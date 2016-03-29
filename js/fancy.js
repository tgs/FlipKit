requirejs(['mousetrap', 'ua-parser-js', 'imageList', 'jquery', 'adjustmentmode',
          'goog!maps,3,other_params:key=AIzaSyBW5fOTQL8BghdonzHVNdb1fFObndyFGpk&libraries=geometry'],
          function(Mousetrap, UAParser, imageListContainer, $, adjustmentmode) {
var imageList = imageListContainer.imageList;
var svo = null;
var markerIndex = {};

var useAdjustmentmode = true;


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
    this.slat = 38.9897227;
    this.slng = -77.0398903;

    // initial POV
    this.sheading = 356.92;
    this.spitch = -2;
    this.szoom = 1;

    // The image is placed at a point in space, which is this many meters
    // away from the *initial* street point, in the 'sheading' direction.
    this.imageDistance = 40;
    this.image = "collection/800/WY%200003.jpg";

    this.streetPt = new google.maps.LatLng(this.slat, this.slng);
    this.m_calcImagePoint();
    this.zoom = 13;

    // distance in metres from street view to marker - this is recalculated when
    // the user moves around.
    this.distance = 0;
    this.maximumDistance = 200;     // distance beyond which marker is hidden

    // dimensions of street view container (fixed)
    //this.panWidth = 480;
    //this.panHeight = 480;

    // dimensions of marker container (resized according to current pov)
    this.initMarkerWidth = 360;
    this.initMarkerHeight = 240;

    // these get updated...
    this.realImageHeight = 550;
    this.realImageWidth = 800;

}


SVO.prototype.m_calcImagePoint = function()
{
    this.pt = google.maps.geometry.spherical.computeOffset(
        this.streetPt, this.imageDistance, this.sheading);

    this.lat = this.pt.lat();
    this.lng = this.pt.lng();
}

// create map
SVO.prototype.m_initMap = function ()
{
    var mapDiv = eid("map");

    var mapOptions =
    {
        center: this.pt,
        zoom: this.zoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        scaleControl: true,
        mapTypeControl: false
    };

    this.map = new google.maps.Map(mapDiv, mapOptions);
}


// create street view
SVO.prototype.m_initPanorama = function ()
{
    var visible = false;
    var l_panDiv = eid("pano");

    // controls can be hidden here to prevent the position being changed by the user
    var l_panOptions =
    {
        // zoomControl: false,
        // linksControl: false
        addressControl: true,
    };

    //l_panOptions.position = this.streetPt;
    //l_panOptions.pov =
    //{
        //heading: this.sheading,
        //pitch: this.spitch,
        //zoom: this.szoom
    //};

    pan = new google.maps.StreetViewPanorama(l_panDiv, l_panOptions);

    this.map.setStreetView(pan);

    // event handlers    
    // TODO: add resize listener
    google.maps.event.addListener(pan, 'pov_changed', function ()
    {
        svo.m_updateMarker();
    });

    google.maps.event.addListener(pan, 'zoom_changed', function ()
    {
        svo.m_updateMarker();
    });

    google.maps.event.addListener(pan, 'position_changed', function ()
    {
        svo.streetPt = pan.getPosition();
        svo.map.setCenter(svo.streetPt);

        svo.m_updateMarker();
    });
    this.pan = pan;
}




function Marker(p_name, p_icon, p)
{
    this.m_icon = "";

    this.pt = null;
    this.m_pov = null;

    this.m_pixelpt = null;
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

// create the 'marker' (a div containing an image which can be clicked)
SVO.prototype.m_initMarker = function ()
{
    var l_markerDiv = eid("marker");
    l_markerDiv.style.width = this.initMarkerWidth + "px";
    l_markerDiv.style.height = this.initMarkerHeight + "px";

    this.m_setImage(this.image);

    this.m_updateMarker();
}

SVO.prototype.m_setImage = function(image, infoUrl)
{
    this.image = image;
    var l_iconDiv = eid("marker");
    l_iconDiv.innerHTML = "<a target='_blank' href='" + infoUrl + "'><img src='" + this.image + "' width='100%' height='100%' alt='' /></a>";
}

SVO.prototype.m_toggleVisible = function(visible)
{
    $('#marker').toggle(visible);
}

function updateFlipButton() {
    var tail;
    if ($('#marker').is(':visible')) {
        tail = "to Modern Image";
    } else {
        tail = "to Historic Image";
    }
    $('#flip-button-change').text(tail);
}

var shareButtonLinkTemplates = {
    "e-mail": "mailto:?body=URL",
    "facebook": "https://www.facebook.com/sharer/sharer.php?u=URL",
    "reddit": "https://reddit.com/submit?url=URL",
    "twitter": "https://twitter.com/share?url=URL"
};
function updateShareButtons() {
    for (var name in shareButtonLinkTemplates) {
        var anchor = eid(name);
        anchor.href = shareButtonLinkTemplates[name].replace(
            "URL", encodeURIComponent(window.location.href));
    }
}

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

        // TODO: what do I do about images with very different aspect ratios?
        var l_pixelPoint = this.m_convertPointProjection(l_pov, l_adjustedZoom);
        var imageArcGuess = 35 / 2;
        var edgePixelPoint = this.m_convertPointProjection(
            {zoom: l_pov.zoom, heading: l_pov.heading - imageArcGuess, pitch: l_pov.pitch},
            l_adjustedZoom);
        // Hope it handles wraparound nicely!
        var markerWidth = 2 * (edgePixelPoint.x - l_pixelPoint.x),
            markerHeight = markerWidth * ( svo.realImageHeight / svo.realImageWidth );

        var l_markerDiv = eid("marker");


        var l_distanceScale = 50 / this.distance;
        l_adjustedZoom = l_adjustedZoom * l_distanceScale;

        // _TODO scale marker according to distance from view point to marker 
        // beyond maximum range a marker will not be visible

        // apply position and size to the marker div
        var wd = markerWidth * l_adjustedZoom;
        var ht = markerHeight * l_adjustedZoom;

        var x = l_pixelPoint.x - Math.floor(wd / 2);
        var y = l_pixelPoint.y - Math.floor(ht / 2);

        //l_markerDiv.style.display = "block";
        l_markerDiv.style.left = x + "px";
        l_markerDiv.style.top = y + "px";
        l_markerDiv.style.width = wd + "px";
        l_markerDiv.style.height = ht + "px";


        // hide marker when its beyond the maximum distance
        //l_markerDiv.style.display = this.distance < this.maximumDistance ? "block" : "none";
        // glog("distance = " + Math.floor(this.distance) + " m (" + l_markerDiv.style.display + ") distance scale = " + l_distanceScale + " l_adjustedZoom = " + l_adjustedZoom);

        eid("markerInfo").innerHTML = "lat: " + formatFloat(this.streetPt.lat(), 6) + " lng: " + formatFloat(this.streetPt.lng(), 6) + " distance: " + Math.floor(this.distance) + " m";
    }
}

