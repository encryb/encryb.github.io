define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'app/views/modals',
  'require-text!app/templates/friend.html'

], function($, _, Backbone, Marionette, Modals, FriendTemplate) {


  var FriendView = Marionette.ItemView.extend({

    // Cache the template function for a single item.
    template: _.template( FriendTemplate ),

    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
    },

    events: {
      "click #editFriend": "editFriend",
      "click #filterFriend": "filterFriend",
      "click #removeFriend": "removeFriend"
    },

    filterFriend: function(){
        console.log("Filter");
    },

    editFriend: function() {
        Modals.showFriend(this.model);
    },

    removeFriend: function() {
        this.model.destroy();
    }
  });
  return FriendView;
});
