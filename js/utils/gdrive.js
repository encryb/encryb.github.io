
define(      [

], function(){
	"use strict";

	function quoteString(input) {
	    return "'" + input + "'";
	}

	var d = {};

	d.getFilePermissions = function(file, callback) {
		var permissionRequest = gapiDrive.permissions.list({
			'fileId': file
		});
		permissionRequest.execute(function(resp) {
            if (resp.error) {
                callback(null);
            }
            return callback(resp.items);
		});
	}

	d.addPermissions = function(file, user) {
		var body = {
			"role": "reader",
			"type": "user",
			"value": user
		};
		var grantRequest = gapiDrive.permissions.insert({
			'fileId': file.id,
			'sendNotificationEmails': false,
			'resource': body
		});
		grantRequest.execute(function(resp) {
			console.log(resp);
		});
	}

	d.getOrCreateFile = function(parentFolder, title, mimeType, callback) {

		var filter = "title contains " + quoteString(title) +
			" and trashed = false" +
			" and mimeType = " + quoteString(mimeType);
		var listRequest = gapiDrive.children.list({
			'folderId' : parentFolder,
			'q': filter
		});

		listRequest.execute(function(resp) {
			var files = resp.items;

			if (!files || files.length == 0) {
				console.log("Creating " + parentFolder);
				d.createFile(parentFolder, title, mimeType, callback);
			}
			else {
				var file = files[0];
                console.log("Title is " + title  + " .File ID is " + file.id);
				callback(file.id);
			}
		});
	}

    d.listFilesInExternalFolder = function(folderId) {
        var deferred = $.Deferred();

        gapiDrive.files.get({fileId:fileId}).execute(function(resp) {
            var files = JSON.parse(resp.description);
            var deferreds = [];
            for (var i = 0; i < files.length; i++) {
                var file
            }
            deferred.resolve(resp.description);
        });
    }

	d.listFilesInFolder = function(folder, callback) {
		var query = "trashed = false and " +
			quoteString(folder) + " in parents";
		var listRequest = gapiDrive.files.list({
			//'folderId' : contentFolder,
			'q' :  query
		});
		listRequest.execute(function(resp) {
			var files = resp.items;
			if (!files)
				return;
			callback(files);
		});
	}

	d.createFile = function(parentFolder, title, mimeType, callback) {
		var parents = [
		{
			'id' : parentFolder
		}];
		var body = {
			'parents' : parents,
			'title' : title,
			'mimeType' : mimeType
		};

		var createFolderRequest = gapiDrive.files.insert({
			'resource': body
		});

		createFolderRequest.execute(function(resp){
            d.addPermissions(resp, "test@bor.as");
			callback(resp.id);
		});

	}

	d.uploadFile = function(contentFolder, name, contentType, data) {
        var deferred = $.Deferred();

		var boundary = '-------314159265358979323846';
		var delimiter = "\r\n--" + boundary + "\r\n";
		var close_delim = "\r\n--" + boundary + "--";

		var parents = [
		{
			'id' : contentFolder
		}];
		var metadata = {
			'parents' : parents,
			'title': name,
			'mimeType': contentType
		};
		var multipartRequestBody =
			delimiter +
			'Content-Type: application/json\r\n\r\n' +
			JSON.stringify(metadata) +
			delimiter +
			'Content-Type: ' + contentType + '\r\n' +
			'Content-Transfer-Encoding: base64\r\n' +
			'\r\n' +
			data +
			close_delim;

		var request = gapi.client.request({
			'path': '/upload/drive/v2/files',
			'method': 'POST',
			'params': {
				'uploadType': 'multipart'
			},
			'headers': {
				'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
			},
			'body': multipartRequestBody
		});
		var callback = function(file) {
            deferred.resolve(file);
        };
		
		request.execute(callback);
        return deferred;
	}

    d.downloadDriveFile = function(fileId, isBinary, callback) {
        var request = gapiDrive.files.get( {
            'fileId' : fileId
        });

        request.execute(function(resp) {
            d.downloadFile(resp.downloadUrl, isBinary, callback);
        });

    }
	d.downloadFile = function(downloadUrl, isBinary, callback) {
		var accessToken = gapi.auth.getToken().access_token;
		var xhr = new XMLHttpRequest();
        if (isBinary) {
		    xhr.responseType = 'arraybuffer';
        }
		xhr.open('GET', downloadUrl);
		xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
		xhr.onload = function() {
			callback(xhr.response);
		};
		xhr.onerror = function() {
			callback(null);
		};
		xhr.send();
	}

	return d;
});