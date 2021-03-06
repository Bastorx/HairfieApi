'use strict';

var Promise = require('../../common/utils/Promise');
var lodash = require('lodash');
var Hooks = require('./hooks');

module.exports = function (BusinessClaim) {
    Hooks.generateId(BusinessClaim);
    Hooks.updateTimestamps(BusinessClaim);

    BusinessClaim.prototype.toRemoteObject = function (context) {
        var obj = this.toObject();
        obj.href = BusinessClaim.app.urlGenerator.api('businessClaims/'+this.id);

        return obj;
    };

    // business claims are associated to currently logged in user
    BusinessClaim.beforeRemote('create', function (ctx, _, next) {
        ctx.req.body.authorId = ctx.req.accessToken.userId;

        if(ctx.req.body.pictures) {
            var pattern = /^((http|https):\/\/)/;
            ctx.req.body.pictures = lodash.filter(ctx.req.body.pictures, function(url) { return !pattern.test(url)});
        }

        if(ctx.req.body.phoneNumber) {
            ctx.req.body.phoneNumber = ctx.req.body.phoneNumber.replace(/\s/g, '');
        }

        next();
    });

    BusinessClaim.submit = function (businessClaimId, callback) {
        var User           = BusinessClaim.app.models.user,
            Business       = BusinessClaim.app.models.Business,
            BusinessMember = BusinessClaim.app.models.BusinessMember,
            Hairdresser    = BusinessClaim.app.models.Hairdresser;

        BusinessClaim.findById(businessClaimId, function (error, businessClaim) {
            if (error) return callback(error);
            if (!businessClaim) return callback({statusCode: 404});
            if (businessClaim.businessId) return callback({statusCode: 500, message: 'Already submited'});

            var business = new Business();
            business.name = businessClaim.name;
            business.kind = businessClaim.kind;
            business.phoneNumber = businessClaim.phoneNumber;
            business.address = businessClaim.address;
            business.gps = businessClaim.gps;
            business.pictures = businessClaim.pictures;
            business.services = businessClaim.services;
            business.men = businessClaim.men;
            business.women = businessClaim.women;
            business.children = businessClaim.children;

            Promise
                .all([
                    Promise.ninvoke(User, 'findById', businessClaim.authorId),
                    Promise.npost(business, 'save')
                ])
                .spread(function (user, business) {
                    businessClaim.businessId = business.id;

                    var hairdressers = businessClaim.hairdressers;
                    if (!Array.isArray(hairdressers)) {
                        hairdressers = [];
                    }

                    var businessMember = new BusinessMember();
                    businessMember.businessId = business.id;
                    businessMember.userId = businessClaim.authorId;
                    businessMember.firstName = user.firstName;
                    businessMember.lastName = user.lastName;
                    businessMember.hidden = true;
                    businessMember.active = true;

                    return Promise
                        .all([
                                Promise.npost(businessClaim, 'save'),
                                Promise.npost(businessMember, 'save'),
                                Promise.map(hairdressers, function (values) {
                                    var hairdresser = new Hairdresser();
                                    hairdresser.businessId = business.id;
                                    hairdresser.firstName = values.firstName;
                                    hairdresser.lastName = values.lastName;
                                    hairdresser.email = values.email;
                                    hairdresser.phoneNumber = values.phoneNumber;
                                    hairdresser.active = true;

                                    return Promise.npost(hairdresser, 'save');
                                })
                        ])
                        .then(function () {
                            return business;
                        })
                })
                .nodeify(callback);
        });
    };

    BusinessClaim.remoteMethod('submit', {
        description: 'Submit the business claim',
        accepts: [
            {arg: 'businessClaimId', type: 'string', description: 'Identifier of the business claim'}
        ],
        returns: {arg: 'Business', root: true},
        http: { verb: 'POST', path: '/:businessClaimId/submit' }
    });
}
