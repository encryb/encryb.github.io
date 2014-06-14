define([
    'backbone'
], function (Backbone) {

    var Profile = Backbone.Model.extend({

        defaults: {
            name: "",
            pictureFile: "",
            pictureUrl: "img/nopic.gif"
        }
    });
    return Profile;
});