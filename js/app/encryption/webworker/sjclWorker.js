define([
	"sjcl",
	"utils/encoding",
	"app/encryption/sjcl-convert"
	],
function (Sjcl, Encoding, SjclConvert) {
	"use strict";

	function decrypt(packedData, password) {
		var data = Encoding.decode(packedData);
		var encData = SjclConvert.convertToBits(data, true);
		var key;
        if (password instanceof Array) {
			key = Sjcl.codec.bytes.toBits(password);
		}
        else if (password.hasOwnProperty("secretKey")) {
            var secretKeyBits = new Sjcl.bn(password.secretKey);
            key = new Sjcl.ecc.elGamal.secretKey(Sjcl.ecc.curves.c384, secretKeyBits);
        }
        else {
            key = password;
        }
        var ct;
	    try {
	        ct = Sjcl.json._decrypt(key, encData, {raw : 1 });
	    }
	    catch (e) {
	        return { value: { error: "Could not decrypt data " + e.message }, transferable: [] };
	    }
        return {value: {mimeType: data.mimeType, data: ct}, transferable: [ct]};
        
	}

	function encrypt(content, mimeType, isBinary, password) {
		var data =  content;
        
        var key;
        if (password.hasOwnProperty("publicKey")) {
            var publicKeyBits = Sjcl.codec.hex.toBits(password.publicKey);
            key = new Sjcl.ecc.elGamal.publicKey(Sjcl.ecc.curves.c384, publicKeyBits);
        }
        else {
            key = password;
        }
	    try {
	        var encrypted = Sjcl.json._encrypt(key, data);
	        var encryptedData = SjclConvert.convertFromBits(encrypted);
	        encryptedData['mimeType'] = mimeType;


	        var packedData = Encoding.encode(encryptedData);
	        return { value: { packedData: packedData }, transferable: [packedData] };
	    }
	    catch (e) {
	        return { value: { error: "Could not encrypt data " + e.message }, transferable: [] };
	    }

		
	}

	return function (event) {
		if (event.data.randomNumber) {
			Sjcl.random.addEntropy(event.data.randomNumber, event.data.entropy, "adding entropy");
			return "entropy";
		}

		if (event.data.encrypt) {
			return encrypt(event.data.content, event.data.mimeType, event.data.isBinary, event.data.password);
		} else if (event.data.decrypt) {
			return decrypt(event.data.encryptedContent, event.data.password);
		}
		return false;
	};
});