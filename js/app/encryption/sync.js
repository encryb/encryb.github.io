define([
    'sjcl',
    'app/encryption/sjcl-convert',
    'app/encryption/webworker/sjclMainThread',
    'compat/windowUrl',
    'utils/data-convert',
    'utils/encoding'
], function(Sjcl, SjclConvert, SjclWorker, WindowUrl, DataConvert, Encoding){

    var sync = {
        /** Encrypt a binary array or a string.
         * @param {String|bitArray} key The password or key.
         * @param {String} mimeType Mime Type of data or null.
         * @param {String|Array} [data] Data to encrypt.
         * @param {Boolean} [isBinary] If data is string or a binary array.
         * @return {ArrayBuffer} ArrayBuffer of encrypted data.
         */
        encrypt: function(key, mimeType, data, isBinary) {
            if (isBinary) {
                data = Sjcl.codec.bytes.toBits(data);
            }
            var encrypted = Sjcl.json._encrypt(key, data);
    
            var encryptedData = SjclConvert.convertFromBits(encrypted);
            if (mimeType) {
                encryptedData['mimeType'] = mimeType;
            }
            var buf = Encoding.encode(encryptedData);
    
            return buf;
        },
    
        decryptText: function(packedData, password) {
            var data = Encoding.decode(packedData);
            var encData = SjclConvert.convertToBits(data);
            if (password instanceof Array) {
                password = Sjcl.codec.bytes.toBits(password);
            }
    
            return Sjcl.json._decrypt(password, encData);
        }
    }
        
    
    return sync;
});