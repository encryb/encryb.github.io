define([
    'jquery',
    'underscore',
    'backbone',
    'jcrop',
    'marionette',
    'utils/image',
    'require-text!app/templates/profile.html'

], function($, _, Backbone, Jcrop, Marionette, ImageUtil, ProfileTemplate){

    var ProfileView = Marionette.ItemView.extend({

        template: _.template( ProfileTemplate ),

        changes : {},

        ui: {
            errorMessage: "#errorMessage",
            errorDetails: "#errorDetails",
            profilePicture: "#profilePicture",
            newProfilePicture: "#newProfilePicture",
            newProfile: "#newProfile",
            profilePictureExisting: "#profilePictureExisting",
            updateButton: "#updateButton",
            cancelButton: "#cancelButton",
            createButton: "#createButton",
            loadingImage: ".loading-img"
        },

        events: {
            "input #name": "nameChange",
            "change #intro": "introChange",
            "change @ui.profilePicture": "onPictureChange",
            "change #pictureInput": "updatePicture",
            "click #cropPictureButton": "cropPictureButton",
            "click @ui.updateButton": "updateProfile",
            "click @ui.cancelButton": "cancelProfile",
            "click @ui.createButton": "createProfile"
        },

        triggers: {
            "click #editKey" : "key:edit"
        },
        createProfile: function (event) {
            event.preventDefault();
            if (this.needsCrop) {
                this.cropPicture();
            }
            var onError = function () {
                this.ui.createButton.removeClass("hide");
                this.ui.loadingImage.addClass("hide");
                window.scrollTo(0, 0);
            }.bind(this);
            this.ui.createButton.addClass("hide");
            this.ui.loadingImage.removeClass("hide");
            this.trigger("profile:create", this.changes, onError);
        },
        updateProfile: function (event) {
            event.preventDefault();
            if (this.needsCrop) {
                this.cropPicture();
            }
            var onError = function () {
                this.ui.updateButton.removeClass("hide");
                this.ui.cancelButton.removeClass("hide");
                this.ui.loadingImage.addClass("hide");
                window.scrollTo(0, 0);
            }.bind(this);

            this.ui.updateButton.addClass("hide");
            this.ui.cancelButton.addClass("hide");
            this.ui.loadingImage.removeClass("hide");
            
            this.trigger("profile:updated", this.changes, onError);
        },

        cancelProfile: function() {
            this.trigger("profile:cancel");
        },
        nameChange: function(event){
            var name = event.target.value;
            this.changes['name'] = name;
            if (name.length > 0) {
                this.ui.updateButton.removeClass("disabled");
            }
            else {
                this.ui.updateButton.addClass("disabled");
            }
        },

        introChange: function(event) {
            var intro = event.target.value;
            this.changes['intro'] = intro;
        },

        updatePicture: function(input) {
            var files = input.files ? input.files : input.currentTarget.files;
            if (files && files[0]) {
                var reader = new FileReader();

                reader.onload = function (e) {
                    // there is no way to update existing picture that has JCrop attached
                    // instead for each image, create a new img element
                    this.ui.newProfilePicture.html("<img class='img-responsive'>");
                    var img = this.ui.newProfilePicture.children();
                    img.one("load", function() {
                        this.onPictureChange();
                    }.bind(this));
                    img.attr("src", e.target.result);
                    this.ui.newProfile.removeClass("hide");
                    this.ui.profilePicture.addClass("hide");
                }.bind(this);

                reader.readAsDataURL(files[0]);
            }

        },
        cropPictureButton: function(event) {
            event.preventDefault();
            this.cropPicture();
        },
        cropPicture: function() {
            var select = this.jcrop_profile.tellSelect();

            var image = this.ui.newProfilePicture.children()[0];
            var resized = ImageUtil.cropAndResize(image, 360, 300, select.x, select.y, select.w, select.h);
            this.ui.profilePicture.attr("src", resized);
            this.ui.newProfile.addClass("hide");
            this.jcrop_profile.release();
            this.ui.profilePicture.removeClass("hide");
            this.changes['picture'] = resized;
            this.needsCrop = false;
        },
        onPictureChange: function(){
            this.needsCrop = true;
            var view = this;
            var image = this.ui.newProfilePicture.children();
            $.when(ImageUtil.getNaturalSize(image.attr("src"))).done(function(size){
                var vertGap = size.width / 10;
                var horzGap = size.height / 10;
                image.Jcrop({
                    aspectRatio: 1.2,
                    setSelect: [vertGap, horzGap, size.width - vertGap, size.height - horzGap],
                    trueSize: [size.width, size.height],
                    onRelease: function() {
                        var select = view.jcrop_profile.tellSelect();
                        if (select.w == 0 || select.h == 0) {
                            view.jcrop_profile.setSelect([vertGap, horzGap, size.width - vertGap, size.height - horzGap])
                        }
                    }
                },function(){
                    view.jcrop_profile = this;
                });
            });
        }
    });
    return ProfileView;
});