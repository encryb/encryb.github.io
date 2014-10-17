define([
    'jquery',
    'underscore',
    'backbone',
    'jasny-bootstrap',
    'marionette',
    'selectize',
    'app/app',
    'app/models/post',
    'utils/image',
    'require-text!app/templates/createPost.html'

], function($, _, Backbone, JasnyBootsrap, Marionette, Selectize, App, Post, ImageUtil, CreatePostTemplate){

    var NewPostView = Marionette.CompositeView.extend({
        template: _.template( CreatePostTemplate ),

        initialize: function() {
            this.listenTo(this.options.permissions, "add", this.permissionAdded);
            this.listenTo(this.options.permissions, "remove", this.permissionRemoved);

            this.on("post:submit", function(post){
                App.state.myPosts.create(post, {wait:true});
                App.vent.trigger("post:created");
                //App.state.saveManifests();
            });
        },

        ui: {
            postSubmitButton: '#postSubmitButton',
            newPostTrigger: '#newPostTrigger',
            newPostText: '#newPostText',
            newPostImage: '#newPostImage',
            newPostForm: '#newPostForm',
            newPostDiv: '#newPostDiv',
            permissions: "#permissions",
            loadingImage: ".loading-img"
        },

        events: {
            'submit form': 'createPost',
            'focus @ui.newPostTrigger' : "expendForm"
        },

        onRender: function(){
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


        createPost: function(event) {
            event.preventDefault();

            this.ui.postSubmitButton.addClass("hide");
            this.ui.loadingImage.removeClass("hide");

            var selectize = this.ui.permissions[0].selectize;

            var post = new Post();
            var date = new Date().getTime();
            post.set({created: date, permissions: selectize.getValue()});

            var postText = this.ui.newPostText.val();
            if (postText && postText.length > 0) {
                post.set({hasText: true, textData: postText});
            }

            var imageElement = this.ui.newPostImage.children()[0] ;
            if (imageElement) {
                var resizedData = ImageUtil.resize(imageElement, 300, 300);
                var fullsizeData = ImageUtil.resize(imageElement, 1920, 1440);
                post.set({hasImage: true, resizedImageData: resizedData, fullImageData: fullsizeData });
            }

            var newPostView = this;
            post.uploadPost().done(function() {
                newPostView.ui.newPostForm.trigger('reset');
                newPostView.ui.newPostDiv.removeClass("in");
                newPostView.ui.newPostTrigger.show();

                newPostView.ui.postSubmitButton.removeClass("hide");
                newPostView.ui.loadingImage.addClass("hide");

                newPostView.trigger("post:submit", post);

                selectize.clear();
            });

        },

        expendForm: function() {
            this.ui.newPostDiv.addClass("in");
            this.ui.newPostTrigger.hide();
        }
    });
    return NewPostView;
});