define([
  'jquery',
  'underscore',
  'backbone.dropboxDatastore',
  'app/constants',
], function($, _, DropboxDatastore, Constants){

var dropboxClient = new Dropbox.Client({key: Constants.DROPBOX_APP_KEY});
if (!dropboxClient.isAuthenticated()) dropboxClient.authenticate({interactive: false});

Backbone.DropboxDatastore.client = dropboxClient;
Backbone.Dropbox = Dropbox;

//$CONFIG

var TAG_TYPE_TEXT = "text";
var TAG_TYPE_THUMBNAIL = "thumbnail";
var TAG_TYPE_IMAGE = "image";
var TAG_TYPE_VIDEOFRAMES = "videoframes";
var TAG_TYPE_VIDEO = "video";
var TAG_TYPE_CAPTION= "caption";
var TAG_TYPE_DATA = "data";
var TAG_SPLIT = "/";
var TAG_PROFILE_PIC = "profilePic";


var dropbox = {

    client: dropboxClient,

    createFolder: function (path) {
        var deferred = $.Deferred();
        dropboxClient.mkdir(path, function (error, stats) {
            if (error) {
                deferred.reject("Could not create directory \"" + path + "\"");
                console.error("Could not create directory " + path, error);
            } else {
                deferred.resolve(stats);
            }
        });
        return deferred;
    },

    remove: function (path) {
        var deferred = $.Deferred();
        dropboxClient.remove(path, function (error, stats) {
            if (error) {
                deferred.reject();
                console.log(error);
            } else {
                deferred.resolve(stats);
            }
        });
        return deferred;
    },


    exists: function (path) {
        var deferred = $.Deferred();
        dropboxClient.stat(path, {}, function (error, data, stats) {
            if (error) {
                deferred.reject();
            } else {
                deferred.resolve(stats);
            }
        });
        return deferred;
    },

    download: function (path) {
        var deferred = $.Deferred();
        dropboxClient.readFile(path, {arrayBuffer: true}, function (error, data, stats) {
            if (error) {
                deferred.reject();
                console.log(error);
            } else {
                deferred.resolve(data);
            }
        });
        return deferred;
    },

    upload: function (path, data) {
        var deferred = $.Deferred();
        try {
            dropboxClient.writeFile(path, data, function (error, stats) {
                if (error) {
                    deferred.reject(error);
                    console.log(error);
                } else {
                    deferred.resolve(stats);
                }
            }); 
        } catch (e) {
            deferred.reject("Could not upload file: " + path + ", " + e.message);
        }
        return deferred;
    },

    share: function (stats) {
        var deferred = $.Deferred();
        try {
            dropboxClient.makeUrl(stats.path, { downloadHack: true }, function (error, resp) {
                if (error) {
                    deferred.reject("Could not share file: " + path + ", " + error);
                    console.log(error);
                } else {
                    deferred.resolve(resp.url);
                }
            });
        } catch (e) {
            deferred.reject("Could not share file: " + path + ", " + e.message);
        }
        return deferred;
    },

    getPath: function(type, id, contentNumber) {

        switch(type) {
            case "text":
                return id + TAG_SPLIT + TAG_TYPE_TEXT;
            case "image":
                return id + TAG_SPLIT + TAG_TYPE_IMAGE + contentNumber;
            case "thumbnail":
                return id + TAG_SPLIT + TAG_TYPE_THUMBNAIL + contentNumber;
            case "video":
                return id + TAG_SPLIT + TAG_TYPE_VIDEO + contentNumber;
            case "videoFrames":
                return id + TAG_SPLIT + TAG_TYPE_VIDEOFRAMES + contentNumber;
            case "caption":
                return id + TAG_SPLIT + TAG_TYPE_CAPTION + contentNumber;
            case "data":
                return id + TAG_SPLIT + TAG_TYPE_DATA + contentNumber;
            case "profilePic":
                return "profilePic-" + id;
            default:
                throw "Unknown data type: " + type;
        }
    },

    downloadUrl: function (downloadUrl) {

        var deferred = $.Deferred();

        var xhr = new XMLHttpRequest();
        xhr.open('GET', downloadUrl);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    deferred.resolve(xhr.response);
                } else {
                    deferred.reject(xhr.statusText);
                }
            }
        };
        xhr.onerror = function () {
            deferred.reject(xhr.statusText);
        };
        xhr.send();

        return deferred;
    },
    getInfo: function () {
        var deferred = $.Deferred();
        dropboxClient.getAccountInfo({},  function(error, accountInfo) {
            if (error) {
                deferred.reject(error);
                return;
            }
            deferred.resolve(accountInfo);

        }); 
        return deferred.promise();
    }
}

return dropbox;


});