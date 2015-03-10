define(["sjcl"], function(Sjcl) {


    var fromBitsToTypedArray = function(arr) {
        var bl = Sjcl.bitArray.bitLength(arr), i, tmp;
        var out = new Uint8Array(bl / 8);
        for (i = 0; i < bl / 8; i++) {
            if ((i & 3) === 0) {
                tmp = arr[i / 4];
            }
            out[i] = (tmp >>> 24);
            tmp <<= 8;
        }
        return out;
    }

    var SjclConvert = {
        convertToBits: function(obj) {
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
        },


        convertFromBits: function(obj) {
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
    }
    return SjclConvert;
});