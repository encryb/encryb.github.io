define([
  'backbone',
  'app/models/post',
  'app/services/dropbox'
], function(Backbone, Post, Dropbox){

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
