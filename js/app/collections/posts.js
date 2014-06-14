define([
  'backbone',
  'app/models/post'
], function(Backbone, Post){

var Wall2 = Backbone.Collection.extend({
    model: Post,

    comparator: function(post) {
        return -post.get('created');
    }

})

return Wall2;
});
