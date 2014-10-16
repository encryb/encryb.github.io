define([
    'jquery',
    'underscore',
    'backbone',
    'bootbox',
    'marionette',
    'app/app',
    'require-text!app/templates/friendDetails.html',
    'require-text!app/templates/commonFriends.html',
    'require-text!app/templates/otherFriends.html',
    'require-text!app/templates/friendOfFriend.html'
], function ($, _, Backbone, Bootbox, Marionette, App, FriendsDetailsTemplate, CommonFriendsTemplate,
             OtherFriendsTemplate, FriendOfFriendTemplate) {

    var FriendOfFriendView = Marionette.ItemView.extend({
        template: _.template(FriendOfFriendTemplate),
        className: "pull-left margin-right-15"
    });

    var CommonFriendsView = Marionette.CompositeView.extend({

        template: _.template(CommonFriendsTemplate),

        childView: FriendOfFriendView,
        childViewContainer: "#commonFriendsOfFriend"
    });

    var OtherFriendsView = Marionette.CompositeView.extend({

        template: _.template(OtherFriendsTemplate),

        childView: FriendOfFriendView,
        childViewContainer: "#otherFriendsOfFriend"
    });

    var FriendsDetailsView = Marionette.LayoutView.extend({

        template: _.template(FriendsDetailsTemplate),

        regions: {
            commonFriends: "#commonFriends",
            otherFriends: "#otherFriends"
        },

        templateHelpers: function(){
            var isInvitePreview = this.options.invitePreview == true;
            return {
                isInvitePreview: function() {
                    return isInvitePreview;
                },
                isFavorite: function() {
                    if (this.favorite) {
                        return true;
                    }
                    return false;
                }
            }
        },

        events: {
            'click #favoriteButton' : "toggleFavorite",
            'click #unfriendButton' : "unfriend",
            'click #unselectFriend' : "unselectFriend",
            "click #inviteButton" : "invite"

        },


        initialize: function (options) {
            this.listenTo(this.model, 'change', this.render);
            this.commonFriendsList = options.commonFriends;
            this.otherFriendsList = options.otherFriends;


        },
        onRender: function() {
            if (this.commonFriendsList && this.commonFriendsList.length > 0) {
                var commonFriendsView = new CommonFriendsView({collection: this.commonFriendsList});
                this.commonFriends.show(commonFriendsView);
            }
            if(this.otherFriendsList && this.otherFriendsList.length > 0) {
                var otherFriendsView = new OtherFriendsView({collection: this.otherFriendsList});
                this.otherFriends.show(otherFriendsView);
            }
        },

        toggleFavorite: function() {
            this.model.set("favorite", !this.model.get("favorite"));
            this.model.save();
        },

        unfriend: function() {
            var friend = this.model;
            Bootbox.confirm("Unfriend " + friend.get("name") + "?", function(result) {
                if (result) {
                    App.vent.trigger("friend:unfriend", friend);

                }
            });
        },
        unselectFriend: function() {
            App.vent.trigger("friend:unselect");
        },

        invite: function() {
            App.vent.trigger("invite:send", this.model);
        }

    });

    return FriendsDetailsView;
});
