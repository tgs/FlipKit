function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

var fifteenMetersNorth = 0.000173;
var imageList = {
    pstreet: {
        view: {lat: 38.9088156, lng: -77.0650941},
        marker: {lat: (38.9088156 + fifteenMetersNorth), lng: -77.0650941},
        pov: {
            heading: 350.67,
            pitch: -1
        },
        file: 'WY 278042.JPG'
    },

    lenfentgal: {
        view: {lat: 38.9088428, lng: -77.0642795},
        marker: {
            lat: 38.9088428,
            lng: -77.0642795 + 2 * fifteenMetersNorth
        },
        pov: {
            heading: 112.7,
            pitch: 1
        },
        file: 'WY 277742-1.JPG'
    },

    rowhouses: {
        view: {lat: 38.9192317, lng: -77.076048},
        marker: {
            lat: 38.9192317 - 2 * fifteenMetersNorth,
            lng: -77.076048 - 2 * fifteenMetersNorth
        },
        pov: {
            heading: 227.54,
            pitch: 2
        },
        file: 'WY 273142.JPG'
    },

    qstreetbridge: {
        view: {lat: 38.9110745,lng: -77.0506875},
        marker: {
            lat: 38.9110745 - fifteenMetersNorth,
            lng: -77.0506875 - fifteenMetersNorth
        },
        pov: {
            heading: 227,
            pitch: -5
        },
        file: 'WY 270442.JPG'
    }
};


function initialize() {
    var thisImage = imageList[
        getParameterByName('image') || "pstreet"];

    var greyhouse_view = thisImage.view;
    var greyhouse = thisImage.marker;

    var map = new google.maps.Map(document.getElementById('map'), {
        center: greyhouse_view,
        zoom: 16
    });
    var panorama = new google.maps.StreetViewPanorama(
        document.getElementById('pano'), {
        position: greyhouse_view,
        pov: thisImage.pov
    });
    map.setStreetView(panorama);


    var houseMarker = new google.maps.Marker({
        position: greyhouse,
        map: panorama,
        icon: thisImage.file,
        title: 'Wymer image'
    });


    var links = document.getElementById('links');
    for (name in imageList) {
        var anchor = document.createElement('a');
        anchor.href = "?image=" + name;
        anchor.text = name;
        links.appendChild(anchor);
        links.appendChild(document.createElement('br'));
    }


    function StreetImageOverlay(bounds, image, map) {
        // Initialize all properties.
        this.bounds_ = bounds;
        this.image_ = image;
        this.map_ = map;

        // Define a property to hold the image's div. We'll
        // actually create this div upon receipt of the onAdd()
        // method so we'll leave it null for now.
        this.div_ = null;

        // Explicitly call setMap on this overlay.
        this.setMap(map);
    }
    StreetImageOverlay.prototype = new google.maps.OverlayView();

    StreetImageOverlay.prototype.onAdd = function() {

        var div = document.createElement('div');
        div.style.borderStyle = 'none';
        div.style.borderWidth = '0px';
        div.style.position = 'absolute';

        // Create the img element and attach it to the div.
        var img = document.createElement('img');
        img.src = this.image_;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.position = 'absolute';
        div.appendChild(img);

        this.div_ = div;

        // Add the element to the "overlayLayer" pane.
        var panes = this.getPanes();
        panes.overlayLayer.appendChild(div);
    };

    StreetImageOverlay.prototype.draw = function() {
        var div = this.div_;

        div.style.left = "40px";
        div.style.top = "40px";
        div.style.width = "100px";
        div.style.height = "100px";
    };


    var overlay;

    function initOverlay(pano) {
        var bounds = {};
        var image = thisImage.file;
        overlay = new StreetImageOverlay(bounds, image, pano);
    }

    // initOverlay(panorama);
    console.log(panorama);
}
