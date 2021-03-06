'use strict';

var moment = require('moment');
var Promise = require('../../common/utils/Promise');
var _ = require('lodash');

module.exports = function (Stat) {

    Stat.business = function (businessId, cb) {
        var Business = Stat.app.models.Business;
        var Hairfie = Stat.app.models.Hairfie;
        var BusinessReviewRequest = Stat.app.models.BusinessReviewRequest;
        var BusinessReview = Stat.app.models.BusinessReview;

        Promise.all([
                Promise.ninvoke(Business, 'findById', businessId),
                Promise.ninvoke(this, 'getWeeklyStats', Hairfie, {businessId: businessId}),
                Promise.ninvoke(this, 'getWeeklyStats', BusinessReviewRequest, {businessId: businessId}),
                Promise.ninvoke(this, 'getWeeklyStats', BusinessReview, {businessId: businessId})
            ])
            .spread(function (business, numHairfies, numBusinessReviewRequests, numReviews) {
                if (!business) throw {statusCode: 404};

                return {
                    numHairfies: numHairfies,
                    numBusinessReviewRequests: numBusinessReviewRequests,
                    numReviews: numReviews
                };
            })
            .then(cb.bind(null, null), cb)
            .fail(cb);
    };

    Stat.getWeeklyStats = function (Hairfie, match, callback) {
        var collection = Hairfie.dataSource.connector.collection(Hairfie.definition.name);

        var pipe = [
            {$match: match},
            {$group:
                {
                    _id: {
                        year: {$year: "$createdAt"},
                        week: {$week: "$createdAt"}
                    },
                    count:{$sum: 1}
                 }
            },
            { $sort: { _id: -1 } }
        ];

        collection.aggregate(pipe, function (error, results) {
            if (error) return callback(error);

            var statObj = [];

            for(var i = 0; i < 12; i++) {
                var w = moment().startOf('isoWeek').subtract(i, 'week');
                var data = _.find(results, function(result) {
                    var wToCompare = moment(w).subtract(1, 'week');
                    return result._id.year == moment(wToCompare).year() && result._id.week == moment(wToCompare).week()
                });
                statObj.push({
                    week: moment(w),
                    weekNumber: moment(w).week(),
                    count: data ? data.count : 0
                })
            }

            callback(null, statObj);
        });
    };


    Stat.remoteMethod('business', {
        description: 'Returns the stats for a specific business',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'ID of the reference business'},
        ],
        returns: {arg: 'businessStats', root: true},
        http: { verb: 'GET', path: '/businesses/:businessId' }
    });
};