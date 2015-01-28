define([
    'backbone',
    'sjcl',
    'app/services/dropbox',
    'app/encryption',
    'utils/data-convert',
    'utils/misc'

], function (Backbone, Sjcl, Storage, Encryption, DataConvert, MiscUtils) {

    // $CONFIG
    var FOLDER_POSTS = "posts/";

    var EXCLUDE_CONTENT_KEYS = [ "caption", "thumbnail", "image", "video", "data"];

    // $CONFIG
    // If text is longer than x, store it in file, rather than in the datastore
    function hasLargeText(text) {
        return ('undefined' !== typeof text && text.length > 200);
    }

    function getOrCreateFolder(model) {
        var deferred = $.Deferred();
        if (model.has("folderId")) {
            deferred.resolve(model.get("folderId"));
        }
        else {
            var folderId = MiscUtils.makeId();
            model.set("folderId", folderId);
            var folderPath = FOLDER_POSTS + folderId;

            $.when(Storage.createFolder(folderPath)).done(function (stats) {
                deferred.resolve(stats);
            });
            return deferred;
        }
    }

    function _removeContent(content, folderPath) {

        var deferred = $.Deferred();

        var caption = content["captionUrl"];
        var thumbnail = content["thumbnailUrl"];
        var image = content["imageUrl"];
        var video = content["videoUrl"];
        var data = content["dataUrl"];
        var contentNumber = content["number"];

        var removeCaption = null;
        if (caption) {
            var captionPath = Storage.getCaptionPath(folderPath, contentNumber);
            removeCaption = Storage.remove(captionPath);
        }
        var removeThumbnail = null;
        if (thumbnail) {
            var thumbnailPath = Storage.getThumbnailPath(folderPath, contentNumber);
            removeThumbnail = Storage.remove(thumbnailPath);
        }
        var removeImage = null;
        if (image) {
            var imagePath = Storage.getImagePath(folderPath, contentNumber);
            removeImage = Storage.remove(imagePath);
        }
        var removeVideo = null;
        if (video) {
            var videoPath = Storage.getImagePath(folderPath, contentNumber);
            removeVideo = Storage.remove(videoPath);
        }
        var removeData = null;
        if (data) {
            var dataPath = Storage.getDataPath(folderPath, contentNumber);
            removeData = Storage.remove(dataPath);
        }


        $.when(removeCaption, removeThumbnail, removeImage, removeVideo, removeData).done(function () {
            deferred.resolve();
        });
        return deferred.promise();
    }


    function _uploadContent(content, password, folderPath) {

        var deferred = $.Deferred();

        var caption = content["caption"];
        var thumbnail = content["thumbnail"];
        var image = content["image"];
        var video = content["video"];
        var data = content["data"];
        var contentNumber = content["number"];

        var uploadCaption = null;
        if (caption) {
            var captionPath = Storage.getCaptionPath(folderPath, contentNumber);
            var encCaption = Encryption.encrypt(password, "plain/text", caption);

            var setCaptionUrl = function(url) {
                content["captionUrl"] = url;
            };

            uploadCaption = Storage.uploadDropbox(captionPath, encCaption)
                        .then(Storage.shareDropbox)
                        .then(setCaptionUrl);
        }


        var uploadAsset = function(asset, path, setUrl) {
            if (asset instanceof File) {
                return uploadFileAsset(asset, path, setUrl);
            }
            var typedArray = DataConvert.dataUriToTypedArray(asset);
            return Encryption.encryptAsync(password, typedArray['mimeType'], typedArray['data'].buffer)
                .then(Storage.uploadDropbox.bind(null, path))
                .then(Storage.shareDropbox)
                .then(setUrl);
        }

        var uploadFileAsset = function(file, path, setUrl) {

            var deferred = $.Deferred();
            var fileReader = new FileReader();
            fileReader.onload = function() {
                var buffer = fileReader.result;
                Encryption.encryptAsync(password, file.type, buffer)
                    .then(Storage.uploadDropbox.bind(null, path))
                    .then(Storage.shareDropbox)
                    .then(setUrl).done( function() {
                        deferred.resolve(arguments);
                    });
            }
            fileReader.readAsArrayBuffer(file);
            return deferred.promise();
        }


        var uploadThumbnail = null;
        if (thumbnail) {

            var thumbPath = Storage.getThumbnailPath(folderPath, contentNumber);
            var setThumbnailUrl = function(url) {
                content["thumbnailUrl"] = url;
            };
            uploadThumbnail = uploadAsset(thumbnail, thumbPath, setThumbnailUrl);

        }

        var uploadImage = null;
        if (image) {
            var imagePath = Storage.getImagePath(folderPath, contentNumber);
            var setImageUrl = function(url) {
                content["imageUrl"] = url;
            };

            uploadImage = uploadAsset(image, imagePath, setImageUrl);
        }

        var uploadVideo = null;
        if (video) {
            var videoPath = Storage.getImagePath(folderPath, contentNumber);
            var setVideoUrl = function(url) {
                content["videoUrl"] = url;
            };

            uploadVideo = uploadAsset(video, videoPath, setVideoUrl);
        }

        var uploadData = null;
        if (data) {
            var dataPath = Storage.getDataPath(folderPath, contentNumber);
            var setDataUrl = function(url) {
                content["dataUrl"] = url;
            };

            uploadData = uploadAsset(data, dataPath, setDataUrl);
        }

        $.when(uploadCaption, uploadThumbnail, uploadImage, uploadVideo, uploadData).done(function() {
            deferred.resolve();
        });
        return deferred.promise();
    }

    var setError = function(model, errorType, errorMsg) {
        console.log("Error", model, errorType, errorMsg);
        var deferred = $.Deferred();
        var messeges = model.get("errors") || [];
        messeges.push(errorType + ": " + errorMsg);
        model.set("errors", messeges);
        deferred.resolve();
        return deferred.promise();
    }

    var setValue = function(model, key, value) {
        var deferred = $.Deferred();
        if (value) {
            model.set(key, value);
        }
        deferred.resolve();
        return deferred.promise();
    }


    var PostAdapter = {

        fetchPost: function(post) {

            var deferred = $.Deferred();
            var password = post.get('password');
            var deferreds = [];

            if (!post.has('text') && post.has('textUrl')) {
                var textDeferred = Storage.downloadUrl(post.get('textUrl'))
                    .then(Encryption.decryptTextAsync.bind(null, password),
                          setError.bind(null, post, "Download error"))
                    .then(setValue.bind(null, post, "text"),
                          setError.bind(null, post, "Decryption error"));
                deferreds.push(textDeferred);
            }

            if (post.has("content")) {
                var contentList = post.get("content");
                contentList.each(function (content) {
                    if (!content.has("caption") && content.has("captionUrl")) {
                        var captionUrl = content.get("captionUrl");
                        var captionDeferred = Storage.downloadUrl(captionUrl)
                            .then(Encryption.decryptTextAsync.bind(null, password),
                                  setError.bind(null, post, "Caption download error"))
                            .then(setValue.bind(null, content, "caption"),
                                  setError.bind(null, post, "Caption decryption error"));
                        deferreds.push(captionDeferred);
                    }

                    if (!content.has("thumbnail") && content.has("thumbnailUrl")) {
                        var setImage = function(content, resizedImage) {
                            var deferred = $.Deferred();
                            if (!resizedImage) {
                                deferred.resolve();
                            }
                            else {
                                content.set("thumbnail", resizedImage);

                                var img = new Image();
                                img.onload = function () {
                                    content.resizedWidth = this.width;
                                    content.resizedHeight = this.height;
                                    deferred.resolve();
                                };
                                img.src = resizedImage;
                            }
                            return deferred.promise();
                        }

                        var resizedImageUrl = content.get("thumbnailUrl");
                        var resizedImageDeferred = Storage.downloadUrl(resizedImageUrl)
                                             .then(Encryption.decryptDataAsync.bind(null, password),
                                                   setError.bind(null, content, "Thumbnail download error"))
                                             .then(setImage.bind(null, content),
                                                   setError.bind(null, content, "Thumbnail decryption error"));

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
                                .then(Encryption.decryptDataAsync.bind(null, password),
                                      setError.bind(null, content, "Image download error"))
                                .done(function (fullImage) {
                                    if (!fullImage) {
                                        deferred.reject(content.get("errors"));
                                    }
                                    content.set("image", fullImage);
                                    deferred.resolve(fullImage);
                                })
                                .fail(function(error) {
                                   setError(content, "Image decryption error", error);
                                   deferred.reject(content.get("errors"));
                                });
                        }
                        return deferred.promise();
                    }

                    // setup a function that fetches the full size image and attach it directly to content object
                    content.getVideo = function () {
                        var deferred = $.Deferred();
                        if (content.has("video")) {
                            deferred.resolve(content.get("video"));
                        }
                        else {
                            var videoUrl = content.get("videoUrl");
                            Storage.downloadUrl(videoUrl)
                                .then(Encryption.decryptDataAsync.bind(null, password))
                                .done(function (video) {
                                    content.set("video", video);
                                    deferred.resolve(video);
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
            var uploads = [];

            var haveLargeText = hasLargeText(post.get("text"));

            var contentList = post.contentList;
            // we have nothing to upload
            if (!haveLargeText && (!contentList || contentList.length == 0)) {
                return;
            }

            $.when(getOrCreateFolder(post)).done( function () {

                var folderPath = FOLDER_POSTS + post.get("folderId");

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
                    for(var i=0; i<contentList.length; i++) {
                        var content = contentList[i];
                        content["number"] = i;
                        var upload = _uploadContent(content, password, folderPath);
                        uploads.push(upload);
                    }
                }

                $.when.apply($, uploads).done(function () {
                    post.set("password", Sjcl.codec.bytes.fromBits(password));
                    deferred.resolve();
                });
            });

            return deferred;
        },

        deletePost: function(model) {
            if (model.has('folderId')) {
                Storage.remove(FOLDER_POSTS + model.get('folderId'));
            }
        },

        // addedContent is an array of JSON objects
        // removedContent is an array of Backbone Models
        updatePost: function(model, changes, addedContent, removedContent) {

            var deferred = $.Deferred();
            var password = Sjcl.codec.bytes.toBits(model.get("password"));

            var setupTasks = [];
            if (!model.has("folderId")) {
                if (addedContent.length > 0 || hasLargeText(changes["text"])) {
                    setupTasks.push(getOrCreateFolder(model));
                }
            }

            $.when.apply($, setupTasks).done(function() {

                var actions = [];

                // deal with text changes
                if (changes.hasOwnProperty("text")) {
                    // remove existing text
                    if (model.has("textUrl")) {
                        var oldTextPath = Storage.getTextPath(FOLDER_POSTS + model.get("folderId"));
                        model.unset("textUrl");
                        Storage.remove(oldTextPath);
                    }

                    if (hasLargeText(changes["text"])) {
                        var textPath = Storage.getTextPath(FOLDER_POSTS + model.get("folderId"));
                        var encText = Encryption.encrypt(password, "plain/text", changes["text"]);
                        var setTextUrl = function(url) {
                            model.set("textUrl", url);
                        };

                        var uploadText = Storage.uploadDropbox(textPath, encText)
                            .then(Storage.shareDropbox)
                            .then(setTextUrl);

                        actions.push(uploadText);
                    }
                }


                if (addedContent.length > 0) {
                    var contentArray = model.get("content");

                    // find the highest current content number. We will use use
                    // that as starting point for added content
                    var highestContentNumber = 0;
                    for (var i=0; i<contentArray.length; i++) {
                        var contentAttributes = contentArray[i];
                        if (contentAttributes.number >= highestContentNumber) {
                            highestContentNumber = contentAttributes.number + 1;
                        }
                    }

                    // need to figure out how to update content list

                    for(var i=0; i < addedContent.length; i++) {
                        var content = addedContent[i];
                        content["number"] = i + highestContentNumber;
                        var upload = _uploadContent(content, password, FOLDER_POSTS + model.get("folderId"));
                        actions.push(upload);
                    }
                }

                for(var i=0; i < removedContent.length; i++) {
                    var content = removedContent[i];
                    var remove = _removeContent(content.toJSON(), FOLDER_POSTS + model.get("folderId"));
                    actions.push(remove);
                }

                $.when.apply($, actions).done(function() {
                    deferred.resolve();
                });

            });
            return deferred;

        },

        removeNonPersistentFields: function(contentList) {

            var filteredContentList = [];
            for(var i=0; i<contentList.length; i++) {
                var content = contentList[i];
                var filteredContent = _.omit(content, EXCLUDE_CONTENT_KEYS);
                filteredContentList.push(filteredContent);
            }
            return filteredContentList;
        }
    };
    return PostAdapter;
});