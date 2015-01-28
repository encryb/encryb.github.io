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
    'app/views/fileThumbnail',
    'app/views/imageThumbnail',
    'utils/misc',
    'require-text!app/templates/postContent.html'
], function($, _, Backbone, Bootsrap, Marionette, CloudGrid, Swipebox, Autolinker, App, PostAdapter,
            FileThumbnailView, ImageThumbnailView,
            MiscUtils, PostContentTemplate){

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
            this.listenTo(this.model.get("content"), "add", this.render);
            this.listenTo(this.model.get("content"), "remove", this.render);


            var onResize = function() {
                var postImagesElement = this.ui.postImages;
                var postFilesElement = this.ui.postFiles;
                if (postImagesElement) {
                    postImagesElement.cloudGrid('reflowContent');
                }
                if (postFilesElement) {
                    postFilesElement.cloudGrid('reflowContent');
                }
            }.bind(this);
            $(window).on('resize', onResize);

        },

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
                    if (model.has("thumbnailUrl")) {

                        var imageView = new ImageThumbnailView({model: model});
                        var imageElement = imageView.render().el;

                        var cols, rows;

                        if (!model.has("thumbnail")) {
                            cols = 10;
                            rows = 8;
                        }
                        else {

                            $(imageElement).click(function () {
                                this.showImage(index);
                            }.bind(this));

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
                            if (collection.length == 1) {
                                if (ratio >= 1) {
                                    cols = cols * 3;
                                    rows = rows * 3;
                                }
                                else {
                                    cols = cols * 2;
                                    rows = rows * 2;
                                }
                            }
                            else if (isFirst || collection.length == 2) {
                                if (ratio >= 1) {
                                    cols = cols * 2;
                                    rows = rows * 2;
                                }
                                isFirst = false;
                            }
                        }
                        $.data(imageElement, 'grid-columns', cols);
                        $.data(imageElement, 'grid-rows', rows);
                        postImagesElement.append(imageElement);
                        imageChildren.push(imageElement);
                    }
                    else if (model.has("filename")) {
                        var fileView = new FileThumbnailView({model: model});
                        var fileElement = fileView.render().el;
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

                        $.data(fileElement, 'grid-columns', 8);
                        $.data(fileElement, 'grid-rows', 3);
                        postFilesElement.append(fileElement);
                        fileChildren.push(fileElement);
                    }
                }, this);
            }

            setTimeout(function () {
                postImagesElement.cloudGrid({
                    children: imageChildren,
                    gridGutter: 3,
                    gridSize: 18
                });

                postFilesElement.cloudGrid({
                    children: fileChildren,
                    gridGutter: 3,
                    gridSize: 25
                });
            }, 0);
        },

        showImage: function(index){
            var swipeboxArgs = [];
            this.model.get("content").each(function(content) {
                if (content.has("videoUrl")) {
                    swipeboxArgs.push({href:content.getVideo(), video:true, title:content.get("caption")|| ""});
                }
                else {
                    swipeboxArgs.push({href:content.getFullImage(), title:content.get("caption")|| ""});
                }
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