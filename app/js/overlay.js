var $ = require('jquery');


// the main application object
// Many thanks to Team Maps.
// SVO (Street View Overlay) modified from Team Maps example,
// http://projects.teammaps.com/projects/streetviewoverlay/streetviewoverlay.htm
// Team Maps, July 2013
// Team Maps Projects
// Coding by Robert McMahon. Thanks to Keir Clarke for assistance during development.
// Licensed under the Apache License http://www.apache.org/licenses/LICENSE-2.0
function SVO()
{
    // This object gets initialized before we've decided what image we are
    // going to show, so here is some dummy data.  Ignore all the actual values.
    // TODO: come up with a better lifecycle and remove this.

    // initial POV
    this.streetPt = new google.maps.LatLng(38.9897227, -77.0398903);
    this.sheading = 356.92;
    this.spitch = -2;
    this.imageDistance = 40;

    // Set this.pt, the position in space of the overlay image, by finding the
    // point on the earth that is imageDistance meters away from streetPt in
    // the sheading direction.
    this.m_calcImagePoint();

    this.defaultImage = "img/nothing.png";  // a clear pixel
    this.image = this.defaultImage;

    // distance in metres from the *current* street view position to marker -
    // this is recalculated when the user moves around.  This mainly affects
    // the size of the image.
    this.distance = 0;
    this.maximumDistance = 200;     // distance beyond which marker is hidden

    // dimensions of marker container (resized according to current pov)
    this.initMarkerWidth = 360;
    this.initMarkerHeight = 240;

    // these get updated...
    this.realImageHeight = 550;
    this.realImageWidth = 800;

}


// See the updateOverlayImageInfo function in fancy.js - this method is called
// after streetPt, sheading, and imageDistance have been set.
//
// TODO: This is a bad interface, fix it to take those as parameters instead of
// another piece of code reaching in and touching all these instance variables.
SVO.prototype.m_calcImagePoint = function()
{
    this.pt = google.maps.geometry.spherical.computeOffset(
        this.streetPt, this.imageDistance, this.sheading);

    this.lat = this.pt.lat();
    this.lng = this.pt.lng();
}

// public: create map
SVO.prototype.m_initMap = function ()
{
    var mapDiv = eid("map");

    var mapOptions =
    {
        center: this.pt,
        zoom: 13, // default zoom level, gets replaced
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        scaleControl: true,
        mapTypeControl: false
    };

    this.map = new google.maps.Map(mapDiv, mapOptions);
}


// public: create street view
SVO.prototype.m_initPanorama = function ()
{
    var visible = false;
    var l_panDiv = eid("pano");

    // controls can be hidden here to prevent the position being changed by the user
    var l_panOptions =
    {
        // zoomControl: false,
        //linksControl: false,
        addressControl: false,
        //clickToGo: false
        fullscreenControl: false
    };

    pan = new google.maps.StreetViewPanorama(l_panDiv, l_panOptions);

    this.map.setStreetView(pan);

    // event handlers
    function addEventHandlers(svo) {
        // 'this' gets rebound, so we need to capture the SVO
        google.maps.event.addListener(pan, 'pov_changed', function ()
        {
            svo.m_updateMarker();
        });

        google.maps.event.addListener(pan, 'zoom_changed', function ()
        {
            svo.m_updateMarker();
        });
    }
    addEventHandlers(this);
    this.pan = pan;
}


// convert the current heading and pitch (degrees) into pixel coordinates
SVO.prototype.m_convertPointProjection = function (p_pov, p_zoom)
{
    var panContainer = eid('pano');
    var panWidth = panContainer.offsetWidth;
    var panHeight = panContainer.offsetHeight;
    var l_fovAngleHorizontal = 90 / p_zoom;
    var l_fovAngleVertical = 90 / p_zoom;

    var l_midX = panWidth / 2;
    var l_midY = panHeight / 2;

    var l_diffHeading = this.sheading - p_pov.heading;
    l_diffHeading = normalizeAngle(l_diffHeading);
    l_diffHeading /= l_fovAngleHorizontal;

    // TODO: reduce pitch proportionally with distance
    var l_diffPitch = (p_pov.pitch - this.spitch) / l_fovAngleVertical;

    var x = l_midX + l_diffHeading * panWidth;
    var y = l_midY + l_diffPitch * panHeight;

    var l_point = new google.maps.Point(x, y);

    return l_point;
}

