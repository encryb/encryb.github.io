define([
  'backbone',
  'dropboxdatastore',
  'app/models/friend'
], function(Backbone, DropboxDatastore, Friend){

var FriendCollection = Backbone.Collection.extend({
    model: Friend,

    dropboxDatastore: new Backbone.DropboxDatastore('Friends_3'),

    initialize: function() {
        this.dropboxDatastore.syncCollection(this);
    }
})

return FriendCollection;
});
