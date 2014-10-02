define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'app/app',
    'require-text!app/templates/friend.html'

], function ($, _, Backbone, Marionette, App, FriendTemplate) {

    var FriendView = Marionette.ItemView.extend({

        template: _.template(FriendTemplate),

        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },

        events: {
            "click #friendImg": "imgClick"
        },

        imgClick: function() {
            App.vent.trigger("friend:selected", this.model);
        }

    });

    var FriendsView = Marionette.CollectionView.extend({
        childView: FriendView
    });
    return FriendsView;
});
