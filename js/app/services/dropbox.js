define([
  'jquery',
  'underscore',
  'dropbox',
  'backbone.dropboxDatastore',
  'app/constants',
  'app/encryption'
], function($, _, Dropbox, DropboxDatastore, Constants, Encryption){

var exports = {};

var dropboxClient = new Dropbox.Client({key: Constants.DROPBOX_APP_KEY});
if (!dropboxClient.isAuthenticated()) dropboxClient.authenticate({interactive: false});

Backbone.DropboxDatastore.client = dropboxClient;
Backbone.Dropbox = Dropbox;

exports.client = dropboxClient;

//$CONFIG

var TAG_TYPE_TEXT = "text";
var TAG_TYPE_RESIZED = "resized";
var TAG_TYPE_FULLSIZE = "fullsize";
var TAG_TYPE_CAPTION= "caption";
var TAG_TYPE_DATA = "data";
var TAG_SPLIT = "/";

exports.createFolder = function(path) {
    var deferred = $.Deferred();
    dropboxClient.mkdir(path, function (error, stats) {
        if (error) {
            deferred.fail();
            console.log(error);
        } else {
            deferred.resolve(stats);
        }
    });
    return deferred;
};
    
exports.remove = function(path) {
    var deferred = $.Deferred();
    dropboxClient.remove(path, function (error, stats) {
        if (error) {
            deferred.fail();
            console.log(error);
        } else {
            deferred.resolve(stats);
        }
    });
    return deferred;
};


exports.exists = function(path) {
    var deferred = $.Deferred();
    dropboxClient.stat(path, {}, function (error, data, stats) {
        if (error) {
            deferred.fail();
        } else {
            deferred.resolve(stats);
        }
    });
    return deferred;
};

exports.downloadDropbox = function(path) {
    var deferred = $.Deferred();
    dropboxClient.readFile(path, {arrayBuffer:true}, function (error, data, stats) {
        if (error) {
            deferred.fail();
            console.log(error);
        } else {
            deferred.resolve(data);
        }
    });
    return deferred;
};

exports.uploadDropbox = function(path, data) {
    var deferred = $.Deferred();
    dropboxClient.writeFile(path, data, function (error, stats) {
        if (error) {
            deferred.fail();
            console.log(error);
        } else {
            deferred.resolve(stats);
        }
    });
    return deferred;
};

exports.shareDropbox = function(stats) {
    var deferred = $.Deferred();
    dropboxClient.makeUrl(stats.path, {downloadHack:true}, function (error, resp) {
        if (error) {
            deferred.fail();
            console.log(error);
        } else {
            deferred.resolve(resp.url);
        }
    });
    return deferred;
};

exports.getTextPath = function(id) {
    return id + TAG_SPLIT + TAG_TYPE_TEXT;
};

exports.getImagePath = function(id, contentNumber) {
    return id + TAG_SPLIT + TAG_TYPE_FULLSIZE + contentNumber;
};
exports.getThumbnailPath = function(id, contentNumber) {
    return id + TAG_SPLIT + TAG_TYPE_RESIZED + contentNumber;
};

exports.getCaptionPath = function(id, contentNumber) {
    return id + TAG_SPLIT + TAG_TYPE_CAPTION + contentNumber;
};

exports.getDataPath = function(id, contentNumber) {
    return id + TAG_SPLIT + TAG_TYPE_DATA + contentNumber;
};

exports.downloadUrl = function(downloadUrl) {

    var deferred = $.Deferred();

    var xhr = new XMLHttpRequest();
    xhr.open('GET', downloadUrl);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                deferred.resolve(xhr.response);
            } else {
                deferred.reject(xhr.statusText);
            }
        }
    };
    xhr.onerror = function() {
        deferred.reject(xhr.statusText);
    };
    xhr.send();

    return deferred;
};

return exports;


});