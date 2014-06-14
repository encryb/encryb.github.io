/*global define*/
define([
        'jquery',
        'backbone',
        'app/views/app',
        'jasny-bootstrap'
], function ($, Backbone, AppView, Bootstrap) {
    'use strict';

    var AppRouter = Backbone.Router.extend({

        routes: {
            '': 'home',
            'post/:postId': 'post'
        },

        home: function () {
            var pv = new AppView();
        },
        post: function (postId) {
            console.log('post id: ' + postId);
        },
    });

    return AppRouter;
});