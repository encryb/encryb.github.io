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
    'require-text!app/templates/post.html'

], function($, _, Backbone, Bootbox, Marionette, App, PostAdapter, CommentsView, PostContentView, UpvotesView, PostTemplate) {
    var PostView = Marionette.LayoutView.extend({
        template: _.template(PostTemplate),
        regions: {
            content: "#postContent",
            upvotes: "#upvotes",
            comments: "#comments"
        },

        onRender: function () {
            this.setupChildren();
        },
        setupChildren: function () {

            var postModel = this.model.get("post");
            //check what happens if this view gets destroyed before fetchPost completes
            $.when(PostAdapter.fetchPost(postModel, false)).done(function() {
                var postContentView = new PostContentView({model: postModel});
                this.content.show(postContentView);
            }.bind(this));

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

    var PostsView = Marionette.CollectionView.extend({
        childView: PostView,


        initialize:function() {
            $(window).on("scroll",this.expandCollection.bind(this))
        },

        remove: function() {
            $(window).off("scroll",this.expandCollection.bind(this));
            Backbone.View.prototype.remove.apply(this, arguments);
        },

        expandCollection: function() {
            // if user scrolls the bottom of the wall, add more posts to the wall
            var postsBottom = $('#posts').prop("scrollHeight") + $("#posts").offset().top;
            var pageBottom = $(window).scrollTop() + window.innerHeight;
            if ( postsBottom <= pageBottom + 10) {
                this.collection.increaseLimit(5);
            }
        }
    });
    return PostsView;
});