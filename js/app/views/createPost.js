define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'selectize',
    'app/app',
    'app/adapters/post',
    'app/models/post',
    'app/views/elements/dropzone',
    'compat/windowUrl',
    'utils/image',
    'require-text!app/templates/createPost.html'

], function($, _, Backbone, Marionette, Selectize, App,
            PostAdapter, Post, DropzoneView, WindowUrl, ImageUtil, CreatePostTemplate){

    var NewPostView = Marionette.LayoutView.extend({
        template: _.template( CreatePostTemplate ),

        regions: {
            "dropzone" : ".dropzoneRegion"
        },

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
        },

        onShow: function() {
            this.dropzoneView = new DropzoneView();
            this.dropzone.show(this.dropzoneView);
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

            var post = {created: date};
            if (permissions.length > 0) {
                post['permissions'] = permissions;
            }
            var text = this.ui.newPostText.val();
            if (text.length > 0) {
                post['text'] = text;
            }


            $.when(this.dropzoneView.getContent()).done(function(contentList) {
                var creationDeferred = $.Deferred();
                App.vent.trigger("post:created", post, contentList, creationDeferred);

                $.when(creationDeferred).done(function () {
                    createPostView.ui.newPostForm.trigger('reset');
                    createPostView.ui.newPostDiv.removeClass("in");
                    createPostView.ui.newPostTrigger.show();

                    createPostView.ui.postSubmitButton.removeClass("hide");
                    createPostView.ui.loadingImage.addClass("hide");

                    createPostView.dropzoneView.dropzone.removeAllFiles();

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
        }
    });
    return NewPostView;
});