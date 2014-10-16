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
      templateHelpers: {
          sumUpvotes: function(){
              var sum = this.friendUpvotes.length;
              if (this.upvoted) {
                  sum++;
              }
              return sum;
          }
      },

      childView: UpvoteView,

      childViewContainer: "#upvotes",
      modelEvents: {
          "change": "render"
      },
      collectionEvents: {
          "add": "delayedRender",
          "remove": "delayedRender"
      },
      // we need this because standard render fires before
      // compositeview adds child to the view, resulting in duplicates
      delayedRender: function() {
          var view = this;
          setTimeout(function(){view.render()}, 0);
      }

  });
  return UpvotesView;
});
