define([
  'jquery',
  'underscore',
  'backbone',
  'app/views/modals',
  'require-text!app/templates/friend.html'

], function($, _, Backbone, Modals, FriendTemplate) {


  var FriendView = Backbone.View.extend({


    // Cache the template function for a single item.
    template: _.template( FriendTemplate ),

    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
    },

    // Re-renders the titles of the todo item.
    render: function() {
      this.$el.html( this.template( this.model.toJSON( ) ));
      return this;
    },

    events: {
      "click #editFriend": "editFriend",
      "click #filterFriend": "filterFriend"
    },

    filterFriend: function(){
        console.log("Filter");
    },

    editFriend: function() {
        Modals.showFriend(this.model);
    }
  });
  return FriendView;
});
