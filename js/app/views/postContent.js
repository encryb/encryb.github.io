define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'jquery.swipebox',
    'autolinker',
    'app/app',
    'app/adapters/post',
    'app/views/elements/fileThumbnail',
    'app/views/elements/imageThumbnail',
    'utils/image',
    'utils/misc',
    'require-text!app/templates/postContent.html'
], function($, _, Backbone, Marionette, Swipebox, Autolinker, App, PostAdapter,
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
            postFiles: '.postFiles',
            fileTable: '.fileTable',
            imageGrid: '.imageGrid'
        },

        events: {
            "click .post-thumbnail": "clickedPosterPicture"
        },

        initialize: function() {
            this.listenTo(this.model.get("poster"), "change:name", this.render);
            this.listenTo(this.model.get("poster"), "change:pictureUrl", this.render);
            this.listenTo(this.model.get("content"), "add", this.render);
            this.listenTo(this.model.get("content"), "remove", this.render);
            this.listenTo(this.model, "change:text", this.render);
        },

        onShow: function () {
            var _this = this;
            if (MiscUtils.isElementVisible(this.$el, 400)) {
                $.when(PostAdapter.fetchPost(this.model, false)).done(function () {
                    // by the time this returns, _this might be destroyed
                    _this.render();
                });
            }
            else {
                var loadCheck = function () {
                    var visible = MiscUtils.isElementVisible(this.$el, 400);
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
          
            var imageDeferreds = [];
            
            if (this.model.has("content")) {
                var collection = this.model.get("content");
                var isFirst = true;

                var thumbCount = 0;
                var fileCount = 0;
                collection.each(function (model, index) {
                    
                    if (model.has("thumbnailUrl") || model.has("videoFramesUrl")) {
                        if (thumbCount > 3) {
                            return;
                        }
                        thumbCount++;
                        var imageView = new ImageThumbnailView({model: model});
                        var imageElement = imageView.render().el;

                        $(imageElement).click(function () {
                            this.showImage(index);
                        }.bind(this));

                        var imageDeferred = $.Deferred();
                        imageDeferreds.push(imageDeferred.promise());

                        var thumbnail;
                        if (model.has("thumbnail")) {
                            thumbnail = model.get("thumbnail");
                        }
                        else if (model.has("videoFrames") && model.get("videoFrames").length > 0) {
                            thumbnail = model.get("videoFrames")[0];
                        }
                        else if (model.has("errors")) {
                            imageDeferred.resolve({ image: imageElement, size: { width: 400, height: 300 } });
                            return;
                        }
                        else {
                            imageDeferred.resolve({ image: imageElement, size: { width: 400, height: 300 } });
                            return;
                        }
                        (function(_imageElement, _imageDeferred, _thumbnail) {
                            $.when(ImageUtils.getNaturalSize(thumbnail)).done(function(size) {
                                _imageDeferred.resolve({ image: _imageElement, size: size });
                            });
                        })(imageElement, imageDeferred, thumbnail);
                        
                    }
                    else if (model.has("filename")) {
                        fileCount++;
                        var fileView = new FileThumbnailView({model: model});
                        var fileElement = fileView.render().el;         
                        postFilesElement.append(fileElement);
                    }
                }, this);

                if (thumbCount > 0) {
                    this.ui.imageGrid.removeClass("hide");
                }
                if (fileCount > 0) {
                    this.ui.fileTable.removeClass("hide");
                }
            }
            
            $.when.apply($, imageDeferreds).done(function () {
                var len = arguments.length;
                for (var i = 0; i < len; i++) {
                    var element = arguments[i].image;
                    if (len === 1) {
                        var size = arguments[i].size;
                        if (size.width > size.height) {
                            $(element).addClass("square square100-land");
                        }
                        else {
                            $(element).addClass("square square100-port");
                        }
                    }
                    if (len === 2) {
                        if (i === 0) {
                            $(element).addClass("square square50");
                        }
                        else {
                            $(element).addClass("square square50");
                        }
                    }
                    if (len === 3) {
                        if (i === 0) {
                            $(element).addClass("square square66");
                        }
                        else {
                            $(element).addClass("square square33");
                        }
                    }
                    if (len === 4) {
                        if (i === 0) {
                            $(element).addClass("square square75");
                        }
                        else {
                            $(element).addClass("square square25");
                        }
                    }
                    postImagesElement.append(element);
                }
            });
        },

        showImage: function(index){
            var swipeboxArgs = [];
            this.model.get("content").each(function(content) {
                if (content.has("videoUrl")) {
                    var errorCallback = function () {
                        App.vent.trigger("video:download", content);
                    }.bind(this);
                    swipeboxArgs.push({href:content.getVideo(), errorCallback: errorCallback, video:true, title:content.get("caption")|| ""});
                }
                else {
                    if (content.has("image")) {
                        swipeboxArgs.push({ href: content.get("image"), title: content.get("caption") || "" });
                    }
                    else if (content.has("imageUrl")) {
                        swipeboxArgs.push({ href: content.getFullImage(), title: content.get("caption") || "" });
                    }
                    else {
                        swipeboxArgs.push({ href: content.get("thumbnail"), title: content.get("caption") || "" });
                    }
                }
            }.bind(this));
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