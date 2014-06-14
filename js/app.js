/*global require*/
'use strict';


// Require.js allows us to configure shortcut alias
require.config({
	waitSeconds : 15,

	baseUrl: 'js/lib',

	paths: {
		app: '../app',
		tpl: '../tpl',
		utils: '../utils',
        dropbox: 'https://www.dropbox.com/static/api/dropbox-datastores-1.0-latest',
        dropboxdatastore: 'backbone.dropboxDatastore'
	},


	// The shim config allows us to configure dependencies for
	// scripts that do not call define() to register a module
	shim: {
		jquery: {
			exports: '$'
		},
		underscore: {
			exports: '_'
		},
		backbone: {
			deps: ['underscore', 'jquery'],
			exports: 'Backbone'
		},
        dropboxdatastore: {
            deps: ['backbone'],
            exports: 'Backbone'
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
        'jasny-bootstrap': {
        	deps: ["bootstrap"]
        },
        'backbone-forms-bootstrap3' : {
            deps: ["backbone-forms"],
            exports: 'Backbone.Form'
        }
	}
});

require([
    'backbone',
    'app/router'
],
function (Backbone, AppRouter) {
    new AppRouter();
    Backbone.history.start();
});