define([
    'backbone',
    'underscore',
    'sjcl',
    'app/storage',
    'app/encryption',
    'utils/data-convert',
    'utils/random'
], function (Backbone, _, Sjcl, Storage, Encryption, DataConvert, Random) {

    var FOLDER_POSTS = "posts/";

    var Post = Backbone.Model.extend({

        defaults: {
            // persisted
            created: null,
            sharedDate: null,
            password: null,
            hasText: false,
            hasImage: false

            // no defaults
            // folderId
            // textUrl
            // resizedImageUrl
            // imageUrl

            // not persisted
            //resizedImageData: null,
            //fullImageData: null,
            //textData: null
        },

        nonPersistent: [ "owner", "resizedImageData", "fullImageData", "textData", "profilePictureUrl", "myPost", "owner"],

        // Return a copy of the model's `attributes` object.
        toJSON: function(options) {
            if (options && options.full) {
                return _.clone(this.attributes);
            }
            else {
                return _.omit(this.attributes, this.nonPersistent);
            }
        },

        uploadPost: function () {

            var deferred = $.Deferred();

            var postId = Random.makeId();
            var password = Sjcl.random.randomWords(8,1);

            var text = this.get('textData');
            var encText = null;
            if (text) {
                encText = Encryption.encryptWithPassword(password,  "plain/text", text);
            }

            var image = this.get('fullImageData');
            var encImage = null;
            if (image) {
                var imageDict = DataConvert.dataUriToTypedArray(image);
                encImage = Encryption.encryptImageWithPassword(password, imageDict['mimeType'], imageDict['data']);
            }

            var resizedImage = this.get('resizedImageData');
            var encResizedImage = null;
            if (resizedImage) {
                var resizedImageDict = DataConvert.dataUriToTypedArray(resizedImage);
                encResizedImage = Encryption.encryptImageWithPassword(password, resizedImageDict['mimeType'], resizedImageDict['data']);
            }

            var model = this;
            $.when(Storage.uploadPost(FOLDER_POSTS + postId, encText, encResizedImage, encImage)).done(function (update) {

                update['postId'] = postId;
                update['password'] = Sjcl.codec.bytes.fromBits(password);
                model.set(update);
                deferred.resolve();
            });
            return deferred;
        },
        deletePost: function() {
            Storage.remove(FOLDER_POSTS + this.get('postId'));
            this.destroy();
        }
    });
    return Post;
});
