define([
    'backbone',
    'app/encryption',
    'app/services/dropbox'
], function (Backbone, Encryption, Storage) {


    var Friend = Backbone.Model.extend({

        defaults: {
            manifestFile: "",
            manifestUrl: "",
            friendsManifest: "",
            pictureUrl: "img/nopic.gif",
            intro: "",
            invite: false
        }

    });
    return Friend;
});
