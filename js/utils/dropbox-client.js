define([
    'dropbox',
    'dropboxdatastore'

], function (Dropbox, DropboxDatastore) {
    "use strict";

    var DROPBOX_APP_KEY = '9loor53qc1sjxn9';

    // Exposed for easy access in the browser console.
    var client = new Dropbox.Client({key: DROPBOX_APP_KEY});

    // Redirect to Dropbox to authenticate if client isn't authenticated
    if (!client.isAuthenticated()) client.authenticate();

    // Set client for Backbone.DropboxDatastore to work with Dropbox
    Backbone.DropboxDatastore.client = client;

    Backbone.Dropbox = Dropbox;

    return client;


});