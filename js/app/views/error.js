
define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'app/app',
  'require-text!app/templates/error.html'
], function ($, _, Backbone, Marionette, App, ErrorTemplate) {

    var ErrorView = Marionette.ItemView.extend({
        template: _.template(ErrorTemplate),

        ui: {
            closeButton: ".close"
        },

        events: {
            "click @ui.closeButton": "closeView"
        },

        closeView: function (event) {
            this.trigger("close");
        }
    });

    return ErrorView;
});
