define([
    'jquery',
    'underscore',
    'backbone',
    'backbone.collectionView',
    'msgpack',
    'app/encryption',
    'app/models/post',
    'app/collections/myPosts',
    'app/collections/posts',
    'app/collections/friends',
    'app/collections/profiles',
    'app/views/post',
    'app/views/friend',
    'app/views/modals',
    'app/storage',
    'utils/data-convert',
    'utils/image',
    'utils/random'
], function($, _, Backbone, CollectionView, Msgpack, Encryption, Post, MyPosts, PostCollection, FriendCollection, ProfileCollection, PostView, FriendView, Modals, Storage, DataConvert, ImageUtil, RandomUtil){

    var myPosts = new MyPosts();
    var friends = new FriendCollection();
    var otherCollection = new PostCollection();
    var profiles = new ProfileCollection();

    var AppView = Backbone.View.extend({

        initialize: function() {
            this.listenTo(profiles, 'sync', function() {myPosts.fetch()});
            this.listenTo(myPosts, 'sync', this.onProfileSync);

            this.listenTo(friends, 'add', this.addFriendsPosts);

            profiles.fetch();
            friends.fetch();

            this.newPostText = $("#newPostText");
            this.newPostImage = $("#newPostImage");

            var friendsView = new Backbone.CollectionView( {
                el : $( "ul#otherContent" ),
                selectable : false,
                collection : otherCollection,
                modelView : PostView,
                modelViewOptions: {myPost: false},
                emptyListCaption: "Empty!"
            } );
            friendsView.render();

        },

        el: 'body',

        events: {
            'submit form': 'createPost',
            "click #addFriend": 'showAddFriendForm',
            "click #myInfo": 'showMyProfile'

        },

        // Wait for user profile to sync before displaying user posts
        // This is required for user name / image to show up properly in posts
        onProfileSync: function() {

            var profilePictureUrl = profiles.getFirst().get('pictureUrl');
            var collectionView = new Backbone.CollectionView( {
                el : $( "ul#content" ),
                selectable : false,
                collection : myPosts,
                modelView : PostView,
                modelViewOptions: {myPost: true, profilePictureUrl: profilePictureUrl},
                emptyListCaption: "Empty!"
            } );
            collectionView.render();

        },

        addFriendsPosts: function(friend) {

            var view = new FriendView({ model: friend });
            $('#friends').prepend( view.render().el );

            var friendManifest = friend.get('friendsManifest');
            if (!friendManifest) {
                return;
            }
            Storage.downloadUrl(friendManifest).done(function(data) {
                var decData = Encryption.decryptBinaryData(data, "global");
                var decObj = Msgpack.decode(decData.buffer);
                console.log(decObj);

                var posts = decObj['posts'];

                friend.set('pictureUrl', decObj['pictureUrl'] );
                friend.save();

                for (var i = 0; i < posts.length; i++) {
                    var post = posts[i];
                    post['owner'] = decObj['name'];
                    post['profilePictureUrl'] = friend.get('pictureUrl');
                    var postModel = new Post(post);
                    otherCollection.add(postModel);
                }
            });

        },


        showAddFriendForm: function() {

            var app = this;
            Modals.addFriend().done(function(model) {
                app.createUser(model.get('account'), model.get('friendManifest'));
            });
        },

        showMyProfile: function() {
            var profile = profiles.getFirst();
            var changes = {};

            var modal = Modals.showMyProfile(profile, changes);

            modal.on('ok', function() {
                if ('name' in changes) {
                    profile.set('name', changes['name']);
                    profile.save();
                }
                if('picture' in changes) {

                    var img = new Image();
                    img.src = changes['picture'];

                    var resized = ImageUtil.resize(img, 300, 200);

                    var picture = DataConvert.dataUriToTypedArray(resized);
                    Storage.uploadDropbox("profilePic",  picture['data']).then(Storage.shareDropbox).done(function(url) {
                        profile.set('pictureFile', "profilePic");
                        profile.set('pictureUrl', url);
                        profile.save();
                    });
                }
            });
        },

        createUser: function(account, url) {

            var deferred = $.Deferred();

            var id = RandomUtil.makeId();
            var changes = {account: account, manifestFile: id, friendsManifest: url};

            this.saveManifest(id)
                .then(Storage.shareDropbox)
                .then(function(url) {
                    changes['manifestUrl'] = url;
                    var friend = friends.create(changes);
                    deferred.resolve(friend);
                });
            return deferred;
        },

        saveManifest: function(path) {
            var deferred = $.Deferred();

            var posts = myPosts.toJSON();
            var manifest = {};

            manifest['posts'] = myPosts.toJSON();

            var profile = profiles.getFirst();
            manifest['name'] = profile.get('name');
            manifest['pictureUrl'] = profile.get('pictureUrl');

            var packedManifest = Msgpack.encode(manifest);
            var p = new Uint8Array(packedManifest);

            console.log(manifest);
            var encText = Encryption.encryptWithPassword("global",  "plain/text", p);

            Storage.uploadDropbox(path, encText).done(function(stats) {
                deferred.resolve(stats);
            });
            return deferred;
        },
        saveManifests: function() {
            friends.each(function(friend) {
                this.saveManifest(friend.get('manifestFile'));
            }, this);
        },

        createPost: function(event) {
            event.preventDefault();

            var post = new Post();
            var date = new Date().getTime();
            post.set({owner: "MEEEEEEEE", sharedDate: date, created: date});

            var postText = this.newPostText.val();
            if (postText && postText.length > 0) {
                post.set({hasText: true, textData: postText});
            }

            var imageElement = this.newPostImage.children()[0] ;
            if (imageElement) {
                var resizedData = ImageUtil.resize(imageElement, 400, 300);
                var fullsizeData = imageElement.src;
                post.set({hasImage: true, resizedImageData: resizedData, fullImageData: fullsizeData });
            }

            var appView = this;
            post.uploadPost().done(function() {
                var form = $("#newPostForm");
                form[0].reset();
                form.removeClass("in");
                myPosts.create(post);
                appView.saveManifests();

            });

            console.log("Clicked post " + event);
        }
    });

    return AppView;
});