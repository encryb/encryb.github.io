define([
    'backbone',
    'underscore'
], function (Backbone, _) {

    var Post = Backbone.Model.extend({

        nonPersistent: [ "caption", "thumbnail", "image", "video", "data"],

        toJSON: function() {

            var exclude = [];
            // we uploaded text to a file, do not store it in datastore as well
            if (this.has("textUrl")) {
                exclude.push("text");
            }
            var json = _.omit(this.attributes, exclude);

            return json;
        }
    });
    return Post;
});
