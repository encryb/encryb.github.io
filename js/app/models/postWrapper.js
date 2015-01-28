define([
    'backbone'
], function (Backbone) {


    var contentJsonToCollection = function(contentArray){
        var collection = new Backbone.Collection();

        for (var i=0; i<contentArray.length; i++) {
            var contentAttributes = contentArray[i];
            // $LEGACY
            if (typeof contentAttributes === "string") {
                contentAttributes = JSON.parse(contentAttributes);
            }
            var model = new Backbone.Model(contentAttributes);
            collection.add(model);
        }
        return collection;
    };


    var PostWrapper = Backbone.Model.extend({

        defaults: {
            comments: []
        },

        initialize: function() {
            var upvotes = new Backbone.Model({upvoted: false, friendUpvotes: new Backbone.Collection()});
            this.set("upvotes", upvotes);

            var commentsColl = new Backbone.Collection();
            commentsColl.comparator = function(comment) {
                return comment.get("date");
            };
            this.set("comments", commentsColl);


        },

        // not persisted
        sync: function () { return false; },

        setPostId: function(userId, postId) {
            this.set("postId", userId + ":" + postId);

        },

        addMyUpvote: function() {
            this.get("upvotes").set("upvoted", true);
        },

        removeMyUpvote: function() {
            this.get("upvotes").set("upvoted", false);
        },

        addComment: function(model) {
            var comment = new Backbone.Model(model.attributes);
            this.get("comments").add(comment);
        },

        removeComment: function(id) {
            var comments = this.get("comments");
            var comment = comments.findWhere({id: id});
            if (comment) {
                comments.remove(comment);
            }
        },

        addFriendsUpvote: function(friend) {
            var upvotes = this.get("upvotes").get("friendUpvotes").add(friend);
        },

        removeFriendsUpvote: function(userId) {
            var friendUpvotes = this.get("upvotes").get("friendUpvotes");
            var friend = friendUpvotes.findWhere({userId: userId});
            friendUpvotes.remove(friend);
        },

        setMyPost: function(postModel, myInfo) {
            this.postModel = postModel;
            var attr = _.extend(_.clone(postModel.attributes), {poster: myInfo, myPost: true});
            // caching for newly created posts, content includes downloaded assets
            if (postModel.hasOwnProperty("contentList")) {
                attr["content"] = new Backbone.Collection(postModel["contentList"]);
            }
            else if (attr.hasOwnProperty("content")) {
                attr["content"] = contentJsonToCollection(attr["content"]);
            }
            else {
                attr["content"] = new Backbone.Collection();
            }
            var model = new Backbone.Model(attr);
            this.set("post", model);
            var userId = myInfo.get("userId");
            this.setPostId(userId, postModel.get("id"));
            this.set('userId', userId);
        },

        setFriendsPost: function(postModel, friend) {
            var attr = _.extend(_.clone(postModel.attributes), {poster: friend, myPost: false});
            if (attr.hasOwnProperty("content")) {
                attr["content"] = contentJsonToCollection(attr["content"]);
            }
            else {
                attr["content"] = new Backbone.Collection();
            }
            var model = new Backbone.Model(attr);
            this.set("post", model);
            this.setPostId(friend.get("userId"), postModel.get("id"));
            this.set('userId', friend.get("userId"));
        },

        updateDisplayModel: function(meta, addContent, removeContent) {
            var displayModel = this.get("post");

            if (typeof addContent !== "undefined" && addContent.length > 0) {
                var contentModels = [];
                for (var i=0; i<addContent.length; i++) {
                    var model = new Backbone.Model(addContent[i]);
                    contentModels.push(model);
                }
                if (displayModel.has("content")) {
                    displayModel.get("content").add(contentModels);
                }
                else {
                    var contentCollection = new Backbone.Collection(contentModels);
                    displayModel.set("content", contentCollection);
                }
            }
            if (typeof removeContent !== "undefined" && removeContent.length > 0) {
                if (displayModel.has("content")) {
                    var contentCollection = displayModel.get("content");
                    contentCollection.remove(removeContent);
                }
                else {
                    console.error("Removing from non existing content collection");
                }
            }
            displayModel.set(meta);
        },

        deletePost: function() {
            this.postModel.destroy();
            this.destroy();
        }
    });
    return PostWrapper;
});