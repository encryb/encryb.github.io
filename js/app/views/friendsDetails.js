define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'require-text!app/templates/friendDetails.html',
    'require-text!app/templates/friend.html'
], function ($, _, Backbone, Marionette, FriendsDetailsTemplate, FriendOfFriendTemplate) {

    var FriendOfFriendView = Marionette.ItemView.extend({
        template: _.template(FriendOfFriendTemplate),
        className: "pull-left margin-right-15"
    });

    var FriendsDetailsView = Marionette.CompositeView.extend({

        template: _.template(FriendsDetailsTemplate),

        childView: FriendOfFriendView,
        childViewContainer: "#friendsOfFriends",

        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        }
    });

    return FriendsDetailsView;
});
