define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'app/app',
    'app/views/comments',
    'app/views/postContent',
    'app/views/upvotes',
    'require-text!app/templates/post.html'

], function($, _, Backbone, Marionette, App, CommentsView, PostContentView, UpvotesView, PostTemplate) {
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
            var postContentView = new PostContentView({model: this.model.get('post')});
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
                postView.trigger("comment:delete", comment.model.get("id"));
            });
        },
        events: {
            "click #upvoteButton": "toggleUpvote",
            "click #deletePost": "deletePost"

        },
        toggleUpvote: function() {
            var id = this.model.get("postId");
            this.trigger("post:like", id);
        },
        submitComment: function(attr) {
            var id = this.model.get("postId");
            attr['postId'] = id;
            this.trigger("comment:submit", attr);
        },

        deletePost: function() {
            // check the order here
            this.trigger("post:delete");
            this.model.deletePost();
        }

    });

    var PostsView = Marionette.CollectionView.extend({
        childView: PostView,
        initialize: function() {
            this.on("childview:post:delete", function(post){
                setTimeout(function(){
                    App.vent.trigger("post:deleted")
                }, 100);
            });

            this.on("childview:post:like", function(postView, id){
                App.state.myUpvotes.toggleUpvote(id);
                App.vent.trigger("post:liked");
            });

            this.on("childview:comment:submit", function(postView, comment) {
                App.state.myComments.addComment(comment['postId'], comment['text'], comment['date']);
                App.vent.trigger("comment:created");
            });

            this.on("childview:comment:delete", function(postView, commentId) {
                var comment = App.state.myComments.findWhere({id:commentId});
                if (comment) {
                    comment.destroy();
                    setTimeout(function(){
                        App.vent.trigger("comment:deleted");
                    }, 100);
                }
            });
        }
    });
    return PostsView;
});