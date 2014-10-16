define([
        'jquery',
        'underscore',
        'backbone',
        'marionette',
        'app/collections/persist/profiles',
    ],
    function ($, _, Backbone, Marionette, Profiles) {
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


        App.getProfile = function() {
            if (App._profilePromise) {
                return App._profilePromise;
            }

            var deferred = $.Deferred();
            App._profilePromise = deferred.promise();

            var profiles = new Profiles();
            profiles.fetch({
                success: function(collection, response, options) {
                    deferred.resolve(collection.getFirst());
                },
                error: function(collection, response, options) {
                    deferred.reject();
                }
            });
            return App._profilePromise;
        }
        return App;
    });