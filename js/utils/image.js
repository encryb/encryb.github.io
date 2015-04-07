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

            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
            }

            var canvas = document.createElement("canvas");

            canvas.width = width;
            canvas.height = height;
            var canvasContext = canvas.getContext("2d");

            canvasContext.drawImage(image, 0, 0, canvas.width, canvas.height);
            var fullsize =  canvas.toDataURL("image/jpeg");

            var thumbMaxWidth = 600;
            var thumbMaxHeight = 900;

            if (thumbMaxHeight >= height && thumbMaxWidth >= width) {
                return { thumbnail: fullsize };
            }

            var thumbWidth, thumbHeight;
            if (width >= height) {
                thumbWidth = Math.min(thumbMaxWidth, width);
                thumbHeight = thumbWidth * (height / width);
            }
            else {
                thumbHeight = Math.min(thumbMaxHeight, height);
                thumbWidth = thumbHeight * (width / height);
            }
            
            var canvasScale = 1;
            var thumbCanvas;

            
            if (thumbHeight * 2 > height) {
                thumbCanvas = canvas;
            }
            else {
                thumbCanvas = document.createElement('canvas');
                var thumbContext = thumbCanvas.getContext('2d');

                // scale to 50%
                thumbCanvas.width = width * 0.5;
                thumbCanvas.height = height * 0.5;
                thumbContext.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);

                if (thumbHeight * 4 < height) {
                    canvasScale = 0.5;
                    // scale to 25%
                    // reuse the same canvas, but just use top left quadrant 
                    thumbContext.drawImage(thumbCanvas, 0, 0,
                        thumbCanvas.width * canvasScale, thumbCanvas.height * canvasScale);
                }
            }
            var saveCanvas = document.createElement('canvas');
            var saveContext = saveCanvas.getContext('2d');

            saveCanvas.width = thumbWidth;
            saveCanvas.height = thumbHeight;

            saveContext.drawImage(thumbCanvas, 0, 0, thumbCanvas.width * canvasScale, thumbCanvas.height * canvasScale,
                                0, 0, saveCanvas.width, saveCanvas.height);
            var thumbnail = saveCanvas.toDataURL("image/jpeg");

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