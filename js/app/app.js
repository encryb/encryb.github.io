define([
        'jquery',
        'underscore',
        'backbone',
        'marionette'
    ],
    function ($, _, Backbone, Marionette) {
        var App = new Marionette.Application();

        App.addRegions({
            headerPanel: '#headerPanel',
            main: '#main'
        });

        App.on("start", function(options){
            if (Backbone.history){
                Backbone.history.start();
            }
        });
        return App;
    });