define([
    'jquery',
    'underscore',
    'backbone',
    'bootbox',
    'dropzone',
    'marionette',
    'selectize',
    'app/app',
    'app/adapters/post',
    'app/models/post',
    'compat/windowUrl',
    'utils/image',
    'require-text!app/templates/createPost.html'

], function($, _, Backbone, Bootbox, Dropzone, Marionette, Selectize, App,
            PostAdapter, Post, WindowUrl, ImageUtil, CreatePostTemplate){

    var NewPostView = Marionette.CompositeView.extend({
        template: _.template( CreatePostTemplate ),

        initialize: function() {
            this.listenTo(this.options.permissions, "add", this.permissionAdded);
            this.listenTo(this.options.permissions, "remove", this.permissionRemoved);

        },

        ui: {
            postSubmitButton: '#postSubmitButton',
            newPostTrigger: '#newPostTrigger',
            newPostText: '#newPostText',
            newPostForm: '#newPostForm',
            newPostDiv: '#newPostDiv',
            permissions: "#permissions",
            loadingImage: ".loading-img",
            dropzone: ".dropzone"
        },

        events: {
            'submit form': 'createPost',
            'focus @ui.newPostTrigger' : "expendForm"
        },

        onRender: function(){

            this.setupPermissionTags();

            this.setupFileDropzone();
        },

        permissionAdded: function(permission) {
            var selectize = this.ui.permissions[0].selectize;
            selectize.addOption(permission.toJSON());
            selectize.refreshOptions(true);
        },


        // $TODO: figure out why removal doesn't work
        permissionRemoved: function(permission) {
            var selectize = this.ui.permissions[0].selectize;
            selectize.removeOption(permission.toJSON());
            selectize.refreshOptions(true);
        },

        // $TODO: this should be moved outside of the view
        createPost: function(event) {
            event.preventDefault();

            this.ui.postSubmitButton.addClass("hide");
            this.ui.loadingImage.removeClass("hide");

            setTimeout(this._createPost.bind(this), 0);
        },

        _createPost: function() {
            var createPostView = this;

            var selectize = this.ui.permissions[0].selectize;
            var permissions = selectize.getValue();

            var date = new Date().getTime();

            var files = this.dropzone.files;

            var post = {created: date};
            if (permissions.length > 0) {
                post['permissions'] = permissions;
            }
            var text = this.ui.newPostText.val();
            if (text.length > 0) {
                post['text'] = text;
            }

            var contentList = [];

            var deferreds = [];
            for (var i=0; i < files.length; i++) {
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

                    image.onload = (function(_image, _loadDeferred, _content) {
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
                    var video =  document.createElement('video');
                    video.src = WindowUrl.createObjectURL(file);

                    $(video).one("loadedmetadata", function(_video, _file, _loadDeferred, _content) {
                        return function() {
                            $(_video).one("seeked", function() {
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

            $.when.apply($, deferreds).done(function() {
                var creationDeferred = $.Deferred();
                App.vent.trigger("post:created", post, contentList, creationDeferred);

                $.when(creationDeferred).done(function () {
                    createPostView.ui.newPostForm.trigger('reset');
                    createPostView.ui.newPostDiv.removeClass("in");
                    createPostView.ui.newPostTrigger.show();

                    createPostView.ui.postSubmitButton.removeClass("hide");
                    createPostView.ui.loadingImage.addClass("hide");

                    createPostView.dropzone.removeAllFiles();

                    selectize.clear();
                });
            });
        },

        expendForm: function() {
            this.ui.newPostDiv.addClass("in");
            this.ui.newPostTrigger.hide();
        },

        setupPermissionTags: function() {
            var perms = this.options.permissions.toJSON();
            var selectDiv = this.ui.permissions.selectize({
                plugins: ['remove_button'],
                delimiter: ',',
                persist: false,
                valueField: "id",
                labelField: "display",
                searchField: "display",
                options: perms,
                create: false
            });

            var selectize = selectDiv[0].selectize;
            selectize.addItem("all");
        },

        setupFileDropzone: function() {
            Dropzone.autoDiscover = false;
            this.dropzone = new Dropzone(this.ui.dropzone.get(0), {
                autoProcessQueue: false,
                url: "nope",
                addRemoveLinks: true,
                thumbnailWidth: 120,
                maxThumbnailFilesize: 40,
                dictRemoveFile: '<span class="glyphicon glyphicon-remove" aria-hidden="true"></span>'
            });
            this.dropzone.on("addedfile", function(file) {

                file._captionLink = Dropzone.createElement("<a class=\"dz-caption\" href=\"javascript:undefined;\" data-dz-caption>" +
                '<span class="glyphicon glyphicon-comment" aria-hidden="true"></span>' + "</a>");
                file.previewElement.appendChild(file._captionLink);

                var captionFileEvent = (function() {
                    return function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        Bootbox.prompt({
                            title: "Caption:",
                            value: file.caption ? file.caption: "",
                            inputType: "textarea",
                            callback : function(result) {
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
        }
    });
    return NewPostView;
});