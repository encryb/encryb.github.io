/*global require*/
'use strict';


require.config({
	waitSeconds : 30,

	baseUrl: 'js/lib',

	paths: {
		app: '../app',
		utils: '../utils',
        dropbox: 'https://www.dropbox.com/static/api/dropbox-datastores-1.2-latest',
        marionette: 'backbone.marionette',
        visibility: 'visibility-1.2.1.min'
	},

	shim: {
		jquery: {
			exports: '$'
		},
        jcrop: {
            deps: ['jquery'],
            exports: 'jQuery.fn.Jcrop'
        },
        "jquery.swipebox": {
            deps: ['jquery'],
            exports: 'jQuery.fn.swipebox'
        },

        underscore: {
			exports: '_'
		},
		backbone: {
			deps: ['jquery', 'underscore'],
			exports: 'Backbone'
		},
        dropboxdatastore: {
            deps: ['backbone'],
            exports: 'Backbone'
        },
        'backbone-filtered-collection': {
            deps: ['backbone'],
            exports: 'Backbone.FilteredCollection'
        },

        sjcl: {
			exports: 'sjcl'
		},
        dropbox: {
            exports: 'Dropbox'
        },
		bootstrap: {
            deps: ["jquery"]
        },
        'backbone-forms-bootstrap3' : {
            deps: ["backbone-forms"],
            exports: 'Backbone.Form'
        },
        'backbone.bootstrap-modal' : {
            deps: ["bootstrap"]
        },
        marionette : {
            deps : ['jquery', 'underscore', 'backbone'],
            exports : 'Marionette'
        },
        visibility: {
            exports: 'Visibility'
        },
	}
});

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
        Dropbox.client.authenticate({interactive: false}, function() {
            App.start();
        });
    }
});