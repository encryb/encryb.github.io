define([
    'backbone',
    'marionette',
    'underscore',
    'msgpack',
    'backbone-filtered-collection',
    'app/app',
    'app/collections/persist/posts',
    'app/collections/persist/friends',
    'app/collections/persist/profiles',
    'app/collections/persist/comments',
    'app/collections/persist/upvotes',
    'app/models/postWrapper',
    'app/encryption',
    'app/storage',
    'app/remoteManifest',
    'utils/dropbox-client'
], function(Backbone, Marionette, _, Msgpack, FilteredCollection, App,
            PostColl, FriendColl, ProfileColl, CommentColl, UpvoteColl,
            PostWrapper, Encryption, Storage, RemoteManifest, DropboxClient) {

    var State = Marionette.Object.extend({

        initialize: function(options) {

            this.myId = Backbone.DropboxDatastore.client.dropboxUid();

            this.myPosts = new PostColl();
            this.myComments = new CommentColl();
            this.myUpvotes = new UpvoteColl();
            this.myFriends = new FriendColl();
            this.myProfiles = new ProfileColl();


            this.friends = {};

            this.posts = new Backbone.Collection();
            this.posts.comparator = function(post) {
                return -post.get('post').get('created');
            };

            this.filteredPosts = new FilteredCollection (null, {collection: this.posts});

            this.comments = new Backbone.Collection();
            this.listenTo(this.comments, "add", this.dispatchCommentAdd);
            this.listenTo(this.comments, "remove", this.dispatchCommentRemove);

            this.upvotes = new Backbone.Collection();
            this.listenTo(this.upvotes, "add", this.dispatchUpvoteAdd);
            this.listenTo(this.upvotes, "remove", this.dispatchUpvoteRemove);

            this.myPosts.on("add", this.onMyPostAdded.bind(this));
            this.myPosts.on("remove", this.onMyPostRemoved.bind(this));

            this.myComments.on("add", this.onMyCommentAdded.bind(this));
            this.myComments.on("remove", this.onMyCommentRemoved.bind(this));

            this.myUpvotes.on("add", this.onMyUpvoteAdded.bind(this));
            this.myUpvotes.on("remove", this.onMyUpvoteRemoved.bind(this));

            this.myFriends.on("add", this.onMyFriendAdded.bind(this));

            App.vent.on("friend:selected", function(friendModel){
                App.state.filterByUser(friendModel.get('userId'));
            });
        },

        fetchAll: function() {
            $.when(this.myProfiles.fetch()).done(function () {
                this.profilePictureUrl = this.myProfiles.getFirst().get('pictureUrl');
                this.name = this.myProfiles.getFirst().get('name');

                var state = this;
                state.trigger("synced:profile");
                $.when(
                    this.myPosts.fetch(),
                    this.myComments.fetch(),
                    this.myUpvotes.fetch(),
                    this.myFriends.fetch()
                ).done(function() {
                        state.trigger("synced:full");
                    });
            }.bind(this));
        },

        onMyPostAdded: function(post) {
            var wrapper = new PostWrapper();
            wrapper.setMyPost(post, this.name, this.profilePictureUrl);
            this.posts.add(wrapper);
            var postComments = this.comments.where({postId: wrapper.get("postId")});
            for (var i=0; i<postComments.length; i++) {
                var comment = postComments[i];
                wrapper.addComment(comment);
            }
            var postUpvotes = this.upvotes.where({postId: wrapper.get("postId")});
            for (var i=0; i<postUpvotes.length; i++) {
                var upvote = postUpvotes[i];
                wrapper.addUpvote(upvote.get("id"), upvote.get("owner") , upvote.get("text"), upvote.get("date"));
            }
        },
        onMyPostRemoved: function(post) {
            var postId = this.myId + ":" + post.get("id");
            var model = this.posts.findWhere({postId: postId});
            model.destroy();
        },
        onMyCommentAdded: function(comment) {
            var attr = _.extend(_.clone(comment.attributes), {owenerId: this.myId, owner: this.name, myComment: true});
            var model = new Backbone.Model(attr);
            this.comments.add(model);
        },
        onMyCommentRemoved: function(comment) {
            var model = this.comments.findWhere({postId: comment.get("postId")});
            model.destroy();
        },
        onMyUpvoteAdded: function(upvote) {
            var attr = _.extend(_.clone(upvote.attributes), {owenerId: this.myId, myUpvote: true});
            var model = new Backbone.Model(attr);
            this.upvotes.add(model);
        },
        onMyUpvoteRemoved: function(upvote) {
            var model = this.upvotes.findWhere({postId: upvote.get("postId")});
            model.destroy();
        },

        onMyFriendAdded: function(friend) {

            var state = this;
            var friendManifest = friend.get('friendsManifest');
            if (!friendManifest) {
                return;
            }

            Storage.downloadUrl(friendManifest).done(function (data) {

                var decData = Encryption.decryptManifestData(data);
                var decObj = Msgpack.decode(decData.buffer);

                var userId = -1;
                if (decObj.hasOwnProperty('userId')) {
                    var userId = decObj['userId'];
                }

                var currentKey = friend.get('publicKey');
                var newKey = decObj['publicKey'];
                if (currentKey != newKey) {
                    console.log("Private key changed from ", currentKey, newKey);
                    friend.set('publicKey', newKey);
                }

                friend.set('name', decObj['name']);
                friend.set('intro', decObj['intro']);
                friend.set('pictureUrl', decObj['pictureUrl']);
                friend.set('intro', decObj['intro']);
                friend.set('userId', userId);
                friend.save();

                state.addCollection(friendManifest, decObj);
            });
        },

        addCollection: function(manifest, friend) {
            var state  = this;

            if (!friend.hasOwnProperty('userId')) {
                return;
            }

            if (this.friends.hasOwnProperty(manifest)) {
                var oldFriend = this.friends[manifest];

                RemoteManifest.compare(oldFriend, friend, function(key, action, item) {
                    if (key == "posts") {
                        if (action == "add") {
                            state.addFriendsPost(item, friend);
                        }
                        else {
                            state.removeFriendsPost(item, friend);
                        }
                    }
                    else if (key == "upvotes"){
                        if (action == "add") {
                            state.addFriendsUpvote(item, friend);
                        }
                        else {
                            state.removeFriendsUpvote(item, friend);
                        }
                    }
                    else if (key == "comments") {
                        if (action == "add") {
                            state.addFriendsComment(item, friend);
                        }
                        else {
                            state.removeFriendsComment(item, friend);
                        }
                    }
                });
            }
            else {
                this.friends[manifest] = friend;
                for (var i=0; i< friend.posts.length; i++) {
                    var post = friend.posts[i];
                    state.addFriendsPost(post, friend);
                }
                if (friend.hasOwnProperty('upvotes')) {
                    for (var i=0; i< friend.upvotes.length; i++) {
                        var upvote = friend.upvotes[i];
                        state.addFriendsUpvote(upvote, friend);
                    }
                }
                if (friend.hasOwnProperty('comments')) {
                    for (var i=0; i< friend.comments.length; i++) {
                        var comment = friend.comments[i];
                        state.addFriendsComment(comment, friend);
                    }
                }

            }
        },

        addFriendsPost: function(post, friend) {
            var wrapper = new PostWrapper();
            wrapper.setFriendsPost(post, friend['name'], friend['pictureUrl'], friend['userId']);
            this.posts.add(wrapper);
            var postComments = this.comments.where({postId: wrapper.get("postId")});
            for (var i=0; i<postComments.length; i++) {
                var comment = postComments[i];
                wrapper.addComment(comment);
            }
        },
        removeFriendsPost: function(post, friend) {
            var postId = friend['userId'] + ":" + post.id;
            var model = this.posts.findWhere({postId: postId});
            model.destroy();
        },
        addFriendsComment: function(comment, friend) {
            var attr = _.extend(_.clone(comment), {owenerId: friend['userId'], owner: friend['name'], myComment: false});
            var model = new Backbone.Model(attr);
            this.comments.add(model);
        },
        removeFriendsComment: function(comment, friend) {
            var model = this.comments.findWhere({id: comment.id, owenerId: friend['userId']});
            model.destroy();
        },

        addFriendsUpvote: function(upvote, friend) {
            var attr = _.extend(_.clone(upvote), {owenerId: friend['userId'], owner: friend['name'], profilePictureUrl: friend['pictureUrl']});
            var model = new Backbone.Model(attr);
            this.upvotes.add(model);
        },
        removeFriendsUpvote: function(post, friend) {
            var model = this.upvotes.findWhere({id: post.id, owenerId: friend['userId']});
            model.destroy();
        },

        dispatchCommentAdd: function(comment) {
            var postId = comment.get("postId");
            var model = this.posts.findWhere({postId: postId});
            // we might not have this post yet.
            if (!model) {
                return;
            }
            model.addComment(comment);
        },
        dispatchCommentRemove: function(comment) {
            var postId = comment.get("postId");
            var model = this.posts.findWhere({postId: postId});
            // post might have been removed.
            if (!model) {
                return;
            }
            model.removeComment(comment.get("id"));
        },
        dispatchUpvoteAdd: function(upvote) {
            var postId = upvote.get("postId");
            var model = this.posts.findWhere({postId: postId});
            // we might not have this post yet.
            if (!model) {
                return;
            }
            if (upvote.get("myUpvote")) {
                model.addMyUpvote();
            }
            else {
                model.addFriendsUpvote(upvote.get('name'), upvote.get('profilePictureUrl'), upvote.get('userId'));
            }
        },
        dispatchUpvoteRemove: function(upvote) {
            var postId = upvote.get("postId");
            var model = this.posts.findWhere({postId: postId});
            // post might have been removed.
            if (!model) {
                return;
            }
            if (upvote.get("myUpvote")) {
                model.removeMyUpvote();
            }
            else {
                model.removeFriendsUpvote(upvote.get('userId'));
            }
        },

        saveManifest: function(friend) {
            var manifest = {};

            var filteredPosts = [];

            var myKey = Encryption.getEncodedKeys().publicKey;

            this.myPosts.each(function(post) {
                var permissions = post.get("permissions");
                if (!permissions ||
                    $.inArray("all", permissions) > -1 ||
                    $.inArray(friend.get('id'), permissions) > -1
                    ) {
                    filteredPosts.push(_.omit(post.toJSON(), 'permissions'));
                }

            });

            manifest['posts'] = filteredPosts;
            manifest['upvotes'] = this.myUpvotes.toJSON();
            manifest['comments'] = this.myComments.toJSON();

            var profile = this.myProfiles.getFirst();
            manifest['name'] = profile.get('name');
            manifest['intro'] = profile.get('intro');
            manifest['pictureUrl'] = profile.get('pictureUrl');
            manifest['userId'] = Backbone.DropboxDatastore.client.dropboxUid();
            manifest['publicKey'] = myKey;

            var packedManifest = new Uint8Array(Msgpack.encode(manifest));
            return friend.saveManifest(packedManifest);
        },

        saveManifests: function() {
            this.myFriends.each(function(friend) {
                this.saveManifest(friend);
            }, this);
        },

        refreshPosts: function() {
            console.log("refresh");
            this.myFriends.each(function(friend) {
                this.onMyFriendAdded(friend);
            }, this);
        },

        filterByUser: function(userId) {
            this.filteredPosts.setFilter(function(post) { return post.get('userId') == userId});
        },
        unsetFilter: function() {
            this.filteredPosts.setFilter(false);
        }


    });
    return State;
});
