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
            if (!json.hasOwnProperty("_enc_")) {
                return json;
            }
            var encryptedArray = json["_enc_"];

            try {
                var modelString = Encryption.decryptTextData(encryptedArray.buffer, Encryption.getKeys().databaseKey);
                var decryptedJson = JSON.parse(modelString);
                if (json.hasOwnProperty("id")) {
                    decryptedJson["id"] = json["id"];
                }
                return decryptedJson;
            }
            catch (e) {

                // $BUG We need to display errors in a bit better way
                var decryptedJson = {};
                if (json.hasOwnProperty("id")) {
                    decryptedJson["id"] = json["id"];
                }
                decryptedJson["created"] = new Date().getTime();

                decryptedJson["text"] = "Could not decrypt post: " + e.toLocaleString();
                return decryptedJson;
            }
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
