/*global require*/
'use strict';

require.config({
	waitSeconds : 30,

	baseUrl: 'js/lib',

	paths: {
		app: '../app',
        compat: '../compat',
		utils: '../utils',
        marionette: 'backbone.marionette'
	},
    
});

require(["../main"]);
