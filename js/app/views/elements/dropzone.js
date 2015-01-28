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
            for (var i = 0; i < files.length; i++) {
                var file = files[i];

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

                    image.onload = (function (_image, _loadDeferred, _content) {
                        return function () {
                            var resized = ImageUtil.resize(_image, 1920, 1440);
                            WindowUrl.revokeObjectURL(image.src);
                            _content['thumbnail'] = resized.thumbnail;
                            _content['image'] = resized.fullsize;
                            _loadDeferred.resolve();
                        };
                    }(image, loadDeferred, content));
                }
                else if (file.type.match(/video.*/)) {
                    var video = document.createElement('video');
                    video.src = WindowUrl.createObjectURL(file);

                    $(video).one("loadedmetadata", function (_video, _file, _loadDeferred, _content) {
                        return function () {
                            $(_video).one("seeked", function () {
                                var frame = ImageUtil.captureFrame(_video, 480, 360);
                                WindowUrl.revokeObjectURL(video.src);
                                _content['video'] = _file;
                                _content['thumbnail'] = frame;
                                _loadDeferred.resolve();
                            });
                            _video.currentTime = _video.duration / 3;
                        };
                    }(video, file, loadDeferred, content));
                }
                else {
                    content['data'] = file;
                    content['filename'] = file.name;
                    loadDeferred.resolve();
                }
                contentList.push(content);
            }

            $.when.apply($, deferreds).done(function () {
                deferred.resolve(contentList);
            });

            return deferred.promise();
        }
    });

    return DropzoneView;

});