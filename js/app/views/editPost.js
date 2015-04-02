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
    'app/views/elements/fileThumbnail',
    'app/views/elements/imageThumbnail',
    'app/views/elements/dropzone',
    'compat/windowUrl',
    'utils/image',
    'require-text!app/templates/editPost.html'
], function($, _, Backbone, Bootbox, Dropzone, Marionette, Selectize, App,
            PostAdapter, Post, FileThumbnailView, ImageThumbnailView, DropzoneView, WindowUrl, ImageUtil, EditPostTemplate){


    var EditPostView = Marionette.LayoutView.extend({
        template: _.template( EditPostTemplate ),

        regions: {
            "dropzone": ".dropzoneRegion"
        },

        initialize: function() {
            this.listenTo(this.options.permissions, "add", this.permissionAdded);
            this.listenTo(this.options.permissions, "remove", this.permissionRemoved);
        },

        ui: {
            cancelButton: '#postEditCancelButton',
            editPostText: '#editPostText',
            permissions: "#permissions",
            loadingImage: ".loading-img",
            buttons: '.btn-group',
            editImages: '.editImages',
            editFiles: '.editFiles'
        },

        events: {
            'click @ui.cancelButton': 'cancelEdit',
            'submit form': 'editPost'
        },

        onRender: function(){
            this.setupPermissionTags();
        },

        onShow: function() {

            this.dropzoneView = new DropzoneView();
            this.dropzone.show(this.dropzoneView);

            var editImagesElement = this.ui.editImages;
            var editFilesElement = this.ui.editFiles;
            var imageChildren = [];
            var fileChildren = [];

            if (this.model.has("content")) {
                var password = this.model.get("password");
                var collection = this.model.get("content");
                collection.each(function (model, index) {
                    if (model.has("thumbnailUrl") || model.has("videoFramesUrl")) {
                        var imageView = new ImageThumbnailView({model: model, removable: true});
                        var imageElement = imageView.render().el;
                        $(imageElement).addClass("square square32");
                        editImagesElement.append(imageElement);
                    }
                    else if (model.has("filename")) {
                        var fileView = new FileThumbnailView({model: model, removable: true, password: password});
                        var fileElement = fileView.render().el;
                        editFilesElement.append(fileElement);
                    }
                }, this);
            }
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
        editPost: function(event) {
            event.preventDefault();

            this.ui.buttons.addClass("hide");
            this.ui.loadingImage.removeClass("hide");

            setTimeout(this._createPost.bind(this), 0);
        },


        _createPost: function() {

            var selectize = this.ui.permissions[0].selectize;
            var permissions = selectize.getValue();

            var changes = {};
            if (!_.isEqual(this.model.get("permissions"), permissions)) {
                changes['permissions'] = permissions;
            }


            var text = this.ui.editPostText.val();
            if (text != this.model.get("text")) {
                changes['text'] = text;
            }

            var deletedContentList = [];
            if (this.model.has("content")) {
                this.model.get("content").each(function(content){
                    if (content.get("deleted")) {
                        deletedContentList.push(content);
                    }
                });
            }

            $.when(this.dropzoneView.getContent()).done(function(addedContentList) {
                App.vent.trigger("post:edited", changes, addedContentList, deletedContentList);
            });
        },

        cancelEdit: function () {
            App.vent.trigger("post:edit:canceled");
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
            selectize.addItems(this.model.get("permissions"));
        }

    });
    return EditPostView;
});