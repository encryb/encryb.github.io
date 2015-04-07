define([
    'jquery',
    'underscore',
    'backbone',
    'bootbox',
    'dropzone',
    'marionette',
    'compat/windowUrl',
    'utils/image',
    'require-text!app/templates/elements/dropzone.html'
], function($, _, Backbone, Bootbox, Dropzone, Marionette, WindowUrl, ImageUtil, DropzoneTemplate) {

    var DropzoneView = Marionette.ItemView.extend({
        template: _.template(DropzoneTemplate),
        className: "dropzone dz-clickable",

        onRender: function() {
            this.setupFileDropzone();
        },

        setupFileDropzone: function () {
            Dropzone.autoDiscover = false;
            this.dropzone = new Dropzone(this.el, {
                autoProcessQueue: false,
                url: "nope",
                addRemoveLinks: true,
                thumbnailWidth: 120,
                maxThumbnailFilesize: 40,
                dictRemoveFile: '<span class="glyphicon glyphicon-remove" aria-hidden="true"></span>'
            });
            this.dropzone.on("addedfile", function (file) {

                file._captionLink = Dropzone.createElement("<a class=\"dz-caption\" href=\"javascript:undefined;\" data-dz-caption>" +
                '<span class="glyphicon glyphicon-comment" aria-hidden="true"></span>' + "</a>");
                file.previewElement.appendChild(file._captionLink);

                var captionFileEvent = (function () {
                    return function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        Bootbox.prompt({
                            title: "Caption:",
                            value: file.caption ? file.caption : "",
                            inputType: "textarea",
                            callback: function (result) {
                                file.caption = result;
                            }
                        });
                    };
                })(this);
                var elements = file.previewElement.querySelectorAll("[data-dz-caption]");
                var results = [];
                for (var i = 0; i < elements.length; i++) {
                    var captionLink = elements[i];
                    results.push(captionLink.addEventListener("click", captionFileEvent));
                }
                return results;
            });
        },

        getContent: function() {

            var deferred = $.Deferred();
            var files = this.dropzone.files;
            var contentList = [];
            var deferreds = [];
            files.forEach(function (file) {
                var content = {};

                var caption = file.caption;
                if (caption && caption.length > 0) {
                    content['caption'] = caption;
                }

                var loadDeferred = $.Deferred();
                deferreds.push(loadDeferred);

                if (file.type.match(/image.*/)) {
                    var image = new Image();
                    image.src = WindowUrl.createObjectURL(file);

                    image.onload = (function() {
                        var resized = ImageUtil.resize(image, 1920, 1440);
                        WindowUrl.revokeObjectURL(image.src);
                        content["thumbnail"] = resized.thumbnail;
                        if (resized.hasOwnProperty("fullsize")) {
                            content['image'] = resized.fullsize;
                        }
                        loadDeferred.resolve();
                    });
                }
                else if (file.type.match(/video.*/)) {
                    var video = document.createElement('video');
                    video.src = WindowUrl.createObjectURL(file);

                    var captureVideoFrame = function (sourceVideo, location) {
                        var deferred = $.Deferred();
                        $(sourceVideo).one("seeked", function () {
                            var frame = ImageUtil.captureFrame(video, 480, 360);
                            deferred.resolve(frame);
                        });
                        sourceVideo.currentTime = sourceVideo.duration * location;
                        return deferred.promise();
                    }

                    $(video).one("error", function () {
                        content['data'] = file;
                        content['size'] = file.size;
                        content['filename'] = file.name;
                        loadDeferred.resolve();
                    });

                    $(video).one("loadedmetadata", function () {
                        
                        // we can not parse the video properly. Store it as file.
                        if (video.videoHeight === 0 || video.videoWidth === 0) {
                            content['data'] = file;
                            content['size'] = file.size;
                            content['filename'] = file.name;
                            loadDeferred.resolve();
                            return;
                        }

                        var frames = [];
                        var addToFrames = function (frame) {
                            frames.push(frame);
                        }
                        $.when(captureVideoFrame(video, 0.1)).then(addToFrames)
                            .then(captureVideoFrame.bind(null, video, 0.25)).then(addToFrames)
                            .then(captureVideoFrame.bind(null, video, 0.40)).then(addToFrames)
                            .then(captureVideoFrame.bind(null, video, 0.55)).then(addToFrames)
                            .then(captureVideoFrame.bind(null, video, 0.70)).then(addToFrames)
                            .then(captureVideoFrame.bind(null, video, 0.85)).then(addToFrames)
                            .done(function () {
                                WindowUrl.revokeObjectURL(video.src);
                                content['video'] = file;
                                content['videoname'] = file.name;
                                content['videoFrames'] = frames;
                                loadDeferred.resolve();
                            });
                        content['duration'] = video.duration;

                    });
                }
                else {
                    content['data'] = file;
                    content['size'] = file.size;
                    content['filename'] = file.name;
                    loadDeferred.resolve();
                }
                contentList.push(content);
            });

            $.when.apply($, deferreds).done(function () {
                deferred.resolve(contentList);
            });

            return deferred.promise();
        }
    });

    return DropzoneView;

});