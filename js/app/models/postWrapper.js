define([
    'backbone'
], function (Backbone) {

    var PostWrapper = Backbone.Model.extend({

        defaults: {
            comments: []
        },

        initialize: function() {
            var upvotes = new Backbone.Model({upvoted: false, friendUpvotes: new Backbone.Collection()});
            this.set("upvotes", upvotes);

            var commentsColl = new Backbone.Collection();
            commentsColl.comparator = function(comment) {
                return comment.get("date");
            };
            this.set("comments", commentsColl);


        },

        // not persisted
        sync: function () { return false; },

        setPostId: function(userId, postId) {
            this.set("postId", userId + ":" + postId);

        },

        addMyUpvote: function() {
            this.get("upvotes").set("upvoted", true);
        },

        removeMyUpvote: function() {
            this.get("upvotes").set("upvoted", false);
        },

        addComment: function(model) {
            var comment = new Backbone.Model(model.attributes);
            this.get("comments").add(comment);
        },

        removeComment: function(id) {
            var comments = this.get("comments");
            var comment = comments.findWhere({id: id});
            if (comment) {
                comments.remove(comment);
            }
        },

        addFriendsUpvote: function(friend) {
            var upvotes = this.get("upvotes").get("friendUpvotes").add(friend);
        },

        removeFriendsUpvote: function(userId) {
            var friendUpvotes = this.get("upvotes").get("friendUpvotes");
            var friend = friendUpvotes.findWhere({userId: userId});
            friendUpvotes.remove(friend);
        },

        setMyPost: function(postModel, myInfo) {
            this.postModel = postModel;

            var attr = _.extend(_.clone(postModel.attributes), {poster: myInfo, myPost: true});
            var model = new Backbone.Model(attr);
            this.set("post", model);
            var userId = myInfo.get("userId");
            this.setPostId(userId, postModel.get("id"));
            this.set('userId', userId);
        },

        setFriendsPost: function(postModel, friend) {
            var attr = _.extend(_.clone(postModel.attributes), {poster: friend, myPost: false});
            var model = new Backbone.Model(attr);
            this.set("post", model);
            this.setPostId(friend.get("userId"), postModel.get("id"));
            this.set('userId', friend.get("userId"));
        },

        deletePost: function() {
            this.postModel.destroy();
            this.destroy();
        }
    });
    return PostWrapper;
});