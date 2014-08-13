define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'app/views/modals',
    'require-text!app/templates/postContent.html'

], function($, _, Backbone, Marionette, Modals, PostContentTemplate){

    var PostView = Marionette.ItemView.extend({

        template: _.template( PostContentTemplate ),

        initialize: function() {
            this.model.fetchPost(false);
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
        }

    });
    return PostView;
});