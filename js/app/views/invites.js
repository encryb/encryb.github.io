define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'bootbox',
    'app/app',
    'require-text!app/templates/invite.html'

], function ($, _, Backbone, Marionette, Bootbox, App, InviteTemplate) {

    var InviteView = Marionette.ItemView.extend({

        template: _.template(InviteTemplate),
        className: "invite",

        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },

        events: {
            "click #inviteAccept": "inviteAccept",
            "click #inviteDecline": "inviteDecline"

        },

        inviteAccept: function() {
            var model = this.model;
            Bootbox.confirm("Accept invitation from " + this.model.get("name") + "?", function(result) {
                if (result) {
                    App.vent.trigger("invite:accept", model);
                }
            });
        },

        inviteDecline: function() {
            var model = this.model;
            Bootbox.confirm("Decline invitation from " + this.model.get("name") + "?", function(result) {
                if (result) {
                    model.destroy();
                }
            });
        },

        imgClick: function() {
            //App.vent.trigger("friend:selected", this.model);
        }

    });

    var InviteViews = Marionette.CollectionView.extend({
        childView: InviteView
    });
    return InviteViews;
});
