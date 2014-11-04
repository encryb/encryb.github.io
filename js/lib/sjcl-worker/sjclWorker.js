define(["sjcl", "utils/encoding"], function (Sjcl, Encoding) {
	"use strict";

	function decrypt(packedData, password) {
		var data = Encoding.decode(packedData);

		var encData = convertToBits(data);
		if (password instanceof Array) {
			password = Sjcl.codec.bytes.toBits(password);
		}
		var ct = Sjcl.json._decrypt(password, encData);

		var decrypted = Sjcl.codec.arrayBuffer.fromBits(ct);


		return { value : {mimeType: data.mimeType, data: decrypted}, transferable: [decrypted] };

	}

	function convertToBits(obj) {
		var result = {};
		if (obj.kemtag) {
			result['kemtag'] = Sjcl.codec.bytes.toBits(new Uint8Array(obj.kemtag));
		}
		if (obj.salt) {
			result['salt'] = Sjcl.codec.bytes.toBits(new Uint8Array(obj.salt));
		}
		result['iv'] = Sjcl.codec.bytes.toBits(new Uint8Array(obj.iv));
		result['ct'] = Sjcl.codec.bytes.toBits(new Uint8Array(obj.ct));
		return result;
	}



	return function (event) {
		if (event.data.randomNumber) {
			Sjcl.random.addEntropy(event.data.randomNumber, event.data.entropy, "adding entropy");
			return "entropy";
		}
		try {
			if (event.data.encrypt) {
				return false; //encrypt(event.data.key, event.data.message);
			} else if (event.data.decrypt) {
				return decrypt(event.data.message, event.data.key);
			}
			return false;
		} catch (e) {
			return false;
		}
	};
});