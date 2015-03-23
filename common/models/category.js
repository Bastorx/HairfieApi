var Promise = require('../../common/utils/Promise'),
    Q = require('q'),
    RemoteObject = require('../utils/RemoteObject'),
    lodash = require('lodash');

var Hooks = require('./hooks');

module.exports = function(Category) {
    Hooks.generateId(Category);
    Hooks.updateTimestamps(Category);

    Category.prototype.toRemoteObject = function (context) {
        return this.toRemoteShortObject();
    };

    Category.prototype.toRemoteShortObject = function (context) {
        var pictureObject = this.getPictureObject();

        return {
            id          : this.id,
            href        : Category.app.urlGenerator.api('categories/'+this.id),
            name        : this.name,
            description : this.description,
            tags        : this.tags,
            picture     : pictureObject && pictureObject.toRemoteObject(),
            position    : this.position
        };
    };

    Category.prototype.getPictureObject = function () {
        return Picture.fromDatabaseValue(this.picture, 'categories', Category.app);
    };
};
