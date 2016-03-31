var fancy = require('./js/fancy.js')
var GoogleMapsLoader = require('google-maps');

GoogleMapsLoader.KEY = 'AIzaSyBW5fOTQL8BghdonzHVNdb1fFObndyFGpk';
GoogleMapsLoader.LIBRARIES = ['geometry'];

GoogleMapsLoader.load(function(google) {
    fancy.initialize(google);
});
