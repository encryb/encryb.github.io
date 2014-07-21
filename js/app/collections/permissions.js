define([
    'backbone'
], function(Backbone) {

    var PermissionModel = Backbone.Model.extend({});

    var PermissionCollection = Backbone.Collection.extend({

        model: PermissionModel,

        collections: {},

        initialize: function () {
            //var me = new PermissionModel({id: "me", display: "Just Me"});
            //this.add(me);
            var all = new PermissionModel({id: "all", display: "Everyone"});
            this.add(all);
        },

        addFriends: function (friends) {
            friends.each(function (friend) {
                this.addFriend(friend);
            }, this);
            this.listenTo(friends, 'add', this.addFriend);
            this.listenTo(friends, 'remove', this.removeFriend);
        },

        addFriend: function (friend) {
            var permissions = this;
            $.when(friend.save()).done(function(){
                var permission = new PermissionModel({id: friend.get('id'), display: friend.get('account')});
                permissions.add(permission);
            });
        },

        removeFriend: function (friend) {
            var permission = this.findWhere({id: friend.get('id')});
            this.remove(permission);
        }

    });
    return PermissionCollection;
});