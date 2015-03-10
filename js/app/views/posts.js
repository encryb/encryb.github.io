define([
    'jquery',
    'underscore',
    'backbone',
    'bootbox',
    'marionette',
    'app/app',
    'app/adapters/post',
    'app/views/comments',
    'app/views/postContent',
    'app/views/upvotes',
    'require-text!app/templates/post.html',
    'require-text!app/templates/empty.html',
], function($, _, Backbone, Bootbox, Marionette, App, PostAdapter, CommentsView, PostContentView, UpvotesView, PostTemplate, EmptyTemplate) {
    var PostView = Marionette.LayoutView.extend({
        template: _.template(PostTemplate),
        regions: {
            content: "#postContent",
            upvotes: "#upvotes",
            comments: "#comments"
        },

        onShow: function () {
            this.setupChildren();
        },
        setupChildren: function () {

            var postModel = this.model.get("post");
            var postContentView = new PostContentView({model: postModel});
            this.content.show(postContentView);
            
            var upvotesModel = this.model.get("upvotes");
            var upvotesView = new UpvotesView({model: upvotesModel, collection: upvotesModel.get("friendUpvotes")});
            this.upvotes.show(upvotesView);

            var commentsColl = this.model.get("comments");
            var commentsModel = new Backbone.Model({collection: commentsColl});
            var commentsView = new CommentsView({model: commentsModel, collection: commentsColl});
            this.comments.show(commentsView);

            var postView = this;
            commentsView.on("comment:submit", function(attr) {
                postView.submitComment(attr);
            });
            commentsView.on("childview:comment:delete", function(comment) {
                postView.deleteComment(comment.model.get("id"));
            });
        },
        events: {
            "click #upvoteButton": "toggleUpvote",
            "click .deletePost": "deletePost",
            "click .editPost": "editPost"

        },
        toggleUpvote: function() {
            App.vent.trigger("post:liked", this.model.get("postId"));
        },
        submitComment: function(attr) {
            App.vent.trigger("comment:created", this.model.get("postId"), attr );

        },
        deleteComment: function(commentId) {
            App.vent.trigger("comment:deleted", commentId);
        },
        editPost: function() {
            App.vent.trigger("post:edit", this.model);
        },
        deletePost: function() {
            Bootbox.confirm("Delete post?", function(result) {
                if (result) {
                    App.vent.trigger("post:deleted", this.model);
                }
            }.bind(this));

        }

    });

    var EmptyView = Marionette.ItemView.extend({
        template: EmptyTemplate,
        events: {
            "click #inviteOgi": "inviteOgi"
        },
        inviteOgi: function () {
            App.vent.trigger("invite:find", "17632845");
        }
    });

    var PostsView = Marionette.CollectionView.extend({
        childView: PostView,
        emptyView: EmptyView
    });
    return PostsView;
});