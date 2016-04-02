var metersPerDegreeLng = 85394;  // at 40 degrees north
var metersPerDegreeLat = 111035;

// For simplicity and speed, I'll see if a point is in a rectangle-ish thing
// rather than exactly within 10 meters.

function findClosePoint(queryPoint, points, metersRadius) {
    // return the closest point, if any is within the radius.  Approximately.
    var lngRadius = metersRadius / metersPerDegreeLng,
        latRadius = metersRadius / metersPerDegreeLat,
        queryPointObject = new google.maps.LatLng(queryPoint.lat, queryPoint.lng);

    return points.reduce(function(prevBest, comparePoint) {
        if (Math.abs(comparePoint.lat - queryPoint.lat) < latRadius &&
            Math.abs(comparePoint.lng - queryPoint.lng) < lngRadius) {

            var comparePointObject = new google.maps.LatLng(
                comparePoint.lat, comparePoint.lng);
            var realDistance = google.maps.geometry.spherical.computeDistanceBetween(
                queryPointObject, comparePointObject);

            if (prevBest === null || realDistance < prevBest.dist) {
                return {
                    dist: realDistance,
                    point: comparePoint
                };
            }
        }
        return prevBest;
    }, null);
}

module.exports = {
    'findClosePoint': findClosePoint
}
