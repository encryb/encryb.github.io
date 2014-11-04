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
    'app/views/chats',
    'app/encryption',
    'app/services/appengine',
    'app/services/dropbox',
    'utils/collection-paged',
    'utils/data-convert'
    ],
function (Backbone, Marionette, App, FriendAdapter, State, PermissionColl, FriendModel,
          WallView, CreatePostView, PostsView, FriendsView, HeaderPanelView, InvitesView, ChatsView,
          Encryption, AppEngine, Dropbox, CollectionPaged, DataConvert) {


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

        _loadProfile: function(callback) {
            if(!this._checkSettings()) {
                this.settings(true);
                return;
            }
            var controller = this;
            $.when(App.getProfile()).done(function(profile){
                if (profile.get('name').length == 0 || !profile.has('userId') ) {
                    controller._profile(profile);
                    return;
                }
                var publicKey = Encryption.getEncodedKeys().publicKey;
                if (publicKey != profile.get("publicKey")) {
                    controller._profile(profile);
                    return;
                }
                callback(profile);
            });

        },


        _setupState: function(profile) {

            if (!App.state) {
                App.state = new State({profile: profile});
                FriendAdapter.setFriendAdapter(App.state.myFriends);
            }


        },
        showWall: function() {
            this._loadProfile(this._showWall.bind(this));
        },


        _showWall: function (profile) {

            this._setupState(profile);
            App.state.fetchAll();

            var headerPanel = new HeaderPanelView({model: profile});
            App.headerPanel.show(headerPanel);

            var wall = new WallView();
            App.main.show(wall);

            $.when(App.state.fetchAll()).done(function() {
                var paged = new CollectionPaged(null,
                    {limit: 3, collection: App.state.filteredPosts, comparator: App.state.posts.comparator});

                var postsView = new PostsView({
                    collection: paged
                });
                wall.posts.show(postsView);

                $(window).scroll(function() {
                    var postsBottom = $('#posts').prop("scrollHeight") + $("#posts").offset().top;
                    var pageBottom = $(window).scrollTop() + window.innerHeight;
                    if ( postsBottom <= pageBottom + 10) {
                        paged.increaseLimit(5);
                    }
                });
            });



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

            var invitesView = new InvitesView({
                collection: App.state.myInvites
            });
            wall.invites.show(invitesView);



            var chats = new Backbone.Collection();

            wall.listenTo(App.vent, "friend:chat", function(friendModel) {
                var friendChat = chats.findWhere({friend: friendModel});
                if (!friendChat) {
                    var chatLines = App.state.chats[friendModel.get("userId")]
                    var chat = new Backbone.Model({friend: friendModel});
                    chat.set("chatLines", chatLines);
                    chats.add(chat);
                }
            });

            var chatsView = new ChatsView({
                collection: chats
            });
            wall.chats.show(chatsView);



            var showHideInvites = function() {
                if (App.state.myInvites.length == 0) {
                    wall.ui.invitePanel.addClass("hide");
                }
                else {
                    wall.ui.invitePanel.removeClass("hide");
                }
            }

            // hide invites panel if there are no invites
            this.listenTo(App.state.myInvites, "all", showHideInvites);

            wall.listenTo(App.vent, "invite:added", function() {
                wall.glowInvites();
            });
            wall.listenTo(App.vent, "friend:added", function() {
                wall.glowFriends();
            });

            wall.listenTo(App.vent, "chat:submit", function(friend, text) {
                FriendAdapter.sendChat(friend, text);
            });
            wall.listenTo(App.vent, "chat:received", function(friend) {
                var friendChat = chats.findWhere({friend: friend});
                if (!friendChat) {
                    var chatLines = App.state.chats[friend.get("userId")]
                    var chat = new Backbone.Model({friend: friend});
                    chat.set("chatLines", chatLines);
                    chats.add(chat);
                }
            });
            wall.listenTo(App.vent, "chat:confirm", function(friend, time) {
               FriendAdapter.sendReceiveConfirmation(friend, time);
            });

            var showFriend = function(friendModel) {
                require(["app/views/friendsDetails"], function (FriendsDetailsView) {

                    var friendsOfFriend = App.state.getFriendsOfFriend(friendModel);
                    var details = new FriendsDetailsView({model: friendModel,
                        commonFriends: friendsOfFriend.commonFriends, otherFriends: friendsOfFriend.otherFriends});
                    wall.friendsDetails.show(details);
                });
            };

            wall.listenTo(App.vent, "friend:selected", function(friendModel) {
                showFriend(friendModel);
                window.scrollTo(0,0);
            });

            wall.listenTo(App.vent, "friend:unselect", function(){
                wall.friendsDetails.empty();
            });

            wall.listenTo(App.vent, "invite:find", function(friendId) {
                var friendModel = App.state.myFriends.findWhere({userId: friendId});
                if (friendModel) {
                    showFriend(friendModel);
                    return;
                }
                $.when(AppEngine.findProfile(friendId)).done(function(profile){
                    var model = new Backbone.Model();

                    model.set("userId", profile.id);
                    model.set("name", profile.name);
                    model.set("intro", profile.intro);
                    model.set("pictureUrl", profile.pictureUrl);
                    model.set("publicKey", profile.publicKey);

                    require(["app/views/friendsDetails"], function (FriendsDetailsView) {
                        var details = new FriendsDetailsView({model: model, invitePreview: true});
                        wall.friendsDetails.show(details);
                        window.scrollTo(0,0);
                    });
                });
            });

            var controller = this;
            wall.listenTo(App.vent, "invite:send", function(inviteModel) {
                $.when(FriendAdapter.createFriend(inviteModel)).done(function(friendModel) {
                    AppEngine.invite(friendModel);
                    // hide the invite details from the wall
                    wall.friendsDetails.reset();
                    FriendAdapter.updateDatastoreProfile(friendModel);
                });
            });


            wall.listenTo(App.vent, "invite:accept", function(inviteModel){
                $.when(FriendAdapter.createFriend(inviteModel)).done(function(friendModel) {
                    AppEngine.acceptInvite(friendModel);
                    FriendAdapter.updateDatastoreProfile(friendModel);
                    inviteModel.destroy();
                });

            });

            wall.listenTo(App.vent, "friend:unfriend", function(friendModel) {
               FriendAdapter.deleteFriend(friendModel);
            });

            wall.listenTo(App.vent, "post:created", FriendAdapter.saveManifests);
            wall.listenTo(App.vent, "post:deleted", FriendAdapter.saveManifests);
            wall.listenTo(App.vent, "post:liked", FriendAdapter.saveManifests);
            wall.listenTo(App.vent, "comment:created", FriendAdapter.saveManifests);
            wall.listenTo(App.vent, "comment:deleted", FriendAdapter.saveManifests);



            $.when(App.state.fetchAll()).done(function(){
                controller._processAccepts();
                controller._processInvites();
            });

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

                    var attr = {
                        userId: inviteEntity.userId,
                        name: inviteEntity.name,
                        intro: inviteEntity.intro,
                        pictureUrl: inviteEntity.pictureUrl,
                        publicKey: inviteEntity.publicKey,
                        friendsDatastoreId: inviteEntity.datastoreId
                    };

                    var existingInvite = App.state.myInvites.findWhere({userId: inviteEntity.userId});

                    if (existingInvite) {
                        existingInvite.save(attr);
                        console.log("updated existing invite");
                    }
                    else {
                        App.state.myInvites.create(attr, {wait: true});
                        console.log("created new invite");
                    }

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
            this._loadProfile(this._profile.bind(this));
        },
        _profile: function(profile) {

            var controller = this;

            require(["app/views/profile"], function (ProfileView) {
                var model = new Backbone.Model();
                model.set("profile", profile);
                model.set("publicKey", Encryption.getEncodedKeys().publicKey)
                var profileView = new ProfileView({model: model});
                App.main.show(profileView);

                profileView.on("key:edit", function() {
                    controller.settings();
                });

                profileView.on("key:cloudRefresh", function() {
                    $.when(AppEngine.findProfile(Dropbox.client.dropboxUid())).done(function(profile){
                        if(profile.publicKey) {
                            model.set("publicKey", profile.publicKey);
                        }
                        else {
                            model.set("publicKey", "none");
                        }
                    });
                });
                profileView.on("profile:create", function() {
                    AppEngine.createProfile(profile, Dropbox.client.dropboxUid());
                });
                profileView.on('profile:updated', function(changes) {
                    var deferreds = [];
                    if ('name' in changes) {
                        profile.set('name', changes['name']);
                    }
                    if ('intro' in changes) {
                        profile.set('intro', changes['intro']);
                    }
                    if('picture' in changes) {
                        var resized = changes['picture'];

                        var deferred = new $.Deferred();
                        deferreds.push(deferred);
                        var picture = DataConvert.dataUriToTypedArray(resized);
                        Dropbox.uploadDropbox("profilePic",  picture['data']).then(Dropbox.shareDropbox).done(function(url) {
                            console.log("URL", url);
                            profile.set('pictureUrl', url);
                            deferred.resolve();
                        });
                    }
                    var publicKey = Encryption.getEncodedKeys().publicKey;
                    if (publicKey != profile.get("publicKey")) {
                        profile.set("publicKey", publicKey);
                    }

                    $.when.apply($, deferreds).done(function() {
                        var profileChanges = profile.changedAttributes();
                        controller.showWall();
                        App.appRouter.navigate("");

                        if (profileChanges) {
                            controller._setupState(profile);
                            $.when(App.state.fetchAll()).done(function() {
                                FriendAdapter.sendUpdatedProfile(profileChanges);
                                AppEngine.publishProfile(App.state.myId, profile);
                                profile.save();
                            });
                        }

                    });
                });
            });
        }
    });

    return Controller;
});
