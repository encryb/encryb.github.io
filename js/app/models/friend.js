define([
    'backbone'
], function (Backbone) {

    var Friend = Backbone.Model.extend({

        defaults: {
            account: null,
            manifestFile: "",
            manifestUrl: "",
            friendsManifest: "",
            pictureUrl: "img/nopic.gif"
        },
        schema: {
            account:      'Text',
            manifestFile:       { type: 'Text', editorAttrs: { readonly: true } },
            manifestUrl:      { type: 'Text', editorAttrs: { readonly: true } },
            friendsManifest:   'Text'
        },
    });
    return Friend;
});
