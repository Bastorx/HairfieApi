var repl = require("repl");
var lodash = require('lodash');
var Q = require('q');


// environment configuration
var env = process.env.NODE_ENV || "dev";

var app = require('./');
var Place = app.models.Place;
var User = app.models.User;
var Hairfie = app.models.Hairfie;
var Business = app.models.Business;
var BusinessMember = app.models.BusinessMember;
var BusinessReview = app.models.BusinessReview;
var BusinessReviewRequest = app.models.BusinessReviewRequest;
var BusinessService = app.models.BusinessService;
var Booking = app.models.Booking;
var Tag = app.models.Tag;
var AlgoliaSearchEngine = app.models.AlgoliaSearchEngine;
var Mailchimp = app.models.Mailchimp;
var Yelp = app.models.Yelp;
var Email = app.models.Email;
var TextMessage = app.models.TextMessage;

var UrlGenerator = require('./common/utils/UrlGenerator');

var urlGenerator = new UrlGenerator({
    defaultApp  : 'api',
    baseUrl     : {
        'api'       : app.get('url'),
        'website'   : app.get('webUrl'),
        'cdn'       : app.get('cdnUrl') || app.get('url'),
        'pro'       : app.get('proUrl')
    },
    routes      : require('./server/routes.js')
});

app.urlGenerator = urlGenerator;
app.generateUrl = function (name, params) {
    return urlGenerator.generate(name, params);
};

var cloudinary = require('cloudinary');
cloudinary.config({cloudName: process.env.CLOUDINARY_CLOUD_NAME,apiKey: process.env.CLOUDINARY_API_KEY,apiSecret: process.env.CLOUDINARY_API_SECRET});

// open the repl session
var replServer = require('repl').start({
  prompt: "HairfieAPI (" + env + ") > ",
});

replServer.context.app = app;
replServer.context.lodash = lodash;
replServer.context.Q = Q;

replServer.context.Place = Place;
replServer.context.User = User;
replServer.context.Hairfie = Hairfie;
replServer.context.Business = Business;
replServer.context.BusinessMember = BusinessMember;
replServer.context.BusinessReview = BusinessReview;
replServer.context.BusinessReviewRequest = BusinessReviewRequest;
replServer.context.Brr = BusinessReviewRequest;
replServer.context.BusinessService = BusinessService;
replServer.context.Booking = Booking;
replServer.context.Tag = Tag;
replServer.context.Mailchimp = Mailchimp;
replServer.context.Yelp = Yelp;
replServer.context.AlgoliaSearchEngine = AlgoliaSearchEngine;
replServer.context.Email = Email;
replServer.context.TextMessage = TextMessage;

replServer.context.cloudinary = cloudinary;

replServer.context.find = find;
replServer.context.findOne = findOne;
replServer.context.findByIds = findByIds;
replServer.context.all = all;
replServer.context.log = log;
replServer.context.save = save;
replServer.context.collection = collection;
replServer.context.update = update;

function all(fn) {
    return function (items) {
        return Q.all(items.map(fn));
    };
}

function find(Model, filter) {
    return Q.ninvoke(Model, 'find', filter);
}

function findOne(Model, filter) {
    return Q.ninvoke(Model, 'findOne', filter);
}

function findByIds(Model, ids) {
    return Q.ninvoke(Model, 'findByIds', ids);
}

function log(message) {
    return function () {
        console.log(message);
        return Q.resolve();
    };
}

function count(collections) {
    return function () {
        console.log("Count :", collections.length);
        return Q.resolve();
    };
}

function save(model) {
    return Q.ninvoke(model, 'save', {validate: false});
}

function collection(Model) {
    return Model.dataSource.connector.collection(Model.definition.name);
}

function update(Model, where, update) {
    return Q.ninvoke(collection(Model), 'update', where, update, {multi: true});
}