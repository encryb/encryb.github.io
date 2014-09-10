define([
    'msgpack',
    'sjcl',
    'utils/data-convert',
    'utils/encoding'
], function(Msgpack, Sjcl, DataConvert, Encoding){

    var exports = {};

    var _OLD_KEY = "global";


    exports.encrypt = function(key, mimeType, data, isBinary) {
        if (isBinary) {
            data = Sjcl.codec.bytes.toBits(data);
        }
        var encrypted = Sjcl.json._encrypt(key, data);

        var encryptedData = encode(encrypted);
        encryptedData['mimeType'] = mimeType;

        var buf = Encoding.encode(encryptedData);

        return buf;
    };

    exports.encryptWithEcc = function(keyString, mimeType, data, isBinary) {
        if(keyString) {
            var key = exports.publicHexToKey(keyString);
        }
        else {
            var key = _OLD_KEY;
        }
        return exports.encrypt(key, mimeType, data, isBinary);
    };

    exports.createKeys = function() {
        var keys = Sjcl.ecc.elGamal.generateKeys(384);

        var publicKey = keys.pub.get();
        var secretKey = keys.sec.get();

        var publicKeyEncoded = Sjcl.codec.hex.fromBits(publicKey.x) + Sjcl.codec.hex.fromBits(publicKey.y);
        var secretKeyEncoded = Sjcl.codec.hex.fromBits(secretKey);
        exports.saveKeys(secretKeyEncoded, publicKeyEncoded);
    }

    exports.saveKeys = function(secretKeyEncoded, publicKeyEncoded) {
        localStorage.setItem("secretKey", secretKeyEncoded);
        localStorage.setItem("publicKey", publicKeyEncoded);
    }


    exports.removeKeys = function() {
        localStorage.removeItem("secretKey");
        localStorage.removeItem("publicKey");
    },

    exports.publicHexToKey = function(publicKeyEncoded) {

        var publicKeyBits = Sjcl.codec.hex.toBits(publicKeyEncoded);
        var publicKey = new Sjcl.ecc.elGamal.publicKey(Sjcl.ecc.curves.c384, publicKeyBits);

        return publicKey;
    },

    exports.secretHexToKey = function(secretKeyEncoded) {
        var secretKeyBits = new Sjcl.bn(secretKeyEncoded);
        var secretKey = new Sjcl.ecc.elGamal.secretKey(Sjcl.ecc.curves.c384, secretKeyBits);
        return secretKey;

    },

    exports.getKeys = function() {
        var secretKeyEncoded = localStorage.getItem("secretKey");
        var publicKeyEncoded = localStorage.getItem("publicKey");

        if (secretKeyEncoded === null || publicKeyEncoded === null ) {
            return null;
        }

        return {
            publicKey: exports.publicHexToKey(publicKeyEncoded),
            secretKey: exports.secretHexToKey(secretKeyEncoded)
        };
    }

    exports.getEncodedKeys = function() {
        var secretKeyEncoded = localStorage.getItem("secretKey");
        var publicKeyEncoded = localStorage.getItem("publicKey");
        return {
            publicKey: publicKeyEncoded,
            secretKey: secretKeyEncoded
        };

    }

    function decrypt(data, password) {

        var encData = convertToBits(data);
        if (password instanceof Array) {
            password = Sjcl.codec.bytes.toBits(password);
        }
        var ct = Sjcl.json._decrypt(password, encData);

        return ct;
    }

    exports.decryptImageData = function(packedData, password) {
        var data = Encoding.decode(packedData);
        var ct = decrypt(data, password);
        var decrypted = Sjcl.codec.bytes.fromBits(ct);
        var imageData = "data:" +  data.mimeType + ";base64," + DataConvert.arrayToBase64(decrypted);
        return imageData;
    }

    exports.decryptTextData = function(packedData, password) {
        var data = Encoding.decode(packedData);
        var ct = decrypt(data, password);
        var decrypted = Sjcl.codec.utf8String.fromBits(ct);
        return decrypted;
    }


    exports.decryptManifestData = function(packedData) {
        var data = Encoding.decode(packedData);
        if (data.hasOwnProperty('kemtag')) {
            var password = exports.getKeys().secretKey;
        }
        else {
            var password = _OLD_KEY;
        }
        var ct = decrypt(data, password);
        var decrypted = fromBitsToTypedArray(ct);
        return decrypted;
    }

    function encode(obj) {
        var result = {};
        if (obj.kemtag) {
            result['kemtag'] = fromBitsToTypedArray(obj.kemtag);
        }
        if (obj.salt) {
            result['salt'] = fromBitsToTypedArray(obj.salt);
        }
        result['iv'] = fromBitsToTypedArray(obj.iv);
        result['ct'] = fromBitsToTypedArray(obj.ct);
        return result;
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

    function fromBitsToTypedArray(arr) {
        var bl = Sjcl.bitArray.bitLength(arr), i, tmp;
        var out = new Uint8Array(bl/8);
        for (i=0; i<bl/8; i++) {
            if ((i&3) === 0) {
                tmp = arr[i/4];
            }
            out[i] = (tmp >>> 24);
            tmp <<= 8;
        }
        return out;
    }


    /*
    exports.test = function() {

        var key = Sjcl.ecc.elGamal.generateKeys(384,10);
        var encodedPub = Msgpack.encode(key.pub.serialize());
        var encodedSec = Msgpack.encode(key.sec.serialize());

        var base64Pub = DataConvert.arrayToBase64(encodedPub);
        var base64Sec = DataConvert.arrayToBase64(encodedSec);

        var pubKey = Sjcl.ecc.deserialize(Msgpack.decode(encodedPub));
        var secKey = Sjcl.ecc.deserialize(Msgpack.decode(encodedSec));

        var array = [0,1,2,3,4];


        var enc = Sjcl.encrypt(pubKey, array);

        var dec = Sjcl.decrypt(secKey, enc);


        console.log(dec);

    }
    */

    return exports;
});