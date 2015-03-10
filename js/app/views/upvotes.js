define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'app/app',
  'require-text!app/templates/upvote.html',
  'require-text!app/templates/upvotes.html'

], function($, _, Backbone, Marionette, App, UpvoteTemplate, UpvotesTemplate) {

  var UpvoteView = Marionette.ItemView.extend({
      template: _.template( UpvoteTemplate ),

      tagName: "span",

      ui: {
          upvotePicture: '.upvote-thumbnail'
      },

      events: {
          'click @ui.upvotePicture': 'clickedUpvotePicture'
      },

      clickedUpvotePicture: function() {
          App.vent.trigger("friend:selected", this.model);
      }
  });

  var UpvotesView = Marionette.CompositeView.extend({
      template: _.template( UpvotesTemplate ),
      templateHelpers: function() {
          var friends = this.model.get("friendUpvotes");
          return {
              sumUpvotes: function(){
                  var sum = friends.length;
                  if (this.upvoted) {
                      sum++;
                  }
                  return sum;
              }
          }
      },

      childView: UpvoteView,

      childViewContainer: "#upvotes",

      _initialEvents: function() {
      },
      modelEvents: {
          "change": "render"
      },
      collectionEvents: {
          "add": "render",
          "remove": "render"

      }
  });
  return UpvotesView;
});
