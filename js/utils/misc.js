define([
    'jquery'
    ],function($) {
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
    },
    exports.formatFullTime = function(date) {
        var currentTime = new Date();

        var secs = Math.floor((currentTime.getTime() - date) / 1000);

        var d = new Date(date);
        var fullTime = d.toLocaleTimeString();

        if (secs > 86400) {
            fullTime += " " + d.toLocaleDateString();
        }
        return fullTime;
    };

    // if scroll reaches top or bottom of target element, don't pass it to the parent
    // from http://stackoverflow.com/questions/5802467/prevent-scrolling-of-parent-element
    // with changes
    exports.isScrollOverflow = function(event) {
        var target = event.currentTarget;
        var $target = $(target);

        var scrollTop = target.scrollTop,
            scrollHeight = target.scrollHeight,
            height = $target.outerHeight(),
            delta = (event.type == 'DOMMouseScroll' ?
                event.originalEvent.detail * -40 :
                event.originalEvent.wheelDelta),
            up = delta > 0;

        if (!up && -delta > scrollHeight - height - scrollTop) {
            // Scrolling down, but this will take us past the bottom.
            $target.scrollTop(scrollHeight);
            return false;
        } else if (up && delta > scrollTop) {
            // Scrolling up, but this will take us past the top.
            $target.scrollTop(0);
            return false;
        }
        return true;
    };

    exports.sendNotification = function(title, text, icon) {

        if (Notification.permission === "granted") {
            var notification = new Notification(title, {icon: icon, body: text});
            notification.onclick = function(x) { window.focus(); notification.close(); };

        }
        else if (Notification.permission !== 'denied') {
            Notification.requestPermission(function (permission) {
                if (!('permission' in Notification)) {
                    Notification.permission = permission;
                }
                if (permission === "granted") {
                    var notification = new Notification(title, {icon: icon, body: text});
                    notification.onclick = function(x) { window.focus(); notification.close(); };
                }
            });
        }
    }

    return exports;

});