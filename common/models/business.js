var async = require('async');
var GeoPoint = require('loopback-datasource-juggler/lib/geo').GeoPoint;
var Abstract = require('./abstract.js');
var Q = require('q');

module.exports = function(Business) {

    Abstract.extend(Business);

    Business.definition.settings.hidden = ['diane_data', 'pj_data', 'city', 'zipcode', 'street'];

    Business.afterSave = function (next) {
      var business = this;

      Business.getApp(function (_, app) {
          // index business on search engine
          app.models.SearchEngine.index('business', business.id, {
              name: business.name,
              gps:  business.gps
          });
      });

      next();
    };

    Business.afterDelete = function (next) {
        Business.getApp(function (_, app) {
            // remove business from search index
            app.models.SearchEngine.delete('business', business.id);
        });

        next();
    };

    Business.definition.settings.virtuals = {
        timetables: function (obj) {
            return obj.timetables ? obj.timetables : {};
        },
        address: function(obj) {
          return {
            street: obj.street ? obj.street.upperFirst() : '',
            zipcode: obj.zipcode,
            city: obj.city ? obj.city.upperFirst() : ''
          };
        },
        pictures: function(obj) {
          var gps = GeoPoint(obj.gps);
          return [gps.streetViewPic()];
        },
        thumb: function(obj) {
          var gps = GeoPoint(obj.gps);
          return gps.streetViewPic(120, 140);
        }
    };

    Business.nearby = function(here, page, limit, callback) {
        var maxDistance = 1000,
            page        = page || 0,
            limit       = limit || 10;

        var filter = {};
        filter.where = {gps: {near: here}};
        filter.skip = limit * page;
        filter.limit = limit;

        Q.denodeify(Business.find.bind(Business))(filter)
            .then(function (businesses) {
                return businesses.map(Business.addDistanceFrom(here))
            })
            .nodeify(callback)
        ;
    };

    Business.addDistanceFrom = function (point) {
        return function (business) {
            business.distance = parseInt(GeoPoint.distanceBetween(point, business.gps, {type: 'meters'}));

            return business;
        }
    };

    // Google Maps API has a rate limit of 10 requests per second
    // Seems we need to enforce a lower rate to prevent errors
    var lookupGeo = require('function-rate-limit')(5, 1000, function() {
        var geoService = Business.app.dataSources.geo;
        geoService.geocode.apply(geoService, arguments);
    });

    Business.beforeSave = function(next, business) {
        if (business.gps) return next();
        if(!business.street || !business.city || !business.zipcode) return next();

        // geo code the address
        lookupGeo(business.street, business.city, business.zipcode,
                function(err, result) {
                    if (result && result[0]) {
                        business.gps = result[0].lng + ',' + result[0].lat;
                        next();
                    } else {
                        console.log('could not find location');
                        console.log(err);
                        next();
                    }
                });
    };

    Business.setup = function() {
        Business.base.setup.apply(this, arguments);

        this.remoteMethod('nearby', {
            description: 'Find nearby locations around you',
            accepts: [
        {arg: 'here', type: 'GeoPoint', required: true,
            description: 'geo location:lng,lat. For ex : 2.30,48.87'},
            {arg: 'page', type: 'Number',
                description: 'number of pages (page size defined by limit)'},
            {arg: 'limit', type: 'Number',
                description: 'number of businesss to get, default=10'}
        ],
            returns: {arg: 'businesses', root: true},
            http: { verb: 'GET' }
        });
    };

    Business.setup();

};
