define([
    'underscore',
    'utils/data-convert'
], function(_, DataConvert){
"use strict";

var d = {};

var VERSION = 1;

var labelToIndex = {
                // array buffers
                kemtag : 0, salt: 1, iv : 2, ct : 3,
                // strings
                mimeType: 201
};
var indexToLabel = _.invert(labelToIndex);

d.encode = function(dict) {

    var size = 1;
    var numItems = 0;
    for (var label in dict) {
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
};

d.decode = function(buffer) {
    var dict = {};

    var view = new DataView(buffer);
    var offset = 0;
    var version = view.getUint8(offset);
    offset++;
    while (offset < buffer.byteLength) {
        var index = view.getUint8(offset);
        var label = indexToLabel[index];
        var size = view.getUint32(offset + 1);

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
};

return d;
});