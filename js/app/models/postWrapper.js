define([
    'backbone',
    'app/storage'
], function (Backbone, Storage) {

    var PostWrapper = Backbone.Model.extend({

        sync: function () { return false; },

        setPostModel: function(postModel) {
            this.postModel = postModel;
        },

        deletePost: function() {
            this.postModel.destroy();
            this.destroy();
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
        }

    });
    return PostWrapper;
});