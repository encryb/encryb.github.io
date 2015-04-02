define([
    'backbone',
    'sjcl',
    'app/services/dropbox',
    'app/encryption/async',
    'compat/windowUrl',
    'utils/data-convert',
    'utils/encoding',
    'utils/misc'
], function (Backbone, Sjcl, Storage, EncryptionAsync, WindowUrl, DataConvert, Encoding, MiscUtils) {

    // $CONFIG
    var FOLDER_POSTS = "posts/";
    var FILED_CONTENT_FIELDS = ["thumbnail", "videoFrames", "image", "video", "data"];


    var fetchHelper = {
        fetchToUrlObject: function(model, key, objectType, password) {
            if (!model.has(key) && model.has(key + "Url")) {
                var url = model.get(key + "Url");
                var decryptFunc;
                if (objectType === "binary") {
                    decryptFunc = EncryptionAsync.decryptData.bind(null, password);
                }
                else if (objectType === "text"){
                    decryptFunc = EncryptionAsync.decryptText.bind(null, password);
                }
                else if (objectType === "array") {
                    decryptFunc = EncryptionAsync.decryptArray.bind(null, password);
                }
                var deferred = Storage.downloadUrl(url)
                    .then(
                        decryptFunc,
                        setError.bind(null, model, key + " download error")
                    )
                    .then(
                        function(value) {
                            if (value) {
                                model.set(key, value);
                            }
                        },
                        setError.bind(null, model, key + " decryption error")
                    );
            }
            return deferred;
        },

        getOrFetchToUrlObject: function (content, type, password) {
            var deferred = $.Deferred();
            if (content.has(type + "Cached")) {
                return content.get(type + "Cached");
            }
            var url;
            if (content.has(type)) {
                var asset = content.get(type);
                if (asset instanceof File) {
                    url = WindowUrl.createObjectURL(asset);
                }
                else {
                    url = content.get(type);
                }
                content.set(type + "Cached", url);
                deferred.resolve(url);
            }
            else {
                url = content.get(type + "Url");
                Storage.downloadUrl(url)
                    .then(EncryptionAsync.decryptData.bind(null, password),
                    setError.bind(null, content, type + " download error"))
                    .done(function (data) {
                        if (!data) {
                            deferred.reject(content.get("errors"));
                            return;
                        }
                        content.set(type + "Cached", data);
                        deferred.resolve(data);
                    })
                    .fail(function(error) {
                        setError(content, type + " decryption error", error);
                        deferred.reject(content.get("errors"));
                    });
            }
            return deferred.promise();
        }
    };

    var createHelper = {

        getOrCreateFolder: function (model) {
            if (model.has("folderId")) {
                return model.get("folderId");
            }

            var folderId = MiscUtils.makeId();
            model.set("folderId", folderId);
            var folderPath = FOLDER_POSTS + folderId;

            return Storage.createFolder(folderPath);
        },

        convertAssetToBuffer: function (asset) {
            var deferred = $.Deferred();

            if (asset.constructor === Array) {
                var conversions = [];
                var i;
                for (i = 0; i < asset.length; i++) {
                    conversions.push(createHelper.convertAssetToBuffer(asset[i]));
                }
                //TODO when conversions length is one, arguments doesn't work!
                $.when.apply($, conversions).done(function () {
                    var results = arguments;
                    var buffers = [];
                    var mimeType;
                    for (i = 0; i < results.length; i++) {
                        var result = results[i];
                        buffers.push(result.buffer);
                        mimeType = result.mimeType;
                    }
                    var combinedBuffer = Encoding.combineBuffers(buffers);
                    deferred.resolve({buffer: combinedBuffer, mimeType: mimeType});
                });
            }
            else if (asset instanceof File) {
                var fileReader = new FileReader();
                fileReader.onload = function () {
                    deferred.resolve({buffer: fileReader.result, mimeType: asset.type});
                };
                fileReader.readAsArrayBuffer(asset);
            }
            else {
                var typedArray = DataConvert.dataUriToTypedArray(asset);
                deferred.resolve({buffer: typedArray['data'].buffer, mimeType: typedArray['mimeType']});
            }
            return deferred.promise();
        },
        uploadAsset: function(content, key, folderPath, password) {
            if (!content.hasOwnProperty(key)) {
                return null;
            }

            var deferred = $.Deferred();
            var asset = content[key];
            var path = Storage.getPath(key, folderPath, content["number"]);
            $.when(this.convertAssetToBuffer(asset)).fail(deferred.reject).done(function(result) {
                EncryptionAsync.encrypt(password, result.mimeType, result.buffer, true)
                   .then(Storage.upload.bind(null, path), deferred.reject)
                   .then(Storage.share, deferred.reject)
                   .fail(deferred.reject)
                   .done(function (url) {
                       if (url) {
                           content[key + "Url"] = url;
                       }
                       deferred.resolve();
                   });
            });
            return deferred.promise();
        }
    };

    function _uploadContent(content, password, folderPath) {
        var deferred = $.Deferred();
        var uploads = FILED_CONTENT_FIELDS.map(function(type) {
            return createHelper.uploadAsset(content, type, folderPath, password);
        });
        $.when.apply($, uploads)
            .fail(function(error) {
                deferred.reject(error);
            }).done(function () {
                deferred.resolve();
            });
        return deferred.promise();
    }

    function _removeContent(content, folderPath) {
        var deferred = $.Deferred();

        var removals = FILED_CONTENT_FIELDS.map(function(type) {
            if (!content.hasOwnProperty(type + "Url")) {
                return null;
            }
            var path = Storage.getPath(type, folderPath, content["number"]);
            return Storage.remove(path);
        });

        $.when.apply($, removals).done(function() {
            deferred.resolve();
        });
        return deferred.promise();
    }

    var setError = function(model, errorType, errorMsg) {
        var deferred = $.Deferred();
        var messeges = model.get("errors") || [];
        messeges.push(errorType + ": " + errorMsg);
        model.set("errors", messeges);
        deferred.resolve();
        return deferred.promise();
    };


    var PostAdapter = {

        fetchPost: function(post) {

            var deferred = $.Deferred();
            var password = post.get('password');
            var fetches = [];

            if (post.has("content")) {
                var contentList = post.get("content");
                contentList.each(function (content) {

                    // automatic downloads
                    fetches.push(fetchHelper.fetchToUrlObject(content, "caption", "text", password));
                    fetches.push(fetchHelper.fetchToUrlObject(content, "videoFrames", "array", password));
                    fetches.push(fetchHelper.fetchToUrlObject(content, "thumbnail", "binary", password));


                    //on demand downloads
                    content.getFullImage = fetchHelper.getOrFetchToUrlObject.bind(null, content, "image", password);
                    content.getVideo = fetchHelper.getOrFetchToUrlObject.bind(null, content, "video", password);
                    content.getData = fetchHelper.getOrFetchToUrlObject.bind(null, content, "data", password);
                });
            }

            $.when.apply($, fetches).done(function() {
                deferred.resolve();
            });

            return deferred.promise();
        },

        uploadPost: function(post) {
            
            var contentList = post.contentList;
            // we have nothing to upload
            if (!contentList || contentList.length == 0) {
                return;
            }
            var deferred = $.Deferred();

            var password = Sjcl.random.randomWords(8, 1);
            var uploads = [];

            $.when(createHelper.getOrCreateFolder(post))
                .fail(function(error){
                    deferred.reject(error);
                })
                .done(function () {
                var folderPath = FOLDER_POSTS + post.get("folderId");
                if (contentList) {
                    for(var i=0; i<contentList.length; i++) {
                        var content = contentList[i];
                        content["number"] = i;
                        var upload = _uploadContent(content, password, folderPath);
                        uploads.push(upload);
                    }
                }

                $.when.apply($, uploads)
                    .fail(function (error) {
                        deferred.reject(error);
                    })
                    .done(function () {
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
            var password;
            if (model.has("password")) {
                password = Sjcl.codec.bytes.toBits(model.get("password"));
            }
            else {
                password = Sjcl.random.randomWords(8, 1);
                model.set("password", Sjcl.codec.bytes.fromBits(password));
            }
                
            var setupTasks = [];
            if (!model.has("folderId")) {
                if (addedContent.length > 0) {
                    setupTasks.push(createHelper.getOrCreateFolder(model));
                }
            }
            var i;
            $.when.apply($, setupTasks).done(function() {
                var actions = [];
                if (addedContent.length > 0) {
                    var contentArray = model.get("content");

                    // find the highest current content number. We will use use
                    // that as starting point for added content
                    var highestContentNumber = 0;
                    for (i=0; i<contentArray.length; i++) {
                        var contentAttributes = contentArray[i];
                        if (contentAttributes.number >= highestContentNumber) {
                            highestContentNumber = contentAttributes.number + 1;
                        }
                    }

                    // need to figure out how to update content list
                    for(i=0; i < addedContent.length; i++) {
                        var content = addedContent[i];
                        content["number"] = i + highestContentNumber;
                        var upload = _uploadContent(content, password, FOLDER_POSTS + model.get("folderId"));
                        actions.push(upload);
                    }
                }

                for(i=0; i < removedContent.length; i++) {
                    var remove = _removeContent(removedContent[i].toJSON(), FOLDER_POSTS + model.get("folderId"));
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
                var filteredContent = _.omit(content, FILED_CONTENT_FIELDS);
                filteredContentList.push(filteredContent);
            }
            return filteredContentList;
        }
    };
    return PostAdapter;
});