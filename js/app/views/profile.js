define([
    'jquery',
    'underscore',
    'backbone',
    'jcrop',
    'marionette',
    'app/encryption',
    'utils/image',
    'require-text!app/templates/profile.html'

], function($, _, Backbone, Jcrop, Marionette, Encryption, ImageUtil, ProfileTemplate){

    var ProfileView = Marionette.ItemView.extend({

        template: _.template( ProfileTemplate ),

        initialize: function() {
            this.listenTo(this.model.get("profile"), "change", this.render);
            this.listenTo(this.model, "change", this.render);
        },

        changes : {},

        ui: {
            profilePicture: "#profilePicture",
            profilePictureExisting: "#profilePictureExisting",
            updateButton: "#updateButton"
        },

        events: {
            "input #name": "nameChange",
            "change #intro": "introChange",
            "change.bs.fileinput @ui.profilePicture": "pictureChange",
            "click @ui.profilePicture #cancelButton": "pictureCancelButton",
            "click @ui.profilePicture #applyButton": "pictureApplyButton",
            "click @ui.updateButton": "updateProfile"
        },

        triggers: {
            "click #editKey" : "key:edit",
            "click #cloudRefresh": "key:cloudRefresh"
        },

        updateProfile: function() {
            console.log(this.changes);
            this.trigger("profile:updated", this.changes);
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

        pictureCancelButton: function() {
            event.preventDefault();
            this.ui.profilePicture.fileinput("reset");
        },
        pictureApplyButton: function(event) {
            event.preventDefault();
            var select = this.jcrop_profile.tellSelect();
            var image = $("#profilePicturePreview img")[0];

            var resized = ImageUtil.cropAndResize(image, 360, 300, select.x, select.y, select.w, select.h);
            this.ui.profilePictureExisting.attr('src', resized);
            this.ui.profilePicture.fileinput("reset");
            this.changes['picture'] = resized;

        },
        pictureChange: function(){
            var view = this;
            var image = $("#profilePicturePreview img");
            var size = ImageUtil.getNaturalSize(image);
            image.Jcrop({
                aspectRatio: 1.2,
                setSelect: [0, 0, 360, 300],
                trueSize: [size.width, size.height]
            },function(){
                view.jcrop_profile = this;
            });
        }
    });
    return ProfileView;
});