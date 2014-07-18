define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'selectize',
    'app/models/post',
    'utils/image',
    'require-text!app/templates/newPost.html'

], function($, _, Backbone, Marionette, Selectize, Post, ImageUtil, NewPostTemplate){

    var PermissionItemView = Marionette.ItemView.extend({
        template: _.template("<%= display %>"),
        tagName: "option",
        onRender: function(){
            this.$el.attr('value', this.model.get('id'));
        }
    });

    var NewPostView = Marionette.CompositeView.extend({
        template: _.template( NewPostTemplate ),

        initialize: function() {
            this.listenTo(this.options.permissions, "add", this.permissionAdded);

        },

        events: {
            'submit form': 'createPost'
        },



        onRender: function(){
            var perms = this.options.permissions.toJSON();
            this.ui.permissions.selectize({
                plugins: ['remove_button'],
                delimiter: ',',
                persist: false,
                valueField: "id",
                labelField: "display",
                options: perms,
                create:false
            });

        },

        permissionAdded: function(permission) {
            console.log("Add Permission");
            var selectize = this.ui.permissions[0].selectize;
            selectize.addOption(permission.toJSON());
            selectize.refreshOptions();

        },

        /*
        initialize: function(){
            var model = new Backbone.Model({id: "all", name: "ALL"});

            var view = new PermissionItemView({model: model});
            this.addChild(view);
        },
        */

        /*
        serializeData: function() {

            var data = {items: Marionette.ItemView.prototype.serializeCollection(this.collection)};
            console.log(data);
            return data;
        },
        */
/*
        childView: PermissionItemView,

        childViewContainer: "select",
*/
        ui: {
            newPostText: '#newPostText',
            newPostImage: '#newPostImage',
            newPostForm: '#newPostForm',
            newPostDiv: '#newPostDiv',
            permissions: "#permissions"
        },



        createPost: function(event) {
            event.preventDefault();

            var selectize = this.ui.permissions[0].selectize;
            console.log(selectize.getValue());

            var post = new Post();
            var date = new Date().getTime();
            post.set({owner: "MEEEEEEEE", sharedDate: date, created: date});

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
                newPostView.trigger("post:submit", post);
                selectize.clear();
            });

            console.log("Clicked post " + event);
        }
    });
    return NewPostView;
});