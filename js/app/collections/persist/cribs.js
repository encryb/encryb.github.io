define([
    'backbone',
    'app/services/dropbox'

], function(Backbone, Dropbox){

    var CribCollection = Backbone.Collection.extend({
        dropboxDatastore: new Backbone.DropboxDatastore('Crib_1'),

        initialize: function() {
            this.dropboxDatastore.syncCollection(this);
        }
    })

    return CribCollection;
});