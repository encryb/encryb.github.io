define([
    'backbone',
    'app/services/dropbox'
], function(Backbone, Dropbox){

    var ProfileModel = Backbone.Model.extend({
        defaults: {
            name: "",
            intro: "",
            pictureFile: "",
            pictureUrl: "img/nopic.gif",
            publicKey: "none",
            shared: false
        }
    });

    var ProfileCollection = Backbone.Collection.extend({
        model: ProfileModel,

        dropboxDatastore: new Backbone.DropboxDatastore('Profiles_3'),

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
