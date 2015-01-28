define([
    'backbone',
    'sjcl',
    'app/services/dropbox',
    'app/encryption'
], function(Backbone, Sjcl, Dropbox, Encryption){

    var EncryptedDatastore = function(name, options) {
        options = options || {};
        this.name = name;
        this.datastoreId = options.datastoreId || 'default';
        this._syncCollection = null;
    };

    _.extend(EncryptedDatastore.prototype, Backbone.DropboxDatastore.prototype, {

        recordToJson: function(record) {
            var json = Backbone.DropboxDatastore.recordToJson(record);

            var exception = null;

            if (!json.hasOwnProperty("_enc_")) {
                return json;
            }

            var encryptedArray = json["_enc_"];

            try {
                var modelString = Encryption.decryptText(encryptedArray.buffer, Encryption.getKeys().databaseKey);
                var decryptedJson = JSON.parse(modelString);
                if (json.hasOwnProperty("id")) {
                    decryptedJson["id"] = json["id"];
                }
                return decryptedJson;
            }
            catch (e) {
                exception = e;
            }

            // we have _enc_, but could not decrypt. Check if there is any plain data and if so return it without _enc_
            console.log("keys", Object.keys(json));
            if (Object.keys(json).length > 2) {
                return _.omit(json, "_enc_");
            }

            if (exception){
                // $BUG We need to display errors in a bit better way
                var errorJson = {};
                if (json.hasOwnProperty("id")) {
                    errorJson["id"] = json["id"];
                }
                errorJson["created"] = new Date().getTime();
                errorJson["error"] = exception.toLocaleString();
                return errorJson;
            }

            return json;

        },

        modelToJson: function(model) {
            var clone = _.omit(model.toJSON(), ["id"]);
            var modelString = JSON.stringify(clone);

            var encryptionKey = Sjcl.codec.bytes.toBits(Encryption.getKeys().databaseKey);

            var encrypted = Encryption.encrypt(encryptionKey, null, modelString, false);
            var encryptedArray  = new Uint8Array(encrypted);
            var json = {};
            if (model.has("id")) {
                json["id"] = model.get("id");
            }
            json["_enc_"] =  encryptedArray;
            return json;
        }
    });

    return EncryptedDatastore;
});
