define([
        'jquery',
        'underscore',
        'backbone',
        'marionette',
        'app/collections/persist/profiles',
        'app/views/error'
    ],
    function ($, _, Backbone, Marionette, Profiles, ErrorView) {
        var App = new Marionette.Application();

        App.addRegions({
            headerPanel: '#headerPanel',
            errorMessage: "#errorMessage",
            main: '#main'
        });

        App.showError = function (msg) {
            var errorView = new ErrorView({ model: new Backbone.Model({ errorMessage: msg }) });
            errorView.on("close", function () {
                App.clearError();
            });
            App.errorMessage.show(errorView);
        };
        App.clearError = function () {
            App.errorMessage.reset();

        };
        App.on("start", function(options){
            if (Backbone.history){
                Backbone.history.start();
            }
        });

        $(document).ready(function () {
            var scroll = _.throttle(function () {
                App.vent.trigger("scroll")
            }, 500, { leading: false }
            );
            var resize = _.debounce(function () {
                App.vent.trigger("resize");
            }, 200);

            $(window).scroll(scroll);
            $(window).resize(resize);
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