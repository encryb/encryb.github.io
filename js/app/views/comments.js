define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'utils/misc',
    'require-text!app/templates/comment.html',
    'require-text!app/templates/comments.html'

], function($, _, Backbone, Marionette, MiscUtils, CommentTemplate, CommmentsTemplate) {
    var CommentView = Marionette.ItemView.extend({
        template: _.template( CommentTemplate ),
        templateHelpers: {
            prettyTime: function() {
                return MiscUtils.formatTime(this.date);
            }
        },

        className: "comment",

        events: {
            "click .deleteComment": "deleteComment",
            "click .quoteComment": "quoteComment"
        },


        deleteComment: function(event) {
            event.preventDefault();
            this.trigger("comment:delete");
        },

        quoteComment: function(event) {
            event.preventDefault();
            this.trigger("comment:quote");
        }

    });

    var CommentsView = Marionette.CompositeView.extend({
        template: _.template( CommmentsTemplate ),
        templateHelpers: {
            numHiddenComments: function(){
                if (this.expanded || this.collection.length < 3) {
                    return 0;
                }
                return this.collection.length - 2;
            },
            hasComments: function() {
                return this.collection.length > 0;
            }
        },
        childView: CommentView,
        childViewContainer: "#comments",
        events: {
            'submit form': 'createComment',
            'focusin #createCommentTrigger' : 'expandCommentForm',
            'click #expandComments' : 'expandComments',
            'focusout #createCommentText' : 'checkForCollapse'
        },

        ui: {
            createCommentTrigger: '#createCommentTrigger',
            createCommentText: '#createCommentText',
            createCommentForm: '#createCommentForm',
            createCommentDiv: '#createCommentDiv',
            expandComments: '#expandComments'
        },

        initialize: function() {
            this.on("childview:comment:quote", this.commentQuote);
        },

        checkForCollapse: function() {
            var text = this.ui.createCommentText.val();
            if (!text || text.length === 0) {
                this.collapseCommentForm();
            }
        },
        expandCommentForm: function() {
            this.ui.createCommentDiv.addClass("in");
            this.ui.createCommentTrigger.hide();
            this.ui.createCommentText.focus();
        },
        collapseCommentForm: function() {
            this.ui.createCommentForm.trigger('reset');
            this.ui.createCommentDiv.removeClass("in");
            this.ui.createCommentTrigger.show();
        },
        expandComments: function() {
            this.model.set("expanded", true);
            this.render();
            return false;
        },
        commentQuote: function(child) {
            this.expandCommentForm();
            var model = child.model;
            var commenterName = model.get("commenter").escape("name");
            var comment = model.get("text");
            this.ui.createCommentText.val("> " + commenterName + ": " + comment + "\n");
        },
        createComment: function() {
            event.preventDefault();

            var date = new Date().getTime();
            var text = this.ui.createCommentText.val();
            if (!text || text.length === 0) {
                return;
            }

            var attr = {};
            attr['date'] = date;
            attr['text'] = text;
            this.trigger("comment:submit", attr);

            this.collapseCommentForm();
        },
        collectionEvents: {
            "add": "render",
            "remove": "render"
        },
        _initialEvents: function() {
        },
        showCollection: function() {
            var ChildView;
            if (this.model.get("expanded")) {
                this.collection.each(function(child, index) {
                    ChildView = this.getChildView(child);
                    this.addChild(child, ChildView, index);
                }, this);
            }
            else {
                var start = Math.max(0, this.collection.length - 2);
                for (var i = start, j = 0; i < this.collection.length; i++, j++) {
                    var child = this.collection.at(i);
                    ChildView = this.getChildView(child);
                    this.addChild(child, ChildView, j);
                }
            }
        }
    });
    return CommentsView;
});
