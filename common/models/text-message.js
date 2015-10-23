'use strict';

var Q = require('q');
var twilio = require('twilio');

module.exports = function (TextMessage) {
    var client;

    TextMessage.on('dataSourceAttached', function () {
        client = new twilio.RestClient(TextMessage.dataSource.settings.twilioAccountSID, TextMessage.dataSource.settings.twilioAuthToken);
    });

    TextMessage.send = function (toNumber, body) {
        var envLabel = TextMessage.app.get("emailPrefix");
        console.log("envLabel", envLabel);

        return client.sendMessage({
            to: toNumber,
            from: envLabel || "RDV Hairfie",
            body: body
        }).then(function(responseData) {
            console.log('Successfully send message', responseData);
            return responseData;
        }).fail(function(error) {
            console.log("error", error);
            return error;
        });
    };
};