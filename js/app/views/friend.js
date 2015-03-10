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
            "click #friendImg": "imgClick",
            "click #chatButton": "openChat"
        },

        modelEvents: {
            "change": "render"
        },

        serializeData: function(){
            return _.clone(this.model.attributes);
        },

        imgClick: function() {
            App.vent.trigger("friend:selected", this.model);
        },
        openChat: function() {
            App.vent.trigger("friend:chat", this.model);
        },
        onRender: function() {
            this.$el.find('[data-toggle="tooltip"]').tooltip();
        }

    });

    var FriendsView = Marionette.CollectionView.extend({
        childView: FriendView
    });
    return FriendsView;
});
