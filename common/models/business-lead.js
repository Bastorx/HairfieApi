'use strict';

var Promise = require('../../common/utils/Promise');
var moment = require('moment-timezone');
var Hooks = require('./hooks');

module.exports = function (BusinessLead) {
    Hooks.generateId(BusinessLead);
    Hooks.updateTimestamps(BusinessLead);

    BusinessLead.prototype.toRemoteObject =
    BusinessLead.prototype.toShortRemoteObject = function (context) {

        return {
            href            : BusinessLead.app.urlGenerator.api('businessLeads/'+this.id),
            name            : this.name,
            kind            : this.kind,
            email           : this.email,
            zipCode         : this.zipCode,
            note            : this.note,
            phoneNumber     : this.phoneNumber
        }
    }

    BusinessLead.afterCreate = function (next) {
        var businessLead = this;

        BusinessLead.app.models.email.notifySales('Nouveau lead', {
            'name'            : businessLead.name,
            'kind'            : businessLead.kind,
            'email'           : businessLead.email,
            'zipCode'         : businessLead.zipCode,
            'note'              : businessLead.note,
            'phoneNumber'     : businessLead.phoneNumber
        });

        next();
    };
}