define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'msgpack',
    'visibility',
    'app/encryption',
    'app/models/post',
    'app/models/friend',
    'app/collections/myPosts',
    'app/collections/posts',
    'app/collections/friends',
    'app/collections/permissions',
    'app/collections/profiles',
    'app/views/newPost',
    'app/views/post',
    'app/views/friend',
    'app/views/modals',
    'app/storage',
    'utils/data-convert',
    'utils/image',
    'utils/random'
], function($, _, Backbone, Marionette, Msgpack, Visibility, Encryption, Post, Friend, MyPosts, PostCollection, FriendCollection, PermissionCollection, ProfileCollection, NewPostView, PostView, FriendView, Modals, Storage, DataConvert, ImageUtil, RandomUtil){

    var myPosts = new MyPosts();
    var friends = new FriendCollection();
    var otherCollection = new PostCollection();
    var profiles = new ProfileCollection();

    var AppView = Backbone.View.extend({

        initialize: function() {

            var app = this;
            this.listenTo(friends, 'add', this.addFriendsPosts);

            // Wait for user profile to sync before displaying user posts
            // This is required for user name / image to show up properly in posts
            $.when(profiles.fetch()).done(function() {
                var profilePictureUrl = profiles.getFirst().get('pictureUrl');
                var profileName = profiles.getFirst().get('name');

                otherCollection.addMyCollection(myPosts, profileName, profilePictureUrl);
                myPosts.fetch();
            });

            friends.fetch();

            var perms = new PermissionCollection();
            perms.addFriends(friends);

            var newPostView = new NewPostView({
                permissions: perms
            });
            newPostView.render();
            $("#newPost").html(newPostView.el);

            newPostView.on("post:submit", function(post){
                myPosts.add(post);
                post.save();
                app.saveManifests();
            });

            var friendsList = new Friends({
                collection: friends
            });

            friendsList.render();
            $("#friends").html(friendsList.el);


            var myPostList = new Posts({
                collection: otherCollection
            });

            myPostList.render();
            $("#friendsPosts").html(myPostList.el);

            myPostList.on("childview:post:delete", function(post){
                setTimeout(function(){app.saveManifests()}, 100);
            });

            var minute = 60 * 1000;
            Visibility.every(3 * minute, 15 * minute, function () {
                var refresh = app.refreshPosts.bind(app);
                refresh();
            });

            Visibility.change(function (e, state) {
                if (state == "visible") {
                    var refresh = app.refreshPosts.bind(app);
                    refresh();
                }
            });
        },

        el: 'body',

        events: {
            "click #addFriend": 'showAddFriendForm',
            "click #myInfo": 'showMyProfile'

        },

        addFriendsPosts: function(friend) {

            var friendManifest = friend.get('friendsManifest');
            if (!friendManifest) {
                return;
            }
            Storage.downloadUrl(friendManifest).done(function(data) {
                var decData = Encryption.decryptBinaryData(data, "global");
                var decObj = Msgpack.decode(decData.buffer);

                var posts = decObj['posts'];

                friend.set('pictureUrl', decObj['pictureUrl'] );
                friend.save();

                otherCollection.addCollection(friendManifest, posts, decObj['name'], friend.get('pictureUrl'));

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

        createUser: function(account, friendsManifest) {

            var deferred = $.Deferred();

            var id = RandomUtil.makeId();
            var changes = {account: account, manifestFile: id, friendsManifest: friendsManifest};

            var newFriend = new Friend(changes);
            this.saveManifest(newFriend)
                .then(Storage.shareDropbox)
                .then(function(url) {
                    newFriend.set('manifestUrl', url);
                    friends.add(newFriend);
                    newFriend.save();
                    deferred.resolve(newFriend);
                });
            return deferred;
        },

        saveManifest: function(friend) {
            var posts = myPosts.toJSON();
            var manifest = {};

            var filteredPosts = [];

            for (var i = 0; i< posts.length; i++) {
                var post = posts[i];
                if (!post.hasOwnProperty('permissions') ||
                    $.inArray("all", post.permissions) > -1 ||
                    $.inArray(friend.get('id'), post.permissions) > -1
                ) {
                    filteredPosts.push(_.omit(post, 'permissions'));
                }
            }

            manifest['posts'] = filteredPosts;

            var profile = profiles.getFirst();
            manifest['name'] = profile.get('name');
            manifest['pictureUrl'] = profile.get('pictureUrl');

            var packedManifest = new Uint8Array(Msgpack.encode(manifest));
            return friend.saveManifest(packedManifest);
        },
        saveManifests: function() {
            friends.each(function(friend) {
                this.saveManifest(friend);
            }, this);
        },

        refreshPosts: function() {
            console.log("refresh");
            friends.each(function(friend) {
                this.addFriendsPosts(friend);
            }, this);
        },

        deleteCallback: function (model) {
            console.log("Deleting " + model);
            this.saveManifests();
        }
    });

    var Posts = Marionette.CollectionView.extend({
        childView: PostView
    });


    var Friends = Marionette.CollectionView.extend({
        childView: FriendView
    });
    return AppView;
});