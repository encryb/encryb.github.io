define([
  'jquery',
  'utils/dropbox-client',
  'utils/gdrive',
  'msgpack',
  'utils/data-convert',
  'app/constants',
  'app/encryption'

], function($, DropboxClient, gdrive, msgpack, dataConvert, constants, encryption){

var exports = {};

var TAG_TYPE_RESIZED = "resized";
var TAG_TYPE_FULLSIZE = "fullsize";
var TAG_TYPE_TEXT = "text";
var TAG_SPLIT = "/";

exports.createFolder = function(path) {
    var deferred = $.Deferred();
    DropboxClient.mkdir(path, function (error, stats) {
        if (error) {
            deferred.fail();
            console.log(error);
        } else {
            deferred.resolve(stats);
        }
    });
    return deferred;
}

exports.remove = function(path) {
    var deferred = $.Deferred();
    DropboxClient.remove(path, function (error, stats) {
        if (error) {
            deferred.fail();
            console.log(error);
        } else {
            deferred.resolve(stats);
        }
    });
    return deferred;
}

exports.exists = function(path) {
    var deferred = $.Deferred();
    DropboxClient.stat(path, {}, function (error, data, stats) {
        if (error) {
            deferred.fail();
        } else {
            deferred.resolve(path);
        }
    });
    return deferred;
}
exports.downloadDropbox = function(path) {
    var deferred = $.Deferred();
    DropboxClient.readFile(path, {}, function (error, data, stats) {
        if (error) {
            deferred.fail();
            console.log(error);
        } else {
            deferred.resolve(data);
        }
    });
    return deferred;
}

exports.uploadDropbox = function(path, data) {
    var deferred = $.Deferred();
    DropboxClient.writeFile(path, data, function (error, stats) {
        if (error) {
            deferred.fail();
            console.log(error);
        } else {
            deferred.resolve(stats);
        }
    });
    return deferred;
}

exports.shareDropbox = function(stats) {
    var deferred = $.Deferred();
    DropboxClient.makeUrl(stats.path, {downloadHack:true}, function (error, resp) {
        if (error) {
            deferred.fail();
            console.log(error);
        } else {
            deferred.resolve(resp.url);
        }
    });
    return deferred;
}

exports.getFullImagePath = function(id) {
    return id + TAG_SPLIT + TAG_TYPE_FULLSIZE;
}

exports.getResizedImagePath = function(id) {
    return id + TAG_SPLIT + TAG_TYPE_RESIZED;
}

exports.getTextPath = function(id) {
    return id + TAG_SPLIT + TAG_TYPE_TEXT;
}

exports.uploadPost = function (id, textData, resizedImageData, imageData) {
    var deferred = $.Deferred();

    var createFolder = exports.createFolder(id);

    var deferredText = null;
    var deferredFullImage = null;
    var deferredResizedImage = null;

    if (textData) {
        deferredText = exports.uploadDropbox(exports.getTextPath(id), textData).then(exports.shareDropbox);
    }
    if (resizedImageData) {
        deferredResizedImage = exports.uploadDropbox(exports.getResizedImagePath(id), resizedImageData).then(exports.shareDropbox);
    }
    if (imageData) {
        deferredFullImage = exports.uploadDropbox(exports.getFullImagePath(id), imageData).then(exports.shareDropbox);
    }


    $.when(createFolder).done(function() {
        var update = {};

        $.when(deferredText, deferredResizedImage, deferredFullImage).done(function(textUrl, resizedImageUrl, imageUrl){

            if (textUrl != null) {
                update['textUrl'] = textUrl;
            }
            if (resizedImageUrl != null) {
                update['resizedImageUrl'] = resizedImageUrl;
            }
            if (imageUrl != null) {
                update['fullImageUrl'] = imageUrl;
            }

            deferred.resolve(update);
        });
    });

    return deferred;
}


exports.downloadUrl = function(downloadUrl) {

    var deferred = $.Deferred();

    var xhr = new XMLHttpRequest();
    xhr.responseType = 'arraybuffer';
    xhr.open('GET', downloadUrl);
    xhr.onload = function() {
        var ecnryptedData = xhr.response;
        deferred.resolve(ecnryptedData);
    };
    xhr.onerror = function() {
        deferred.fail();
    };
    xhr.send();

    return deferred;
}

exports.downloadData = function(downloadUrl, isImage, password) {

    var deferred = $.Deferred();

    var xhr = new XMLHttpRequest();
    xhr.responseType = 'arraybuffer';
    xhr.open('GET', downloadUrl);
    xhr.onload = function() {
        var ecnryptedData = xhr.response;
        var data;
        if (isImage) {
            data = encryption.decryptImageData(ecnryptedData, password);
        }
        else {
            data = encryption.decryptTextData(ecnryptedData, password);
        }

        deferred.resolve(data);
    };
    xhr.onerror = function() {
        deferred.fail();
    };
    xhr.send();

    return deferred;
}

return exports;


});