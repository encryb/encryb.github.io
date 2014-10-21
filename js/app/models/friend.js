define([
    'backbone'
], function (Backbone) {


    var Friend = Backbone.Model.extend({

        defaults: {
            pictureUrl: "img/nopic.gif",
            intro: "",
            invite: false,
            favorite: false
        }

    });
    return Friend;
});
