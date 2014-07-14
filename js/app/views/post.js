define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'app/views/modals',
    'require-text!app/templates/post.html'

], function($, _, Backbone, Marionette, Modals, PostTemplate){

    var PostView = Marionette.ItemView.extend({

        template: _.template( PostTemplate ),

        initialize: function() {
            this.model.fetchPost(false);
        },

        serializeModel: function(model){
            var attr = _.clone(model.attributes);
            if('profilePictureUrl' in this.options) {
                attr['profilePictureUrl'] = this.options['profilePictureUrl'];
            }
            if ('myPost' in this.options) {
                attr['myPost'] = this.options['myPost'];
            }
            return attr;
        },

        'modelEvents': {
            'change': 'render'
        },

        events: {
            "click #resizedImage": "showImage",
            "click #deletePost": "deletePost"
        },

        showImage: function(){
            Modals.showImage(this.model);
        },

        deletePost: function() {
            this.trigger("post:delete");
            this.model.deletePost();
        }
    });
    return PostView;
});