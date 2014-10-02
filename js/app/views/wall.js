define([
    'jquery',
    'underscore',
    'backbone',
    'jcrop',
    'jasny-bootstrap',
    'marionette',
    'visibility',
    'app/app',
    'require-text!app/templates/wall.html'
], function($, _, Backbone, Jcrop, Jasny, Marionette, Visibility, App,
            WallTemplate
    ){

    var AppView = Marionette.LayoutView.extend({
        template: _.template( WallTemplate ),
        regions: {
            posts: "#posts",
            friendsDetails: "#friendsDetails",
            createPost: "#createPost",
            friends: "#friends",
            invites: "#invites"
        },
        ui: {
            settingsColumn: "#settingsColumn",
            postsColumn: "#postsColumn",
            expandSettings: "#expandSettings",
            inviteButton: "#inviteButton",
            inviteCode: "#inviteCode"
        },

            /*
        initialize: function() {

            var minute = 60 * 1000;
            Visibility.every(3 * minute, 15 * minute, function () {
                var refresh = wall.state.refreshPosts.bind(app);
                refresh();
            });

            Visibility.change(function (e, state) {
                if (state == "visible") {
                    var refresh = wall.refreshPosts.bind(app);
                    refresh();
                }
            })
        },

             */
        events: {
            "click @ui.expandSettings": "expandSettings",
            "click @ui.inviteButton": "inviteFriend"
        },
        triggers: {
            "click #saveManifests": "manifests:save"
        },

        expandSettings: function() {
            this.ui.postsColumn.toggleClass('col-xs-12 col-xs-8');
            this.ui.settingsColumn.toggleClass('hidden-xs');
            this.ui.expandSettings.toggleClass('glyphicon-expand glyphicon-collapse-down');
        },

        inviteFriend: function() {
            var userId = this.ui.inviteCode.val();
            App.vent.trigger("invite:send", userId);
        }
    });

    return AppView;
});