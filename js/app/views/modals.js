define([
    'jquery',
    'underscore',
    'backbone',
    'backbone.bootstrap-modal',
    'backbone-forms-bootstrap3',
    'require-text!app/templates/imageModal.html'
], function($, _, Backbone, BackboneModal, BackboneForm, ImageModalTemplate){

    var modals = {};

    var ImageModalView = Backbone.View.extend({
        template: _.template( ImageModalTemplate ),
        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
            this.model.fetchPost(true);
        },
        render: function() {
            this.$el.html( this.template( this.model.toJSON({full:true}) ) );
            return this;
        }
    });

    modals.showFriend = function(model) {
        var form = new BackboneForm({model: model});
        var modal = new BackboneModal({
            animate: false,
            showFooter: true,
            okText: "Save",
            cancelText: "Cancel",
            content: form
        }).open();

        modal.on('ok', function () {
            //Do some validation etc.
            var validateErrors = form.validate();
            if (validateErrors) {
                modal.preventClose();
            }
            else {
                form.commit();
                form.model.save();
            }
        });
    }

    modals.showImage =  function(model){
        var modal = new BackboneModal({
            animate: false,
            showFooter: true,
            okText: "Close",
            cancelText: false,
            fullscreen: true,
            content: new ImageModalView({model: model})
        });

        modal.open();

        return modal;

    }

    modals.showMyProfile =  function(model, changes){

        var modal = new BackboneModal({
            animate: false,
            showFooter: true,
            okText: "Update",
            cancelText: "Cancel",
            content: new MyInfoModalView({model: model, changes: changes})
        }).open();

        return modal;

    }


    modals.addFriend = function() {

        var deferred = $.Deferred();

        var NewFriend = Backbone.Model.extend({
            defaults: {
                account: "",
                friendsManifest: ""
            },
            schema: {
                account:            { type: 'Text', validators: ['required'] },
                friendsManifest:    'Text'
            }
        });

        var model = new NewFriend();

        var form = new BackboneForm({model: model});
        var modal = new BackboneModal({
            animate: false,
            showFooter: true,
            okText: "Create",
            cancelText: "Cancel",
            content: form
        }).open();

        modal.on('ok', function() {
            //Do some validation etc.
            var validateErrors = form.validate();
            if (validateErrors) {
                modal.preventClose();
            }
            else {
                form.commit();
                deferred.resolve(model);
            }
        });

        return deferred;

    }



    return modals;
});