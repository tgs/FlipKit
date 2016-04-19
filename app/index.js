var fancy = require('./js/fancy.js');
var GoogleMapsLoader = require('google-maps');

GoogleMapsLoader.KEY = process.env.MAPS_API_KEY || '';
GoogleMapsLoader.LIBRARIES = ['geometry'];

GoogleMapsLoader.load(function(google) {
    fancy.initialize(google);
});
