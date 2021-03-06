define([
    'backbone',
    'marionette',
    'underscore',
    'app/app',
    'app/collections/persist/posts',
    'app/collections/persist/friends',
    'app/collections/persist/comments',
    'app/collections/persist/upvotes',
    'app/collections/persist/invites',
    'app/models/postWrapper',
    'app/models/post'
], function(Backbone, Marionette, _, App,
            PostColl, FriendColl,  CommentColl, UpvoteColl, InviteColl,
            PostWrapper, Post) {

    var State = Marionette.Object.extend({

        initialize: function(options) {
            this.myModel = new Backbone.Model();

            var profile = options.profile;
            this.myModel.set("name", profile.get("name"));
            this.myModel.set("pictureUrl", profile.get("pictureUrl"));
            this.myModel.set("userId", profile.get("userId"));

            this.myId = profile.get("userId");
            this.myPassword = profile.get("password");

            this.listenTo(profile, "change:name", function(model){
                this.myModel.set("name", model.get("name"));
            });
            this.listenTo(profile,"change:pictureUrl", function(model){
                this.myModel.set("pictureUrl", model.get("pictureUrl"));
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

            var i;
            for (i=0; i<postComments.length; i++) {
                var comment = postComments[i];
                wrapper.addComment(comment);
            }
            var postUpvotes = this.upvotes.where({postId: wrapper.get("postId")});
            for (i=0; i<postUpvotes.length; i++) {
                var upvote = postUpvotes[i];
                if (upvote.get("myUpvote")) {
                    wrapper.addMyUpvote();
                }
                else {
                    wrapper.addFriendsUpvote(upvote.get("friend"));
                }
                this.updateScore(upvote, 1);
            }
        },
        onMyPostRemoved: function(post) {
            var postId = this.myId + ":" + post.get("id");
            var model = this.posts.findWhere({postId: postId});
            this.posts.remove(model);
        },
        onMyCommentAdded: function(comment) {
            var attr = _.extend(_.clone(comment.attributes), {commenter: this.myModel, myComment: true});
            var model = new Backbone.Model(attr);
            this.comments.add(model);
        },
        onMyCommentRemoved: function(comment) {
            var model = this.comments.findWhere({id: comment.get("id"), commenter: this.myModel});
            this.comments.remove(model);
        },
        onMyUpvoteAdded: function(upvote) {
            var attr = _.extend(_.clone(upvote.attributes), {owenerId: this.myId, myUpvote: true});
            var model = new Backbone.Model(attr);
            this.upvotes.add(model);
        },
        onMyUpvoteRemoved: function(upvote) {
            var model = this.upvotes.findWhere({postId: upvote.get("postId"), myUpvote: true});
            this.upvotes.remove(model);
        },


        addFriendsPost: function(post, friend) {
            var wrapper = new PostWrapper();

            var postModel = new Post(post);

            wrapper.setFriendsPost(postModel, friend);
            this.posts.add(wrapper);
            var postComments = this.comments.where({postId: wrapper.get("postId")});

            for (var ci=0; ci<postComments.length; ci++) {
                var comment = postComments[ci];
                wrapper.addComment(comment);
            }
            var postUpvotes = this.upvotes.where({postId: wrapper.get("postId")});
            for (var pi=0; pi<postUpvotes.length; pi++) {
                var upvote = postUpvotes[pi];
                if (upvote.get("myUpvote")) {
                    wrapper.addMyUpvote();
                }
                else {
                    wrapper.addFriendsUpvote(upvote.get("friend"));
                }
                this.updateScore(upvote, 1);
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
            model.set("ownerId", friend.get("userId"));
            this.upvotes.add(model);
        },
        removeFriendsUpvote: function(post, friend) {
            console.log("Removing", post, friend.get("userId"));
            var model = this.upvotes.findWhere({postId: post.postId, ownerId: friend.get("userId")});
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
            this.updateScore(upvote, 1);
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
                post.removeFriendsUpvote(upvote.get("ownerId"));
            }
            this.updateScore(upvote, -1);
        },

        updateScore: function(upvote, value) {

            var postId = upvote.get("postId");
            var posterId = postId.split(":")[0];

            if (posterId == this.myId) {
                return;
            }

            var upvoterId = upvote.get("myUpvote") ? this.myId : upvote.get("friend").get("userId");
            // don't count self upvotes
            if (upvoterId == posterId) {
                return;
            }

            var friend = this.myFriends.findWhere({userId: posterId});
            if (!friend) {
                console.log("Friend does not exist", friend);
                return;
            }
            friend.set("score", friend.get("score") + value);
        },

        filterByUser: function(userId) {
            this.filteredPosts.setFilter(function(post) { return post.get('userId') == userId });
        },
        unsetFilter: function() {
            this.filteredPosts.setFilter(false);
        },

        toManifest: function(friend) {
            var manifest = {
                posts: this.myPosts.toManifest(friend),
                upvotes: this.myUpvotes.toJSON(),
                comments: this.myComments.toJSON(),
                friends: this.myFriends.toManifest(friend)
            }
            return {manifest: manifest, archive: null};
        },
        createMyPost: function(postModel){
            var deferred = $.Deferred();
            var onSuccess = function() {
                deferred.resolve();
            }
            postModel.dropboxDatastore = this.myPosts.dropboxDatastore;
            this.myPosts.create(postModel, {wait:true, success: onSuccess});
            return deferred.promise();
        }


    });
    return State;
});
