define([
    'backbone',
    'app/encryption',
    'app/services/dropbox'
], function (Backbone, Encryption, Storage) {


    var Friend = Backbone.Model.extend({

        defaults: {
            pictureUrl: "img/nopic.gif",
            intro: "",
            invite: false,
            favorite: false
        }

    });
    return Friend;
});
