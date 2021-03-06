'use strict';

var Promise = require('../../common/utils/Promise');
var Hooks = require('./hooks');

module.exports = function (HairdresserSuggestion) {
    Hooks.generateId(HairdresserSuggestion);
    Hooks.updateTimestamps(HairdresserSuggestion);

    HairdresserSuggestion.validateAsync('businessId', function (onError, onDone) {
        this.business(function (error, business) {
            if (error || !business) onError();
            onDone();
        });
    }, {message: 'exists'});
    HairdresserSuggestion.validateAsync('authorId', function (onError, onDone) {
        if (!this.authorId) return onDone(); // author is optional
        this.author(function (error, business) {
            if (error || !business) onError();
            onDone();
        });
    }, {message: 'exists'});

    HairdresserSuggestion.prototype.toRemoteObject = function (context) {
        return {
            id          : this.id,
            business    : Promise.npost(this, 'business').then(function (business) {
                return business ? business.toRemoteShortObject() : null;
            }),
            author      : Promise.npost(this, 'author').then(function (user) {
                return user ? user.toRemoteShortObject(context) : null;
            }),
            firstName   : this.firstName,
            lastName    : this.lastName
        };
    };

    HairdresserSuggestion.beforeRemote('create', function (ctx, _, next) {
        ctx.req.body.authorId = ctx.req.user ? ctx.req.user.id : null;
        next();
    });
};
