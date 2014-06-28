define([
    'msgpack',
    'sjcl',
    'utils/data-convert',
    'utils/encoding'
], function(Msgpack, Sjcl, DataConvert, Encoding){

    var exports = {};


    exports.encryptWithPassword = function(password, mimeType, data) {

        var encrypted = Sjcl.json._encrypt(password, data);

        var encryptedData = encode(encrypted);
        encryptedData['mimeType'] = mimeType;

        var buf = Encoding.encode(encryptedData);

        return buf;
    }

    exports.encryptImageWithPassword = function(password, mimeType, data) {
        var bits = Sjcl.codec.bytes.toBits(data);
        return exports.encryptWithPassword(password, mimeType, bits);
    }


    /*
    exports.encryptWithPublicKey = function(mimeType, data) {

        var key = exports.getKeys().publicKey;

        var encryptedData = Sjcl.encrypt(key, data);
        encryptedData['mimeType'] = mimeType;
        var serializedData = Msgpack.encode(encryptedData);
        var base64Data = DataConvert.arrayToBase64(serializedData);
        return base64Data;
    }


    exports.getKeys = function() {
        var secretKeyEncoded= localStorage.getItem("secretKey");
        var publicKeyEncoded = localStorage.getItem("publicKey");
        if (secretKeyEncoded && publicKeyEncoded) {
            var secretKey = Sjcl.ecc.deserialize(JSON.parse(secretKeyEncoded));
            var publicKey = Sjcl.ecc.deserialize(JSON.parse(publicKeyEncoded));
            return {
                publicKey: publicKey,
                secretKey: secretKey
            };
        }

        var key = Sjcl.ecc.elGamal.generateKeys(384,10);

        localStorage.setItem("publicKey", JSON.stringify(key.pub.serialize()));
        localStorage.setItem("secretKey", JSON.stringify(key.sec.serialize()));

        return {
            publicKey: key.pub,
            secretKey: key.sec
        };
    }
    */


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


    exports.decryptBinaryData = function(packedData, password) {
        var data = Encoding.decode(packedData);
        var ct = decrypt(data, password);
        var decrypted = fromBitsToTypedArray(ct);
        return decrypted;
    }

    /*
    if (returnBytes == 55) {
        return sjcl.codec.bytes.fromBitsToTypedArray(ct);
    }

    if (returnBytes == true) {
        return sjcl.codec.bytes.fromBits(ct);
    }
    return sjcl.codec.utf8String.fromBits(ct);

     */


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