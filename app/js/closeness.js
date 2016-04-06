var metersPerDegreeLng = 85394;  // at 40 degrees north
var metersPerDegreeLat = 111035;

// For simplicity and speed, I'll see if a point is in a rectangle-ish thing
// rather than exactly within 10 meters.

function findClosePoint(queryPoint, points, metersRadius) {
    // return the closest point, if any is within the radius.
    var closePoints = findPointsWithin(queryPoint, points, metersRadius);
    var closest = closePoints.reduce(function(best, pt) {
        if (best === null || pt.dist < best.dist) {
            return pt;
        }
        return best;
    }, null);
    return closest === null ? null : closest.point;
}

function findPointsWithin(queryPoint, points, metersRadius) {
    // return all points within the radius, and their distances
    var lngRadius = metersRadius / metersPerDegreeLng,
        latRadius = metersRadius / metersPerDegreeLat,
        queryPointObject = new google.maps.LatLng(queryPoint.lat, queryPoint.lng);

    var closePoints = points.reduce(function(soFar, comparePoint) {
        if (Math.abs(comparePoint.lat - queryPoint.lat) < latRadius &&
            Math.abs(comparePoint.lng - queryPoint.lng) < lngRadius) {

            var comparePointObject = new google.maps.LatLng(
                comparePoint.lat, comparePoint.lng);
            var realDistance = google.maps.geometry.spherical.computeDistanceBetween(
                queryPointObject, comparePointObject);

            if (realDistance < metersRadius) {
                soFar.push({
                    dist: realDistance,
                    point: comparePoint
                });
            }
        }
        return soFar;
    }, []);

    return closePoints;
}

module.exports = {
    'findClosePoint': findClosePoint,
    'findPointsWithin': findPointsWithin
}
