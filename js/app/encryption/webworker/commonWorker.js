"use strict";

importScripts("../../../../require.js");

requirejs.config({
	baseUrl: '../../../../js/lib',

	paths: {
		app: '../app',
		utils: '../utils'
	},
	shim: {
		sjcl: {
			exports: 'sjcl'
		}
	}
});


var theHandler;

self.onmessage = function (event) {
	var result;

	if (event.data.loadScript) {
		require([event.data.loadScript], function (handler) {
			theHandler = handler;

			self.postMessage("ready");
		});

		return;
	}

	if (theHandler) {
		result = theHandler(event);

		if (typeof result !== "undefined") {
			self.postMessage(result.value, result.transferable);
		}
	}
};