define(["app/encryption/webworker/commonMainThread"], function (WorkerManager) {
	"use strict";

	var entropyAvailable = true;

	function getEntropy() {
		try {
			var ab;

			// get cryptographically strong entropy depending on runtime environment
			if (window && Uint32Array) {
				ab = new Uint32Array(32);
				if (window.crypto && window.crypto.getRandomValues) {
					window.crypto.getRandomValues(ab);
				} else if (window.msCrypto && window.msCrypto.getRandomValues) {
					window.msCrypto.getRandomValues(ab);
				} else {
					return false;
				}

				// get cryptographically strong entropy in Webkit
				return ab;
			}
		} catch (e) {}

		return false;
	}

	var addEntropy = {
		setup: function (theWorker, callback) {
			var entropy = getEntropy();

			if (entropy) {
				theWorker.postMessage({randomNumber: entropy, entropy: 1024}, null, callback);
			} else {
				entropyAvailable = false;
			}
		}
	};

	var workers = new WorkerManager("../app/encryption/webworker/sjclWorker", 2, addEntropy);

	var sjclWorker = {
		sym: {
			encrypt: function (content, mimeType, password, isBinary, callback) {
				workers.getFreeWorker(function (err, worker) {
					var message = {
						"password": password,
						"mimeType": mimeType,
						"content": content,
                        "isBinary": isBinary,
						"encrypt": true
					};

                    var tranferable = [];
                    if (content instanceof ArrayBuffer ){
                        tranferable.push(content);
                    }
					worker.postMessage(message, tranferable, callback);
				});
			},
			decrypt: function (encryptedContent, isBinary, password, callback) {
				workers.getFreeWorker(function (err, worker) {
					var message = {
						"password": password,
						"encryptedContent": encryptedContent,
                        "isBinary": isBinary,
						"decrypt": true
					};

					worker.postMessage(message, [encryptedContent], callback);
				});
			}
		}
	};

	return sjclWorker;
});