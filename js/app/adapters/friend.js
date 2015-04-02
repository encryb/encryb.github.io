define([
    'jquery',
    'backbone',
    'marionette',
    'app/app',
    'app/encryption/async',
    'app/encryption/keys',
    'app/services/dropbox',
    'app/remoteManifest',
    'utils/misc'
],
function ($, Backbone, Marionette, App, EncryptionAsync, Keys, Dropbox, RemoteManifest, MiscUtils) {

    var FriendAdapter = {

        manifestCache : {},
        notifyFriendPromises: {},
        notifyMePromises: {},
        outgoingChatPromises: {},

        addFriendsList: function(friends) {
            friends.on("add", this.attachFriend.bind(this));
            this.friends = friends;
        },

        createFriend: function (inviteModel) {
            var friendAdapter = this;
            var deferred = $.Deferred();

            var manifestFile = "manifests" + "/" + MiscUtils.makeId();
            var attrs = {
                userId: inviteModel.get("userId"),
                name: inviteModel.get("name"),
                intro: inviteModel.get("intro"),
                publicKey: inviteModel.get("publicKey"),
                manifestFile: manifestFile,
                pictureUrl: inviteModel.get("pictureUrl")};

            if (inviteModel.get("friendsDatastoreId")) {
                attrs["friendsDatastoreId"] = inviteModel.get("friendsDatastoreId");
            }
            else {
                attrs["invite"] = true;
            }

            $.when(Backbone.DropboxDatastore.createSharedDatastore()).then(function (datastore) {
                attrs["myDatastoreId"] = datastore.getId();
                friendAdapter.friends.create(attrs, {
                    success: function (model) {
                        deferred.resolve(model);
                    }
                });

            });
            return deferred;
        },
        // TODO: destroy promises
        deleteFriend: function(friendModel) {
            var manifestFile = friendModel.get("manifestFile");
            Backbone.DropboxDatastore.deleteDatastore(friendModel.get("myDatastoreId"));
            if (friendModel.has("friendsDatastoreId")) {
                Backbone.DropboxDatastore.deleteDatastore(friendModel.get("friendsDatastoreId"));
            }
            Dropbox.remove(manifestFile);
            this.removeCollection(friendModel);
            friendModel.destroy();
        },
        sendUpdatedProfile: function(changes) {
            var friendAdapter = this;
            App.state.myFriends.each(function(friend) {
                $.when(friendAdapter._getModelUsedToNotifyFriend(friend)).done(function(notifyModel){
                    notifyModel.save(changes);
                });
            });
        },

        setupIncomingChatCollection: function(friend){
            var friendId = friend.get("userId");

            var ChatCollection = Backbone.Collection.extend({
                dropboxDatastore: new Backbone.DropboxDatastore('Chat', {
                    datastoreId: friend.get("friendsDatastoreId")
                }),

                initialize: function() {
                    this.dropboxDatastore.syncCollection(this);
                }
            });


            App.state.chats[friendId] = new Backbone.Collection();

            $.when(this._getModelUsedToNotifyFriend(friend)).done(_.bind(function(notifyModel) {

                var chat = new ChatCollection();
                chat.on("add", _.bind(function(chatLine){
                    if (notifyModel.get("chatReceived") < chatLine.get("time")) {
                        this._addChatLine(chatLine, friend);
                    }
                },this));
                chat.fetch();
            }, this));

        },


        sendReceiveConfirmation: function(friend, time) {
            $.when(this._getModelUsedToNotifyFriend(friend)).done(function(notifyModel) {
                notifyModel.set("chatReceived", time);
                notifyModel.save();
            });
        },

        _addChatLine : function(chatLine, friend) {
            //send trigger to controller to open a chat window if need be
            App.vent.trigger("chat:received", friend);
            var textBuffer = chatLine.get("text").buffer;
            var key = {secretKey: Keys.getEncodedKeys().secretKey};
            $.when(EncryptionAsync.decryptText(key, textBuffer)).done(function(text){
                var collection = App.state.chats[friend.get("userId")];
                var lastChat = collection.last();

                if (lastChat && !lastChat.get("isMine") &&
                    (chatLine.get("time") - lastChat.get("time") < 30000)) {
                    lastChat.set("text", lastChat.get("text") + "\n" + text);
                }
                else {
                    var newChat = new Backbone.Model({time: chatLine.get("time"), text: text});
                    collection.add(newChat);
                }
            });
        },

        clearReceivedChats: function(friend, receivedTime) {
            $.when(this._getOutgoingChatCollection(friend)).done(function(chats) {
                var chatLinesToDelete = [];
                chats.each(function(chatLine) {
                    if (chatLine.get("time") <= receivedTime) {
                        chatLinesToDelete.push(chatLine);
                    }
                });
                for(var i=0; i<chatLinesToDelete.length; i++) {
                    var chatLine = chatLinesToDelete[i];
                    chatLine.destroy();
                }
            });
        },
        _getOutgoingChatCollection: function(friend) {
            var friendId = friend.get("userId");
            if (this.outgoingChatPromises.hasOwnProperty(friendId)) {
                return this.outgoingChatPromises[friendId];
            }
            var deferred = $.Deferred();
            this.outgoingChatPromises[friendId] = deferred;

            var ChatCollection = Backbone.Collection.extend({
                dropboxDatastore: new Backbone.DropboxDatastore('Chat', {
                    datastoreId: friend.get("myDatastoreId")
                }),

                initialize: function() {
                    this.dropboxDatastore.syncCollection(this);
                }
            });
            var chat = new ChatCollection();
            chat.fetch({
                success: function (collection, response, options) {
                    deferred.resolve(collection);
                },
                error: function(collection, response, options) {
                    console.log("Fetch failed", friend, response);
                    deferred.reject();
                }
            });
            return deferred;
        },

        sendChat: function(friend, text) {
            var time = new Date().getTime();
            $.when(this._getOutgoingChatCollection(friend)).done(function(chats){
                var key = {publicKey: friend.get("publicKey")};
                $.when(EncryptionAsync.encrypt(key, "plain/json", text, false)).done(function(encText) {
                    var encArray = new Uint8Array(encText);
                    chats.create({time: time, text: encArray});
                });
            });
            var chat = new Backbone.Model({isMine: true, time:time, text: text});

            var collection = App.state.chats[friend.get("userId")];
            var lastChat = collection.last();
            if (lastChat && lastChat.get("isMine") &&
                (time - lastChat.get("time") < 30000)) {
                lastChat.set("text", lastChat.get("text") + "\n" + text);
            }
            else {
                collection.add(chat);
            }
        },


        _getModelUsedToNotifyMe: function(friend) {
            var friendId = friend.get("userId");
            if (this.notifyMePromises.hasOwnProperty(friendId)) {
                return this.notifyMePromises[friendId];
            }
            var deferred = $.Deferred();
            this.notifyMePromises[friendId] = deferred;

            var SharedCollection = Backbone.Collection.extend({
                dropboxDatastore: new Backbone.DropboxDatastore('Manifest', {
                    datastoreId: friend.get("friendsDatastoreId")
                }),

                initialize: function() {
                    this.dropboxDatastore.syncCollection(this);
                }
            });
            var shared = new SharedCollection();
            shared.fetch({
                success: function (collection, response, options) {
                    var model = collection.first();
                    deferred.resolve(model);
                },
                error: function(collection, response, options) {
                    console.log("Fetch failed", friend, response);
                    deferred.reject();
                }
            });
            return deferred;

        },
        attachFriend: function(friend) {
            var friendAdapter = this;

            if (!friend.has("friendsDatastoreId")) {
                friend.once("change:friendsDatastoreId", function (model, options) {
                    friendAdapter.attachFriend(friend);
                });
                return;
            }
            $.when(this._getModelUsedToNotifyMe(friend)).done(function(notifyModel) {
                friendAdapter.syncFriendsFeed(friend, notifyModel);
                notifyModel.on("change:lastUpdated", function(model, options) {
                   friendAdapter.syncFriendsFeed(friend, model);
                });
                notifyModel.on("change:name", function(model, options) {
                    friend.save({name : model.get("name")});
                });
                notifyModel.on("change:intro", function(model, options) {
                    friend.save({intro : model.get("intro")});
                });
                notifyModel.on("change:pictureUrl", function(model, options) {
                    friend.save({pictureUrl : model.get("pictureUrl")});
                });
                notifyModel.on("change:chatReceived", function(model, options) {
                   friendAdapter.clearReceivedChats(friend, model.get("chatReceived"));
                });

            });
            this.setupIncomingChatCollection(friend);
        },


        syncFriendsFeed: function(friend, notifyModel) {

            friend.set("name", notifyModel.get("name"));
            friend.set("intro", notifyModel.get("intro"));
            friend.set("pictureUrl", notifyModel.get("pictureUrl"));
            friend.set("publicKey", notifyModel.get("publicKey"));
            friend.save();

            this.getManifest(friend, notifyModel.get("manifestUrl"));
        },

        notifyFriend: function(friend) {
            $.when(this._getModelUsedToNotifyFriend(friend)).done(
                function(notifyModel) {
                    notifyModel.set("lastUpdated", new Date().getTime());
                    notifyModel.save();
                }
            );
        },

        updateDatastoreProfile: function(friend) {
            var friendAdapter = this;
            $.when(this._getModelUsedToNotifyFriend(friend), App.getProfile()).done(
                function(notifyModel, profile) {
                    var changes = {
                        name: profile.get('name'),
                        intro: profile.get('intro'),
                        pictureUrl: profile.get('pictureUrl'),
                        publicKey: Keys.getEncodedKeys().publicKey
                    };

                    $.when(friendAdapter.saveManifest(friend))
                        .then(friendAdapter.shareManifest.bind(null, notifyModel))
                        .done(function() {
                            changes["lastUpdated"] = new Date().getTime();
                            notifyModel.save(changes);
                        });
                }
            );
        },

        shareManifest: function(notifyModel, manifestStats, archiveStats) {
            var deferred = $.Deferred();

            var tasks = [];
            if (manifestStats && !notifyModel.has("manifestUrl")) {
                var shareManifest = Dropbox.share(manifestStats).then(function (url) {
                    notifyModel.set("manifestUrl", url);
                });
                tasks.push(shareManifest);
            }

            if (archiveStats && !notifyModel.has("archiveUrl")) {
                var shareArchive = Dropbox.share(archiveStats).then(function (url) {
                    notifyModel.set("archiveUrl", url);
                });
                tasks.push(shareArchive);
            }

            $.when.apply($, tasks).done(function(){
                deferred.resolve(tasks.length > 0);
            });

            return deferred.promise();

        },


        _getModelUsedToNotifyFriend: function(friend) {
            var friendId = friend.get("userId");
            if (this.notifyFriendPromises.hasOwnProperty(friendId)) {
                return this.notifyFriendPromises[friendId];
            }


            var deferred = $.Deferred();
            this.notifyFriendPromises[friendId] = deferred;
            var SharedCollection = Backbone.Collection.extend({
                dropboxDatastore: new Backbone.DropboxDatastore('Manifest', {
                    datastoreId: friend.get("myDatastoreId")
                })
            });
            var shared = new SharedCollection();
            shared.fetch({success: function (collection, response, options) {
                var model = collection.first();
                if (!model) {
                    model = new Backbone.Model();
                    collection.add(model);
                }
                deferred.resolve(model);
            }});
            return deferred;

        },

        saveManifests: function() {
            var friendAdapter = this;
            App.state.myFriends.each(function(friend) {
                $.when(friendAdapter._getModelUsedToNotifyFriend(friend)).done(function(notifyModel){
                    friendAdapter.saveManifest(friend)
                        .then(friendAdapter.shareManifest.bind(null, notifyModel))
                        .done(function() {
                            notifyModel.set("lastUpdated", new Date().getTime());
                            notifyModel.save();
                        });
                });
            });
        },

        saveManifest: function(friend) {
            var deferred = $.Deferred();

            var manifest = App.state.toManifest(friend);

            var currentManifest = manifest.manifest;
            var archiveManifest = manifest.archive;

            var key = {publicKey: friend.get("publicKey")};

            var currentDeferred = $.Deferred();
            $.when(EncryptionAsync.encrypt(key, "plain/json", JSON.stringify(currentManifest), false)).done(function(encText){
                Dropbox.upload(friend.get("manifestFile"), encText).done(function (stats) {
                    currentDeferred.resolve(stats);
                });
            });

            var archiveDeferred = null;
            if (manifest.archive) {
                archiveDeferred = $.Deferred();
                $.when(EncryptionAsync.encrypt(key, "plain/json", JSON.stringify(archiveManifest), false)).done(function (encText) {
                    Dropbox.upload(friend.get("archiveFile"), encText).done(function (stats) {
                        archiveDeferred.resolve(stats);
                    });
                });
            }

            $.when(currentDeferred, archiveDeferred).done(function(currentStats, archiveStats) {
                deferred.resolve(currentStats, archiveStats);
            });

            return deferred;
        },

        getManifest: function(friend, friendsManifest) {

            var friendAdapter = this;
            Dropbox.downloadUrl(friendsManifest)
                .fail (function(error) {
                    friend.set("error", "Failed to download " + friend.escape("name") + "'s manifest: " + error);
                })
                .done(function (data) {
                    var key = {secretKey: Keys.getEncodedKeys().secretKey};
                    $.when(EncryptionAsync.decryptText(key, data)).done(function(decryptedData){
                            try {
                                var manifest = JSON.parse(decryptedData);
                                friendAdapter.updateCollection(friend, manifest);
                            }
                            catch (e) {
                                friend.set("error", "Failed to parse " + friend.escape("name") + "'s manifest: " + e.message);
                            }
                        })
                        .fail (function(error) {
                            friend.set("error", "Failed to decode " + friend.escape("name") + "'s manifest: " + error);
                        });

            });
        },

        removeCollection: function(friend) {

            var manifest = {};
            manifest['posts'] = [];
            manifest['upvotes'] = [];
            manifest['comments'] = [];
            manifest['friends'] = [];

            this.updateCollection(friend, manifest);
        },

        updateCollection: function(friend, manifest) {
            var state  = App.state;

            var friendId = friend.get("userId");
            if (this.manifestCache.hasOwnProperty(friendId)) {
                var oldManifest = this.manifestCache[friendId];

                RemoteManifest.compare(oldManifest, manifest, function(key, action, item) {
                    if (key == "posts") {
                        if (action == "add") {
                            state.addFriendsPost(item, friend);
                        }
                        else {
                            state.removeFriendsPost(item, friend);
                        }
                    }
                    else if (key == "upvotes"){
                        if (action == "add") {
                            state.addFriendsUpvote(item, friend);
                        }
                        else {
                            state.removeFriendsUpvote(item, friend);
                        }
                    }
                    else if (key == "comments") {
                        if (action == "add") {
                            state.addFriendsComment(item, friend);
                        }
                        else {
                            state.removeFriendsComment(item, friend);
                        }
                    }
                    else if (key == "friends") {
                        if (action == "add") {
                            state.addFriendOfFriend(item, friend);
                        }
                        else{
                            state.removeFriendOfFriend(item, friend);
                        }
                    }
                });
            }
            else {
                var i;
                this.manifestCache[friendId] = manifest;
                for (i=0; i < manifest.posts.length; i++) {
                    var post = manifest.posts[i];
                    state.addFriendsPost(post, friend);
                }
                if (manifest.hasOwnProperty('upvotes')) {
                    for (i=0; i< manifest.upvotes.length; i++) {
                        var upvote = manifest.upvotes[i];
                        state.addFriendsUpvote(upvote, friend);
                    }
                }
                if (manifest.hasOwnProperty('comments')) {
                    for (i=0; i< manifest.comments.length; i++) {
                        var comment = manifest.comments[i];
                        state.addFriendsComment(comment, friend);
                    }
                }
                if (manifest.hasOwnProperty('friends')) {
                    for (i=0; i< manifest.friends.length; i++) {
                        var friendOfFriend = manifest.friends[i];
                        state.addFriendOfFriend(friendOfFriend, friend);
                    }
                }

            }
        }
    };

    return FriendAdapter;

});