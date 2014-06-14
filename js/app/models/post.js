define([
    'backbone',
    'underscore',
    'app/storage',
    'app/encryption',
    'utils/data-convert',
    'utils/random'
], function (Backbone, _, Storage, Encryption, DataConvert, Random) {

    var Post = Backbone.Model.extend({

        defaults: {
            // persisted
            textUrl: null,
            resizedImageUrl: null,
            fullImageUrl: null,
            created: null,
            sharedDate: null,
            password: null,
            hasText: false,
            hasImage: false,

            // not persisted
            resizedImageData: null,
            fullImageData: null,
            textData: null
        },

        nonPersistent: [ "owner", "resizedImageData", "fullImageData", "textData"],

        // Return a copy of the model's `attributes` object.
        toJSON: function(options) {
            if (options && options.full) {
                return _.clone(this.attributes);
            }
            else {
                return _.omit(this.attributes, this.nonPersistent);
            }
        },

        fetchPost: function(fullFetch) {

            var deferred = $.Deferred();

            var model = this;

            var password = this.get('password');
            var deferredText = null;
            var deferredResizedImage = null;
            var deferredFullImage = null;

            if (model.get('textData') == null && model.get('hasText')) {
                deferredText = Storage.downloadData(this.get('textUrl'), false, password);
            }
            if (model.get('hasImage')) {
                if(model.get('resizedImageData') == null) {
                    deferredResizedImage = Storage.downloadData(this.get('resizedImageUrl'), true, password);
                }
                if(fullFetch && model.get('fullImageData') == null) {
                    deferredFullImage = Storage.downloadData(this.get('fullImageUrl'), true, password);
                }
            }


            $.when(deferredText, deferredResizedImage, deferredFullImage)
                .done(function (textResp, resizedImageResp, fullImageResp) {
                var updates = {};
                if(textResp != null) {
                    updates['textData'] = textResp;
                }
                if(resizedImageResp != null) {
                    updates['resizedImageData'] = resizedImageResp;
                }
                if (fullImageResp != null) {
                    updates['fullImageData'] = fullImageResp;
                }
                model.set(updates);
                deferred.resolve();
            });
            return deferred;
        },
        uploadPost: function () {

            var deferred = $.Deferred();

            var id = Random.makeId();
            var password = Encryption.generateRandomPassword();

            var text = this.get('textData');
            var encText = null;
            if (text) {
                encText = Encryption.encryptWithPassword(password,  "plain/text", text);
            }

            var image = this.get('fullImageData');
            var encImage = null;
            if (image) {
                var imageDict = DataConvert.dataUriToTypedArray(image);
                encImage = Encryption.encryptWithPassword(password, imageDict['mimeType'], imageDict['data']);
            }

            var resizedImage = this.get('resizedImageData');
            var encResizedImage = null;
            if (resizedImage) {
                var resizedImageDict = DataConvert.dataUriToTypedArray(resizedImage);
                encResizedImage = Encryption.encryptWithPassword(password, resizedImageDict['mimeType'], resizedImageDict['data']);
            }

            var model = this;
            $.when(Storage.uploadPost(id, encText, encResizedImage, encImage)).done(function (update) {

                update['password'] = password;
                model.set(update);
                deferred.resolve();
            });
            return deferred;
        }
    });
    return Post;
});
