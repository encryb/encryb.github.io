define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'require-text!app/templates/postFile.html',
], function($, _, Backbone, Marionette, PostFileTemplate) {


    var FileThumbnailView = Marionette.ItemView.extend({
        template: _.template(PostFileTemplate),
        className: "gridItem border-file pos-relative",
        modelEvents: {
            'change': 'render'
        },
        events: {
            'click .removeFile': 'removeFile',
            'click .restoreFile': 'restoreFile'
        },

        removeFile: function () {
            if (this.model.has("deleted")) {
                this.model.unset("deleted");
            }
            else {
                this.model.set("deleted", true);
            }
        },

        removeFile: function () {
            console.log("Remove!");
            this.model.set("deleted", true);
        },

        restoreFile: function() {
            console.log("restore!");
            this.model.unset("deleted");
        }
    });

    return FileThumbnailView;
});
