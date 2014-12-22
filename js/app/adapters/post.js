define([
    'backbone',
    'sjcl',
    'app/services/dropbox',
    'app/encryption',
    'utils/data-convert',
    'utils/random'

], function (Backbone, Sjcl, Storage, Encryption, DataConvert, Random) {

    // $CONFIG
    var FOLDER_POSTS = "posts/";

    function _uploadContent(content, password, folderPath, contentNumber) {

        var deferred = $.Deferred();

        var caption = content.get("caption");
        var thumbnail = content.get("thumbnail");
        var image = content.get("image");
        var data = content.get("data");

        var uploadCaption = null;
        if (caption) {
            var captionPath = Storage.getCaptionPath(folderPath, contentNumber);
            var encCaption = Encryption.encrypt(password, "plain/text", caption);

            var setCaptionUrl = function(url) {
                content.set("captionUrl", url);
            };

            uploadCaption = Storage.uploadDropbox(captionPath, encCaption)
                        .then(Storage.shareDropbox)
                        .then(setCaptionUrl);
        }

        var uploadThumbnail = null;
        if (thumbnail) {

            var thumbPath = Storage.getThumbnailPath(folderPath, contentNumber);
            var setThumbnailUrl = function(url) {
                content.set("thumbnailUrl", url);
            };

            var thumbnailDict = DataConvert.dataUriToTypedArray(thumbnail);
            uploadThumbnail = Encryption.encryptAsync(password, thumbnailDict['mimeType'], thumbnailDict['data'].buffer)
                              .then(Storage.uploadDropbox.bind(null, thumbPath))
                              .then(Storage.shareDropbox)
                              .then(setThumbnailUrl);
        }

        var uploadImage = null;
        if (image) {
            var imagePath = Storage.getImagePath(folderPath, contentNumber);
            var setImageUrl = function(url) {
                content.set("imageUrl", url);
            };

            var imageDict = DataConvert.dataUriToTypedArray(image);
            uploadThumbnail = Encryption.encryptAsync(password, imageDict['mimeType'], imageDict['data'].buffer)
                              .then(Storage.uploadDropbox.bind(null, imagePath))
                              .then(Storage.shareDropbox)
                              .then(setImageUrl);
        }

        var uploadData = null;
        if (data) {
            var dataPath = Storage.getDataPath(folderPath, contentNumber);
            var setDataUrl = function(url) {
                content.set("dataUrl", url);
            };

            var dataDict = DataConvert.dataUriToTypedArray(data);
            console.log(dataDict);
            uploadThumbnail = Encryption.encryptAsync(password, dataDict['mimeType'], dataDict['data'].buffer)
                .then(Storage.uploadDropbox.bind(null, dataPath))
                .then(Storage.shareDropbox)
                .then(setDataUrl);
        }

        $.when(uploadCaption, uploadThumbnail, uploadImage, uploadData).done(function() {
            deferred.resolve();
        });
        return deferred.promise();
    }

    var PostAdapter = {

        fetchPost: function(post) {

            var deferred = $.Deferred();
            var password = post.get('password');
            var deferreds = [];

            if (!post.has('text') && post.has('textUrl')) {

                var setText = function(model, text) {
                    var deferred = $.Deferred();
                    model.set("text", text);
                    deferred.resolve();
                    return deferred.promise();
                }
                var textDeferred = Storage.downloadUrl(post.get('textUrl'))
                    .then(Encryption.decryptTextDataAsync.bind(null, password))
                    .then(setText.bind(null, post));
                deferreds.push(textDeferred);
            }

            if (post.has("content")) {
                var contentList = post.get("content");
                contentList.each(function (content) {
                    if (!content.has("caption") && content.has("captionUrl")) {

                        var setCaption = function(model, caption) {
                            var deferred = $.Deferred();
                            model.set("caption", caption);
                            deferred.resolve();
                            return deferred.promise();
                        }

                        var captionUrl = content.get("captionUrl");
                        var captionDeferred = Storage.downloadUrl(captionUrl)
                            .then(Encryption.decryptTextDataAsync.bind(null, password))
                            .then(setCaption.bind(null, content));
                        deferreds.push(captionDeferred);
                    }

                    if (!content.has("thumbnail") && content.has("thumbnailUrl")) {

                        var setImage = function(content, resizedImage) {
                            var deferred = $.Deferred();
                            content.set("thumbnail", resizedImage);

                            var img = new Image();
                            img.onload = function () {
                                content.resizedWidth = this.width;
                                content.resizedHeight = this.height;
                                deferred.resolve();
                            };
                            img.src = resizedImage;

                            return deferred.promise();
                        }

                        var resizedImageUrl = content.get("thumbnailUrl");
                        var resizedImageDeferred = Storage.downloadUrl(resizedImageUrl)
                                             .then(Encryption.decryptImageDataAsync.bind(null, password))
                                             .then(setImage.bind(null, content));

                        deferreds.push(resizedImageDeferred);
                    }

                    // setup a function that fetches the full size image and attach it directly to content object
                    content.getFullImage = function () {
                        var deferred = $.Deferred();
                        if (content.has("image")) {
                            deferred.resolve(content.get("image"));
                        }
                        else {
                            var fullImageUrl = content.get("imageUrl");
                            Storage.downloadUrl(fullImageUrl)
                                .then(Encryption.decryptImageDataAsync.bind(null, password))
                                .done(function (fullImage) {
                                    content.set("image", fullImage);
                                    deferred.resolve(fullImage);
                                });
                        }
                        return deferred.promise();
                    }
                });
            }

            $.when.apply($, deferreds).done(function() {
                deferred.resolve();
            });

            return deferred.promise();
        },

        uploadPost: function(post) {
            var deferred = $.Deferred();

            var password = Sjcl.random.randomWords(8,1);
            var folderId = Random.makeId();
            var folderPath = FOLDER_POSTS + folderId;


            var uploads = [];

            // $CONFIG
            // If text is longer than x, store it in file, rather than in the datastore
            var haveLargeText = post.has("text") && post.get("text").length > 200;
            var contentList = post.get("content");

            // we have nothing to upload
            if (!haveLargeText && (!contentList || contentList.length == 0)) {
                return;
            }

            $.when(Storage.createFolder(folderPath)).done( function () {

                var uploadText = null;
                if (haveLargeText) {
                    var text = post.get("text");
                    var textPath = Storage.getTextPath(folderPath);
                    var encText = Encryption.encrypt(password, "plain/text", text);

                    var setTextUrl = function(url) {
                        post.set("textUrl", url);
                    };

                    uploadText = Storage.uploadDropbox(textPath, encText)
                        .then(Storage.shareDropbox)
                        .then(setTextUrl);
                    uploads.push(uploadText);
                }

                if (contentList) {
                    contentList.each(function(content, index) {
                        var upload = _uploadContent(content, password, folderPath, index);
                        uploads.push(upload);
                    })
                }

                $.when.apply($, uploads).done(function () {
                    post.set("password", Sjcl.codec.bytes.fromBits(password));
                    post.set("folderId", folderId);
                    deferred.resolve();
                });
            });

            return deferred;
        },

        deletePost: function(model) {
            if (model.has('folderId')) {
                Storage.remove(FOLDER_POSTS + model.get('folderId'));
            }
        }
    };
    return PostAdapter;
});