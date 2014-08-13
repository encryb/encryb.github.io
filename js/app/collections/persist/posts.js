define([
  'backbone',
  'app/storage',
  'app/models/post'
], function(Backbone, storage, Post){

var Posts = Backbone.Collection.extend({
    model: Post,

    dropboxDatastore: new Backbone.DropboxDatastore('Version_10'),

    initialize: function() {
        this.dropboxDatastore.syncCollection(this);
    },

    comparator: function(post) {
        return -post.get('created');
    }
})

return Posts;
});
