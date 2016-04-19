var GoogleMapsLoader = require('google-maps');
var imageList = require('./js/imageList.json');
var $ = require('jquery');

GoogleMapsLoader.KEY = process.env.MAPS_API_KEY || '';
GoogleMapsLoader.LIBRARIES = ['geometry'];

function eid(id)
{
    return document.getElementById(id);
}


GoogleMapsLoader.load(function(google) {
    var out = $('#positions');
    var svService = new google.maps.StreetViewService();
    var index = 0;

    // 248
    //
    // todo: distance between the new and old
    function LL(literal) {
        return new google.maps.LatLng(literal.lat, literal.lng);
    }
    function distance(a, b) {
        return google.maps.geometry.spherical.computeDistanceBetween(
            LL(a), LL(b));
    }

    function next(index) {
        setTimeout(lookAtImage, 500, index + 1);
    }

    function lookAtImage(index) {
        if (index < 0) {
            $('<p></p>').text('[').appendTo(out);
            next(index);
        } else if (index >= imageList.length) {
            $('<p></p>').text(']').appendTo(out);
            // NOT next, we're done.
        } else {
            var image = imageList[index],
                query = {pano: image.pano};

            function gotPano(data, status) {
                var result = {
                    'imageID': image.imageID,
                    'searchedBy': query,
                    'oldPano': image.pano,
                };
                if (status === google.maps.StreetViewStatus.OK) {
                    Object.assign(result, {
                        'found': true,
                        'pano': data.location.pano,
                        'latLng': data.location.latLng.toJSON(),
                        'oldLatLng': {lat: image.lat, lng: image.lng},
                        'shortDescription': data.location.shortDescription
                    });
                    result['distance'] = distance(
                        result['latLng'], result['oldLatLng']);
                } else {
                    result['found'] = false;
                }
                $('<p></p>').text(JSON.stringify(result) + ',').appendTo(out);
            }

            svService.getPanorama(query, gotPano);
            next(index);
        }
    }

    lookAtImage(-1);
});
