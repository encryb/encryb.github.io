define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',
    'require-text!app/templates/friendDetails.html'

], function ($, _, Backbone, Marionette, FriendsDetailsTemplate) {

    var FriendsDetailsView = Marionette.ItemView.extend({

        template: _.template(FriendsDetailsTemplate),

        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        }
    });

    return FriendsDetailsView;
});
