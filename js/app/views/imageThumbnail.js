define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'require-text!app/templates/postImage.html',
], function($, _, Backbone, Marionette, PostImageTemplate) {


    var ImageThumbnailView = Marionette.ItemView.extend({
        template: _.template(PostImageTemplate),
        templateHelpers: function() {
            var removable = this.removable;
            return {
                isRemovable: function () {
                    return removable;
                }
            }
        },
        className: "gridItem pointer-hand",
        attributes: function () {
            var style = "";
            if (!this.model.has("thumbnail")) {
                style += "background-color: #ebebeb;";
            }
            else {

                style += "background-image: url(" + this.model.escape("thumbnail") + ");";
                style += "background-size: 100% auto; background-repeat: no-repeat;";
            }

            return {
                style: style
            }
        },

        initialize: function(options) {
            if (options.removable == true) {
                this.removable = true;
            }
            else {
                this.removable = false;
            }
        },

        modelEvents: {
            'change': 'render'
        },
        events: {
            'click .removeImage': 'removeImage',
            'click .restoreImage': 'restoreImage'
        },
        onRender: function () {
            if (this.model.has("deleted")) {
                this.$el.css("opacity", 0.5);
            }
            else {
                this.$el.css("opacity", 1);
            }
        },

        removeImage: function () {
            this.model.set("deleted", true);
        },

        restoreImage: function() {
            this.model.unset("deleted");
        }
    });

    return ImageThumbnailView;
});
