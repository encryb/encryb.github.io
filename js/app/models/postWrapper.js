define([
    'backbone',
    'app/models/postContent'
], function (Backbone, PostContent) {

    var PostWrapper = Backbone.Model.extend({

        defaults: {
            comments: []
        },

        initialize: function() {
            var upvotes = new Backbone.Model({upvoted: false, friendUpvotes: new Backbone.Collection()});
            this.set("upvotes", upvotes);

            var commentsColl = new Backbone.Collection();
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
                comment.destroy();
            }
        },

        addFriendsUpvote: function(name, pictureUrl, userId) {
            var friend = new Backbone.Model({friendId: userId, name: name, pictureUrl: pictureUrl});
            var upvotes = this.get("upvotes").get("friendUpvotes").add(friend);
        },

        removeFriendsUpvote: function(userId) {
            var friendUpvotes = this.get("upvotes").get("friendUpvotes");
            var friend = friendUpvotes.findWhere({friendId: userId});
            friendUpvotes.remove(friend);
        },

        setMyPost: function(postModel, name, pictureUrl) {
            this.postModel = postModel;
            var userId = Backbone.DropboxDatastore.client.dropboxUid();

            var attr = _.extend(_.clone(postModel.attributes), {owner: name, profilePictureUrl: pictureUrl, myPost: true});
            var model = new PostContent(attr);
            this.set("post", model);
            this.setPostId(userId, postModel.get("id"));
            this.set('userId', userId);
        },

        setFriendsPost: function(post, name, pictureUrl, userId) {
            var attr = _.extend(post, {owner: name, profilePictureUrl: pictureUrl, myPost: false});
            var model = new PostContent(attr);
            this.set("post", model);
            this.setPostId(userId, post.id);
            this.set('userId', userId);
        },

        deletePost: function() {
            this.postModel.destroy();
            this.destroy();
        }
    });
    return PostWrapper;
});