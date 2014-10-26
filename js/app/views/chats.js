define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'autolinker',
    'utils/misc',
    'app/app',
    'require-text!app/templates/chat.html',
    'require-text!app/templates/chatLine.html'
], function($, _, Backbone, Marionette, Autolinker, MiscUtils, App, ChatTemplate, ChatLineTemplate) {

    var ChatLineView = Marionette.ItemView.extend({
        template: _.template(ChatLineTemplate),
        tagName: "li",
        templateHelpers: function() {
            var friend = this.friend;
            return {
                prettyTime: function () {
                    return MiscUtils.formatFullTime(this.time);
                },
                getName: function () {
                    if (this.isMine) {
                        return "me";
                    }
                    else {
                        return friend.escape("name");
                    }
                },
                formatText: function() {
                    return Autolinker.link(_.escape(this.text));
                }
            }
        },
        initialize: function(options) {
            this.friend = options.friend;
        },
        modelEvents: {
            'change': 'render'
        }
    });

    var ChatView = Marionette.CompositeView.extend({
        template: _.template( ChatTemplate ),
        className: "pull-right clearfix",
        childView: ChatLineView,
        childViewContainer: ".chat",

        initialize: function() {
            this.atBottom = true;
            this.collection = this.model.get("chatLines");
            this.childViewOptions =  { friend: this.model.get("friend") };
            this.on("add:child", this.chatAdded);
            this.on("childview:render", this.chatAdded);
        },

        templateHelpers: function() {
            var uniqueId = _.uniqueId("_chat_");
            return {
                uniqueId: function() {
                    return uniqueId;
                }
            }
        },
        ui: {
            panelBody : ".panel-body",
            panel : ".panel",
            textinput: "textarea",
            closeButton: "#chatClose"
        },

        events: {
            'mousewheel @ui.panelBody': 'scrollCheck',
            'click @ui.panel': 'clickPanel',
            'keydown @ui.textinput': 'submitChat',
            'click @ui.closeButton': 'closeChat'
        },

        collectionEvents: {
            "add": "modelAdded"
        },

        modelAdded: function(chatLine) {
            if(!chatLine.get("isMine")) {
                if (!this.lastChatTime || chatLine.get("time") > this.lastChatTime ) {
                    this.lastChatTime = chatLine.get("time");
                }

                if (!document.hasFocus()) {
                    var friend = this.model.get("friend");
                    if (this.notificationPromise) {
                        $.when(this.notificationPromise).done(function (notification) {
                            notification.close()
                        });
                    }
                    this.notificationPromise = MiscUtils.sendNotification(friend.get("name"), chatLine.get("text"), friend.get("pictureUrl"));
                }
            }
        },
        chatAdded : function() {
            if (this.atBottom) {
                this.ui.panelBody.scrollTop(this.ui.panelBody.prop("scrollHeight"));
            }
            this.newChatHighlight();
        },

        submitChat: function(e) {
            if (e.keyCode == 13) {
                if (this.ui.textinput.val().length == 0) {
                    return false;
                }
                App.vent.trigger("chat:submit", this.model.get("friend"), this.ui.textinput.val());
                this.ui.textinput.val("");

                this.atBottom = true;

                return false;
            }
        },
        clickPanel: function(target) {
            this.ui.panel.removeClass("panel-primary").addClass("panel-chat");
            if (this.notificationPromise) {
                $.when(this.notificationPromise).done(function(notification) { notification.close()});
            }
            if (this.lastChatTime) {
                App.vent.trigger("chat:confirm", this.model.get("friend"), this.lastChatTime);
                delete this.lastChatTime;
            }
        },

        newChatHighlight: function() {
            if(!this.ui.textinput.is(":focus")) {
                this.ui.panel.removeClass("panel-chat").addClass("panel-primary");
            }
            else if (this.lastChatTime) {
                App.vent.trigger("chat:confirm", this.model.get("friend"), this.lastChatTime);
                delete this.lastChatTime;
            }
        },

        scrollCheck: function(e) {
            if (this.ui.panelBody.scrollTop() + this.ui.panelBody.outerHeight() >= this.ui.panelBody.prop("scrollHeight")) {
                this.atBottom = true;
            }
            else {
                this.atBottom = false;
            }
            return MiscUtils.isScrollOverflow(e);
        },

        closeChat: function(e) {
            this.model.collection.remove(this.model);
        }
    });

    var ChatsView = Marionette.CollectionView.extend({
        childView: ChatView,
        className: "overlay rotate clearfix"
    });
    return ChatsView;
});
