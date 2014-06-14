define([
    'msgpack',
    'sjcl',
    'utils/data-convert',
    'utils/encoding'
], function(Msgpack, Sjcl, DataConvert, Encoding){

    var exports = {};

    exports.encryptWithPassword = function(password, mimeType, data) {

        var encryptedData = Sjcl.encrypt(password, data);
        encryptedData['mimeType'] = mimeType;

        var buf = Encoding.encode(encryptedData);

        return buf;
    }

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


    exports.decryptImageData = function(packedData, password) {
        var data = Encoding.decode(packedData);

        var decrypted = Sjcl.decrypt(password, data, true);
        var imageData = "data:" +  data.mimeType + ";base64," + DataConvert.arrayToBase64(decrypted);
        return imageData;
    }

    exports.decryptTextData = function(packedData, password) {
        var data = Encoding.decode(packedData);

        var decrypted = Sjcl.decrypt(password, data, false);
        return decrypted;
    }


    exports.decryptBinaryData = function(packedData, password) {
        var data = Encoding.decode(packedData);

        var decrypted = Sjcl.decrypt(password, data, 55);
        return decrypted;
    }

    exports.generateRandomPassword = function() {
        var randomBytes = Sjcl.random.randomWords(16,1);
        var randomString = Sjcl.codec.base64.fromBits(randomBytes);
        return randomString;
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