define([
    'backbone'
], function (Backbone) {


    var Friend = Backbone.Model.extend({

        defaults: {
            pictureUrl: "img/nopic.gif",
            intro: "",
            invite: false,
            favorite: false,
            score: 0
        },

        toJSON: function(options) {
            return _.omit(this.attributes, "score", "error");
        }

    });
    return Friend;
});
