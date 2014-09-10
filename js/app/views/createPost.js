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
                App.state.saveManifests();
            });
        },

        events: {
            'submit form': 'createPost',
            'focusin #newPostTrigger' : "expendForm"
        },

        onRender: function(){
            var perms = this.options.permissions.toJSON();
            this.ui.permissions.selectize({
                plugins: ['remove_button'],
                delimiter: ',',
                persist: false,
                valueField: "id",
                labelField: "display",
                searchField: "display",
                options: perms,
                create: false
            });

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


        ui: {
            newPostTrigger: '#newPostTrigger',
            newPostText: '#newPostText',
            newPostImage: '#newPostImage',
            newPostForm: '#newPostForm',
            newPostDiv: '#newPostDiv',
            permissions: "#permissions"
        },

        createPost: function(event) {
            event.preventDefault();

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
                var resizedData = ImageUtil.resize(imageElement, 400, 300);
                var fullsizeData = imageElement.src;
                post.set({hasImage: true, resizedImageData: resizedData, fullImageData: fullsizeData });
            }

            var newPostView = this;
            post.uploadPost().done(function() {
                newPostView.ui.newPostForm.trigger('reset');
                newPostView.ui.newPostDiv.removeClass("in");
                newPostView.ui.newPostTrigger.show();
                newPostView.trigger("post:submit", post);

                selectize.clear();
            });

            console.log("Clicked post " + event);
        },

        expendForm: function() {
            event.preventDefault();
            this.ui.newPostDiv.addClass("in");
            this.ui.newPostTrigger.hide();
        }
    });
    return NewPostView;
});