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
                },
                formatTime: function (duration) {
                    var mins = Math.floor(duration / 60);
                    var seconds = Math.round(duration % 60);
                    if (seconds < 10) {
                        seconds = "0" + seconds;
                    }
                    return mins + ":" + seconds;
                }
            }
        },
        className: "pointer-hand",
        attributes: function () {
            var style = "";
            if (this.model.has("thumbnail")) {
                style += "background-image: url(" + this.model.escape("thumbnail") + ");";
                style += "background-repeat: no-repeat;";

            }
            else if (this.model.has("videoFrames")) {
                // preload images to remove flicker in chrome
                for (var i = 0; i < this.model.get("videoFrames").length; i++) {
                    new Image().src = this.model.get("videoFrames")[i];
                }
                
                style += "background-image: url(" + this.model.get("videoFrames")[0] + ");";
                style += "background-repeat: no-repeat;";
                style += "transition: background 0.3s;"
                
            }
            else {
                style += "background-color: #ebebeb;";
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
            'click .restoreImage': 'restoreImage',
            'mouseenter': 'mouseOver',
            'mouseleave': 'mouseOut'
        },

        imageNumber: 0,

        swapImage: function() {
            var frames = this.model.get("videoFrames");
            if (!frames) {
                return;
            }
            this.imageNumber = (this.imageNumber+1) % frames.length;
            this.$el.css("background-image", "url(" + frames[this.imageNumber] + ")");
        },

        mouseOver: function() {
            this.swapImage();
            this.swapInterval = setInterval(this.swapImage.bind(this), 1000);
        },
        mouseOut: function() {
            clearInterval(this.swapInterval);
        },

        onRender: function () {
            if (this.model.has("deleted") && this.removable) {
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
