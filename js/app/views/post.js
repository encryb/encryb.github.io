define([
    'jquery',
    'underscore',
    'backbone',
    'app/views/modals',
    'require-text!app/templates/post.html'

], function($, _, Backbone, Modals, PostTemplate){

    var PostView = Backbone.View.extend({

        template: _.template( PostTemplate ),

        initialize: function() {
            this.updateJson();
            this.listenTo(this.model, 'change', this.updateJsonAndRender);
            this.model.fetchPost(false);
        },

        updateJsonAndRender: function() {
            this.updateJson();
            this.render();
        },

        updateJson: function(){
            var json = this.model.toJSON({full:true});
            if('profilePictureUrl' in this.options) {
                json['profilePictureUrl'] = this.options['profilePictureUrl'];
            }
            if ('myPost' in this.options) {
                json['myPost'] = this.options['myPost'];
            }

            this.json = json;

        },

        render: function() {

            this.$el.html( this.template( this.json ) );
            return this;
        },

        events: {
            "click #resizedImage": "showImage",
            "click #deletePost": "deletePost"
        },

        showImage: function(){
            Modals.showImage(this.model);
        },

        deletePost: function() {
            this.model.destroy();
        }
    });
    return PostView;
});