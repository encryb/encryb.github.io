define([
  'backbone',
  'app/collections/encryptedDatastore'
], function(Backbone, EncryptedDatastore){

var Upvotes = Backbone.Collection.extend({

    model: Backbone.Model,

    dropboxDatastore: new EncryptedDatastore('Upvotes_2'),

    initialize: function () {
        this.dropboxDatastore.syncCollection(this);
    },

    addUpvote: function (postId) {
        this.create({postId: postId});
    },
    removeUpvote: function (postId) {
        var upvote = this.findWhere({postId: postId});
        if (upvote) {
            upvote.destroy();
        }
    },
    isUpvoted: function (postId) {
        var upvote = this.findWhere({postId: postId});
        if (upvote) {
            return true;
        }
        return false;
    },
    toggleUpvote: function(postId) {
        if (this.isUpvoted(postId)) {
            this.removeUpvote(postId);
        }
        else {
            this.addUpvote(postId);
        }
    }
});

return Upvotes;
});
