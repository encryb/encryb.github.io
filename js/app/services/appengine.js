define([
    'jquery',
    'backbone',
    'marionette',
    'app/app'
],
function ($, Backbone, Marionette, App) {

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
                AppEngine.invite({
                    id: App.state.myId,
                    password: App.state.myPassword,
                    inviteeId: friendModel.get("userId"),
                    datastoreId: friendModel.get("myDatastoreId")}
                ).execute(function (resp) {
                    if (resp.error) {
                        console.log("invite error", resp);
                        deferred.reject(resp.error);
                        return;
                    }
                    deferred.resolve();
                });
            })
            return deferred;

        },

        acceptInvite: function (friendModel) {
            var deferred = $.Deferred();
            require(["appengine!encrybuser"], function (AppEngine) {
                AppEngine.acceptInvite({
                    id: App.state.myId,
                    password: App.state.myPassword,
                    inviterId: friendModel.get("userId"),
                    datastoreId: friendModel.get("myDatastoreId")}
                ).execute(function (resp) {
                    if (resp.error) {
                        console.log("accept invite error", resp);
                        deferred.reject(resp.error);
                        return;
                    }
                    deferred.resolve();
                });
            });
            return deferred.promise();
        },

        getInvites: function () {
            var deferred = $.Deferred();
            require(["appengine!encrybuser"], function (AppEngine) {
                var args = {id: App.state.myId, password: App.state.myPassword};
                AppEngine.getInvites(args).execute(function (resp) {

                    if (resp.error) {
                        console.log("getInvites error", resp);
                        deferred.reject(resp.error);
                        return;
                    }
                    if (!resp.items) {
                        deferred.resolve([]);
                        return;
                    }

                    deferred.resolve(resp.items);

                    for (var i = 0; i < resp.items.length; i++) {
                        var inviteEntity = resp.items[i];

                        AppEngine.inviteReceived({ id: inviteEntity.userId, password: App.state.myPassword, inviteeId: App.state.myId })
                            .execute(function (resp) {});
                    }

                });
            });
            return deferred;
        },

        getAccepts: function () {

            var deferred = $.Deferred();
            require(["appengine!encrybuser"], function (AppEngine) {

                var args = {id: App.state.myId, password: App.state.myPassword};
                AppEngine.getAccepts(args).execute(function (resp) {

                    if (resp.error) {
                        console.log("getAccepts error", resp);
                        deferred.reject(resp.error);
                    }

                    if (!resp.items) {
                        deferred.resolve([]);
                        return;
                    }

                    deferred.resolve(resp.items);

                    for (var i = 0; i < resp.items.length; i++) {
                        var acceptEntity = resp.items[i];
                        AppEngine.acceptReceived({id: acceptEntity.userId, inviterId: myUserId}).execute(function (resp) {});
                    }

                });
            });
            return deferred;
        },

        createProfile: function(profile) {
            var deferred = $.Deferred();
            require(["appengine!encrybuser"], function (AppEngine) {

                var args = {
                    name: profile.get('name'),
                    intro: profile.get('intro'),
                    pictureUrl: profile.get('pictureUrl'),
                    publicKey: profile.get('publicKey')
                };
                console.log("Calling create profile", args);
                AppEngine.createProfile(args).execute(function (resp) {
                    if (resp.error) {
                        console.log("createProfile error", resp);
                        deferred.reject(resp.error);
                        return;
                    }

                    console.log("Profile created", resp);
                    profile.set("userId", resp.userId);
                    profile.set("password", resp.password);
                    profile.save();
                    deferred.resolve(profile);
                });
            });
            return deferred.promise();
        },

        publishProfile: function (profile) {
            var deferred = $.Deferred();
            require(["appengine!encrybuser"], function (AppEngine) {

                var args = {
                    id: App.state.myId,
                    password: App.state.myPassword,
                    name: profile.get('name'),
                    intro: profile.get('intro'),
                    pictureUrl: profile.get('pictureUrl'),
                    publicKey: profile.get('publicKey')
                };
                AppEngine.setProfile(args).execute(function (resp) {
                    if (resp.error) {
                        console.log("publishProfile error", resp);
                        deferred.reject(resp.error);
                        return;
                    }
                    deferred.resolve();
                });
            });
            return deferred.promise();
        }
    };
    return AppEngineService;
});
