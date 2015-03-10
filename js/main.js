require([
    'backbone',
    'marionette',
    'app/app',
    'app/controllers/controller',
    'app/services/dropbox'
],
function (Backbone, Marionette, App, Controller, Dropbox) {

    var AppRouter = Marionette.AppRouter.extend({
        appRoutes: {
            '': 'showWall',
            'settings': 'settings',
            'profile': 'profile'
        }
    });

    App.appRouter = new AppRouter({
        controller: new Controller()
    });

    if (Dropbox.client.isAuthenticated()) {
        App.start();
    }
    else {
        Dropbox.client.authenticate({ interactive: false }, function () {
            App.start();
        });
    }
});
