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
            this.listenTo(this.model, 'change', this.render);
            this.model.fetchPost(false);
        },

        render: function() {
            var model = this.model.toJSON({full:true});
            if('profilePictureUrl' in this.options) {
                model['profilePictureUrl'] = this.options['profilePictureUrl'];
            }
            if ('myPost' in this.options) {
                model['myPost'] = this.options['myPost'];
            }
            this.$el.html( this.template( model ) );
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