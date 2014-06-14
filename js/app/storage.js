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
var TAG_SPLIT = "--";


exports.downloadDropbox = function(path) {
    var deferred = $.Deferred();
    DropboxClient.readFile(path, {arrayBuffer:true}, function (error, data, stats) {
        if (error) {
            deferred.fail();
            console.log(error);
        } else {
            deferred.resolve(data);
            console.log(stats);
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
            console.log(stats);
        }
    });
    return deferred;
}

exports.shareDropbox = function(stats) {
    var deferred = $.Deferred();
    DropboxClient.makeUrl(stats.path, {downloadHack: true}, function (error, resp) {
        if (error) {
            deferred.fail();
            console.log(error);
        } else {
            deferred.resolve(resp.url);
        }
    });
    return deferred;
}

/*
exports.processContent() {
	getContentFolder(function(contentFolder) {
		gdrive.listFilesInFolder(contentFolder, function(files) {
			var groups = groupContent(files);
			for (var contentId in groups) {
				var content = groups[contentId];
				gdrive.downloadFile(content[TAG_TYPE_RESIZED], function(data) {
					displayResizedImage(contentId, data, content[TAG_TYPE_FULLSIZE]);
				});
			}
		});
	});
}*/


exports.getFullImagePath = function(id) {
    return TAG_TYPE_FULLSIZE + TAG_SPLIT + id;
}

exports.getResizedImagePath = function(id) {
    return TAG_TYPE_RESIZED + TAG_SPLIT + id;
}

exports.getTextPath = function(id) {
    return TAG_TYPE_TEXT + TAG_SPLIT + id;
}

exports.uploadPost = function(id, textData, resizedImageData, imageData) {
        var deferred = $.Deferred();

        var deferredText = null;
        var deferredFullImage = null;
        var deferredResizedImage = null;

        if (textData) {
            deferredText = exports.uploadDropbox(exports.getTextPath(id),textData).then(exports.shareDropbox);
        }
        if (resizedImageData) {
            deferredResizedImage = exports.uploadDropbox(exports.getResizedImagePath(id), resizedImageData).then(exports.shareDropbox);
        }
        if (imageData) {
            deferredFullImage = exports.uploadDropbox(exports.getFullImagePath(id), imageData).then(exports.shareDropbox);
        }

        $.when(deferredText, deferredResizedImage, deferredFullImage).done(function(textUrl, resizedImageUrl, imageUrl){

            var update = {};

            console.log(textUrl);
            console.log(resizedImageUrl);
            console.log(imageUrl );

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