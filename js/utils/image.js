define(function() {
    'use strict';

    var exports = {};

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