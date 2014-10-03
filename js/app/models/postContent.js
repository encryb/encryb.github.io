define([
    'backbone',
    'app/services/dropbox',
    'app/encryption'
], function (Backbone, Storage, Encryption) {

    var PostContent = Backbone.Model.extend({


        defaults: {
            fullImageData: "img/loading.gif"
        },

        // not persisted
        sync: function () { return false; },

        fetchPost: function(fullFetch) {

            var deferred = $.Deferred();

            var model = this;

            var password = model.get('password');

            var deferredText = null;
            var deferredResizedImage = null;
            var deferredFullImage = null;

            if (model.get('textData') == null && model.get('hasText')) {
                deferredText = Storage.downloadUrl(model.get('textUrl'));
            }
            if (model.get('hasImage')) {
                if(model.get('resizedImageData') == null) {
                    deferredResizedImage = Storage.downloadUrl(model.get('resizedImageUrl'));
                }
                if(fullFetch && model.get('fullImageData') == model.defaults.fullImageData) {
                    deferredFullImage = Storage.downloadUrl(model.get('fullImageUrl'));
                }
            }

            $.when(deferredText, deferredResizedImage, deferredFullImage)
                .done(function (encryptedText, encryptedResizedImage, encryptedFullImage) {

                    var updates = {};

                    if(encryptedText != null) {
                        updates['textData'] = Encryption.decryptTextData(encryptedText, password);
                    }
                    if(encryptedResizedImage != null) {
                        updates['resizedImageData'] = Encryption.decryptImageData(encryptedResizedImage, password);
                    }
                    if (encryptedFullImage != null) {
                        updates['fullImageData'] = Encryption.decryptImageData(encryptedFullImage, password);
                    }
                    model.set(updates);
                    deferred.resolve();
                });
            return deferred;
        }
    });
    return PostContent;
});