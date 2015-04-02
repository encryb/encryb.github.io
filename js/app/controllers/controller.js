define([
    'backbone',
    'marionette',
    'bootstrap',
    'bootbox',
    'app/app',
    'app/adapters/friend',
    'app/adapters/post',
    'app/collections/gather/state',
    'app/collections/permissions',
    'app/models/friend',
    'app/models/post',
    'app/views/wall',
    'app/views/createPost',
    'app/views/editPost',
    'app/views/posts',
    'app/views/friend',
    'app/views/headerPanel',
    'app/views/invites',
    'app/views/chats',
    'app/encryption/sync',
    'app/encryption/keys',
    'app/services/appengine',
    'app/services/dropbox',
    'utils/data-convert'
    ],
function (Backbone, Marionette, Bootstrap, Bootbox, App, FriendAdapter, PostAdapter, State, PermissionColl, FriendModel, PostModel,
          WallView, CreatePostView, EditPostView, PostsView, FriendsView, HeaderPanelView, InvitesView, ChatsView,
          Encryption, Keys, AppEngine, Dropbox, DataConvert) {


    function startDownload(uri, name) {
        var link = document.getElementById("downloadLink");

        link.download = name;
        link.href = uri;
        link.click();
    }


    var Controller = Marionette.Controller.extend({

        _checkSettings: function() {
            var keysLoaded = (Keys.getKeys() != null);
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
            $.when(App.getProfile()).done(function(profile){
                if (profile.get('name').length == 0 || !profile.has('userId') ) {
                    this._profile(profile);
                    return;
                }
                var publicKey = Keys.getEncodedKeys().publicKey;
                if (publicKey != profile.get("publicKey")) {
                    this._profile(profile);
                    return;
                }
                callback(profile);
            }.bind(this));
        },


        _setupState: function(profile) {
            if (!App.state) {
                App.state = new State({profile: profile});
                FriendAdapter.addFriendsList(App.state.myFriends);
            }
        },
        showWall: function () {
            App.clearError();
            this._loadProfile(this._showWall.bind(this));
        },


        _openChatWindow: function(chats, friend) {
            var friendChat = chats.findWhere({friend: friend});
            if (!friendChat) {
                var chatLines = App.state.chats[friend.get("userId")]
                var chat = new Backbone.Model({friend: friend});
                chat.set("chatLines", chatLines);
                chats.add(chat);
            }
        },

        _showWall: function (profile) {

            this._setupState(profile);

            var headerPanel = new HeaderPanelView({model: profile});
            App.headerPanel.show(headerPanel);

            var wall = new WallView();
            App.main.show(wall);

            $.when(App.state.fetchAll()).done(function() {
                var postsView = new PostsView({
                    collection: App.state.posts
                });

                App.vent.on("friend:selected", function (friendModel) {
                    postsView.filter = function (child, index, collection) {
                        return (child.get("userId") == friendModel.get("userId"));                     
                    };
                    postsView.render();
                });
                App.vent.on("friend:unselect", function () {
                    postsView.filter = null;
                    postsView.render();
                });

                wall.posts.show(postsView);
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

            // user clicked on chat icon in friends list
            wall.listenTo(App.vent, "friend:chat", function(friendModel) {
                this._openChatWindow(chats, friendModel);
            }.bind(this));

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
            };

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
            // Chat was received by friend adapter
            wall.listenTo(App.vent, "chat:received", function(friendModel) {
                this._openChatWindow(chats, friendModel);
            }.bind(this));
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

            var friendUnselect = function () {
                wall.friendsDetails.empty();
                wall.posts.$el.show();
                wall.createPost.$el.show();
            }
            wall.listenTo(App.vent, "friend:unselect", function(){
                friendUnselect();
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
                        wall.posts.$el.hide();
                        wall.createPost.$el.hide();
                        window.scrollTo(0,0);
                    });
                });
            });

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
                friendUnselect();
            });

            wall.listenTo(App.vent, "post:created", function(postMeta, contentList, uiNotifyDeferred) {
                var postModel = new PostModel(postMeta);
                postModel.contentList = contentList;
                var upload = PostAdapter.uploadPost(postModel);
                $.when(upload)
                    .fail(function (error) {
                        App.showError(error);
                        uiNotifyDeferred.reject();
                    })
                    .done(function() {
                        var jsonContent = PostAdapter.removeNonPersistentFields(contentList);
                        postModel.set("content", jsonContent);

                        $.when(App.state.createMyPost(postModel, contentList)).done(function(){
                            FriendAdapter.saveManifests();
                            uiNotifyDeferred.resolve();
                    });
                });
            });

            var editPostDialog;
            var editPostView;
            var editPostModel;
            var editPostRegion;
            wall.listenTo(App.vent, "post:edit", function(post) {
                editPostDialog = Bootbox.dialog({
                    message: "<div id='bootbox'></div>",
                    closeButton: false
                });
                editPostRegion = new Backbone.Marionette.Region({
                    el: "#bootbox"
                });
                editPostView = new EditPostView({
                    model: post.get("post"),
                    permissions: perms
                });
                editPostRegion.show(editPostView);
                editPostModel = post;
            });

            wall.listenTo(App.vent, "post:edit:canceled", function() {
                editPostRegion.reset();
                editPostDialog.modal("hide");
            });
            // addedContent is an array of JSON objects
            // removedContent is an array of Backbone Models
            wall.listenTo(App.vent, "post:edited", function(changes, addedContent, removedContent){
                var persistModel = editPostModel.postModel;


                var onEditSuccess = function() {
                    // update display model
                    editPostModel.updateDisplayModel(changes, addedContent, removedContent);

                    // content is array of JSON objects
                    var currentContent = persistModel.get("content");

                    var contentAfterRemoval = $.grep(currentContent, function(searchContent) {
                        // only return values that are not part of removedContent collection
                        var foundRemoval = $.grep(removedContent, function(searchRemoved) {
                            if (searchContent.number == searchRemoved.get("number")) {
                                return true;
                            }
                        });
                        if (foundRemoval.length == 0) {
                            return true;
                        }
                    });

                    var updatedContent = contentAfterRemoval.concat(PostAdapter.removeNonPersistentFields(addedContent));
                    changes["content"] = updatedContent;


                    persistModel.save(changes, {success: function() {
                        FriendAdapter.saveManifests();
                        editPostView.destroy();
                        editPostDialog.modal("hide");
                    }});
                }.bind(this);
                // update persisted model
                $.when(PostAdapter.updatePost(persistModel, changes, addedContent, removedContent))
                    .done(onEditSuccess);

            });
            wall.listenTo(App.vent, "post:deleted", function(post) {
                PostAdapter.deletePost(post);
                post.deletePost();
                FriendAdapter.saveManifests();
            });
            wall.listenTo(App.vent, "post:liked", function(postId) {
                App.state.myUpvotes.toggleUpvote(postId);
                FriendAdapter.saveManifests();
            });
            wall.listenTo(App.vent, "comment:created", function(postId, comment) {
                App.state.myComments.addComment(postId, comment['text'], comment['date']);
                FriendAdapter.saveManifests();
            });
            wall.listenTo(App.vent, "comment:deleted", function(commentId) {
                var comment = App.state.myComments.findWhere({id: commentId});
                if (comment) {
                    comment.destroy();
                    FriendAdapter.saveManifests();
                }
            });
            wall.listenTo(App.vent, "file:download", function(content){
                $.when(content.getData()).done(function(data){
                    startDownload(data, content.get("filename"));
                });
            });

            $.when(App.state.fetchAll()).done(function(){
                this._processAccepts();
                this._processInvites();

                // If there are no friends, expand friends panel to show add friend element
                if (App.state.myFriends.size() === 0) {
                    $("#collapseFriends").removeClass("collapse");
                }

            }.bind(this));

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

        settings: function (displayAbout) {
            App.clearError();
            displayAbout = displayAbout || false;
            var controller = this;
            var model = new Backbone.Model();

            var keysLoaded = (Keys.getKeys() != null);
            model.set("dropboxEnabled", Dropbox.client.isAuthenticated());
            model.set("dropboxInfo", false);
            model.set("keysLoaded", keysLoaded);
            model.set("displayAbout", displayAbout);

            require(["app/views/setup"], function(SetupView) {

                var setupView = new SetupView({model: model});
                App.main.show(setupView);

                var getInfo = function (_model) {
                    $.when(Dropbox.getInfo()).done(function (info) {
                        _model.set("dropboxInfo", info);
                    });
                };

                if (model.get("dropboxEnabled")) {
                    getInfo(model);
                }

                setupView.on("dropbox:login", function () {
                    Dropbox.client.authenticate({}, function (error, client) {
                        if (error) {
                            console.log("Dropbox Authentication Error", error);
                        }
                        else {
                            model.set("dropboxEnabled", true);
                            getInfo(model);
                        }
                    });

                });
                setupView.on("dropbox:logout", function () {
                    Dropbox.client.signOut({}, function () {
                        window.location.href = "https://www.dropbox.com/logout";
                        model.set("dropboxEnabled", false);
                        model.set("dropboxInfo", false);
                    });
                });

                setupView.on("keys:create", function () {
                    Keys.createKeys();
                    model.set("keysLoaded", true);
                });

                setupView.on("keys:remove", function () {
                    Keys.removeKeys();
                    model.set("keysLoaded", false);
                });
                setupView.on("keys:download", function () {
                    var keys = Keys.getEncodedKeys();
                    var uri = "data:text/javascript;base64," + window.btoa(JSON.stringify(keys));
                    startDownload(uri, "encryb.keys");
                });
                setupView.on("keys:upload", function (keysString) {
                    var keys = JSON.parse(keysString);
                    Keys.saveKeys(keys['secretKey'], keys['publicKey'], keys['databaseKey']);
                    model.set("keysLoaded", true);
                });

                var saveKeysToDropbox = function(password) {
                    var keys = Keys.getEncodedKeys();
                    var jsonKeys = JSON.stringify(keys);
                    var encKeys = Encryption.encrypt(password, "text/keys", jsonKeys, false);
                    Dropbox.upload("encryb.keys", encKeys);
                }


                setupView.on("keys:saveToDropbox", function (password) {
                    saveKeysToDropbox(password);
                });

                setupView.on("keys:loadFromDropbox", function(password){
                    $.when(Dropbox.download("encryb.keys")).done(function(encKeys){
                        var jsonKeys = Encryption.decryptText(encKeys, password);
                        var keys = JSON.parse(jsonKeys);
                        var forceSave = false;

                        // $LEGACY
                        if (!keys.hasOwnProperty('databaseKey')) {
                            keys.databaseKey = JSON.stringify(Keys.generateDatabaseKey());
                            forceSave = true;
                        }

                        Keys.saveKeys(keys.secretKey, keys.publicKey, keys.databaseKey);
                        if (forceSave) {
                            saveKeysToDropbox(password);
                        }

                        model.set("keysLoaded", true);
                    });
                })

                setupView.on("continue", function () {
                    App.appRouter.navigate("");
                    controller.showWall();
                });
            });
        },

        profile: function () {
            App.clearError();
            this._loadProfile(this._profile.bind(this));
        },
        _profile: function(profile) {

            var controller = this;

            require(["app/views/profile"], function (ProfileView) {
                var model = new Backbone.Model();
                model.set("profile", profile);
                model.set("publicKey", Keys.getEncodedKeys().publicKey);
                var profileView = new ProfileView({model: model});
                App.main.show(profileView);

                profileView.on("key:edit", function() {
                    controller.settings();
                });

                var changeProfile = function(changes, _profile) {
                    var deferreds = [];
                    if ('name' in changes) {
                        _profile.set('name', changes['name']);
                    }
                    if ('intro' in changes) {
                        _profile.set('intro', changes['intro']);
                    }
                    if('picture' in changes) {
                        var resized = changes['picture'];

                        var deferred = new $.Deferred();
                        deferreds.push(deferred);
                        var picture = DataConvert.dataUriToTypedArray(resized);
                        var pictureId = (new Date).getTime();
                        Dropbox.upload(Dropbox.getPath("profilePic", pictureId), picture["data"])
                            .then(Dropbox.share)
                            .done(function (url) {
                                // remove previous profile picture
                                if (_profile.has("pictureId")) {
                                    Dropbox.remove(Dropbox.getPath("profilePic", _profile.get("pictureId")));
                                }
                                _profile.set("pictureUrl", url);
                                _profile.set("pictureId", pictureId);
                                deferred.resolve();
                            });
                    }
                    var publicKey = Keys.getEncodedKeys().publicKey;
                    if (_profile.get("publicKey") != publicKey) {
                        _profile.set("publicKey", publicKey);
                    }

                    return deferreds;
                }

                profileView.on("profile:create", function(changes) {

                    var deferreds = changeProfile(changes, profile);
                    $.when.apply($, deferreds).done(function() {
                        $.when(AppEngine.createProfile(profile)).done(function() {
                            controller.showWall();
                            App.appRouter.navigate("");
                        });
                    });
                });

                profileView.on('profile:updated', function(changes, errorCallback) {

                    var changeProfileFail = function () {
                        App.showError("Could not upload profile picture");
                        errorCallback();
                    };
                    var publishFail = function () {
                        App.showError("Could not publish updated profile");
                        errorCallback();
                    };
                    var saveFail = function () {
                        App.showError("Could not save updated profile");
                        errorCallback();
                    }
                
                    var deferreds = changeProfile(changes, profile);
                    $.when.apply($, deferreds).fail(changeProfileFail).done(function () {
                        var deferred = $.Deferred();
                        var profileChanges = profile.changedAttributes();
                        console.log("profileChanges", profileChanges);
                        if (!profileChanges) {
                            controller.showWall();
                            App.appRouter.navigate("");
                            return;
                        }

                        controller._setupState(profile);
                        $.when(App.state.fetchAll()).done(function () {
                            FriendAdapter.sendUpdatedProfile(profileChanges);
                            $.when(AppEngine.publishProfile(profile)).fail(publishFail).done(function () {
                                profile.save(null, {
                                    success: function (model, response) {
                                        controller.showWall();
                                        App.appRouter.navigate("");
                                    },
                                    error: saveFail
                                });
                            });
                        });
                    });   
                });

                profileView.on("profile:cancel", function () {
                    controller.showWall();
                    App.appRouter.navigate("");
                });
            });
        }
    });

    return Controller;
});
