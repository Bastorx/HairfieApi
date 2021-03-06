'use strict';

var Promise = require('../../common/utils/Promise');
var _ = require('lodash');
var Hooks = require('./hooks');
var q = require('q');

module.exports = function (BusinessReview) {
    Hooks.generateId(BusinessReview);
    Hooks.updateTimestamps(BusinessReview);

    BusinessReview.observe('before save', function (ctx, next) {
        if (ctx.instance) {
            var sum = 0, count = 0;
            _.forIn(ctx.instance.criteria || {}, function (value) {
                count++;
                sum += value;
            });

            // ok, we don't change rating valu eif there is no criteria cause it
            // may be an old fashioned review (bare rating)
            if (count > 0) ctx.instance.rating = Math.ceil(sum / count);

            var getauthorId = q(null);
            if (ctx.instance.authorId) {
                getauthorId = q(ctx.instance.authorId);
            } else {
                getauthorId = q.ninvoke(BusinessReview.app.models.user, 'findOne', {where: {email: ctx.instance.email}})
                .then(function(author) {
                    return author ? author.id : null;
                });
            }

            getauthorId
                .then(function (id) {
                    if (id) {
                        ctx.instance.authorId = id;
                    }
                    next();
                });
        } else {
            next();
        }
    });

    BusinessReview.observe('after save', function (ctx, next) {
        if (ctx.instance) {
            var businessReview = ctx.instance;

            if(ctx.isNewInstance) {
                Promise.npost(businessReview, 'business')
                .then(function (business) {
                    return BusinessReview.app.models.email.notifySales('Un avis a été déposé', {
                        'ID'              : businessReview.id,
                        'Salon'           : business.name,
                        'Nom'             : businessReview.firstName + ' ' + businessReview.lastName,
                        'Email'           : businessReview.email,
                        'Note globale'    : businessReview.rating,
                        'Commentaire'     : businessReview.comment,
                        'RequestID'       : businessReview.requestId
                    });
                })
                .fail(console.log);
            }

            q.ninvoke(BusinessReview.app.models.Business, 'getRating', ctx.instance.businessId)
                .then(function(business) {
                    console.log("business has been saved", business);
                })
                .fail(function(error) {
                    console.log("error", error);
                })

            // update review request with reviewId so we know it's used
            businessReview.request(function (error, request) {
                if (request) {
                    request.reviewId = businessReview.id;
                    request.save();
                }

                next();
            });
        } else {
            next();
        }
    });

    BusinessReview.observe('after save', function updateNumReviews(ctx, next) {
        var businessReview = ctx.instance;
        if(businessReview && businessReview.authorId) {

            Promise.ninvoke(businessReview, 'author')
                .then(function(author) {
                    Promise.ninvoke(BusinessReview, 'count', {authorId: businessReview.authorId})
                        .then(function (numReviews) {
                            author.numReviews = numReviews;
                            console.log("update author %s with %s numReviews", author.id, numReviews)
                            Promise.ninvoke(author, 'save');
                        })
                });
        }
        next();
    });

    var criterionKeys = [
        'welcome',
        'treatment',
        'discussion',
        'decoration',
        'resultQuality',
        'hygiene',
        'availability',
        'business',
        'businessMember',
        'haircut'
    ];

    BusinessReview.prototype.toRemoteObject = function (context) {
        var criteria = this.criteria || {};

        return Promise.ninvoke(this, 'author')
            .then(function (author) {
                return {
                    id          : this.id,
                    href        : BusinessReview.app.urlGenerator.api('businessReviews/'+this.id),
                    firstName   : author ? author.firstName : this.firstName,
                    lastName    : author ? author.lastName : this.lastName,
                    gender      : author ? author.gender : this.gender,
                    email       : author ? author.email : this.email,
                    verified    : this.requestId ? true : false,
                    rating      : this.rating,
                    criteria    : this.criteria || {},
                    comment     : this.comment,
                    author      : author ? author.toRemoteShortObject(context) : null,
                    business    : Promise.ninvoke(this.business).then(function (business) {
                        return business ? business.toRemoteShortObject(context) : null;
                    }),
                    createdAt   : this.createdAt,
                    updatedAt   : this.updatedAt
                };
            }.bind(this));
    };

    BusinessReview.validateAsync('businessId', function (onError, onDone) {
        this.business(function (error, business) {
            if (error || !business) onError();
            onDone();
        });
    }, {message: 'exists'});

    BusinessReview.validate('criteria', function (onError) {
        _.forIn(this.criteria || {}, function (value, key) {
            if (-1 == criterionKeys.indexOf(key)) onError();
            if (!_.isNumber(value)) onError();
            if (value < 0 || value > 100) onError();
        });
    }, {message: 'valid'});

    BusinessReview.beforeRemote('create', function (ctx, _, next) {
        if (!ctx.req.body.requestId) {
            if (ctx.req.user) {
                ctx.req.body.authorId = ctx.req.user.id;
            }

            // fill values with user's ones
            // only verified reviews can be associated to hairfies
            delete ctx.req.body.hairfieId;

            next();
        }
        else {
            var BusinessReviewRequest = BusinessReview.app.models.BusinessReviewRequest;

            BusinessReviewRequest.findById(ctx.req.body.requestId, function (error, request) {
                if (error) return next(error);
                if (!request) return next({statusCode: 400, message: 'Review request not found'});
                if (!request.canWrite()) return next({statusCode: 400, message: 'Cannnot write with this review request'});

                ctx.req.body.businessId = request.businessId;
                ctx.req.body.hairfieId = request.hairfieId;
                ctx.req.body.email = request.email;

                next();
            });
        }
    });

    BusinessReview.getBusinessRating = function (businessId, callback) {
        var collection = BusinessReview.dataSource.connector.collection(BusinessReview.definition.name);

        var pipe = [
            {$match: {businessId: businessId, hidden: {$ne: true}}},
            {$group: {_id: null, numReviews: {$sum: 1}, rating: {$avg: "$rating"}}}
        ];

        collection.aggregate(pipe, function (error, result) {
            if (error) return callback(error);

            var rating = {
                numReviews: 0,
                rating:     null
            };

            if (1 === result.length) {
                rating.numReviews = result[0].numReviews;
                rating.rating     = result[0].rating;
            }

            callback(null, rating);
        });
    };

    BusinessReview.delete = function (req, user, next) {
        if (!user) return next({statusCode: 401});

        return Promise.ninvoke(BusinessReview, 'findById', req.params.businessReviewId)
            .then(function(businessReview) {
                if (!businessReview) return next({statusCode: 404});
                var isAllowed = user.admin;
                if (!isAllowed) return next({statusCode: 403});

                businessReview.hidden = true;

                q.ninvoke(BusinessReview.app.models.Business, 'getRating', businessReview.businessId);

                return Promise.npost(businessReview, 'save');
            })
    };

    BusinessReview.remoteMethod('delete', {
        description: 'Delete the BusinessReview',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}},
        ],
        http: { path: '/:businessReviewId', verb: 'DELETE' }
    });
};
