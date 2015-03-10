define(function() {
    'use strict';


    var ImageUtil = {

        getNaturalSize: function(src) {
            var deferred = $.Deferred();
            var image = new Image();
            image.onload = function() {
                deferred.resolve({
                    width: image.naturalWidth,
                    height: image.naturalHeight
                });
            };
            image.src = src;
            return deferred;
        },

        cropAndResize: function(image, maxWidth, maxHeight, cropX, cropY, cropWidth, cropHeight) {

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
        },

        resize: function(image, maxWidth, maxHeight) {

            var width = image.naturalWidth;
            var height = image.naturalHeight;

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
            var fullsize =  canvas.toDataURL("image/jpeg");

            var thumbscale = maxWidth < maxHeight ? 4 : 6;

            maxWidth = maxWidth / thumbscale;
            maxHeight = maxHeight / thumbscale;
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


            canvas.width = width;
            canvas.height = height;
            var canvasContext2 = canvas.getContext("2d");

            canvasContext2.drawImage(image, 0, 0, canvas.width, canvas.height);
            var thumbnail = canvas.toDataURL("image/jpeg");

            return {thumbnail: thumbnail, fullsize: fullsize};

        },


        captureFrame: function(video, maxWidth, maxHeight) {

            var width = video.videoWidth;
            var height = video.videoHeight;

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

            canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
            var fullsize =  canvas.toDataURL("image/jpeg");

            return fullsize;
        }
    }
    return ImageUtil;

});