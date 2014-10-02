define([
    'backbone',
    'marionette',
    'app/app',
    'app/collections/gather/state',
    'app/collections/permissions',
    'app/models/friend',
    'app/views/wall',
    'app/views/createPost',
    'app/views/posts',
    'app/views/friend',
    'app/views/headerPanel',
    'app/views/invites',
    'app/encryption',
    'app/services/dropbox',
    'utils/data-convert',
    'utils/random'
    ],
function (Backbone, Marionette, App, State, PermissionColl, FriendModel,
          WallView, CreatePostView, PostsView, FriendsView, HeaderPanelView, InvitesView,
          Encryption, Dropbox, DataConvert, RandomUtil) {


    function startDownload(uri, name) {
        var link = document.createElement("a");
        link.download = name;
        link.href = uri;
        link.click();
    }


    var Controller = Marionette.Controller.extend({

        initialize: function() {
            var controller = this;
            App.vent.on("encryption:updated", function(publicKey) {
                controller._publishProfile();
            });
            App.vent.on("profile:updated", function(profile) {
                controller._publishProfile();
            });
            App.vent.on("invite:send", function(friendId) {
               controller._inviteFriend(friendId);
            });
            App.vent.on("invite:accept", function(inviteModel){
                controller._acceptInvite(inviteModel);
            });
        },

        _acceptInvite: function(inviteModel) {

            var createUser = this._createUser(inviteModel.get("userId"), inviteModel.get("name"),
                inviteModel.get("intro"), inviteModel.get("pictureUrl"), inviteModel.get("publicKey"));

            $.when(createUser).done(function(friendModel) {
                friendModel.set("friendsManifest", inviteModel.get('manifestUrl'));
                friendModel.save();

                App.state.onMyFriendAdded(friendModel);

                require(["appengine!encrybuser"], function (AppEngine) {
                    AppEngine.acceptInvite({id: App.state.myId,
                        inviterId: friendModel.get("userId"),
                        manifestUrl: friendModel.get("manifestUrl")}
                    ).execute(function (resp) {});
                });
                inviteModel.destroy();
            });


        },

        _inviteFriend: function(friendId) {
            var controller = this;
            require(["appengine!encrybuser"], function (AppEngine) {
                AppEngine.getProfile({id: friendId}).execute(function(profile) {
                    if (!profile.publicKey) {
                        return;
                    }
                    var createUser = controller._createUser(friendId, profile.name, profile.intro,
                        profile.pictureUrl, profile.publicKey);
                    $.when(createUser).done(function(friend) {
                        friend.set("invited", true);
                        friend.save();

                        AppEngine.invite({id: App.state.myId,
                            idToInvite: friendId,
                            manifestUrl: friend.get("manifestUrl")}
                        ).execute(function(resp){});
                    });

                });
            });
        },


        _createUser: function(id, name, intro, pictureUrl, publicKey) {

            var deferred = $.Deferred();

            var manifestFile = "manifests" + "/" + RandomUtil.makeId();
            var attrs = {userId: id, name: name, intro: intro, publicKey: publicKey,
                manifestFile: manifestFile, pictureUrl: pictureUrl};

            var newFriend = new FriendModel(attrs);
            App.state.saveManifest(newFriend)
                .then(Dropbox.shareDropbox)
                .then(function(url) {
                    newFriend.set('manifestUrl', url);
                    App.state.myFriends.add(newFriend);
                    newFriend.save();
                    deferred.resolve(newFriend);
                });
            return deferred;
        },

        _checkInvites: function() {
            require(["appengine!encrybuser"], function (AppEngine) {

                var args = {id: App.state.myId};
                AppEngine.getInvites(args).execute(function(resp) {

                    if (!resp.items) {
                        return;
                    }

                    for (var i = 0; i < resp.items.length; i++) {
                        var inviteEntity = resp.items[i];

                       var existingInvites = App.state.myInvites.where({userId: inviteEntity.userId});
                        if (existingInvites.length > 0) {
                            continue;
                        }

                        var invite = {};
                        invite["userId"] = inviteEntity.userId;
                        invite["name"] = inviteEntity.name;
                        invite["pictureUrl"] = inviteEntity.pictureUrl;
                        invite["publicKey"] = inviteEntity.publicKey;
                        invite["manifestUrl"] = inviteEntity.manifestUrl;
                        invite["intro"] = inviteEntity.intro;

                        var confirmInvite = function(inviteId) {
                            return function() {
                                console.log("Confirm Invite", inviteId);
                                AppEngine.inviteReceived({id: inviteId, inviteeId: App.state.myId}).execute(function (resp) {
                                    console.log("AppEngine", resp);
                                });
                            }
                        }(inviteEntity.id);

                        App.state.myInvites.create(invite, {wait: true, success: confirmInvite});
                    }

                    console.log("Invites", resp);
                });
            });
        },
        _checkAccepts: function() {
            if (!App.state.myFriends.findWhere({invited: true})) {
                // no pending invites
                return;
            }

            require(["appengine!encrybuser"], function (AppEngine) {

                var args = {id: App.state.myId};
                AppEngine.getAccepts(args).execute(function(resp) {

                    if (!resp.items) {
                        return;
                    }

                    for (var i = 0; i < resp.items.length; i++) {
                        var acceptEntity = resp.items[i];

                        var friendModel = App.state.myFriends.findWhere({userId: acceptEntity.userId});

                        if (!friendModel.get("invited")) {
                            console.log("Friend already accepted invite", friendModel);
                        }
                        var changes = {invited:false, friendsManifest: acceptEntity.manifestUrl};

                        var confirmAccept = function(acceptId) {
                            return function() {
                                console.log("Confirm Accept", acceptId);
                                AppEngine.acceptReceived({id: acceptId, inviterId: App.state.myId}).execute(function (resp) {
                                    console.log("AppEngine", resp);
                                });
                            }
                        }(acceptEntity.id);


                        friendModel.save(changes, {success: confirmAccept});
                        App.state.onMyFriendAdded(friendModel);
                    }

                });
            });
        },

        _publishProfile: function() {
            require(["appengine!encrybuser"], function (AppEngine) {
                var profile = App.state.myProfiles.getFirst();

                var publicKey = Encryption.getEncodedKeys().publicKey;

                // $TODO this logic needs to be improved
                if (profile.get('name').length < 1 || !publicKey) {
                    return;
                }

                var args = {id: App.state.myId,
                            name: profile.get('name'),
                            intro: profile.get('intro'),
                            pictureUrl: profile.get('pictureUrl'),
                            publicKey: publicKey};
                console.log("Calling set profile", args);
                AppEngine.setProfile(args).execute(function(resp) {
                    profile.set("shared", true);
                    profile.save();
                });


            });

        },

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

            var headerPanel = new HeaderPanelView({model: profile});
            App.headerPanel.show(headerPanel);

            var wall = new WallView();
            App.main.show(wall);

            wall.on("manifests:save", function() {
                App.state.saveManifests();
            });

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


            App.vent.on("friend:selected", function(friendModel) {
                require(["app/views/friendsDetails"], function (FriendsDetailsView) {

                    var friendsOfFriend = App.state.getFriendsOfFriend(friendModel);
                    var details = new FriendsDetailsView({model: friendModel, collection: friendsOfFriend});
                    wall.friendsDetails.show(details);
                });
            });

            if (App.state.initialSyncCompleted) {
                this._checkAccepts();
                this._checkInvites();
            }
            else {
                var controller = this;
                App.state.on("synced:full", function() {
                    controller._checkAccepts();
                    controller._checkInvites();
                });
            }

            if (!profile.get('shared')) {
                this._publishProfile();
            }

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

                    $.when.apply($, deferreds).done(function() {
                        model.save();
                        controller.showWall();
                        App.appRouter.navigate("");
                        App.vent.trigger("profile:updated", model);
                    });
                });
            });
        }
    });

    return Controller;
});
