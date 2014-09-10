define(function() {
    'use strict';

    var exports = {};

    exports.getNaturalSize = function(img) {
        var image = new Image();
        image.src = $(img).attr("src");
        return { width: image.naturalWidth,
                 height: image.naturalHeight};
    };

    exports.cropAndResize = function(image, maxWidth, maxHeight, cropX, cropY, cropWidth, cropHeight) {

        var width = cropWidth;
        var height = cropHeight;

        if (width > height) {
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
        }
        else {
            if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
            }
        }

        var canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;
        var canvasContext = canvas.getContext("2d");

        canvasContext.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg");
    };

    exports.resize = function(image, maxWidth, maxHeight) {

        var width = image.width;
        var height = image.height;

        if (width > height) {
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
        }
        else {
            if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
            }
        }

        var canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;
        var canvasContext = canvas.getContext("2d");

        canvasContext.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg");
    };

    return exports;

});