define([
    'jquery',
    'backbone',
    'marionette',
    'app/app',
    'app/encryption',
    'app/services/dropbox',
    'app/remoteManifest',
    'utils/random'
],
function ($, Backbone, Marionette, App, Encryption, Dropbox, RemoteManifest, RandomUtil) {

    var FriendAdapter = {

        manifestCache : {},
        notifyFriendPromises: {},
        notifyMePromises: {},
        outgoingChatPromises: {},

        setFriendAdapter: function(friends) {
            friends.on("add", this.attachFriend.bind(this));
            this.friends = friends;
        },

        createFriend: function (inviteModel) {
            var friendAdapter = this;
            var deferred = $.Deferred();

            var manifestFile = "manifests" + "/" + RandomUtil.makeId();
            var attrs = {
                userId: inviteModel.get("userId"),
                name: inviteModel.get('name'),
                intro: inviteModel.get('intro'),
                publicKey: inviteModel.get('publicKey'),
                manifestFile: manifestFile,
                pictureUrl: inviteModel.get('pictureUrl')};

            if (inviteModel.get('friendsDatastoreId')) {
                attrs['friendsDatastoreId'] = inviteModel.get('friendsDatastoreId');
            }
            else {
                attrs['invite'] = true;
            }

            $.when(Backbone.DropboxDatastore.createSharedDatastore()).then(function (datastore) {
                attrs['myDatastoreId'] = datastore.getId();
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
            var text = Encryption.decryptTextData(textBuffer, Encryption.getKeys().secretKey);
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
                var encText = Encryption.encryptWithEcc(friend.get('publicKey'),  "plain/text", text);
                var encArray = new Uint8Array(encText);
                chats.create({time:time, text: encArray});
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
            if (!friend.get("friendsDatastoreId")) {
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

            this.getManifest(friend, notifyModel.get('manifestUrl'));
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
                        publicKey: Encryption.getEncodedKeys().publicKey,
                        lastUpdated: new Date().getTime()
                    }

                    if(!notifyModel.get("manifestUrl")) {
                        friendAdapter.saveManifest(friend).then(Dropbox.shareDropbox).done(function(url){
                           changes['manifestUrl'] = url;
                            notifyModel.save(changes);
                        });
                    }
                    else {
                        notifyModel.save(changes);
                    }
                }
            );
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
            App.state.myFriends.each(function(friend) {
                setTimeout(function() { FriendAdapter.saveManifest(friend); }, 0); ;
            });
        },

        saveManifest: function(friend) {
            var deferred = $.Deferred();

            var manifest = {};

            manifest['posts'] = App.state.myPosts.toManifest(friend);
            manifest['upvotes'] = App.state.myUpvotes.toJSON();
            manifest['comments'] = App.state.myComments.toJSON();
            manifest['friends'] = App.state.myFriends.toManifest(friend);

            var encText = Encryption.encryptWithEcc(friend.get('publicKey'),  "plain/text", JSON.stringify(manifest), false);
            Dropbox.uploadDropbox(friend.get('manifestFile'), encText).done(function(stats) {
                deferred.resolve(stats);
                FriendAdapter.notifyFriend(friend);

            });


            return deferred;
        },

        getManifest: function(friend, friendsManifest) {

            var friendAdapter = this;

            Dropbox.downloadUrl(friendsManifest).done(function (data) {

                var decryptedData = Encryption.decryptTextData(data, Encryption.getKeys().secretKey);
                var manifest = JSON.parse(decryptedData);

                friendAdapter.updateCollection(friend, manifest);
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
                this.manifestCache[friendId] = manifest;
                for (var i=0; i < manifest.posts.length; i++) {
                    var post = manifest.posts[i];
                    state.addFriendsPost(post, friend);
                }
                if (manifest.hasOwnProperty('upvotes')) {
                    for (var i=0; i< manifest.upvotes.length; i++) {
                        var upvote = manifest.upvotes[i];
                        state.addFriendsUpvote(upvote, friend);
                    }
                }
                if (manifest.hasOwnProperty('comments')) {
                    for (var i=0; i< manifest.comments.length; i++) {
                        var comment = manifest.comments[i];
                        state.addFriendsComment(comment, friend);
                    }
                }
                if (manifest.hasOwnProperty('friends')) {
                    for (var i=0; i< manifest.friends.length; i++) {
                        var friendOfFriend = manifest.friends[i];
                        state.addFriendOfFriend(friendOfFriend, friend);
                    }
                }

            }
        }


    };

    return FriendAdapter;

});