define([
    'backbone'
], function(Backbone) {

    var PermissionModel = Backbone.Model.extend({});

    var PermissionCollection = Backbone.Collection.extend({

        model: PermissionModel,

        collections: {},

        initialize: function () {
            var me = new PermissionModel({id: "me", display: "Just Me"});
            this.add(me);
            var all = new PermissionModel({id: "all", display: "Everyone"});
            this.add(all);
        },

        addFriends: function (friends) {
            friends.each(function (friend) {
                this.addFriend(friend);
            }, this);
            this.listenTo(friends, 'add', this.addFriend);
        },

        addFriend: function (friend) {
            var permission = new PermissionModel({id: friend.get('id'), display: friend.get('account')});
            this.add(permission);
        }
    });
    return PermissionCollection;
});