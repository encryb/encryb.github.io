define([
  'backbone',
  'underscore',
  'app/models/post',
  'app/models/postWrapper',
  'app/remoteManifest',
  'utils/dropbox-client'
], function(Backbone, _, Post, PostWrapper, RemoteManifest, DropboxClient){

var Wall2 = Backbone.Collection.extend({
    model: PostWrapper,

    collections: {},
    upvotes: {},
    friends: {},

    idToModel: {},

    initialize: function() {
        this.on("add", this.onPostAdded);
        this.on("remove", this.onPostRemoved);
    },

    onPostAdded: function(model) {
        var id = model.get('postId');
        this.idToModel[id] = model;

        if (this.myUpvotes.findWhere({postId:id})) {
            model.addMyUpvote();
        }

        if(this.myComments) {
            var comments = this.myComments.where({postId: id});
            for (var i=0; i < comments.length; i++) {
                var comment = comments[i];
                this.onMyCommentAdded(comment);
            }
        }
    },

    onPostRemoved: function(model) {
        delete this.idToModel[model.get('postId')];
    },


    onMyUpvoteAdded: function(upvote) {
        var upvoteId = upvote.get('postId');
        var model = this.idToModel[upvoteId];
        if(model) {
            model.addMyUpvote();
        }
    },
    onMyUpvoteRemoved: function(upvote) {
        var upvoteId = upvote.get('postId');
        var model = this.idToModel[upvoteId];
        if(model) {
            model.removeMyUpvote();
        }
    },

    onFriendUpvoteAdded: function(upvoteId, name, pictureUrl, userId) {
        if (this.idToModel.hasOwnProperty(upvoteId)) {
            var model = this.idToModel[upvoteId];
            if(model) {
                model.addFriendUpvote(name, pictureUrl, userId);
            }
        }
    },
    onFriendUpvoteRemoved: function(upvoteId, friend) {
        if (this.idToModel.hasOwnProperty(upvoteId)) {
            var model = this.idToModel[upvoteId];
            if(model) {
                model.removeFriendUpvote(friend);
            }
        }
    },

    toggleUpvote: function(id) {
        if (! this.myUpvotes) {
            return;
        }
        if (this.myUpvotes.isUpvoted(id)) {
            this.myUpvotes.removeUpvote(id);
        }
        else {
            this.myUpvotes.addUpvote(id);
        }
    },

    addMyUpvotes: function(myUpvotes) {
        this.myUpvotes = myUpvotes;
        this.listenTo(myUpvotes, 'add', this.onMyUpvoteAdded);
        this.listenTo(myUpvotes, 'remove', this.onMyUpvoteRemoved);

        myUpvotes.each(function(upvote) {
            this.onMyUpvoteAdded(upvote);
       });
    },

    onMyCommentAdded: function(name, comment) {
        var postId = comment.get('postId');
        var model = this.idToModel[postId];
        if (model) {
            model.addComment(comment.get('id'), name , comment.get("text"), comment.get("date"), true);
        }
    },

    onMyCommentRemoved: function(comment) {
        var postId = comment.get('postId');
        var model = this.idToModel[postId];
        if (model) {
            model.removeComment(comment.get('id'));
        }
    },


    addFriendsComment: function(friend, comment) {
        var postId = comment.postId;
        var model = this.idToModel[postId];
        if (model) {
            model.addComment(comment.id, friend.name , comment.text, comment.date);
        }
    },

    removeFriendsComment: function(comment) {
        var postId = comment.postId;
        var model = this.idToModel[postId];
        if (model) {
            model.removeComment(comment.get('id'));
        }
    },

    addMyCollection: function(posts, comments, name, pictureUrl) {
        this.listenTo(posts, 'add', this.addMyPost);
        // remove is handled automatically when model is destoyed
        this.myName = name;
        this.myPicture = pictureUrl;
        var wall = this;
        posts.each(function(post) {
            var wrapper = new PostWrapper();
            wrapper.setMyPost(post, name, pictureUrl);
            wall.add(wrapper);
        });

        this.myComments = comments;
        this.listenTo(comments, 'add', this.onMyCommentAdded.bind(this, name));
        this.listenTo(comments, 'remove', this.onMyCommentRemoved);

        comments.each(function(comment) {
            wall.onMyCommentAdded(comment, name);
        });
    },

    addMyPost: function(post) {
        var wrapper = new PostWrapper();
        wrapper.setMyPost(post, this.myName, this.myPicture);
        this.add(wrapper);
    },

    addCollection: function(manifest, friend) {
        var wall  = this;

        var userId = "undefined";
        if (friend.hasOwnProperty('userId')) {
            userId = friend.userId;
        }

        if (this.friends.hasOwnProperty(manifest)) {
            var oldFriend = this.friends[manifest];

            RemoteManifest.compare(oldFriend, friend, function(key, action, item) {
                if (key == "posts") {
                    if (action == "add") {
                        wall.addPost(item, friend.name, friend.pictureUrl, userId);
                    }
                    else {
                        wall.removePost(item);
                    }
                }
                else if (key == "upvotes"){
                    if (action == "add") {
                        wall.onFriendUpvoteAdded(item.postId, friend.name, friend.pictureUrl, userId);
                    }
                    else {
                        wall.onFriendUpvoteRemoved(item.postId, userId);
                    }
                }
                else if (key == "comments") {
                    if (action == "add") {
                        wall.addFriendsComment(item, friend);
                    }
                    else {
                        wall.removeFriendsComment(item);
                    }
                }
            });
        }
        else {
            this.friends[manifest] = friend;
            for (var i=0; i< friend.posts.length; i++) {
                var post = friend.posts[i];
                wall.addPost(post, friend.name, friend.pictureUrl, userId);
            }
            if (friend.hasOwnProperty('upvotes')) {
                for (var i=0; i< friend.upvotes.length; i++) {
                    var upvote = friend.upvotes[i];
                    wall.onFriendUpvoteAdded(upvote.postId, friend.name, friend.pictureUrl, userId);
                }
            }
            if (friend.hasOwnProperty('comments')) {
                for (var i=0; i< friend.comments.length; i++) {
                    var comment = friend.comments[i];
                    wall.addFriendsComment(friend, comment);
                }
            }

        }
    },
    addPost: function(post, name, pictureUrl, userId) {
        var wrapper = new PostWrapper();
        wrapper.setFriendsPost(post, name, pictureUrl, userId);
        this.add(wrapper);

    },
    removePost: function(post) {
        var removePost = this.findWhere({id: post.id});
        if (removePost) {
            this.remove(removePost);
        }
    },
    setPostModel: function(post) {
        this.postModel = post;
    },
    destroyPost: function() {
        if ('postModel' in this) {
            this.postModel.destroyPost();
        }
        this.destroy();
    },
    comparator: function(post) {
        return -post.get('post').get('created');
    }

})

return Wall2;
});
