define([
    'backbone',
    'dropboxdatastore',
    'app/models/profile'
], function(Backbone, DropboxDatastore, ProfileModel){

    var ProfileCollection = Backbone.Collection.extend({
        model: ProfileModel,

        dropboxDatastore: new Backbone.DropboxDatastore('Profiles_2'),

        initialize: function() {
            this.dropboxDatastore.syncCollection(this);
        },

        getFirst: function() {
            if (this.length == 0){
                var profile = new ProfileModel();
                this.add(profile);
                return profile;
            }
            return this.at(0);
        }
    });

    return ProfileCollection;
});
