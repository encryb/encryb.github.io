define([
  'backbone',
  'app/collections/encryptedDatastore'
], function(Backbone, EncryptedDatastore){

var Comments = Backbone.Collection.extend({

    model: Backbone.Model,

    dropboxDatastore: new EncryptedDatastore('Comments_2'),

    initialize: function () {
        this.dropboxDatastore.syncCollection(this);
    },

    addComment: function (postId, text, date) {
        this.create({postId: postId, text: text, date: date}, {wait:true});
    },

    removeComment: function(postId, commentId) {
        var comment = this.findWhere({postId: postId, commentId: commentId});
        if (comment) {
            comment.destroy();
        }
    },
    hasComment: function(postId) {
        var comment = this.findWhere({postId: postId});
        return comment;
    }
});

return Comments;
});
