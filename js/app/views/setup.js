define([
    'jquery',
    'underscore',
    'backbone',
    'bootbox',
    'marionette',
    'require-text!app/templates/setup.html',
    'require-text!app/templates/password.html'

], function($, _, Backbone, Bootbox, Marionette, SetupTemplate, PasswordTemplate){

    var SetupView = Marionette.ItemView.extend({

        template: _.template( SetupTemplate ),

        events: {
            "change #uploadKeysInput": "keysUpload",
            "click #removeKeysButton": "keysRemove",
            "click #createNewKeysButton": "keysCreate",
            "click #saveKeysToDropboxButton": "saveKeyToDropbox",
            "click #loadKeysFromDropboxButton" : "loadKeyFromDropbox"

        },

        triggers: {
            "click #dropboxLogout": "dropbox:logout",
            "click #dropboxLogin": "dropbox:login",
            "click #downloadKeysButton": "keys:download",
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
                    { text : 'Save to your computer (Safer option)', value: 'keys:download', name: 'file'},
                    { text : 'Save to Dropbox (Simpler option, but less secure)', value: 'keys:saveToDropbox', name: 'dropbox'}
                ],
                callback : function(values) {
                    view.trigger("keys:create");
                    view.promptForPassword();
                    for (var i=0; i<values.length; i++) {
                        var value = values[i];
                        view.trigger(value);
                    }

                }
            });
        },
        saveKeyToDropbox: function() {
            var view = this;
            $.when(this._passwordDialog()).done(function(password){
                view.trigger("keys:saveToDropbox", password);
            });
        },
        loadKeyFromDropbox: function() {
            var view = this;
            $.when(this._passwordDialog()).done(function(password){
                view.trigger("keys:loadFromDropbox", password);
            });
        },

        _passwordDialog: function() {
            var deferred = $.Deferred();
            Bootbox.dialog({
                title: "Enter password",
                message: PasswordTemplate,
                buttons: {
                    success: {
                        label: "OK",
                        className: "btn-default",
                        callback: function () {
                            var password1 = $("#passwordDialog1").val();
                            var password2 = $("#passwordDialog2").val();
                            if (password1 != password2) {
                                $("#passwordDialogAlert").removeClass("hide");
                                $("#passwordDialogAlert").text("Passwords do not match");
                                return false;
                            }

                            if (password1.length < 1) {
                                $("#passwordDialogAlert").removeClass("hide");
                                $("#passwordDialogAlert").text("Invalid Password");
                                return false;
                            }
                            deferred.resolve(password1);


                        }
                    }
                }
            });
            return deferred;
        }




    });
    return SetupView;
});