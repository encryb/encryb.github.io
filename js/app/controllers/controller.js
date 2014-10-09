define([
    'backbone',
    'marionette',
    'app/app',
    'app/adapters/friend',
    'app/collections/gather/state',
    'app/collections/permissions',
    'app/models/friend',
    'app/views/wall',
    'app/views/createPost',
    'app/views/posts',
    'app/views/friend',
    'app/views/headerPanel',
    'app/views/invites',
    'app/views/invitePreview',
    'app/encryption',
    'app/services/appengine',
    'app/services/dropbox',
    'utils/data-convert',
    'utils/random'
    ],
function (Backbone, Marionette, App, FriendAdapter, State, PermissionColl, FriendModel,
          WallView, CreatePostView, PostsView, FriendsView, HeaderPanelView, InvitesView, InvitePreviewView,
          Encryption, AppEngine, Dropbox, DataConvert, RandomUtil) {


    function startDownload(uri, name) {
        var link = document.createElement("a");
        link.download = name;
        link.href = uri;
        link.click();
    }


    var Controller = Marionette.Controller.extend({


        _checkSettings: function() {
            var keysLoaded = (Encryption.getKeys() != null);
            var dropboxAuthenticated = Dropbox.client.isAuthenticated();

            if (!keysLoaded || !dropboxAuthenticated) {
                return false;
            }
            return true;
        },


        _loadState: function(callback) {

            if(!this._checkSettings()) {
                this.settings(true);
                return;
            }
            if (App.state) {
                callback();
                return;
            }
            App.state = new State();
            App.state.on("synced:profile", function() {
               callback();
            });

            App.state.myFriends.on("add", FriendAdapter.attachFriend.bind(FriendAdapter));
            App.state.fetchAll();
        },

        showWall: function() {
            this._loadState(this._showWall.bind(this));
        },
        _showWall: function () {

            var profile = App.state.myProfiles.getFirst();
            if (profile.get('name').length == 0) {
                this._profile();
                return;
            }
            var publicKey = Encryption.getEncodedKeys().publicKey;
            if (publicKey != profile.get("publicKey")) {
                this._profile();
                return;
            }

            var headerPanel = new HeaderPanelView({model: profile});
            App.headerPanel.show(headerPanel);

            var wall = new WallView();
            App.main.show(wall);

            wall.on("manifests:save", function() {
                FriendAdapter.saveManifests();
            });

            App.vent.on("post:created", FriendAdapter.saveManifests);
            App.vent.on("post:deleted", FriendAdapter.saveManifests);
            App.vent.on("post:liked", FriendAdapter.saveManifests);
            App.vent.on("comment:created", FriendAdapter.saveManifests);
            App.vent.on("comment:deleted", FriendAdapter.saveManifests);

            var postsView = new PostsView({
                collection: App.state.filteredPosts
            });
            wall.posts.show(postsView);

            var perms = new PermissionColl();
            perms.addFriends(App.state.myFriends);
            var createPostView = new CreatePostView({
                permissions: perms
            });
            wall.createPost.show(createPostView);

            var friendsView = new FriendsView({
                collection: App.state.myFriends
            });
            wall.friends.show(friendsView);

            /*
            var showInvites = App.state.myInvites.length > 0;
            if (showInvites) {
                $("#invitePanel").show();
            }
            else {
                $("#invitePanel").hide();
            }*/

            var invitesView = new InvitesView({
                collection: App.state.myInvites
            });
            wall.invites.show(invitesView);

            var showHideInvites = function() {
                if (App.state.myInvites.length == 0) {
                    wall.ui.invitePanel.addClass("hide");
                }
                else {
                    wall.ui.invitePanel.removeClass("hide");
                }
            }

            // hide invites panel if there are no invites
            App.state.myInvites.on("all", showHideInvites);


            App.vent.on("invite:added", function() {
                wall.glowInvites();
            });
            App.vent.on("friend:added", function() {
                wall.glowFriends();
            });

            App.vent.on("friend:selected", function(friendModel) {
                require(["app/views/friendsDetails"], function (FriendsDetailsView) {

                    var friendsOfFriend = App.state.getFriendsOfFriend(friendModel);
                    var details = new FriendsDetailsView({model: friendModel, collection: friendsOfFriend});
                    wall.friendsDetails.show(details);
                });
            });

            App.vent.on("invite:find", function(friendId) {
                $.when(AppEngine.findProfile(friendId)).done(function(profile){
                    var model = new Backbone.Model();

                    model.set("userId", profile.id);
                    model.set("name", profile.name);
                    model.set("intro", profile.intro);
                    model.set("pictureUrl", profile.pictureUrl);
                    model.set("publicKey", profile.publicKey);


                    var invitePreviewView = new InvitePreviewView({model: model});
                    wall.invitePreview.show(invitePreviewView);
                });
            });

            var controller = this;
            App.vent.on("invite:send", function(inviteModel) {
                $.when(FriendAdapter.createFriend(inviteModel)).done(function(friendModel) {
                    AppEngine.invite(friendModel);
                    // hide the invite details from the wall
                    wall.invitePreview.reset();
                    FriendAdapter.updateDatastoreProfile(friendModel);
                });
            });


            App.vent.on("invite:accept", function(inviteModel){
                $.when(FriendAdapter.createFriend(inviteModel)).done(function(friendModel) {
                    AppEngine.acceptInvite(friendModel);
                    FriendAdapter.updateDatastoreProfile(friendModel);
                    inviteModel.destroy();
                });

            });


            if (App.state.initialSyncCompleted) {
                controller._processAccepts();
                controller._processInvites();
            }
            else {
                App.state.on("synced:full", function() {
                    controller._processAccepts();
                    controller._processInvites();
                });
            }

            if (!profile.get('shared')) {
                AppEngine.publishProfile();
            }

        },

        _processAccepts: function() {
            if (!App.state.myFriends.findWhere({invite: true})) {
                return;
            }
            $.when(AppEngine.getAccepts()).done(function(accepts) {

                for (var i = 0; i < accepts.length; i++) {
                    var acceptEntity = accepts[i];

                    var friendModel = App.state.myFriends.findWhere({userId: acceptEntity.userId});

                    if (!friendModel.get("invite")) {
                        console.log("Friend already accepted invite", friendModel);
                        continue;
                    }
                    var changes = {invite: false, friendsDatastoreId: acceptEntity.datastoreId};
                    friendModel.save(changes);
                    App.vent.trigger("friend:added");

                    FriendAdapter.updateDatastoreProfile(friendModel);
                }
            });
        },

        _processInvites: function() {

            $.when(AppEngine.getInvites()).done(function(invites) {
                for (var i = 0; i < invites.length; i++) {
                    var inviteEntity = invites[i];

                    var existingInvites = App.state.myInvites.where({userId: inviteEntity.userId});
                    if (existingInvites.length > 0) {
                        continue;
                    }
                    var attr = {
                        userId: inviteEntity.userId,
                        name: inviteEntity.name,
                        intro: inviteEntity.intro,
                        pictureUrl: inviteEntity.pictureUrl,
                        publicKey: inviteEntity.publicKey,
                        friendsDatastoreId: inviteEntity.datastoreId
                    };


                    App.state.myInvites.create(attr, {wait: true});
                    App.vent.trigger("invite:added");
                }

            });
        },

        settings: function(displayAbout) {
            displayAbout = displayAbout || false;
            var controller = this;
            var model = new Backbone.Model();

            var keysLoaded = (Encryption.getKeys() != null);
            model.set("dropboxEnabled", Dropbox.client.isAuthenticated());
            model.set("keysLoaded", keysLoaded);
            model.set("displayAbout", displayAbout);

            require(["app/views/setup"], function(SetupView) {

                var setupView = new SetupView({model: model});
                App.main.show(setupView);

                setupView.on("dropbox:login", function () {
                    Dropbox.client.authenticate({}, function (error, client) {
                        if (error) {
                            console.log("Dropbox Authentication Error", error);
                        }
                        else {
                            model.set("dropboxEnabled", true);
                        }
                    });

                });
                setupView.on("dropbox:logout", function () {
                    Dropbox.client.signOut({}, function () {
                        window.location.href = "https://www.dropbox.com/logout";
                        model.set("dropboxEnabled", false);
                    })
                });

                setupView.on("keys:create", function () {
                    Encryption.createKeys();
                    model.set("keysLoaded", true);
                });
                setupView.on("keys:remove", function () {
                    Encryption.removeKeys();
                    model.set("keysLoaded", false);
                });
                setupView.on("keys:download", function () {
                    var keys = Encryption.getEncodedKeys();
                    var uri = "data:text/javascript;base64," + window.btoa(JSON.stringify(keys));
                    startDownload(uri, "encryb.keys");
                });
                setupView.on("keys:upload", function (keysString) {
                    var keys = JSON.parse(keysString);
                    Encryption.saveKeys(keys['secretKey'], keys['publicKey']);
                    model.set("keysLoaded", true);
                });
                setupView.on("keys:saveToDropbox", function (password) {
                    var keys = Encryption.getEncodedKeys();
                    var jsonKeys = JSON.stringify(keys)
                    var encKeys = Encryption.encrypt(password, "text/keys", jsonKeys, false);
                    Dropbox.uploadDropbox("encryb.keys", encKeys);
                });

                setupView.on("keys:loadFromDropbox", function(password){
                    $.when(Dropbox.downloadDropbox("encryb.keys")).done(function(encKeys){
                        var jsonKeys = Encryption.decryptTextData(encKeys, password);
                        var keys = JSON.parse(jsonKeys);
                        Encryption.saveKeys(keys.secretKey, keys.publicKey);
                        model.set("keysLoaded", true);
                    });
                })

                setupView.on("continue", function () {
                    App.appRouter.navigate("");
                    controller.showWall();
                });
            });
        },

        profile: function() {
            this._loadState(this._profile.bind(this));
        },
        _profile: function() {

            var controller = this;

            var model = App.state.myProfiles.getFirst();
            require(["app/views/profile"], function (ProfileView) {
                var profileView = new ProfileView({model: model});
                App.main.show(profileView);

                profileView.on('profile:updated', function(changes) {
                    var deferreds = [];
                    if ('name' in changes) {
                        model.set('name', changes['name']);
                    }
                    if ('intro' in changes) {
                        model.set('intro', changes['intro']);
                    }
                    if('picture' in changes) {
                        var resized = changes['picture'];

                        var deferred = new $.Deferred();
                        deferreds.push(deferred);
                        var picture = DataConvert.dataUriToTypedArray(resized);
                        Dropbox.uploadDropbox("profilePic",  picture['data']).then(Dropbox.shareDropbox).done(function(url) {
                            console.log("URL", url);
                            model.set('pictureUrl', url);
                            deferred.resolve();
                        });
                    }
                    var publicKey = Encryption.getEncodedKeys().publicKey;
                    if (publicKey != model.get("publicKey")) {
                        model.set("publicKey", publicKey);
                    }

                    $.when.apply($, deferreds).done(function() {
                        model.save();
                        controller.showWall();
                        App.appRouter.navigate("");
                        App.vent.trigger("profile:updated", model);
                        controller._publishProfile();
                    });
                });
            });
        }
    });

    return Controller;
});
