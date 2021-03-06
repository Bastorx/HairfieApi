'use strict';

var Q = require('q');
var MailchimpLite = require('mailchimp-lite');
var _ = require('lodash');

module.exports = function (Mailchimp) {
    var client;

    Mailchimp.on('dataSourceAttached', function () {
        client = new MailchimpLite({
            key: Mailchimp.dataSource.settings.apiKey,
            datacenter: Mailchimp.dataSource.settings.datacenter
        });
    });

    Mailchimp.updateAllUser = function () {
        var listId = Mailchimp.dataSource.settings.listId;
        var User = Mailchimp.app.models.User;

        return Q.ninvoke(User, 'find', {})
        .then(function(users) {
            return Q.all(_.map(users, function(user) {
                return user.toMailchimp();
            }))
        })
        .then(function(mcUsers) {
            console.log("##### Users in progress #####");
            console.log(mcUsers[0]);
            return client.v2.post('/lists/batch-subscribe', {
                id: listId,
                update_existing: true,
                double_optin: false,
                replace_interests: false,
                batch: mcUsers
            })
        })
        .then(function(response) { 
            console.log("##### updateAllUser #####");
            console.log("add_count :", response.add_count);
            console.log("update_count :", response.update_count);
            console.log("error_count :", response.error_count);

            return;
        })
        .catch(function(error) {
            console.log(error); // Mailchimp Error: 401
            console.log(error.response);
        });
    };

    Mailchimp.updateAllBooking = function() {
        var listId  = Mailchimp.dataSource.settings.listId;
        var Booking = Mailchimp.app.models.Booking;

        return Q.ninvoke(Booking, 'find', {})
        .then(function(bookings) {
            var cleanedBookings = _.uniq(_.sortBy(bookings, function(b) {
                return b.dateTime || b.timeslot;
            }), 'email');
            return Q.all(_.map(cleanedBookings, function(booking) {
                return booking.toMailchimp();
            }))
        })
        .then(function(mcBookings) {
            console.log("##### Bookings in progress #####");
            console.log(mcBookings[0]);
            return client.v2.post('/lists/batch-subscribe', {
                id: listId,
                update_existing: true,
                double_optin: false,
                replace_interests: false,
                batch: mcBookings
            })
        })
        .then(function(response) { 
            console.log("##### updateAllBooking #####");
            console.log("add_count :", response.add_count);
            console.log("update_count :", response.update_count);
            console.log("error_count :", response.error_count);

            return;
        })
        .catch(function(error) {
            console.log(error); // Mailchimp Error: 401
            console.log(error.response);
        });
    }

    Mailchimp.updateAllSubscriber = function() {
        var listId  = Mailchimp.dataSource.settings.listId;
        var Subscriber = Mailchimp.app.models.Subscriber;

        return Q.ninvoke(Subscriber, 'find', {})
        .then(function(subscribers) {
            return Q.all(_.map(subscribers, function(subscriber) {
                return subscriber.toMailchimp();
            }))
        })
        .then(function(mcSubscribers) {
            console.log("##### Subscribers in progress #####");
            console.log(mcSubscribers[0])
            return client.v2.post('/lists/batch-subscribe', {
                id: listId,
                update_existing: true,
                double_optin: false,
                replace_interests: false,
                batch: mcSubscribers
            })
        })
        .then(function(response) { 
            console.log("##### updateAllSubscriber #####");
            console.log("add_count :", response.add_count);
            console.log("update_count :", response.update_count);
            console.log("error_count :", response.error_count);

            return;
        })
        .catch(function(error) {
            console.log(error); // Mailchimp Error: 401
            console.log(error.response);
        });
    }

    Mailchimp.updateAllHairfies = function() {
        var listId  = Mailchimp.dataSource.settings.listId;
        var Hairfie = Mailchimp.app.models.Hairfie;

        return Q.ninvoke(Hairfie, 'find', {customerEmail: {neq: null}})
        .then(function(hairfies) {
            return Q.all(_.map(hairfies, function(hairfie) {
                return hairfie.toMailchimp();
            }))
        })
        .then(function(mcHairfies) {
            console.log("##### Hairfies in progress #####");
            console.log(mcHairfies[0]);
            return client.v2.post('/lists/batch-subscribe', {
                id: listId,
                update_existing: true,
                double_optin: false,
                replace_interests: false,
                batch: mcHairfies
            })
        })
        .then(function(response) { 
            console.log("##### updateAllBooking #####");
            console.log("add_count :", response.add_count);
            console.log("update_count :", response.update_count);
            console.log("error_count :", response.error_count);

            return;
        })
        .catch(function(error) {
            console.log(error); // Mailchimp Error: 401
            console.log(error.response);
        });
    }

    Mailchimp.updateEverything = function() {
        return Mailchimp.updateAllSubscriber()
        .then(function() {
            return Mailchimp.updateAllBooking();
        })
        .then(function() {
            return Mailchimp.updateAllHairfies();
        })
        .then(function() {
            return Mailchimp.updateAllUser();
        })
    }

    Mailchimp.addToList = function (subscriber) {
        var listId = Mailchimp.dataSource.settings.listId;

        return client.post('/lists/' + listId + '/members', {
            email_address: subscriber.email,
            status: "subscribed"
        })
        .then(function(response) {
            console.log("success", response);
            return response;
        })
        .catch(function(error) {
            console.log(error); // Mailchimp Error: 401
            console.log(error.response);
        });
    };
};