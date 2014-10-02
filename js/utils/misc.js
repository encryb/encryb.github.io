define(function() {
    'use strict';

    var exports = {};

    exports.formatTime = function(date) {
        var currentTime = new Date();
        var secs = Math.floor((currentTime.getTime() - date) / 1000);
        if (secs < 60) return secs + " sec(s) ago";
        if (secs < 3600) return Math.floor(secs / 60) + " min(s) ago";
        if (secs < 86400) return Math.floor(secs / 3600) + " hour(s) ago";
        if (secs < 604800) return Math.floor(secs / 86400) + " day(s) ago";
        return new Date(date).toDateString();
    }

    return exports;

});