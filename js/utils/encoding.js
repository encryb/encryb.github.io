define([
    'utils/data-convert'
], function(DataConvert){

"use strict";

var VERSION = 1;

var labelToIndex = {
                // array buffers
                kemtag : 0, salt: 1, iv : 2, ct : 3,
                // strings
                mimeType: 201
};
var indexToLabel = {
                0: "kemtag", 1: "salt", 2: "iv", 3: "ct",
                201: "mimeType"};


var Encoding = {

    combineBuffers: function(buffers) {
        var dataLenght = 0;
        for (var i=0; i<buffers.length; i++) {
            dataLenght += buffers[i].byteLength;
        }

        // create combined array whose size is
        // 1 bytes for encoding version +
        // 4 bytes per each element for size +
        // sum of size for all arrays
        var combinedArray = new Uint8Array(1 + (buffers.length * 4) + dataLenght);
        var view = new DataView(combinedArray.buffer);

        var offset = 0;

        view.setUint8(offset, 0);
        offset += 1;

        for (var i=0; i<buffers.length; i++) {
            view.setUint32(offset, buffers[i].byteLength);
            combinedArray.set(new Uint8Array(buffers[i]), offset + 4);
            offset += buffers[i].byteLength + 4;
        }
        return combinedArray.buffer;

    },
    splitBuffers: function(combinedBuffer) {

        var buffers = [];

        var view = new DataView(combinedBuffer);
        var offset = 0;
        var version = view.getUint8(offset);
        offset += 1;

        while (offset < combinedBuffer.byteLength-1) {


            var size = view.getUint32(offset);
            offset += 4;

            // make sure we don't over allocate
            if (size > (combinedBuffer.byteLength - offset)) {
                console.error("Element size is larger than remaining buffer", size, combinedBuffer.byteLength);
                return;
            }
            var data = new Uint8Array(size);
            data.set(new Uint8Array(view.buffer, offset, size));
            offset += data.length;

            buffers.push(data.buffer);
        }
        return buffers;
    },

    encode: function(dict) {

        var size = 1;
        var numItems = 0;
        for (var label in dict) {
            if (!(label in labelToIndex)) {
                continue;
            }
            size += 5; //1 byte for key, 4 bytes for size
            size += dict[label].length;
            numItems ++;
        }

        var buffer = new ArrayBuffer(size);
        var view = new DataView(buffer);
        var offset = 0;
        view.setUint8(offset, VERSION);
        offset++;

        for (var label in dict) {
            if (!(label in labelToIndex)) {
                continue;
            }
            var index = labelToIndex[label]
            view.setUint8(offset, index);
            var data;
            if (index > 200) {
                data = DataConvert.stringToTypedArray(dict[label]);
            }
            else {
                data = dict[label];
            }
            view.setUint32(offset + 1, data.byteLength);
            (new Uint8Array(view.buffer)).set(data, offset + 5);
            offset += 5 + data.length;
        }
        return buffer;
    },

    decode: function(buffer) {
        var dict = {};

        var view = new DataView(buffer);
        var offset = 0;
        var version = view.getUint8(offset);
        offset++;
        while (offset < buffer.byteLength) {
            var index = view.getUint8(offset);
            var label = indexToLabel[index];
            var size = view.getUint32(offset + 1);

            // make sure we don't over allocate
            if (size > (buffer.byteLength - offset + 5)) {
                return;
            }
            var data = new Uint8Array(size);
            data.set(new Uint8Array(view.buffer, offset + 5 , size), 0);
            offset += 5 + data.length;

            if (index > 200) {
                dict[label] = DataConvert.arrayToString(data);
            }
            else {
                dict[label] = data;
            }
        }
        return dict;
    }
}

return Encoding;
});