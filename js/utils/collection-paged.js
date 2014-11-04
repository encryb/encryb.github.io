define([
    'backbone'
],function(Backbone) {

    var PagedCollection = Backbone.Collection.extend({

        initialize: function(models, options) {
            this._limit = options.limit;
            this.comparator = options.comparator;
            this.setCollection(options.collection);
        },
        setCollection: function(collection) {
            this._collection = collection;
            this._collection.on("add", this.onAdd, this);
            this._collection.on("remove", this.onRemove, this);
            this._collection.on("reset", this.onReset, this);

            this._process();
        },
        increaseLimit: function(increase) {
            this._limit = increase + this._limit;
            this._process();
        },

        _process: function() {
            // we are at limit
            if (this.length >= this._limit) {
                return true;
            }
            // we already have all items
            if (this.length >= this._collection.length) {
                return false;
            }

            for (var i = this.length; i < this._collection.length; i++) {
                var model = this._collection.at(i);
                Backbone.Collection.prototype.add.call(this, model);

                // we are at limit
                if (this.length >= this._limit) {
                    return true;
                }
            }
        },

        add: function() {
            throw "This is a read only collection";
        },

        remove: function() {
            throw "This is a read only collection";
        },

        reset: function() {
            throw "This is a read only collection";
        },

        /*
         * Event handlers
         */
        onAdd: function(model) {
            // if we are at the limit and last element is higher rated than
            // new one, don't do anything
            if (this.length >= this._limit) {
                var lastModel = this.at(this._limit - 1);
                if (this.comparator(lastModel) < this.comparator(model)) {
                    return;
                }
            }
            // else add it to collection
            Backbone.Collection.prototype.add.call(this, model);
        },

        onRemove: function(model) {
            Backbone.Collection.prototype.remove.call(this, model);
        },

        onReset: function() {
            var models = this._collection.models.slice(0, this._limit);
            Backbone.Collection.prototype.apply.call(this, models);

        }
    });
    return PagedCollection;
});