define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'marionette',
    'cloudGrid',
    'jquery.swipebox',
    'autolinker',
    'app/app',
    'app/adapters/post',
    'utils/misc',
    'require-text!app/templates/postImage.html',
    'require-text!app/templates/postFile.html',
    'require-text!app/templates/postContent.html'
], function($, _, Backbone, Bootsrap, Marionette, CloudGrid, Swipebox, Autolinker, App, PostAdapter, MiscUtils,
            PostImageTemplate, PostFileTemplate, PostContentTemplate){


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

        ui: {
            postImages: '.postImages',
            postFiles: '.postFiles'
        },

        modelEvents: {
            'change': 'render'
        },

        events: {
            "click .post-thumbnail": "clickedPosterPicture"
        },

        initialize: function() {
            this.listenTo(this.model.get("poster"), "change", this.render);
        },

        postFileTemplate: _.template(PostFileTemplate),
        postImageTemplate: _.template(PostImageTemplate),

        onRender: function() {

            var postImagesElement = this.ui.postImages;
            var postFilesElement = this.ui.postFiles;
            var imageChildren = [];
            var fileChildren = [];

            if (this.model.has("content")) {
                var password = this.model.get("password");
                var collection = this.model.get("content");
                var isFirst = true;
                collection.each(function (model, index) {
                    if (model.has("thumbnail")) {
                        var imageElement = $(this.postImageTemplate(model.attributes));
                        imageElement.click(function () {
                            this.showImage(index);
                        }.bind(this));

                        imageElement.css("background-image", "url(" + model.escape("thumbnail") + ")");
                        imageElement.css("background-size", "100% auto");
                        var ratio = model.resizedWidth / model.resizedHeight;
                        var cols, rows;
                        if (ratio > 2) {
                            cols = 8;
                            rows = 4;
                        }
                        else if (ratio < 1) {
                            cols = 6;
                            rows = 8;
                        }
                        else {
                            cols = 7;
                            rows = 4;
                        }
                        if (isFirst) {
                            if (ratio >= 1) {
                                cols = cols * 2;
                                rows = rows * 2;
                            }
                            isFirst = false;
                        }
                        $.data(imageElement, 'grid-columns', cols);
                        $.data(imageElement, 'grid-rows', rows);
                        postImagesElement.append(imageElement);
                        imageChildren.push(imageElement);
                    }
                    if (model.has("filename")) {
                        var fileElement = $(this.postFileTemplate(model.attributes));
                        fileElement.click(function () {
                            if (!model.has("data")) {
                                fileElement.find(".downloadImage").addClass("hide");
                                fileElement.find(".downloadLoadingImage").removeClass("hide");
                            }
                            App.vent.trigger("file:download", model, password);
                        }.bind(this));

                        this.listenTo(model, "change:data", function() {
                            fileElement.find(".downloadLoadingImage").addClass("hide");
                            fileElement.find(".downloadDoneImage").removeClass("hide");
                        });

                        $.data(fileElement, 'grid-columns', 6);
                        $.data(fileElement, 'grid-rows', 4);
                        postFilesElement.append(fileElement);
                        fileChildren.push(fileElement);
                    }
                }, this);
            }

            setTimeout(function () {
                postImagesElement.cloudGrid({
                    children: imageChildren,
                    gridGutter: 3,
                    gridSize: 20
                });

                postFilesElement.cloudGrid({
                    children: fileChildren,
                    gridGutter: 3,
                    gridSize: 25
                });

                $(window).on('resize', function () {
                    postImagesElement.cloudGrid('reflowContent');
                    postFilesElement.cloudGrid('reflowContent');
                })
            }, 0);
        },

        showImage: function(index){
            var swipeboxArgs = [];
            this.model.get("content").each(function(content) {
                swipeboxArgs.push({href:content.getFullImage(),title:content.get("caption")|| ""})
            });
            $.swipebox(swipeboxArgs, {initialIndexOnArray:index});
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