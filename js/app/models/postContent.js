define([
    'backbone',
    'app/storage'
], function (Backbone, Storage) {

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
                deferredText = Storage.downloadData(model.get('textUrl'), false, password);
            }
            if (model.get('hasImage')) {
                if(model.get('resizedImageData') == null) {
                    deferredResizedImage = Storage.downloadData(model.get('resizedImageUrl'), true, password);
                }
                if(fullFetch && model.get('fullImageData') == model.defaults.fullImageData) {
                    deferredFullImage = Storage.downloadData(model.get('fullImageUrl'), true, password);
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
    return PostContent;
});