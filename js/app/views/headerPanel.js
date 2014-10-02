define([
    'jquery',
    'underscore',
    'marionette',
    'app/services/dropbox',
    'require-text!app/templates/headerPanel.html'

], function($, _, Marionette, Dropbox, HeaderPanelTemplate) {

    var HeaderPanelView = Marionette.ItemView.extend({
        template: _.template(HeaderPanelTemplate),

        templateHelpers: {
            dropboxId: function() {
                return Dropbox.client.dropboxUid();
            }
        },

        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        }
    });

    return HeaderPanelView;
});
