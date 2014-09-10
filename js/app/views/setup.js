define([
    'jquery',
    'underscore',
    'backbone',
    'bootbox',
    'marionette',
    'require-text!app/templates/setup.html'

], function($, _, Backbone, Bootbox, Marionette, SetupTemplate){

    var SetupView = Marionette.ItemView.extend({

        template: _.template( SetupTemplate ),

        events: {
            "change #uploadKeysInput": "keysUpload",
            "click #removeKeysButton": "keysRemove",
            "click #createNewKeysButton": "keysCreate"

        },

        triggers: {
            "click #dropboxLogout": "dropbox:logout",
            "click #dropboxLogin": "dropbox:login",
            "click #loadKeysFromGoogleButton" : "keys:loadFromGoogle",
            "click #downloadKeysButton": "keys:download",
            "click #saveKeysToGoogleButton": "keys:saveKeysToGoogleButton",
            "click #continueButton": "continue"
        },

        initialize: function () {
            this.model.on('change', this.render);
        },

        keysUpload: function(event) {
            var reader = new FileReader();

            var view = this;
            reader.onload = (function(e) {
                view.trigger("keys:upload", reader.result);
            });

            reader.readAsText(event.target.files[0]);
        },
        keysRemove: function() {
            var view = this;


            Bootbox.confirm("Are you sure? Without the encryption keys will not be able to read friends' posts!", function(result) {
                if (result) {
                    view.trigger("keys:remove");
                }
            });
        },
        keysCreate: function() {
            var view = this;
            Bootbox.prompt({
                title    : "Keys Created! To ensure proper access to your friends post, please backup your key. Options are: ",
                inputType : 'checkbox',
                inputOptions : [
                    { text : 'Save to your computer (Safest option)', value: 'keys:download', name: 'file'},
                    { text : 'Save to Dropbox (Simplest option, but encryption key is stored next to the encrypted data)', value: 'keys:saveToDropbox', name: 'dropbox'},
                    { text : 'Save to Google Drive (Compromise option, the most clever one)', value: 'googledrive', name: 'googledrive'}
                ],
                callback : function(values) {
                    view.trigger("keys:create");
                    for (var i=0; i<values.length; i++) {
                        var value = values[i];
                        view.trigger(value);
                    }

                }
            });
        }

    });
    return SetupView;
});