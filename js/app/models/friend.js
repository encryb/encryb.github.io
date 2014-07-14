define([
    'backbone',
    'app/encryption',
    'app/storage'
], function (Backbone, Encryption, Storage) {

    var FOLDER_MANIFESTS = "manifests/";


    var Friend = Backbone.Model.extend({

        defaults: {
            account: "",
            manifestFile: "",
            manifestUrl: "",
            friendsManifest: "",
            pictureUrl: "img/nopic.gif"
        },
        schema: {
            account:      'Text',
            manifestUrl:      { type: 'Text', editorAttrs: { readonly: true } },
            friendsManifest:   'Text'
        },


        saveManifest: function(manifest) {
            var deferred = $.Deferred();

            var encText = Encryption.encryptImageWithPassword("global",  "plain/text", manifest);

            Storage.uploadDropbox(this.get('manifestFile'), encText).done(function(stats) {
                deferred.resolve(stats);
            });
            return deferred;
        },
    });
    return Friend;
});
