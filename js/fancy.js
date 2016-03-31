var mousetrap = require('mousetrap');
var UAParser = require('ua-parser-js');
var $ = require('jquery');
var keybindings = require('./keybindings');
var imageList = require('./imageList.json');
var overlay = require('./overlay');
var GoogleMapsLoader = require('google-maps'); // only for common js environments 
 


//var imageList = imageListContainer.imageList;
var svo = null;
var markerIndex = {};

var useAdjustmentmode = false;

var eid = overlay.eid;

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


function updateImageInfo(info) {
    $('#image-info').text(info);
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


function initialize(google) {
    svo = new overlay.SVO();
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
                    updateOverlayImageInfo(svo, image);
                    location.hash = image.imageID;

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
                    updateImageInfo(image.TITLE);
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
        document.getElementById('image-info'));
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
        keybindings.addAdjustmentKeybindings(svo, markerIndex, adjOut);
        svo.map.controls[google.maps.ControlPosition.LEFT_TOP].push(
            eid('adjust-out'));
    }
    keybindings.addNormalKeybindings(svo);

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

    var filterChecks = $("div#filtertags").filterCheckBoxes(Object.keys(imageCategories)).find('input');
    filterChecks.on('change', function() {
        var selected = filterChecks.filter(':checked')
            .map(function() { return this.value; })
            .toArray();
        updateFilteredMarkers(selected);
    });
    filterChecks.first().trigger('change');

}

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


function updateOverlayImageInfo(svo, image) {
    svo.imageID = image.imageID;
    // TODO: does this work?
    svo.streetPt = new google.maps.LatLng(image.lat, image.lng);
    svo.sheading = image.heading;
    svo.imageDistance = image.image_distance;
    svo.realImageHeight = image.height;
    svo.realImageWidth = image.width;
    svo.spitch = image.pitch;
    svo.m_calcImagePoint()
    svo.m_setImage(image.image_url, image['CAT Record URL']);
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

module.exports = { 'initialize': initialize };

