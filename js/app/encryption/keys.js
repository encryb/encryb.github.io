define([
    'sjcl'
], function(Sjcl){

    var keyCache = null;
    var encodedKeyCache = null;

    var keys = {
        createKeys: function () {
            var keys = Sjcl.ecc.elGamal.generateKeys(384);

            var publicKey = keys.pub.get();
            var secretKey = keys.sec.get();

            var publicKeyEncoded = Sjcl.codec.hex.fromBits(publicKey.x) + Sjcl.codec.hex.fromBits(publicKey.y);
            var secretKeyEncoded = Sjcl.codec.hex.fromBits(secretKey);

            var databaseKey = this.generateDatabaseKey();

            var databaseKeyEncoded = JSON.stringify(databaseKey);
            this.saveKeys(secretKeyEncoded, publicKeyEncoded, databaseKeyEncoded);

            keyCache = {'databaseKey': databaseKey, 'publicKey': publicKey, 'secretKey': secretKey};

        },

        generateDatabaseKey: function () {
            return Sjcl.codec.bytes.fromBits(Sjcl.random.randomWords(8, 1));
        },

        saveKeys: function (secretKeyEncoded, publicKeyEncoded, databaseKeyEncoded) {
            keyCache = null;
            try {
                localStorage.setItem("secretKey", secretKeyEncoded);
                localStorage.setItem("publicKey", publicKeyEncoded);
                localStorage.setItem("databaseKey", databaseKeyEncoded);
            }
            catch (e) {
                console.error("Could not save keys to local storage", e);
            }

            encodedKeyCache = {
                'databaseKey': databaseKeyEncoded, 'publicKey': publicKeyEncoded,
                'secretKey': secretKeyEncoded
            };
        },


        removeKeys: function () {
            keyCache = null;
            encodedKeyCache = null;
            localStorage.removeItem("secretKey");
            localStorage.removeItem("publicKey");
            localStorage.removeItem("databaseKey");
        },

        publicHexToKey: function (publicKeyEncoded) {
            var publicKeyBits = Sjcl.codec.hex.toBits(publicKeyEncoded);
            var publicKey = new Sjcl.ecc.elGamal.publicKey(Sjcl.ecc.curves.c384, publicKeyBits);
            return publicKey;
        },

        secretHexToKey: function (secretKeyEncoded) {
            var secretKeyBits = new Sjcl.bn(secretKeyEncoded);
            var secretKey = new Sjcl.ecc.elGamal.secretKey(Sjcl.ecc.curves.c384, secretKeyBits);
            return secretKey;
        },

        getKeys: function () {

            if (keyCache) {
                return keyCache;
            }

            var secretKeyEncoded, publicKeyEncoded, databaseKeyEncoded;
            if (encodedKeyCache) {
                secretKeyEncoded = encodedKeyCache.secretKey;
                publicKeyEncoded = encodedKeyCache.publicKey;
                databaseKeyEncoded = encodedKeyCache.databaseKey;
            }
            else {
                secretKeyEncoded = localStorage.getItem("secretKey");
                publicKeyEncoded = localStorage.getItem("publicKey");
                databaseKeyEncoded = localStorage.getItem("databaseKey");
            }

            if (secretKeyEncoded === null || publicKeyEncoded === null || databaseKeyEncoded === null) {
                return null;
            }

            return {
                publicKey: this.publicHexToKey(publicKeyEncoded),
                secretKey: this.secretHexToKey(secretKeyEncoded),
                databaseKey: JSON.parse(databaseKeyEncoded)
            };
        },

        getEncodedKeys: function () {
            if (encodedKeyCache) {
                return encodedKeyCache;
            }
            var secretKeyEncoded = localStorage.getItem("secretKey");
            var publicKeyEncoded = localStorage.getItem("publicKey");
            var databaseKeyEncoded = localStorage.getItem("databaseKey");

            encodedKeyCache = {
                publicKey: publicKeyEncoded,
                secretKey: secretKeyEncoded,
                databaseKey: databaseKeyEncoded
            };
            return encodedKeyCache;
        }
    };
    return keys;
});