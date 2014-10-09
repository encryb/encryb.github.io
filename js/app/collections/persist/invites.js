define([
  'backbone',
  'app/services/dropbox'
], function(Backbone, Dropbox){

var InviteCollection = Backbone.Collection.extend({

    dropboxDatastore: new Backbone.DropboxDatastore('Invites_19'),

    initialize: function() {
        this.dropboxDatastore.syncCollection(this);
    }
})

return InviteCollection;
});
