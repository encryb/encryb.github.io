define([
  'backbone',
  'app/models/friend',
  'app/services/dropbox'
], function(Backbone, Friend, Dropbox){

var FriendCollection = Backbone.Collection.extend({
    model: Friend,

    dropboxDatastore: new Backbone.DropboxDatastore('Friends_14'),

    initialize: function() {
        this.dropboxDatastore.syncCollection(this);
    },

    toManifest: function(excludeFriend) {

        var friends = [];
        this.each(function(friend) {
            if (friend.get('userId') == excludeFriend.get('userId')){
                return;
            };
            friends.push(_.pick(friend.attributes, "name", "userId", "pictureUrl", "intro"));
        }, this);
        return friends;
    }
})

return FriendCollection;
});
