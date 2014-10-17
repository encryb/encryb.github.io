define([
    'jquery',
    'backbone',
    'marionette',
    'app/app',
    'app/encryption'
],
function ($, Backbone, Marionette, App, Encryption) {

    var AppEngineService = {

        findProfile: function(friendId) {
            var deferred = $.Deferred();
            require(["appengine!encrybuser"], function (AppEngine) {
                AppEngine.getProfile({id: friendId}).execute(function (profile) {
                    if (profile.error || !profile.publicKey) {
                        deferred.reject();
                        return;
                    }
                    deferred.resolve(profile);
                });
            });
            return deferred;
        },

        invite: function(friendModel) {
            var deferred = $.Deferred();
            require(["appengine!encrybuser"], function (AppEngine) {
                AppEngine.invite({id: App.state.myId,
                    inviteeId: friendModel.get("userId"),
                    datastoreId: friendModel.get("myDatastoreId")}
                ).execute(function (resp) {
                    if (resp.error) {
                        console.log("ERROR", resp);
                        deferred.reject();
                        return;
                    }
                    deferred.resolve();
                });
            })
            return deferred;

        },

        acceptInvite: function (friendModel) {

            require(["appengine!encrybuser"], function (AppEngine) {
                AppEngine.acceptInvite({id: App.state.myId,
                        inviterId: friendModel.get("userId"),
                        datastoreId: friendModel.get("myDatastoreId")}
                ).execute(function (resp) {});
            });
        },


        getInvites: function () {
            var deferred = $.Deferred();
            require(["appengine!encrybuser"], function (AppEngine) {
                var args = {id: App.state.myId};
                AppEngine.getInvites(args).execute(function (resp) {

                    if (resp.error) {
                        deferred.reject();
                        return;
                    }
                    if (!resp.items) {
                        deferred.resolve([]);
                        return;
                    }

                    deferred.resolve(resp.items);

                    for (var i = 0; i < resp.items.length; i++) {
                        var inviteEntity = resp.items[i];

                        AppEngine.inviteReceived({id: inviteEntity.userId, inviteeId: App.state.myId}).execute(function (resp) {
                        });
                    }

                });
            });
            return deferred;
        },

        getAccepts: function () {

            var deferred = $.Deferred();
            require(["appengine!encrybuser"], function (AppEngine) {

                var args = {id: App.state.myId};
                AppEngine.getAccepts(args).execute(function (resp) {

                    if (resp.error) {
                        deferred.reject();
                    }

                    if (!resp.items) {
                        deferred.resolve([]);
                        return;
                    }

                    deferred.resolve(resp.items);

                    for (var i = 0; i < resp.items.length; i++) {
                        var acceptEntity = resp.items[i];
                        AppEngine.acceptReceived({id: acceptEntity.userId, inviterId: App.state.myId}).execute(function (resp) {});
                    }

                });
            });
            return deferred;
        },

        publishProfile: function () {
            require(["appengine!encrybuser"], function (AppEngine) {
                $.when(App.getProfile()).done(function(profile){

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
                    AppEngine.setProfile(args).execute(function (resp) {
                        profile.set("shared", true);
                        profile.save();
                    });

                });


            });

        }
    };
    return AppEngineService;
});
