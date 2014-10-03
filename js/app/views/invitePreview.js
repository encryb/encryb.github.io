define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'app/app',
    'require-text!app/templates/invitePreview.html'

], function ($, _, Backbone, Marionette, App, InvitePreviewTemplate) {

    var InvitePreviewView = Marionette.ItemView.extend({

        template: _.template(InvitePreviewTemplate),

        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },

        events: {
            "click #previewInviteButton" : "invite"

        },

        invite: function() {
            App.vent.trigger("invite:send", this.model);
        }


    });

    return InvitePreviewView;

});
