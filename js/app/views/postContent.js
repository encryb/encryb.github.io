define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'cloudGrid',
    'jquery.swipebox',
    'autolinker',
    'app/app',
    'app/adapters/post',
    'app/views/elements/fileThumbnail',
    'app/views/elements/imageThumbnail',
    'utils/image',
    'utils/misc',
    'require-text!app/templates/postContent.html'
], function($, _, Backbone, Marionette, CloudGrid, Swipebox, Autolinker, App, PostAdapter,
            FileThumbnailView, ImageThumbnailView,
            ImageUtils, MiscUtils, PostContentTemplate){

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

        events: {
            "click .post-thumbnail": "clickedPosterPicture"
        },

        initialize: function() {
            this.listenTo(this.model.get("poster"), "change:name", this.render);
            this.listenTo(this.model.get("poster"), "change:pictureUrl", this.render);
            this.listenTo(this.model.get("content"), "add", this.render);
            this.listenTo(this.model.get("content"), "remove", this.render);

            var reflowGrid = function() {
                if (this.ui.postImages) {
                    this.ui.postImages.cloudGrid('reflowContent');
                }
                if (this.ui.postFiles) {
                    this.ui.postFiles.cloudGrid('reflowContent');
                }
            }.bind(this);
            this.listenTo(App.vent, "resize", reflowGrid);

        },

        onShow: function () {
            var _this = this;
            if (MiscUtils.isElementVisible(this.$el, 200)) {
                $.when(PostAdapter.fetchPost(this.model, false)).done(function () {
                    // by the time this returns, _this might be destroyed
                    _this.render();
                });
            }
            else {
                var loadCheck = function () {
                    var visible = MiscUtils.isElementVisible(this.$el, 200);
                    if (visible) {
                        this.stopListening(App.vent, "scroll", loadCheck);
                        this.stopListening(App.vent, "resize", loadCheck);
                        $.when(PostAdapter.fetchPost(this.model, false)).done(function () {
                            _this.render();
                        });
                    }
                }.bind(this);

                this.listenTo(App.vent, "scroll", loadCheck);
                this.listenTo(App.vent, "resize", loadCheck);
            }
        },

        onRender: function () {

            var postImagesElement = this.ui.postImages;
            var postFilesElement = this.ui.postFiles;
            var imageChildren = [];
            var fileChildren = [];

            var deferreds = [];

            if (this.model.has("content")) {
                var password = this.model.get("password");
                var collection = this.model.get("content");
                var isFirst = true;
                collection.each(function (model, index) {
                    if (model.has("thumbnailUrl") || model.has("videoFramesUrl")) {

                        var imageView = new ImageThumbnailView({model: model});
                        var imageElement = imageView.render().el;


                        $(imageElement).click(function () {
                            this.showImage(index);
                        }.bind(this));


                        // we have this in case of error downloading thumbnail
                        if (!model.has("thumbnail")) {
                            $.data(imageElement, 'grid-columns', 20);
                            $.data(imageElement, 'grid-rows', 12);
                        }
                        else {

                            var imageDeferred = $.Deferred();
                            deferreds.push(imageDeferred.promise());
                            (function(_imageElement) {
                                $.when(ImageUtils.getNaturalSize(model.get("thumbnail"))).done(function(size) {
                                    var ratio = size.width / size.height;
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
                                    if (collection.length == 1 && size.width > 300) {
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
                                        if (ratio >= 1 && size.width > 300) {
                                            cols = cols * 2;
                                            rows = rows * 2;
                                        }
                                        isFirst = false;

                                    }
                                    $.data(_imageElement, 'grid-columns', cols);
                                    $.data(_imageElement, 'grid-rows', rows);
                                    imageDeferred.resolve();
                                });
                            })(imageElement);
                        }
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
            $.when.apply($, deferreds).done(function() {
                setTimeout(function () {
                    postImagesElement.cloudGrid({
                        children: imageChildren,
                        gridGutter: 3,
                        gridSize: 17
                    });

                    postFilesElement.cloudGrid({
                        children: fileChildren,
                        gridGutter: 3,
                        gridSize: 25
                    });
                }, 0);
            });
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