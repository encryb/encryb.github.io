define([
    'backbone',
    'marionette',
    'underscore',
    'msgpack',
    'backbone-filtered-collection',
    'app/app',
    'app/collections/persist/posts',
    'app/collections/persist/friends',
    'app/collections/persist/comments',
    'app/collections/persist/upvotes',
    'app/collections/persist/invites',
    'app/models/postWrapper',
    'app/encryption',
    'app/services/dropbox',
    'app/remoteManifest'
], function(Backbone, Marionette, _, Msgpack, FilteredCollection, App,
            PostColl, FriendColl,  CommentColl, UpvoteColl, InviteColl,
            PostWrapper, Encryption, Dropbox, RemoteManifest) {

    var State = Marionette.Object.extend({

        initialize: function(options) {

            this.myId = Dropbox.client.dropboxUid();
            this.myModel = new Backbone.Model();

            var profile = options.profile;
            this.myModel.set("name", profile.get("name"));
            this.myModel.set("pictureUrl", profile.get("pictureUrl"));
            this.myModel.set("userId", this.myId);

            this.listenTo(profile, "change:name", function(model){
                this.myModel.set("name", model.get("name"));
            });
            this.listenTo(profile,"change:profileUrl", function(model){
                this.myModel.set("profileUrl", model.get("profileUrl"));
            });

            this.myPosts = new PostColl();
            this.myComments = new CommentColl();
            this.myUpvotes = new UpvoteColl();
            this.myFriends = new FriendColl();
            this.myInvites = new InviteColl();

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

            this.chats = {};

            this.friendsOfFriends = [];


            this.myPosts.on("add", this.onMyPostAdded.bind(this));
            this.myPosts.on("remove", this.onMyPostRemoved.bind(this));

            this.myComments.on("add", this.onMyCommentAdded.bind(this));
            this.myComments.on("remove", this.onMyCommentRemoved.bind(this));

            this.myUpvotes.on("add", this.onMyUpvoteAdded.bind(this));
            this.myUpvotes.on("remove", this.onMyUpvoteRemoved.bind(this));

            App.vent.on("friend:selected", function(friendModel){
                App.state.filterByUser(friendModel.get('userId'));
            });
            App.vent.on("friend:unselect", function(){
               App.state.unsetFilter();
            });
        },

        fetchAll: function() {

            if (this.fetchPromise) {
                return this.fetchPromise;
            }

            var deferred = $.Deferred();
            this.fetchPromise = deferred.promise();
            var state = this;

            $.when(
                state.myPosts.fetch(),
                state.myComments.fetch(),
                state.myUpvotes.fetch(),
                state.myFriends.fetch(),
                state.myInvites.fetch()
            ).done(function() {
                deferred.resolve(state);
            });
            return this.fetchPromise;
        },

        onMyPostAdded: function(post) {
            var wrapper = new PostWrapper();
            wrapper.setMyPost(post, this.myModel);
            this.posts.add(wrapper);
            var postComments = this.comments.where({postId: wrapper.get("postId")});
            for (var i=0; i<postComments.length; i++) {
                var comment = postComments[i];
                wrapper.addComment(comment);
            }
            var postUpvotes = this.upvotes.where({postId: wrapper.get("postId")});
            for (var i=0; i<postUpvotes.length; i++) {
                var upvote = postUpvotes[i];
                if (upvote.get("myUpvote")) {
                    wrapper.addMyUpvote();
                }
                else {
                    wrapper.addFriendsUpvote(upvote.get("friend"));
                }
            }
        },
        onMyPostRemoved: function(post) {
            var postId = this.myId + ":" + post.get("id");
            var model = this.posts.findWhere({postId: postId});
            model.destroy();
        },
        onMyCommentAdded: function(comment) {

            var attr = _.extend(_.clone(comment.attributes), {commenter: this.myModel, myComment: true});
            var model = new Backbone.Model(attr);
            this.comments.add(model);
        },
        onMyCommentRemoved: function(comment) {
            var model = this.comments.findWhere({postId: comment.get("postId"), commenter: this.myModel});
            this.comments.remove(model);
        },
        onMyUpvoteAdded: function(upvote) {
            var attr = _.extend(_.clone(upvote.attributes), {owenerId: this.myId, myUpvote: true});
            var model = new Backbone.Model(attr);
            this.upvotes.add(model);
        },
        onMyUpvoteRemoved: function(upvote) {
            var model = this.upvotes.findWhere({postId: upvote.get("postId")});
            this.upvotes.remove(model);
        },


        addFriendsPost: function(post, friend) {
            var wrapper = new PostWrapper();
            wrapper.setFriendsPost(post, friend);
            this.posts.add(wrapper);
            var postComments = this.comments.where({postId: wrapper.get("postId")});
            for (var i=0; i<postComments.length; i++) {
                var comment = postComments[i];
                wrapper.addComment(comment);
            }
            var postUpvotes = this.upvotes.where({postId: wrapper.get("postId")});
            for (var i=0; i<postUpvotes.length; i++) {
                var upvote = postUpvotes[i];
                if (upvote.get("myUpvote")) {
                    wrapper.addMyUpvote();
                }
                else {
                    wrapper.addFriendsUpvote(upvote.get("friend"));
                }
            }
        },
        removeFriendsPost: function(post, friend) {
            var postId = friend.get('userId') + ":" + post.id;
            var model = this.posts.findWhere({postId: postId});
            this.posts.remove(model);
        },
        addFriendsComment: function(comment, friend) {
            var attr = _.extend(_.clone(comment), {commenter: friend, myComment: false});
            var model = new Backbone.Model(attr);
            this.comments.add(model);
        },
        removeFriendsComment: function(comment, friend) {
            var model = this.comments.findWhere({id: comment.id, commenter: friend});
            this.comments.remove(model);
        },

        addFriendsUpvote: function(upvote, friend) {
            var model = new Backbone.Model();
            model.set("postId", upvote.postId);
            model.set("friend", friend);
            this.upvotes.add(model);
        },
        removeFriendsUpvote: function(post, friend) {
            var model = this.upvotes.findWhere({id: post.id, owenerId: friend.get('userId')});
            this.upvotes.remove(model);
        },

        getFriendsOfFriend: function(friendModel) {
            var friendId = friendModel.get('userId');
            if (!this.friendsOfFriends.hasOwnProperty(friendId)) {
                this.friendsOfFriends[friendId] = new Backbone.Collection();
            }
            var friends =  this.friendsOfFriends[friendId];

            var commonFriends = new Backbone.Collection();
            var otherFriends = new Backbone.Collection();
            friends.each(function(friend) {
                if (this.myFriends.findWhere({userId: friend.get("userId")})){
                    commonFriends.add(friend);
                }
                else {
                    otherFriends.add(friend);
                }
            }, this);
            return {otherFriends: otherFriends, commonFriends: commonFriends};
        },

        addFriendOfFriend: function(friendOfFriend, friend) {
            var friendId = friend.get('userId');
            if (!this.friendsOfFriends.hasOwnProperty(friendId)) {
                this.friendsOfFriends[friendId] = new Backbone.Collection();
            }
            var model = new Backbone.Model(friendOfFriend);

            this.friendsOfFriends[friendId].add(model);
        },

        removeFriendOfFriend: function(friendOfFriend, friend) {
            var friendId = friend.get('userId');
            if (!this.friendsOfFriends.hasOwnProperty(friendId)) {
                return;
            }
            var model = this.friendsOfFriends['friendId'].findWhere({userId: friendOfFriend['userId']});
            this.friendsOfFriends['friendId'].remove(model);
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
            var post = this.posts.findWhere({postId: postId});
            // we might not have this post yet.
            if (!post) {
                return;
            }
            if (upvote.get("myUpvote")) {
                post.addMyUpvote();
            }
            else {
                post.addFriendsUpvote(upvote.get("friend"));
            }
        },
        dispatchUpvoteRemove: function(upvote) {
            var postId = upvote.get("postId");
            var post = this.posts.findWhere({postId: postId});
            // post might have been removed.
            if (!post) {
                return;
            }
            if (upvote.get("myUpvote")) {
                post.removeMyUpvote();
            }
            else {
                post.removeFriendsUpvote(upvote.get('userId'));
            }
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