function loadPage()
{
    svo = new SVO();
    svo.m_initMap();
    svo.m_initPanorama();
    svo.m_initMarker();
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


var engine = new UAParser().getEngine().name;

function setPanoAndPov(options) {
    if (engine === "Gecko") {
        svo.pan.setOptions(options);
    } else {
        svo.pan.setPano(options.pano);
        setTimeout(function() {
            svo.pan.setPov(options.pov);
        }, 200);
    }
}


function initialize() {
    svo = new SVO();
    svo.m_initMap();

    var svService = new google.maps.StreetViewService();

    var imageCategories = {};

    $.each(imageList, function(i, image) {
        var pos = {lat: image.lat, lng: image.lng};
        var marker = new google.maps.Marker({
            position: pos,
            map: svo.map,
            title: image.TITLE
        });
        markerIndex[image.imageID] = marker;
        imageCategories[image.Tag_1] = 1;
        imageCategories[image.Tag_2] = 1;

        marker.addListener('click', function() {
            var giveUpNextTime = false;

            var gotPanoramaCallback = function(data, status) {
                if (status === google.maps.StreetViewStatus.OK) {
                    console.log("Got panorama " + 
                                (giveUpNextTime ? "by location" : "by id"));
                    svo.imageID = image.imageID;
                    location.hash = svo.imageID;
                    svo.streetPt = new google.maps.LatLng(image.lat, image.lng);
                    svo.sheading = image.heading;
                    svo.imageDistance = image.image_distance;
                    svo.realImageHeight = image.height;
                    svo.realImageWidth = image.width;
                    // Technically 90 but empirically 80 works better with
                    // Jessie's data collection
                    svo.spitch = image.pitch;
                    svo.m_calcImagePoint()
                    svo.m_setImage(image.image_url, image['CAT Record URL']);

                    var options = {
                        pano: data.location.pano,
                        pov: {heading: image.heading, pitch: image.pitch}
                    };

                    // Changing the location and POV at the same time causes horrible
                    // display problems!
                    //svo.pan.setOptions(options);
                    setPanoAndPov(options);
                    svo.m_toggleVisible(true);
                    updateFlipButton();
                    updateShareButtons();
                } else {
                    console.log("Failed a try to get pano data");
                    if (giveUpNextTime) {
                        console.error('Street View data not found for this location.');
                    } else {
                        giveUpNextTime = true;
                        svService.getPanorama({
                            location: pos,
                            radius: 20,
                            preference: google.maps.StreetViewPreference.NEAREST},
                            gotPanoramaCallback);
                    }
                }
            };

            svService.getPanorama({pano: image.pano}, gotPanoramaCallback);

        });
    });

    delete imageCategories[''];


    var startMarker = location.hash.slice(1);
    if ((! startMarker) || (markerIndex[startMarker] === undefined)) {
        var startMarker = (imageList[
            Math.floor(Math.random() * imageList.length)].imageID);
    }

    var initMarker = markerIndex[startMarker];

    // Set the map center, panorama location, etc.
    // So maybe don't set those in the initMap??
    svo.m_initPanorama();
    svo.m_initMarker();

    google.maps.event.trigger(initMarker, "click");

    svo.pan.controls[google.maps.ControlPosition.TOP_LEFT].push(
        document.getElementById('flip-button'));
    svo.map.controls[google.maps.ControlPosition.TOP_LEFT].push(
        document.getElementById('wymerlink'));
    svo.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(
        document.getElementById('filtertags'));
    svo.pan.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(
        document.getElementById('wymercopyright'));
    svo.pan.controls[google.maps.ControlPosition.RIGHT_TOP].push(
        document.getElementById('probs'));
    svo.pan.controls[google.maps.ControlPosition.RIGHT_TOP].push(
        document.getElementById('cherlinks'));

    if (useAdjustmentmode) {
        var adjOut = $('<div class="wymercontrol wymermapcontrol" id="adjust-out"></div>')
            .insertAfter('body')
            .css("padding-left", "20px")
            .css("width", "250px")
            .css("height", "250px");
        adjustmentmode.addKeybindings(svo, markerIndex, adjOut);
        svo.map.controls[google.maps.ControlPosition.LEFT_TOP].push(
            eid('adjust-out'));
    }


    $("#flip-button").click(function() {
        svo.m_toggleVisible();
        updateFlipButton();
    });

    // Notice if the user types a valid Wymer number in the #hash.
    window.onhashchange = function() {
        var id = location.hash.slice(1);
        if (id && (id in markerIndex)) {
            google.maps.event.trigger(
                markerIndex[id], "click");
        }
    };

    $.fn.filterCheckBoxes = function(categories, options) {
        var opts = $.extend({}, $.fn.filterCheckBoxes.defaults, options);

        var contents = $.map(categories, function(cat) {
            var input = $('<input type="checkbox" checked>')
            .attr('name', opts.name)
            .attr('value', cat).wrap('<label>').parent();
            $('<span>').text(cat).appendTo(input);
            return input.wrap('<p>').parent();
        });
        this.append(contents);
        return this;
    };


    $.fn.filterCheckBoxes.defaults = {
        name: 'filtertags',
    };
    var filterChecks = $("div#filtertags").filterCheckBoxes(Object.keys(imageCategories)).find('input');
    filterChecks.on('change', function() {
        var selected = filterChecks.filter(':checked')
            .map(function() { return this.value; })
            .toArray();
        updateFilteredMarkers(selected);
    });
    filterChecks.first().trigger('change');

}



function updateFilteredMarkers(enabledCategories) {
    $.each(imageList, function(i, image) {
        var imgid = image.imageID;
        if ($.inArray(image['Tag_1'], enabledCategories) > -1 ||
            $.inArray(image['Tag_2'], enabledCategories) > -1) {
            if (null === markerIndex[imgid].getMap()) {
                markerIndex[imgid].setMap(svo.map);
            }
            console.log('Kept ' + imgid);
        } else {
            markerIndex[imgid].setMap(null);
            console.log('Removed ' + imgid);
        }
    });
}

initialize();

          }
);
