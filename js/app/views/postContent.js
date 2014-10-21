define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'jquery.swipebox',
    'autolinker',
    'app/app',
    'utils/misc',
    'require-text!app/templates/postContent.html'

], function($, _, Backbone, Marionette, Swipebox, Autolinker, App, MiscUtils, PostContentTemplate){

    var PostContentView = Marionette.ItemView.extend({

        template: _.template( PostContentTemplate ),
        templateHelpers: {
            prettyTime: function() {
                return MiscUtils.formatTime(this.created);
            },
            formatText: function() {
              if (!this.hasOwnProperty('textData')) {
                  return "";
              }
              return Autolinker.link(this.textData);
            },
            permissionsIcon: function() {
                if (!this.permissions || this.permissions.length == 0) {
                    return "img/sharedNot.png";
                }
                if (this.permissions.indexOf("all") >= 0) {
                    return "img/sharedAll.png";
                }
                return "img/sharedSome.png"
            }
        },

        initialize: function() {
            this.model.fetchPost(false);
            this.listenTo(this.model.get("poster"), "change", this.render);
        },

        'modelEvents': {
            'change': 'render'
        },

        events: {
            "click #resizedImage": "showImage",
            "click .post-thumbnail": "clickedPosterPicture"
        },

        showImage: function(){
            var view = this;
            $.swipebox(
                [
                    { href: "img/swipebox/loader.gif", title: view.model.get('textData') }
                ] );

            $.when(this.model.fetchPost(true)).done(function(){
                if ($.swipebox.isOpen) {
                    $.swipebox.close();
                    $.swipebox(
                        [
                            { href: view.model.get('fullImageData'), title: view.model.get('textData') }
                        ]);
                }

            });
        },

        clickedPosterPicture: function() {
            if (this.model.get("myPost")) {
                return false;
            }
            App.vent.trigger("friend:selected", this.model.get("poster"));
        }


    });
    return PostContentView;
});