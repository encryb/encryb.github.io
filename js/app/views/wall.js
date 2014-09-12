define([
    'jquery',
    'underscore',
    'backbone',
    'jcrop',
    'jasny-bootstrap',
    'marionette',
    'visibility',
    'app/app',
    'app/models/post',
    'app/models/friend',
    'app/views/modals',
    'app/storage',
    'utils/data-convert',
    'utils/image',
    'utils/random',
    'require-text!app/templates/wall.html'
], function($, _, Backbone, Jcrop, Jasny, Marionette, Visibility, App, PostModel, FriendModel,
            Modals, Storage, DataConvert, ImageUtil, RandomUtil,
            WallTemplate
    ){

    var AppView = Marionette.LayoutView.extend({
        template: _.template( WallTemplate ),
        regions: {
            posts: "#posts",
            friendsDetails: "#friendsDetails",
            createPost: "#createPost",
            friends: "#friends"
        },
        ui: {
            settingsColumn: "#settingsColumn",
            postsColumn: "#postsColumn",
            expandSettings: "#expandSettings"
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
            "click #addFriend": 'showAddFriendForm',
            "click @ui.expandSettings": 'expandSettings'
        },
        triggers: {
            "click #saveManifests": 'manifests:save'
        },

        expandSettings: function() {
            this.ui.postsColumn.toggleClass('col-xs-12 col-xs-8');
            this.ui.settingsColumn.toggleClass('hidden-xs');
            this.ui.expandSettings.toggleClass('glyphicon-expand glyphicon-collapse-down');
        },

        showAddFriendForm: function() {

            var app = this;
            Modals.addFriend().done(function(model) {
                app.createUser(model.get('account'), model.get('friendManifest'));
            });
        },

        createUser: function(account, friendsManifest) {

            var deferred = $.Deferred();

            var id = RandomUtil.makeId();
            var attrs = {account: account, manifestFile: id, friendsManifest: friendsManifest};

            var newFriend = new FriendModel(attrs);
            this.state.saveManifest(newFriend)
                .then(Storage.shareDropbox)
                .then(function(url) {
                    newFriend.set('manifestUrl', url);
                    App.state.myFriends.add(newFriend);
                    newFriend.save();
                    deferred.resolve(newFriend);
                });
            return deferred;
        },

        deleteCallback: function (model) {
            console.log("Deleting " + model);
            this.state.saveManifests();
        }
    });

    return AppView;
});