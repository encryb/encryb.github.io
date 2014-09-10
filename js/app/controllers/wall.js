define([
    'backbone',
    'marionette',
    'app/app',
    'app/collections/gather/state',
    'app/collections/permissions',
    'app/views/wall',
    'app/views/createPost',
    'app/views/posts',
    'app/views/friend',
    'app/encryption',
    'app/storage',
    'utils/dropbox-client',
    'utils/data-convert'
    ],
function (Backbone, Marionette, App, State, PermissionColl,
          WallView, CreatePostView, PostsView, FriendsView,
          Encryption, Storage, DropboxClient, DataConvert) {


    function startDownload(uri, name) {
        var link = document.createElement("a");
        link.download = name;
        link.href = uri;
        link.click();
    }


    var WallController = Marionette.Controller.extend({

        _checkSettings: function() {
            var keysLoaded = (Encryption.getKeys() != null);
            var dropboxAuthenticated = DropboxClient.isAuthenticated();

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

            var model = App.state.myProfiles.getFirst();
            if (model.get('name').length == 0) {
                this._profile();
                return;
            }

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

            App.vent.on("friend:selected", function(friendModel) {
                require(["app/views/friendsDetails"], function (FriendsDetailsView) {

                    var details = new FriendsDetailsView({model: friendModel});
                    wall.friendsDetails.show(details);
                });
            });
        },

        settings: function(displayAbout) {
            displayAbout = displayAbout || false;
            var controller = this;
            var model = new Backbone.Model();

            var keysLoaded = (Encryption.getKeys() != null);
            model.set("dropboxEnabled", DropboxClient.isAuthenticated());
            model.set("keysLoaded", keysLoaded);
            model.set("displayAbout", displayAbout);

            require(["app/views/setup"], function(SetupView) {

                var setupView = new SetupView({model: model});
                App.main.show(setupView);

                setupView.on("dropbox:login", function () {
                    DropboxClient.authenticate({}, function (error, client) {
                        if (error) {
                            console.log("Dropbox Authentication Error", error);
                        }
                        else {
                            model.set("dropboxEnabled", true);
                        }
                    });

                });
                setupView.on("dropbox:logout", function () {
                    DropboxClient.signOut({}, function () {
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
                setupView.on("keys:saveToDropbox", function () {
                    var keys = Encryption.getEncodedKeys();
                    Storage.uploadDropbox("encryb.keys", JSON.stringify(keys));
                });

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
                        Storage.uploadDropbox("profilePic",  picture['data']).then(Storage.shareDropbox).done(function(url) {
                            console.log("URL", url);
                            model.set('pictureUrl', url);
                            deferred.resolve();
                        });
                    }

                    $.when.apply($, deferreds).done(function() {
                        model.save();
                        controller.showWall();
                        App.appRouter.navigate("");

                    });
                });
            });
        }
    });

    return WallController;
});
