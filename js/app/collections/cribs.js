define([
    'backbone',
    'dropboxdatastore',
    'app/models/crib'
], function(Backbone, DropboxDatastore, Crib){

    var FriendCollection = Backbone.Collection.extend({
        model: Crib,

        dropboxDatastore: new Backbone.DropboxDatastore('Crib_1'),

        initialize: function() {
            this.dropboxDatastore.syncCollection(this);
        }
    })

    return FriendCollection;
});