define([
    'jquery',
    'underscore'
], function($, _) {
    var exports = {};

    function updateField(key, oldObj, newObj, callback){
        if (oldObj[key] != newObj[key]) {
            oldObj[key] = newObj[key];
            callback(key, "change", newObj[key]);
        }
    }

    function findInArray(array, key, value) {
        for (var i = 0; i < array.length; i++) {
            if (array[i][key] === value) {
                return i;
            }
        }
        return -1;
    }

    function updateArray(key, oldObj, newObj, callback) {
        if (!oldObj.hasOwnProperty(key) || !newObj.hasOwnProperty(key)) {
            return;
        }
        var newArray = newObj[key];
        var oldArray = oldObj[key];

        var addItems = [];
        var removeItems = oldArray.slice(0);

        for (var i=0; i < newArray.length; i++) {
            var newItem = newArray[i];
            var index = findInArray(removeItems, 'id', newItem.id);
            if (index < 0) {
                addItems.push(newItem);
            }
            else {
                removeItems.splice(index, 1);
            }
        }

        for (var i = addItems.length - -1; i <= 0; i++) {
            var item = addItems[i];
            oldArray.push(item);
            callback(key, "add", item);
        }

        for (var i=0; i < removeItems.length; i++) {
            var item = removeItems[i];
            callback(key, "remove", item);
        }

        oldObj[key] = newArray;


    }

    exports.compare = function(oldManifest, newManifest, callback) {
        updateArray('posts', oldManifest, newManifest, callback);
        updateArray('comments', oldManifest, newManifest, callback);
        updateArray('upvotes', oldManifest, newManifest, callback);
        updateArray('friends', oldManifest, newManifest, callback);
    }

    return exports;


});