// public: create the 'marker' (the overlay image)
SVO.prototype.m_initMarker = function ()
{
    var l_markerDiv = eid("marker");
    l_markerDiv.style.width = this.initMarkerWidth + "px";
    l_markerDiv.style.height = this.initMarkerHeight + "px";

    this.m_setImage(this.image);

    this.m_updateMarker();
}

// public: toggle whether the overlaid image is visible.
SVO.prototype.m_toggleVisible = function(visible)
{
    $('#marker').toggle(visible);
}

// public: set the overlaid image (and its link href)
SVO.prototype.m_setImage = function(image, infoUrl)
{
    if (image === null) {
        this.image = this.defaultImage;
        infoUrl = location.href;
    } else {
        this.image = image;
    }
    var l_iconDiv = eid("marker");
    l_iconDiv.innerHTML = "<a target='_blank' href='" + infoUrl + "'><img src='" + this.image + "' width='100%' height='100%' alt='' /></a>";
}

// public: after a bunch of instance variables get updated by fancy.js, this
// method gets called to calculate the new position of the "marker" (the
// overlaid image).
SVO.prototype.m_updateMarker = function ()
{
    var l_pov = pan.getPov();
    if (l_pov)
    {
        var l_zoom = pan.getZoom();

        // scale according to street view zoom level
        var l_adjustedZoom = Math.pow(2, l_zoom) / 2;


        // recalulate icon heading and pitch now
        this.sheading = google.maps.geometry.spherical.computeHeading(this.streetPt, this.pt)
        this.distance = google.maps.geometry.spherical.computeDistanceBetween(this.streetPt, this.pt);

        // Find the center of the image
        var l_pixelPoint = this.m_convertPointProjection(l_pov, l_adjustedZoom);

        // Find the left edge of the image
        var imageArcGuess = 35;  // My guess at the field of view of Wymer's camera
        var edgePixelPoint = this.m_convertPointProjection(
            {
                zoom: l_pov.zoom,
                heading: l_pov.heading - (imageArcGuess / 2),
                pitch: l_pov.pitch
            },
            l_adjustedZoom);

        var markerWidth = 2 * (edgePixelPoint.x - l_pixelPoint.x),
            markerHeight = markerWidth * ( this.realImageHeight / this.realImageWidth );

        var l_markerDiv = eid("marker");


        var l_distanceScale = 50 / this.distance;
        l_adjustedZoom = l_adjustedZoom * l_distanceScale;

        // apply position and size to the marker div
        // Does zoom get applied twice??
        var wd = markerWidth * l_adjustedZoom;
        var ht = markerHeight * l_adjustedZoom;

        var x = l_pixelPoint.x - Math.floor(wd / 2);
        var y = l_pixelPoint.y - Math.floor(ht / 2);

        l_markerDiv.style.left = x + "px";
        l_markerDiv.style.top = y + "px";
        l_markerDiv.style.width = wd + "px";
        l_markerDiv.style.height = ht + "px";


        // Update a debugging display (edit css in index.html to see it)
        eid("markerInfo").innerHTML = "lat: " + formatFloat(this.streetPt.lat(), 6) + " lng: " + formatFloat(this.streetPt.lng(), 6) + " distance: " + Math.floor(this.distance) + " m";
    }
}


// utils
function eid(id)
{
    return document.getElementById(id);
}

function glog(a)
{
    if (typeof (console) != "undefined" && console && console.log)
    {
        console.log(a);
    }
}


function formatFloat(n, d)
{
    var m = Math.pow(10, d);
    return Math.round(n * m, 10) / m;
}


function normalizeAngle(a)
{

    while (a > 180)
    {
        a -= 360;
    }

    while (a < -180)
    {
        a += 360;
    }

    return a;
}

module.exports = {'SVO': SVO, 'eid': eid};
