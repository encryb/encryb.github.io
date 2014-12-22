define([
    'backbone'
], function(Backbone) {

    var PermissionCollection = Backbone.Collection.extend({

        model: Backbone.Model,

        collections: {},

        initialize: function () {
            //var me = new PermissionModel({id: "me", display: "Just Me"});
            //this.add(me);
            var all = new Backbone.Model({id: "all", display: "Everyone"});
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
            if (friend.has("id")){
                this._addFriend(friend);
            }
            else {
                $.when(friend.save()).done(function () {
                    this._addFriend(friend);
                }.bind(this));
            }
        },

        _addFriend: function (friend) {
            var permission = new Backbone.Model({id: friend.get('id'), display: friend.get('name')});
            this.add(permission);
        },

        removeFriend: function (friend) {
            var permission = this.findWhere({id: friend.get('id')});
            this.remove(permission);
        }

    });
    return PermissionCollection;
});