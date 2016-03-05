var svo = null;

// the main application object
function SVO()
{
    this.slat = 38.9897227;
    this.slng = -77.0398903;

    // initial POV
    this.sheading = 356.92;
    this.spitch = -2;
    this.szoom = 1;

    this.image = "collection/800/WY%200003.jpg";

    this.streetPt = new google.maps.LatLng(this.slat, this.slng);
    this.m_setImagePoint();
    this.zoom = 16;

    this.distance = 0;  // distance in metres from street view to marker
    this.maximumDistance = 200;     // distance beyond which marker is hidden

    // dimensions of street view container (fixed)
    //this.panWidth = 480;
    //this.panHeight = 480;

    // dimensions of marker container (resized according to current pov)
    this.initMarkerWidth = 360;
    this.initMarkerHeight = 240;
}


SVO.prototype.m_setImagePoint = function()
{
    this.pt = google.maps.geometry.spherical.computeOffset(
        this.streetPt, 40, this.sheading);

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

    l_panOptions.position = this.streetPt;
    l_panOptions.pov =
    {
        heading: this.sheading,
        pitch: this.spitch,
        zoom: this.szoom
    };

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

SVO.prototype.m_setImage = function(image)
{
    this.image = image;
    var l_iconDiv = eid("marker");
    l_iconDiv.innerHTML = "<img src='" + this.image + "' width='100%' height='100%' alt='' />";
}

SVO.prototype.m_toggleVisible = function(visible)
{
    $('#marker').toggle(visible);
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
            markerHeight = 0.75 * markerWidth;

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

        l_markerDiv.style.display = "block";
        l_markerDiv.style.left = x + "px";
        l_markerDiv.style.top = y + "px";
        l_markerDiv.style.width = wd + "px";
        l_markerDiv.style.height = ht + "px";


        // hide marker when its beyond the maximum distance
        l_markerDiv.style.display = this.distance < this.maximumDistance ? "block" : "none";
        // glog("distance = " + Math.floor(this.distance) + " m (" + l_markerDiv.style.display + ") distance scale = " + l_distanceScale + " l_adjustedZoom = " + l_adjustedZoom);

        eid("markerInfo").innerHTML = "lat: " + formatFloat(this.streetPt.lat(), 6) + " lng: " + formatFloat(this.streetPt.lng(), 6) + " distance: " + Math.floor(this.distance) + " m";
    }
}

// display a message when the user clicks on the marker's div
function markerClick()
{
    eid("markerInfo").innerHTML = "<h2>Meow !!!</h2>";
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


var justone = [{
    "Notes" : "",
    "heading" : 356.92,
    "TITLE" : "House at 1800 N Portal Drive",
    "lat" : 38.9897227,
    "OBJECTID" : "WY 0003.01",
    "MAPS_URL" : "https://www.google.com/maps/place/1800+N+Portal+Dr+NW,+Washington,+DC+20012/@38.9897227,-77.0398903,3a,75y,356.92h,87.53t/data=!3m7!1e1!3m5!1sDHFoLrc7S3HS2ye-s8vNuA!2e0!6s%2F%2Fgeo0.ggpht.com%2Fcbk%3Fpanoid%3DDHFoLrc7S3HS2ye-s8vNuA%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D214.89781%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c8c210a10d13:0x1bf4fc13c610ae9f",
    "lng" : -77.0398903,
    "pano" : "DHFoLrc7S3HS2ye",
    "a" : 3,
    "y" : 75,
    "pitch_from_down" : 87.53
}]


function initialize() {
    loadPage();

    var svService = new google.maps.StreetViewService();

    svo.pan.controls[google.maps.ControlPosition.TOP_LEFT].push(
        document.getElementById('flip-button'));
    svo.map.controls[google.maps.ControlPosition.TOP_LEFT].push(
        document.getElementById('wymerlink'));
    svo.pan.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(
        document.getElementById('wymercopyright'));

    var startMarker = Math.floor(Math.random() * imageList.length);

    $.each(imageList, function(i, image) {
        var pos = {lat: image.lat, lng: image.lng};
        var marker = new google.maps.Marker({
            position: pos,
            map: svo.map,
            title: image.TITLE
        });
        marker.addListener('click', function() {
            var giveUpNextTime = false;

            var gotPanoramaCallback = function(data, status) {
                if (status === google.maps.StreetViewStatus.OK) {
                    svo.streetPt = new google.maps.LatLng(image.lat, image.lng);
                    svo.sheading = image.heading;
                    // Technically 90 but empirically 80 works better with
                    // Jessie's data collection
                    svo.spitch = image.pitch_from_down - 80;
                    svo.m_setImagePoint()
                    svo.m_setImage(image.image_url);

                    svo.pan.setOptions({
                        position: pos,
                        pano: data.location.pano,
                        pov: {heading: image.heading, pitch: image.pitch_from_down - 90}
                    });
                    svo.m_toggleVisible(true);
                    console.log("Got panorama " + (giveUpNextTime ? "by location" : "by id"));
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
        if (startMarker === i) {
            google.maps.event.trigger(marker, "click");
            //map.setCenter(pos);
        }
    });

    // choose an image and flip to it: var rand = myArray[Math.floor(Math.random() * myArray.length)];
    //
    // Also draggability on the image
    // and put all the close images in the panorama view
    //
    // Add border between img and map
    // Grow img, map to take whole screen


    $("#flip-button").click(function() {
        svo.m_toggleVisible();
    });

}



var imageList = [
   {
      "pitch_from_down" : 87.53,
      "heading" : 356.92,
      "MAPS_URL" : "https://www.google.com/maps/place/1800+N+Portal+Dr+NW,+Washington,+DC+20012/@38.9897227,-77.0398903,3a,75y,356.92h,87.53t/data=!3m7!1e1!3m5!1sDHFoLrc7S3HS2ye-s8vNuA!2e0!6s%2F%2Fgeo0.ggpht.com%2Fcbk%3Fpanoid%3DDHFoLrc7S3HS2ye-s8vNuA%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D214.89781%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c8c210a10d13:0x1bf4fc13c610ae9f",
      "image_url" : "collection/800/WY 0003.jpg",
      "lng" : -77.0398903,
      "a" : 3,
      "pano" : "DHFoLrc7S3HS2ye-s8vNuA",
      "Notes" : "",
      "lat" : 38.9897227,
      "OBJECTID" : "WY 0003.01",
      "TITLE" : "House at 1800 N Portal Drive",
      "y" : 75
   },
   {
      "lng" : -77.0418996,
      "a" : 3,
      "image_url" : "collection/800/WY 0004.jpg",
      "pano" : "yP1862iaUqtTq3MEluegkQ",
      "Notes" : "",
      "lat" : 38.9882058,
      "pitch_from_down" : 74.66,
      "MAPS_URL" : "https://www.google.com/maps/@38.9882058,-77.0418996,3a,75y,232.62h,74.66t/data=!3m7!1e1!3m5!1syP1862iaUqtTq3MEluegkQ!2e0!5s20090701T000000!7i13312!8i6656",
      "heading" : 232.62,
      "TITLE" : "East Beach Drive looking south from North Portal Drive",
      "y" : 75,
      "OBJECTID" : "WY 0004.01"
   },
   {
      "TITLE" : "House on West Beach Drive north of Kalmia Road.",
      "y" : 75,
      "OBJECTID" : "WY 0005.01",
      "pano" : "nNT6o1czXBewQuy25fZotw",
      "lat" : 38.9865335,
      "Notes" : "",
      "image_url" : "collection/800/WY 0005.jpg",
      "lng" : -77.0427705,
      "a" : 3,
      "pitch_from_down" : 79.81,
      "MAPS_URL" : "https://www.google.com/maps/@38.9865335,-77.0427705,3a,75y,273.43h,79.81t/data=!3m7!1e1!3m5!1snNT6o1czXBewQuy25fZotw!2e0!5s20140801T000000!7i13312!8i6656",
      "heading" : 273.43
   },
   {
      "y" : 75,
      "TITLE" : "House and Grounds at 17th Street and Kalmia Road, NW.",
      "OBJECTID" : "WY 0006.01",
      "lng" : -77.0401661,
      "a" : 3,
      "image_url" : "collection/800/WY 0006.jpg",
      "Notes" : "",
      "lat" : 38.9857132,
      "pano" : "BZQiiYDnP8XQjZO71YCHUA",
      "heading" : 98.21,
      "MAPS_URL" : "https://www.google.com/maps/@38.9857132,-77.0401661,3a,75y,98.21h,73.54t/data=!3m7!1e1!3m5!1sBZQiiYDnP8XQjZO71YCHUA!2e0!5s20090701T000000!7i13312!8i6656",
      "pitch_from_down" : 73.54
   },
   {
      "heading" : 70.47,
      "MAPS_URL" : "https://www.google.com/maps/@38.9843706,-77.0394624,3a,75y,70.47h,85.97t/data=!3m7!1e1!3m5!1sPS9ogt7PHucxXI79fkb_jw!2e0!5s20140801T000000!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 85.97,
      "lat" : 38.9843706,
      "Notes" : "",
      "pano" : "PS9ogt7PHucxXI79fkb_jw",
      "lng" : -77.0394624,
      "a" : 3,
      "image_url" : "collection/800/WY 0007.jpg",
      "OBJECTID" : "WY 0007.01",
      "y" : 75,
      "TITLE" : "Marjorie Webster Junior College at 7775 17th Street NW."
   },
   {
      "a" : 3,
      "lng" : -77.0360996,
      "image_url" : "collection/800/WY 0008.jpg",
      "pano" : "QqSwbEbzrv1zM5UxYRt3xw",
      "Notes" : "",
      "lat" : 38.9882218,
      "pitch_from_down" : 83.79,
      "MAPS_URL" : "https://www.google.com/maps/@38.9882218,-77.0360996,3a,75y,254.16h,83.79t/data=!3m7!1e1!3m5!1sQqSwbEbzrv1zM5UxYRt3xw!2e0!5s20140701T000000!7i13312!8i6656!6m1!1e1",
      "heading" : 254.16,
      "TITLE" : "Houses, west side of 16th Street NW, opposite Northgate Avenue.",
      "y" : 75,
      "OBJECTID" : "WY 0008.01"
   },
   {
      "pitch_from_down" : 78.62,
      "heading" : 174.39,
      "MAPS_URL" : "https://www.google.com/maps/@38.9921878,-77.0364963,3a,75y,174.39h,78.62t/data=!3m6!1e1!3m4!1s5dEbUr15g2EwoupY649YMA!2e0!7i13312!8i6656",
      "a" : 3,
      "lng" : -77.0364963,
      "image_url" : "collection/800/WY 0010.jpg",
      "pano" : "5dEbUr15g2EwoupY649YMA",
      "lat" : 38.9921878,
      "Notes" : "not good angle",
      "OBJECTID" : "WY 0010.01",
      "TITLE" : "Blair Portal, 16th Street and Eastern Avenue NW, looking south.",
      "y" : 75
   },
   {
      "heading" : 16.04,
      "MAPS_URL" : "https://www.google.com/maps/@38.9918188,-77.03622,3a,75y,16.04h,74.54t/data=!3m7!1e1!3m5!1scq-ISYcNOP5q94xy6pZw9w!2e0!5s20140701T000000!7i13312!8i6656",
      "pitch_from_down" : 74.54,
      "a" : 3,
      "lng" : -77.03622,
      "image_url" : "collection/800/WY 0011.jpg",
      "Notes" : "",
      "lat" : 38.9918188,
      "pano" : "cq-ISYcNOP5q94xy6pZw9w",
      "OBJECTID" : "WY 0011.01",
      "y" : 75,
      "TITLE" : "Looking north toward Silver Spring, Maryland from Blair Portal."
   },
   {
      "OBJECTID" : "WY 0012.01",
      "y" : 75,
      "TITLE" : "Eastern Avenue NW looking west from near Georgia Avenue",
      "heading" : 337.59,
      "MAPS_URL" : "https://www.google.com/maps/@38.9845186,-77.0266156,3a,75y,337.59h,76.41t/data=!3m6!1e1!3m4!1sKuNjlSwjGApXaaCcycrVTw!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 76.41,
      "lng" : -77.0266156,
      "a" : 3,
      "image_url" : "collection/800/WY 0012.jpg",
      "lat" : 38.9845186,
      "Notes" : "not sure",
      "pano" : "KuNjlSwjGApXaaCcycrVTw"
   },
   {
      "OBJECTID" : "WY 0013.01",
      "y" : 75,
      "TITLE" : "13th Street NW looking south from Eastern Avenue.",
      "heading" : 47.02,
      "MAPS_URL" : "https://www.google.com/maps/@38.9868852,-77.0296682,3a,75y,47.02h,82.79t/data=!3m6!1e1!3m4!1sBfr12zavr39o3yB0ZnRpgA!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 82.79,
      "lat" : 38.9868852,
      "Notes" : "",
      "pano" : "Bfr12zavr39o3yB0ZnRpgA",
      "image_url" : "collection/800/WY 0013.jpg",
      "lng" : -77.0296682,
      "a" : 3
   },
   {
      "pitch_from_down" : 86.19,
      "heading" : 299.54,
      "MAPS_URL" : "https://www.google.com/maps/@38.9835804,-77.0271188,3a,75y,299.54h,86.19t/data=!3m6!1e1!3m4!1se44Rml4CsIo3H-4NFjTlsw!2e0!7i13312!8i6656",
      "image_url" : "collection/800/WY 0015.jpg",
      "lng" : -77.0271188,
      "a" : 3,
      "pano" : "e44Rml4CsIo3H-4NFjTlsw",
      "lat" : 38.9835804,
      "Notes" : "",
      "OBJECTID" : "WY 0015.01",
      "TITLE" : "Northminster Presbyterian Church, Kalmia Road and Georgia Avenue NW",
      "y" : 75
   },
   {
      "y" : 75,
      "TITLE" : "House at corner of Jonquil Street and 14th Street NW.",
      "OBJECTID" : "WY 0016.01",
      "lat" : 38.9841034,
      "Notes" : "",
      "pano" : "Tl7Ozj2YFArZBpKLcnCQDg",
      "lng" : -77.0334077,
      "image_url" : "collection/800/WY 0016.jpg",
      "a" : 3,
      "MAPS_URL" : "https://www.google.com/maps/@38.9841034,-77.0334077,3a,75y,48.73h,79.85t/data=!3m7!1e1!3m5!1sTl7Ozj2YFArZBpKLcnCQDg!2e0!5s20111001T000000!7i13312!8i6656!6m1!1e1",
      "heading" : 48.73,
      "pitch_from_down" : 79.85
   },
   {
      "pitch_from_down" : 83.74,
      "MAPS_URL" : "https://www.google.com/maps/@38.9840262,-77.0320513,3a,75y,166.81h,83.74t/data=!3m6!1e1!3m4!1s2iLOxGBwGR8vGa3xhJKGbA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 166.81,
      "image_url" : "collection/800/WY 0017.jpg",
      "lng" : -77.0320513,
      "a" : 3,
      "pano" : "2iLOxGBwGR8vGa3xhJKGbA",
      "Notes" : "",
      "lat" : 38.9840262,
      "OBJECTID" : "WY 0017.01",
      "TITLE" : "Morningside Drive north of Jonquil Street, NW.",
      "y" : 75
   },
   {
      "image_url" : "collection/800/WY 0018.jpg",
      "lng" : -77.0322452,
      "a" : 3,
      "pano" : "ryGzfAtrXpigvvwxdcg9Mw",
      "Notes" : "",
      "lat" : 38.9844519,
      "pitch_from_down" : 87.91,
      "heading" : 199.59,
      "MAPS_URL" : "https://www.google.com/maps/@38.9844519,-77.0322452,3a,75y,199.59h,87.91t/data=!3m7!1e1!3m5!1sryGzfAtrXpigvvwxdcg9Mw!2e0!5s20110601T000000!7i13312!8i6656!6m1!1e1",
      "TITLE" : "House at Morningside Drive and Jonquil Street NW.",
      "y" : 75,
      "OBJECTID" : "WY 0018.01"
   },
   {
      "heading" : 100.64,
      "MAPS_URL" : "https://www.google.com/maps/@38.9850233,-77.0330105,3a,75y,100.64h,94.12t/data=!3m6!1e1!3m4!1sA_a7d6xHdIr4b4L0XauTtg!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 94.12,
      "lng" : -77.0330105,
      "a" : 3,
      "image_url" : "collection/800/WY 0019.jpg",
      "lat" : 38.9850233,
      "Notes" : "bad angle",
      "pano" : "A_a7d6xHdIr4b4L0XauTtg",
      "OBJECTID" : "WY 0019.01",
      "y" : 75,
      "TITLE" : "Kalmia Road east of 14th Street NW."
   },
   {
      "image_url" : "collection/800/WY 0020.jpg",
      "lng" : -77.0321605,
      "a" : 3,
      "lat" : 38.9840379,
      "Notes" : "",
      "pano" : "PRKiAfxw4fU8HRMn6oH9cQ",
      "heading" : 29.95,
      "MAPS_URL" : "https://www.google.com/maps/@38.9840379,-77.0321605,3a,75y,29.95h,82.78t/data=!3m7!1e1!3m5!1sPRKiAfxw4fU8HRMn6oH9cQ!2e0!5s20070901T000000!7i3328!8i1664!6m1!1e1",
      "pitch_from_down" : 82.78,
      "y" : 75,
      "TITLE" : "Houses on Morningside Drive south of Kalmia Road NW.",
      "OBJECTID" : "WY 0020.01"
   },
   {
      "OBJECTID" : "WY 0021.01",
      "TITLE" : "House on northeast corner of Kalmia Road and 4th Street NW.",
      "y" : 75,
      "pitch_from_down" : 83.04,
      "MAPS_URL" : "https://www.google.com/maps/@38.9850488,-77.0334219,3a,75y,52.92h,83.04t/data=!3m6!1e1!3m4!1s1EHXxjJAQiJfExa3I2vasA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 52.92,
      "a" : 3,
      "lng" : -77.0334219,
      "image_url" : "collection/800/WY 0021.jpg",
      "pano" : "1EHXxjJAQiJfExa3I2vasA",
      "lat" : 38.9850488,
      "Notes" : ""
   },
   {
      "TITLE" : "Alexander R. Shepherd Elementary School, 14th and Jonquil Streets NW.",
      "y" : 75,
      "OBJECTID" : "WY 0022.01",
      "image_url" : "collection/800/WY 0022.jpg",
      "lng" : -77.0334176,
      "a" : 3,
      "pano" : "KGRWM0NJczx9NVEZa0tZdw",
      "Notes" : "",
      "lat" : 38.9848236,
      "pitch_from_down" : 78.88,
      "MAPS_URL" : "https://www.google.com/maps/@38.9848236,-77.0334176,3a,75y,287.95h,78.88t/data=!3m7!1e1!3m5!1sKGRWM0NJczx9NVEZa0tZdw!2e0!5s20090701T000000!7i13312!8i6656!6m1!1e1",
      "heading" : 287.95
   },
   {
      "Notes" : "",
      "lat" : 38.9793901,
      "pano" : "c08GXBuwfN2foNZVvZSrUg",
      "a" : 3,
      "lng" : -77.0331863,
      "image_url" : "collection/800/WY 0023.01.jpg",
      "MAPS_URL" : "https://www.google.com/maps/@38.9793901,-77.0331863,3a,75y,33.04h,85.92t/data=!3m6!1e1!3m4!1sc08GXBuwfN2foNZVvZSrUg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 33.04,
      "pitch_from_down" : 85.92,
      "y" : 75,
      "TITLE" : "House on northeast corner of 14th and Geranium Streets NW.",
      "OBJECTID" : "WY 0023.01"
   },
   {
      "heading" : 43.14,
      "MAPS_URL" : "https://www.google.com/maps/@38.9654355,-77.032856,3a,75y,43.14h,89.14t/data=!3m6!1e1!3m4!1sPUj-lURUseqEunaAKonZpA!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 89.14,
      "lat" : 38.9654355,
      "Notes" : "",
      "pano" : "PUj-lURUseqEunaAKonZpA",
      "lng" : -77.032856,
      "a" : 3,
      "image_url" : "collection/800/WY 0081.jpg",
      "OBJECTID" : "WY 0081.17",
      "y" : 75,
      "TITLE" : "Houses on Rittenhouse Street NW east of 14th Street. March 6, 1948."
   },
   {
      "pitch_from_down" : 86.14,
      "heading" : 60.85,
      "MAPS_URL" : "https://www.google.com/maps/@38.9647494,-77.0334244,3a,75y,60.85h,86.14t/data=!3m6!1e1!3m4!1sQxSl_QJVDVXJM0YTyYdl0Q!2e0!7i13312!8i6656",
      "pano" : "QxSl_QJVDVXJM0YTyYdl0Q",
      "lat" : 38.9647494,
      "Notes" : "",
      "lng" : -77.0334244,
      "image_url" : "collection/800/WY 0082.jpg",
      "a" : 3,
      "OBJECTID" : "WY 0082.17",
      "TITLE" : "Houses on 14th Street NW between Rittenhouse Street and Fort Stevens Drive.",
      "y" : 75
   },
   {
      "lng" : -77.0364203,
      "a" : 3,
      "image_url" : "collection/800/WY 0083.jpg",
      "lat" : 38.96686,
      "Notes" : "",
      "pano" : "cO6UKA5KLRGOzOXdilU8uA",
      "heading" : 98.83,
      "MAPS_URL" : "https://www.google.com/maps/@38.96686,-77.0364203,3a,75y,98.83h,88.22t/data=!3m6!1e1!3m4!1scO6UKA5KLRGOzOXdilU8uA!2e0!7i3328!8i1664!6m1!1e1",
      "pitch_from_down" : 88.22,
      "y" : 75,
      "TITLE" : "Apartment houses on Somerset Place looking east from 16th Street NW.",
      "OBJECTID" : "WY 0083.17"
   },
   {
      "OBJECTID" : "WY 0084.17",
      "y" : 75,
      "TITLE" : "Houses on (unpaved) Rock Creek Ford Road. View from Fort Stevens Drive NW.",
      "MAPS_URL" : "https://www.google.com/maps/@38.964618,-77.0357613,3a,75y,158.16h,86.81t/data=!3m6!1e1!3m4!1sSDYjXTC9X7AJP-xrSwU_bw!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 158.16,
      "pitch_from_down" : 86.81,
      "lat" : 38.964618,
      "Notes" : "",
      "pano" : "SDYjXTC9X7AJP-xrSwU_bw",
      "lng" : -77.0357613,
      "a" : 3,
      "image_url" : "collection/800/WY 0084.jpg"
   },
   {
      "OBJECTID" : "WY 0085.17",
      "TITLE" : "Church on 14th Street and Rock Creek Ford Road NW.",
      "y" : 75,
      "pitch_from_down" : 81.32,
      "MAPS_URL" : "https://www.google.com/maps/@38.9631998,-77.0334227,3a,75y,331.18h,81.32t/data=!3m6!1e1!3m4!1shpQq4qwqvt0iwxXNcW_4DA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 331.18,
      "image_url" : "collection/800/WY 0085.jpg",
      "lng" : -77.0334227,
      "a" : 3,
      "pano" : "hpQq4qwqvt0iwxXNcW_4DA",
      "lat" : 38.9631998,
      "Notes" : ""
   },
   {
      "y" : 75,
      "TITLE" : "Brightwood School on the corner of 13th and Nicholson Streets NW.",
      "OBJECTID" : "WY 0090.17",
      "lat" : 38.9602147,
      "Notes" : "",
      "pano" : "WBk-BtKgsLJ5DCZj3MktGg",
      "lng" : -77.0296825,
      "image_url" : "collection/800/WY 0090.jpg",
      "a" : 3,
      "heading" : 321.12,
      "MAPS_URL" : "https://www.google.com/maps/@38.9602147,-77.0296825,3a,75y,321.12h,80.83t/data=!3m6!1e1!3m4!1sWBk-BtKgsLJ5DCZj3MktGg!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 80.83
   },
   {
      "y" : 75,
      "TITLE" : "Holy Nativity Church at 13th and Peabody Streets NW. July 25, 1948.",
      "OBJECTID" : "WY 0092.17",
      "image_url" : "collection/800/WY 0092.jpg",
      "lng" : -77.0296902,
      "a" : 3,
      "Notes" : "",
      "lat" : 38.9629172,
      "pano" : "tvcpWRPEh2WeKiFDTpszVg",
      "MAPS_URL" : "https://www.google.com/maps/place/13th+St+NW+%26+Peabody+St+NW,+Washington,+DC+20011/@38.9629172,-77.0296902,3a,75y,37.04h,86.27t/data=!3m7!1e1!3m5!1stvcpWRPEh2WeKiFDTpszVg!2e0!6s%2F%2Fgeo1.ggpht.com%2Fcbk%3Fpanoid%3DtvcpWRPEh2WeKiFDTpszVg%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D116.62517%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c8613a9b5d1d:0x4b4a9e814e51615b!6m1!1e1",
      "heading" : 37.04,
      "pitch_from_down" : 86.27
   },
   {
      "y" : 75,
      "TITLE" : "Apartment houses on 14th Street NE; view south from Missouri Avenue.",
      "OBJECTID" : "WY 0093.17",
      "lng" : -77.0333055,
      "a" : 3,
      "image_url" : "collection/800/WY 0093.jpg",
      "lat" : 38.9619696,
      "Notes" : "",
      "pano" : "e0alowSICOALF_W7yYvMOQ",
      "heading" : 203.19,
      "MAPS_URL" : "https://www.google.com/maps/place/13th+St+NW+%26+Peabody+St+NW,+Washington,+DC+20011/@38.9619696,-77.0333055,3a,75y,203.19h,81.14t/data=!3m7!1e1!3m5!1se0alowSICOALF_W7yYvMOQ!2e0!6s%2F%2Fgeo1.ggpht.com%2Fcbk%3Fpanoid%3De0alowSICOALF_W7yYvMOQ%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D228.50879%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c8613a9b5d1d:0x4b4a9e814e51615b!6m1!1e1",
      "pitch_from_down" : 81.14
   },
   {
      "OBJECTID" : "WY 0094.17",
      "TITLE" : "Row houses on the west side of the 5600 block of 13th Street NW.",
      "y" : 75,
      "pitch_from_down" : 81.32,
      "heading" : 221.74,
      "MAPS_URL" : "https://www.google.com/maps/@38.9583283,-77.0297013,3a,75y,221.74h,81.32t/data=!3m6!1e1!3m4!1spvKLL9pNJnXo8-O1V7BB3w!2e0!7i13312!8i6656",
      "lng" : -77.0297013,
      "image_url" : "collection/800/WY 0094.jpg",
      "a" : 3,
      "pano" : "pvKLL9pNJnXo8-O1V7BB3w",
      "Notes" : "",
      "lat" : 38.9583283
   },
   {
      "lng" : -77.0308175,
      "a" : 3,
      "image_url" : "collection/800/WY 0095.jpg",
      "lat" : 38.9562114,
      "Notes" : "",
      "pano" : "gtwCn43yAMmnhnOhVGmORg",
      "MAPS_URL" : "https://www.google.com/maps/@38.9562114,-77.0308175,3a,75y,230.6h,91.04t/data=!3m6!1e1!3m4!1sgtwCn43yAMmnhnOhVGmORg!2e0!7i13312!8i6656",
      "heading" : 230.6,
      "pitch_from_down" : 91.04,
      "y" : 75,
      "TITLE" : "Houses on the south side of the1300 block of Kennedy Street NW.",
      "OBJECTID" : "WY 0095.17"
   },
   {
      "y" : 75,
      "TITLE" : "Capital Transit Company streetcar and bus terminal at 14th Street and Colorado Avenue NW.",
      "OBJECTID" : "WY 0096.17",
      "lng" : -77.0334326,
      "a" : 3,
      "image_url" : "collection/800/WY 0096.jpg",
      "lat" : 38.9554356,
      "Notes" : "",
      "pano" : "U3aNhM1nQjdbDNFxVZbTSQ",
      "MAPS_URL" : "https://www.google.com/maps/@38.9554356,-77.0334326,3a,75y,59.66h,81.51t/data=!3m6!1e1!3m4!1sU3aNhM1nQjdbDNFxVZbTSQ!2e0!7i13312!8i6656",
      "heading" : 59.66,
      "pitch_from_down" : 81.51
   },
   {
      "pitch_from_down" : 79.67,
      "heading" : 354.87,
      "MAPS_URL" : "https://www.google.com/maps/@38.9529247,-77.0360071,3a,75y,354.87h,79.67t/data=!3m6!1e1!3m4!1sjQdLuj3gbN9fi38BQwOOvQ!2e0!7i13312!8i6656",
      "lng" : -77.0360071,
      "a" : 3,
      "image_url" : "collection/800/WY 0097.jpg",
      "pano" : "jQdLuj3gbN9fi38BQwOOvQ",
      "lat" : 38.9529247,
      "Notes" : "",
      "OBJECTID" : "WY 0097.17",
      "TITLE" : "Liberian Legation at 16th Street and Colorado Avenue NW.",
      "y" : 75
   },
   {
      "TITLE" : "Brightwood School on Georgia Avenue NW at Quackenbos Street.",
      "y" : 75,
      "OBJECTID" : "WY 0099.17",
      "pano" : "QChJgjS471vwnt3xAOO0mA",
      "Notes" : "",
      "lat" : 38.9632302,
      "image_url" : "collection/800/WY 0099.jpg",
      "lng" : -77.0278473,
      "a" : 3,
      "pitch_from_down" : 104.75,
      "heading" : 260.48,
      "MAPS_URL" : "https://www.google.com/maps/@38.9632302,-77.0278473,3a,75y,260.48h,104.75t/data=!3m6!1e1!3m4!1sQChJgjS471vwnt3xAOO0mA!2e0!7i13312!8i6656!6m1!1e1"
   },
   {
      "a" : 3,
      "lng" : -77.0278737,
      "image_url" : "collection/800/WY 0100.jpg",
      "lat" : 38.9628804,
      "Notes" : "",
      "pano" : "-E613XNf7LX_uDs8w6z1Rg",
      "MAPS_URL" : "https://www.google.com/maps/@38.9628804,-77.0278737,3a,75y,274.9h,88.71t/data=!3m6!1e1!3m4!1s-E613XNf7LX_uDs8w6z1Rg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 274.9,
      "pitch_from_down" : 88.71,
      "y" : 75,
      "TITLE" : "Old Nativity Church, Georgia Avenue NW at Peabody Street.",
      "OBJECTID" : "WY 0100.17"
   },
   {
      "TITLE" : "Capital Transit Brightwood Car Barns; Georgia Avenue between Peabody Street and Missouri Avenue.",
      "y" : 75,
      "OBJECTID" : "WY 0102.17",
      "pano" : "YUecFOdKus3EGRAskBZFog",
      "lat" : 38.961427,
      "Notes" : "",
      "lng" : -77.027986,
      "a" : 3,
      "image_url" : "collection/800/WY 0102.17.jpg",
      "pitch_from_down" : 77.49,
      "MAPS_URL" : "https://www.google.com/maps/@38.961427,-77.027986,3a,75y,333.87h,77.49t/data=!3m6!1e1!3m4!1sYUecFOdKus3EGRAskBZFog!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 333.87
   },
   {
      "OBJECTID" : "WY 0103.02",
      "TITLE" : "Boys playing baseball.",
      "y" : 75,
      "pitch_from_down" : 73.58,
      "heading" : 284.86,
      "MAPS_URL" : "https://www.google.com/maps/@38.9811191,-77.0278846,3a,75y,284.86h,73.58t/data=!3m6!1e1!3m4!1soNH4aTTboTLSi6tSzpV3SA!2e0!7i13312!8i6656!6m1!1e1",
      "pano" : "oNH4aTTboTLSi6tSzpV3SA",
      "lat" : 38.9811191,
      "Notes" : "",
      "a" : 3,
      "lng" : -77.0278846,
      "image_url" : "collection/800/WY 0103.02.jpg"
   },
   {
      "pitch_from_down" : 75.2,
      "MAPS_URL" : "https://www.google.com/maps/@38.9804837,-77.0278755,3a,75y,222.59h,75.2t/data=!3m6!1e1!3m4!1s97u5aqqxWTxXRn3sulXcPA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 222.59,
      "a" : 3,
      "lng" : -77.0278755,
      "image_url" : "collection/800/WY 0104..jpg",
      "pano" : "97u5aqqxWTxXRn3sulXcPA",
      "lat" : 38.9804837,
      "Notes" : "",
      "OBJECTID" : "WY 0104.02",
      "TITLE" : "House at the Southwest corner of 12th and Holly Streets NW.",
      "y" : 75
   },
   {
      "pano" : "uaSCRSeDAz7p2qNAy3Hh8w",
      "Notes" : "",
      "lat" : 38.9803796,
      "image_url" : "collection/800/WY 0106.jpg",
      "lng" : -77.0291944,
      "a" : 3,
      "pitch_from_down" : 81.57,
      "heading" : 137.32,
      "MAPS_URL" : "https://www.google.com/maps/@38.9803796,-77.0291944,3a,75y,137.32h,81.57t/data=!3m7!1e1!3m5!1suaSCRSeDAz7p2qNAy3Hh8w!2e0!5s20140701T000000!7i13312!8i6656!6m1!1e1",
      "TITLE" : "Holly Street (south side) west of 12th Street NW,",
      "y" : 75,
      "OBJECTID" : "WY 0106.02"
   },
   {
      "TITLE" : "House on Holly Street near 13th Street NW.",
      "y" : 75,
      "OBJECTID" : "WY 0107.02",
      "pano" : "uaSCRSeDAz7p2qNAy3Hh8w",
      "lat" : 38.9803796,
      "Notes" : "",
      "lng" : -77.0291944,
      "a" : 3,
      "image_url" : "collection/800/WY 0107.jpg",
      "pitch_from_down" : 83.94,
      "heading" : 140.86,
      "MAPS_URL" : "https://www.google.com/maps/@38.9803796,-77.0291944,3a,75y,140.86h,83.94t/data=!3m7!1e1!3m5!1suaSCRSeDAz7p2qNAy3Hh8w!2e0!5s20140701T000000!7i13312!8i6656!6m1!1e1"
   },
   {
      "TITLE" : "House on southeast corner of Holly St and 13th Street NW.",
      "y" : 75,
      "OBJECTID" : "WY 0108.02",
      "pano" : "o74L1G5cJUNmWJx_2_uqBw",
      "Notes" : "",
      "lat" : 38.9800121,
      "a" : 3,
      "lng" : -77.029683,
      "image_url" : "collection/800/WY 0108.jpg",
      "pitch_from_down" : 83.81,
      "MAPS_URL" : "https://www.google.com/maps/@38.9800121,-77.029683,3a,75y,54.25h,83.81t/data=!3m7!1e1!3m5!1so74L1G5cJUNmWJx_2_uqBw!2e0!5s20140701T000000!7i13312!8i6656!6m1!1e1",
      "heading" : 54.25
   },
   {
      "Notes" : "",
      "lat" : 38.9804833,
      "pano" : "nTMcLh_uXiBICQ_b65M5yA",
      "a" : 3,
      "lng" : -77.0296841,
      "image_url" : "collection/800/WY 0109.jpg",
      "MAPS_URL" : "https://www.google.com/maps/@38.9804833,-77.0296841,3a,75y,179.78h,81.94t/data=!3m6!1e1!3m4!1snTMcLh_uXiBICQ_b65M5yA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 179.78,
      "pitch_from_down" : 81.94,
      "y" : 75,
      "TITLE" : "13th Street NW, south of Holly Street,",
      "OBJECTID" : "WY 0109.02"
   },
   {
      "OBJECTID" : "WY 0110.02",
      "TITLE" : "House on northwest corner of 13th and Geranium Streets NW.",
      "y" : 75,
      "pitch_from_down" : 91.83,
      "MAPS_URL" : "https://www.google.com/maps/place/12th+St+NW+%26+Holly+St+NW,+Washington,+DC+20012/@38.979391,-77.029612,3a,75y,324.35h,91.83t/data=!3m7!1e1!3m5!1sDD6wtSUKiHjsVDH2db_3xw!2e0!6s%2F%2Fgeo1.ggpht.com%2Fcbk%3Fpanoid%3DDD6wtSUKiHjsVDH2db_3xw%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D36.23605%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c893d7719e0d:0x7038c1b8ee096b22!6m1!1e1",
      "heading" : 324.35,
      "a" : 3,
      "lng" : -77.029612,
      "image_url" : "collection/800/WY 0110.jpg",
      "pano" : "DD6wtSUKiHjsVDH2db_3xw",
      "lat" : 38.979391,
      "Notes" : ""
   },
   {
      "a" : 3,
      "lng" : -77.0296848,
      "image_url" : "collection/800/WY 0111.jpg",
      "lat" : 38.979445,
      "Notes" : "",
      "pano" : "sBrz4zjAq0hi-3PsrNYkfg",
      "MAPS_URL" : "https://www.google.com/maps/@38.979445,-77.0296848,3a,75y,50.7h,76.62t/data=!3m7!1e1!3m5!1ssBrz4zjAq0hi-3PsrNYkfg!2e0!5s20110701T000000!7i13312!8i6656!6m1!1e1",
      "heading" : 50.7,
      "pitch_from_down" : 76.62,
      "y" : 75,
      "TITLE" : "Geranium Street NW(north side) near 13th Street NW.",
      "OBJECTID" : "WY 0111.02"
   },
   {
      "TITLE" : "North side, Geranium Street between 12th and 13th Streets NW.",
      "y" : 75,
      "OBJECTID" : "WY 0112.02",
      "pano" : "SR1ruq5XNvfJj3LIh-p36w",
      "lat" : 38.9793908,
      "Notes" : "",
      "lng" : -77.0291901,
      "image_url" : "collection/800/WY 0112.jpg",
      "a" : 3,
      "pitch_from_down" : 81.91,
      "MAPS_URL" : "https://www.google.com/maps/@38.9793908,-77.0291901,3a,75y,61.23h,81.91t/data=!3m6!1e1!3m4!1sSR1ruq5XNvfJj3LIh-p36w!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 61.23
   },
   {
      "lng" : -77.0285989,
      "a" : 3,
      "image_url" : "collection/800/WY 0113.jpg",
      "Notes" : "",
      "lat" : 38.9793906,
      "pano" : "8HS7828A-DRjphJVa-zTSA",
      "heading" : 48.91,
      "MAPS_URL" : "https://www.google.com/maps/@38.9793906,-77.0285989,3a,75y,48.91h,84.24t/data=!3m7!1e1!3m5!1s8HS7828A-DRjphJVa-zTSA!2e0!5s20090701T000000!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 84.24,
      "y" : 75,
      "TITLE" : "North side, Geranium Street between 12th and 13th Streets NW.",
      "OBJECTID" : "WY 0113.02"
   },
   {
      "image_url" : "collection/800/WY 0114.jpg",
      "lng" : -77.0278741,
      "a" : 3,
      "pano" : "qpwVMUoE47zLS2vRgb2XvA",
      "lat" : 38.980317,
      "Notes" : "",
      "pitch_from_down" : 80.09,
      "heading" : 334.98,
      "MAPS_URL" : "https://www.google.com/maps/@38.980317,-77.0278741,3a,75y,334.98h,80.09t/data=!3m6!1e1!3m4!1sqpwVMUoE47zLS2vRgb2XvA!2e0!7i13312!8i6656!6m1!1e1",
      "TITLE" : "Northwest corner, 12th and Geranium Streets NW.",
      "y" : 75,
      "OBJECTID" : "WY 0114.02"
   },
   {
      "OBJECTID" : "WY 0115.02",
      "TITLE" : "North side of Underwood Street east of 16th Street NW",
      "y" : 75,
      "pitch_from_down" : 87.77,
      "MAPS_URL" : "https://www.google.com/maps/@38.9690312,-77.0349033,3a,75y,45.38h,87.77t/data=!3m6!1e1!3m4!1sNZ58G-opL1BAxdWLrL_oyQ!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 45.38,
      "pano" : "NZ58G-opL1BAxdWLrL_oyQ",
      "Notes" : "",
      "lat" : 38.9690312,
      "image_url" : "collection/800/WY 0115.jpg",
      "lng" : -77.0349033,
      "a" : 3
   },
   {
      "OBJECTID" : "WY 0122.02",
      "y" : 75,
      "TITLE" : "Apartment House, Luzon Avenue and Van Buren Streets NW.",
      "heading" : 20.59,
      "MAPS_URL" : "https://www.google.com/maps/@38.9699346,-77.0333763,3a,75y,20.59h,84.66t/data=!3m7!1e1!3m5!1sqbDWQXxUKX4AaXr1U_YY4Q!2e0!5s20071201T000000!7i3328!8i1664!6m1!1e1",
      "pitch_from_down" : 84.66,
      "lng" : -77.0333763,
      "image_url" : "collection/800/WY 0122.jpg",
      "a" : 3,
      "Notes" : "",
      "lat" : 38.9699346,
      "pano" : "qbDWQXxUKX4AaXr1U_YY4Q"
   },
   {
      "OBJECTID" : "WY 0123.02",
      "y" : 75,
      "TITLE" : "14th Street NW south of Van Buren Street NW.",
      "heading" : 182.42,
      "MAPS_URL" : "https://www.google.com/maps/@38.9695869,-77.0334253,3a,75y,182.42h,87.47t/data=!3m6!1e1!3m4!1senOWDlmBofWz6FEjzcuyOg!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 87.47,
      "Notes" : "",
      "lat" : 38.9695869,
      "pano" : "enOWDlmBofWz6FEjzcuyOg",
      "a" : 3,
      "lng" : -77.0334253,
      "image_url" : "collection/800/WY 0123.jpg"
   },
   {
      "Notes" : "",
      "lat" : 38.9699236,
      "pano" : "O7Ysu75qaOH2_dSTBfG8Iw",
      "image_url" : "collection/800/WY 0124.jpg",
      "lng" : -77.0297199,
      "a" : 3,
      "heading" : 183.35,
      "MAPS_URL" : "https://www.google.com/maps/@38.9699236,-77.0297199,3a,75y,183.35h,79.96t/data=!3m6!1e1!3m4!1sO7Ysu75qaOH2_dSTBfG8Iw!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 79.96,
      "y" : 75,
      "TITLE" : "13th Street NW south of Van Buren Street.",
      "OBJECTID" : "WY 0124.02"
   },
   {
      "heading" : 275.98,
      "MAPS_URL" : "https://www.google.com/maps/@38.9699204,-77.0278443,3a,75y,275.98h,84.98t/data=!3m6!1e1!3m4!1sXgQ33R7DKDpW2RmOODW6HA!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 84.98,
      "lat" : 38.9699204,
      "Notes" : "",
      "pano" : "XgQ33R7DKDpW2RmOODW6HA",
      "lng" : -77.0278443,
      "image_url" : "collection/800/WY 0125.jpg",
      "a" : 3,
      "OBJECTID" : "WY 0125.02",
      "y" : 75,
      "TITLE" : "Van Buren Street NW, west of Georgia Avenue."
   },
   {
      "pitch_from_down" : 84.04,
      "MAPS_URL" : "https://www.google.com/maps/@38.9637775,-77.0291223,3a,75y,354.65h,84.04t/data=!3m6!1e1!3m4!1sFYaNavge3IIMFE4ysUzoTQ!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 354.65,
      "pano" : "FYaNavge3IIMFE4ysUzoTQ",
      "lat" : 38.9637775,
      "Notes" : "",
      "a" : 3,
      "lng" : -77.0291223,
      "image_url" : "collection/800/WY 0126.jpg",
      "OBJECTID" : "WY 0126.02",
      "TITLE" : "Fort Stevens, Quackenbos Street at 13th Street NW.",
      "y" : 75
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9699236,-77.0297199,3a,75y,57.71h,79.14t/data=!3m7!1e1!3m5!1sO7Ysu75qaOH2_dSTBfG8Iw!2e0!5s20140701T000000!7i13312!8i6656!6m1!1e1",
      "heading" : 57.71,
      "pitch_from_down" : 79.14,
      "image_url" : "collection/800/WY 0127.jpg",
      "lng" : -77.0297199,
      "a" : 3,
      "Notes" : "",
      "lat" : 38.9699236,
      "pano" : "O7Ysu75qaOH2_dSTBfG8Iw",
      "OBJECTID" : "WY 0127.02",
      "y" : 75,
      "TITLE" : "North side of Van Buren Street, east of 13th Street."
   },
   {
      "pitch_from_down" : 85.54,
      "heading" : 352.99,
      "MAPS_URL" : "https://www.google.com/maps/@38.9699236,-77.0297199,3a,75y,352.99h,85.54t/data=!3m6!1e1!3m4!1sO7Ysu75qaOH2_dSTBfG8Iw!2e0!7i13312!8i6656!6m1!1e1",
      "pano" : "O7Ysu75qaOH2_dSTBfG8Iw",
      "lat" : 38.9699236,
      "Notes" : "",
      "a" : 3,
      "lng" : -77.0297199,
      "image_url" : "collection/800/WY 0128.jpg",
      "OBJECTID" : "WY 0128.02",
      "TITLE" : "13th Street NW north of Van Buren Street.",
      "y" : 75
   },
   {
      "TITLE" : "13th Place NW, north of Van Buren Street.",
      "y" : 75,
      "OBJECTID" : "WY 0129.02",
      "pano" : "q1cTGMOil-S0wU4KZW2UFQ",
      "lat" : 38.9705707,
      "Notes" : "",
      "image_url" : "collection/800/WY 0129.jpg",
      "lng" : -77.0284754,
      "a" : 3,
      "pitch_from_down" : 81.72,
      "heading" : 319.26,
      "MAPS_URL" : "https://www.google.com/maps/@38.9705707,-77.0284754,3a,75y,319.26h,81.72t/data=!3m6!1e1!3m4!1sq1cTGMOil-S0wU4KZW2UFQ!2e0!7i13312!8i6656!6m1!1e1"
   },
   {
      "TITLE" : "13th Place NW, south of Army Medical Center.",
      "y" : 75,
      "OBJECTID" : "WY 0130.02",
      "pano" : "_6QCOv3JtDV2chkgUTsU8g",
      "lat" : 38.9722668,
      "Notes" : "",
      "lng" : -77.0286229,
      "image_url" : "collection/800/WY 0130.jpg",
      "a" : 3,
      "pitch_from_down" : 72.63,
      "MAPS_URL" : "https://www.google.com/maps/@38.9722668,-77.0286229,3a,75y,154.95h,72.63t/data=!3m7!1e1!3m5!1s_6QCOv3JtDV2chkgUTsU8g!2e0!5s20071101T000000!7i3328!8i1664!6m1!1e1",
      "heading" : 154.95
   },
   {
      "TITLE" : "Old House on Georgia Avenue NW near Hemlock Street.",
      "y" : 75,
      "OBJECTID" : "WY 0131.02",
      "pano" : "zse3oSO2hbMJZ6lUKV3xhA",
      "lat" : 38.9816334,
      "Notes" : "",
      "lng" : -77.026537,
      "a" : 3,
      "image_url" : "collection/800/WY 0131.jpg",
      "pitch_from_down" : 86.69,
      "MAPS_URL" : "https://www.google.com/maps/@38.9816334,-77.026537,3a,75y,61.68h,86.69t/data=!3m6!1e1!3m4!1szse3oSO2hbMJZ6lUKV3xhA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 61.68
   },
   {
      "OBJECTID" : "WY 0132.02",
      "TITLE" : "Temporary Housing project, east side of Georgia Avenue NW at Geranium Street.",
      "y" : 75,
      "pitch_from_down" : 77.48,
      "heading" : 158.94,
      "MAPS_URL" : "https://www.google.com/maps/@38.9794103,-77.0264572,3a,75y,158.94h,77.48t/data=!3m6!1e1!3m4!1s576N0UUI5krS_MWe5FEuAA!2e0!7i13312!8i6656!6m1!1e1",
      "image_url" : "collection/800/WY 0132.jpg",
      "lng" : -77.0264572,
      "a" : 3,
      "pano" : "576N0UUI5krS_MWe5FEuAA",
      "lat" : 38.9794103,
      "Notes" : ""
   },
   {
      "Notes" : "",
      "lat" : 38.9804218,
      "pano" : "g94BuCFP5Qxn6dIZtqjupg",
      "image_url" : "collection/800/WY 0133.jpg",
      "lng" : -77.0264931,
      "a" : 3,
      "heading" : 230.19,
      "MAPS_URL" : "https://www.google.com/maps/@38.9804218,-77.0264931,3a,75y,230.19h,82.5t/data=!3m6!1e1!3m4!1sg94BuCFP5Qxn6dIZtqjupg!2e0!7i13312!8i6656",
      "pitch_from_down" : 82.5,
      "y" : 75,
      "TITLE" : "Automobile dealer, west side of Georgia Avenue at Holly Street NW.",
      "OBJECTID" : "WY 0133.02"
   },
   {
      "y" : 75,
      "TITLE" : "Southeast corner of Georgia Avenue and Geranium Street NW.",
      "OBJECTID" : "WY 0134.02",
      "lat" : 38.9794103,
      "Notes" : "",
      "pano" : "576N0UUI5krS_MWe5FEuAA",
      "a" : 3,
      "lng" : -77.0264572,
      "image_url" : "collection/800/WY 0134.jpg",
      "MAPS_URL" : "https://www.google.com/maps/@38.9794103,-77.0264572,3a,75y,133.99h,71.82t/data=!3m6!1e1!3m4!1s576N0UUI5krS_MWe5FEuAA!2e0!7i13312!8i6656",
      "heading" : 133.99,
      "pitch_from_down" : 71.82
   },
   {
      "pitch_from_down" : 85.45,
      "MAPS_URL" : "https://www.google.com/maps/@38.9783103,-77.0263672,3a,75y,321.17h,85.45t/data=!3m6!1e1!3m4!1s2a74XsxF31TzlLeuo1daWg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 321.17,
      "image_url" : "collection/800/WY 0135.jpg",
      "lng" : -77.0263672,
      "a" : 3,
      "pano" : "2a74XsxF31TzlLeuo1daWg",
      "Notes" : "",
      "lat" : 38.9783103,
      "OBJECTID" : "WY 0135.02",
      "TITLE" : "West side of Georgia Avenue, NW north of Elder Street.",
      "y" : 75
   },
   {
      "TITLE" : "National Battleground Cemetery.",
      "y" : 75,
      "OBJECTID" : "WY 0136.02",
      "lng" : -77.0271917,
      "a" : 3,
      "image_url" : "collection/800/WY 0136.jpg",
      "pano" : "9pcdlXYcP8BXo0oKevU5Uw",
      "lat" : 38.9707568,
      "Notes" : "",
      "pitch_from_down" : 76.22,
      "heading" : 96.49,
      "MAPS_URL" : "https://www.google.com/maps/@38.9707568,-77.0271917,3a,75y,96.49h,76.22t/data=!3m6!1e1!3m4!1s9pcdlXYcP8BXo0oKevU5Uw!2e0!7i13312!8i6656!6m1!1e1"
   },
   {
      "OBJECTID" : "WY 0139.02",
      "y" : 75,
      "TITLE" : "Shopping Center, Georgia Avenue and Rittenhouse Street NW.",
      "MAPS_URL" : "https://www.google.com/maps/@38.9649432,-77.0274925,3a,75y,8.42h,71.16t/data=!3m6!1e1!3m4!1sGsAam0LuFTrMB-OyHo9zaQ!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 8.42,
      "pitch_from_down" : 71.16,
      "lng" : -77.0274925,
      "image_url" : "collection/800/WY 0139.jpg",
      "a" : 3,
      "lat" : 38.9649432,
      "Notes" : "",
      "pano" : "GsAam0LuFTrMB-OyHo9zaQ"
   },
   {
      "OBJECTID" : "WY 0140.02",
      "y" : 75,
      "TITLE" : "Emory Methodist Church, Georgia Avenue and Quackenbos Street NW.",
      "MAPS_URL" : "https://www.google.com/maps/@38.964088,-77.0277752,3a,75y,297.77h,93.5t/data=!3m6!1e1!3m4!1sX8_mAYTC-5bIj1j8IXrQBA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 297.77,
      "pitch_from_down" : 93.5,
      "lng" : -77.0277752,
      "image_url" : "collection/800/WY 0140.jpg",
      "a" : 3,
      "lat" : 38.964088,
      "Notes" : "",
      "pano" : "X8_mAYTC-5bIj1j8IXrQBA"
   },
   {
      "OBJECTID" : "WY 0141.02",
      "TITLE" : "House at 9th and Peabody Street NW.",
      "y" : 75,
      "pitch_from_down" : 71.55,
      "MAPS_URL" : "https://www.google.com/maps/@38.9626997,-77.0259754,3a,75y,52.68h,71.55t/data=!3m6!1e1!3m4!1slEa9yuq60BRfr2hL5DhSeA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 52.68,
      "image_url" : "collection/800/WY 0141.jpg",
      "lng" : -77.0259754,
      "a" : 3,
      "pano" : "lEa9yuq60BRfr2hL5DhSeA",
      "lat" : 38.9626997,
      "Notes" : ""
   },
   {
      "TITLE" : "Van Buren Street west of 7th Place NW.",
      "y" : 75,
      "OBJECTID" : "WY 0142.02",
      "pano" : "8iUxNdNd728GLjs91cOuIQ",
      "lat" : 38.9699231,
      "Notes" : "",
      "a" : 3,
      "lng" : -77.0231748,
      "image_url" : "collection/800/WY 0142.jpg",
      "pitch_from_down" : 89.41,
      "heading" : 256.33,
      "MAPS_URL" : "https://www.google.com/maps/place/7th+St+NW+%26+Van+Buren+St+NW,+Washington,+DC+20012/@38.9699231,-77.0231748,3a,75y,256.33h,89.41t/data=!3m7!1e1!3m5!1s8iUxNdNd728GLjs91cOuIQ!2e0!6s%2F%2Fgeo1.ggpht.com%2Fcbk%3Fpanoid%3D8iUxNdNd728GLjs91cOuIQ%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D309.6326%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c88899832e19:0x65a95b7e364e0cf9!6m1!1e1"
   },
   {
      "OBJECTID" : "WY 0143.02",
      "TITLE" : "7th Place NW south of Van Buren Street (west side).",
      "y" : 75,
      "pitch_from_down" : 83.36,
      "heading" : 184.87,
      "MAPS_URL" : "https://www.google.com/maps/@38.969923,-77.0233375,3a,75y,184.87h,83.36t/data=!3m6!1e1!3m4!1sohCUyB9r5aasNMXlA4liGQ!2e0!7i13312!8i6656!6m1!1e1",
      "a" : 3,
      "lng" : -77.0233375,
      "image_url" : "collection/800/WY 0143.jpg",
      "pano" : "ohCUyB9r5aasNMXlA4liGQ",
      "lat" : 38.969923,
      "Notes" : ""
   },
   {
      "lat" : 38.9699235,
      "Notes" : "",
      "pano" : "2lIcR5NRruzuhsr7Dqtzyg",
      "lng" : -77.0234032,
      "image_url" : "collection/800/WY 0144.jpg",
      "a" : 3,
      "MAPS_URL" : "https://www.google.com/maps/@38.9699235,-77.0234032,3a,75y,181.58h,82.67t/data=!3m6!1e1!3m4!1s2lIcR5NRruzuhsr7Dqtzyg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 181.58,
      "pitch_from_down" : 82.67,
      "y" : 75,
      "TITLE" : "7th Place NW (east side) south of Van Buren Street.",
      "OBJECTID" : "WY 0144.02"
   },
   {
      "y" : 75,
      "TITLE" : "Underwood Street east of 8th Street NW.",
      "OBJECTID" : "WY 0145.02",
      "Notes" : "",
      "lat" : 38.968579,
      "pano" : "Y6wWMEAQMdcxKDReu63a1g",
      "lng" : -77.0242181,
      "a" : 3,
      "image_url" : "collection/800/WY 0145.jpg",
      "heading" : 60.62,
      "MAPS_URL" : "https://www.google.com/maps/@38.968579,-77.0242181,3a,75y,60.62h,78.72t/data=!3m6!1e1!3m4!1sY6wWMEAQMdcxKDReu63a1g!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 78.72
   },
   {
      "pitch_from_down" : 70.92,
      "MAPS_URL" : "https://www.google.com/maps/@38.9687422,-77.0242181,3a,75y,323.69h,70.92t/data=!3m6!1e1!3m4!1sGsIQ-2ksXagpSWbURB2S5A!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 323.69,
      "image_url" : "collection/800/WY 0146.jpg",
      "lng" : -77.0242181,
      "a" : 3,
      "pano" : "GsIQ-2ksXagpSWbURB2S5A",
      "Notes" : "",
      "lat" : 38.9687422,
      "OBJECTID" : "WY 0146.02",
      "TITLE" : "8th Street NW (west side) north of Underwood Street.",
      "y" : 75
   },
   {
      "pitch_from_down" : 87,
      "MAPS_URL" : "https://www.google.com/maps/@38.9812878,-77.0223658,3a,75y,277.07h,87t/data=!3m6!1e1!3m4!1sVo_FoUWbLWViVQaK6rJlow!2e0!7i13312!8i6656",
      "heading" : 277.07,
      "pano" : "Vo_FoUWbLWViVQaK6rJlow",
      "lat" : 38.9812878,
      "Notes" : "",
      "a" : 3,
      "lng" : -77.0223658,
      "image_url" : "collection/800/WY 0147.jpg",
      "OBJECTID" : "WY 0147.02",
      "TITLE" : "Eastern Avenue NW west of Blair Road.",
      "y" : 75
   },
   {
      "Notes" : "",
      "lat" : 38.9804844,
      "pano" : "LFbN0JxYE90wUjIveP9KGA",
      "image_url" : "collection/800/WY 0148.jpg",
      "lng" : -77.0224427,
      "a" : 3,
      "heading" : 48.68,
      "MAPS_URL" : "https://www.google.com/maps/@38.9804844,-77.0224427,3a,75y,48.68h,77.9t/data=!3m6!1e1!3m4!1sLFbN0JxYE90wUjIveP9KGA!2e0!7i13312!8i6657",
      "pitch_from_down" : 77.9,
      "y" : 75,
      "TITLE" : "House at 7421 Blair Road NW.",
      "OBJECTID" : "WY 0148.02"
   },
   {
      "lng" : -77.0212529,
      "image_url" : "collection/800/WY 0149.jpg",
      "a" : 3,
      "pano" : "jHfwU2sbsX-BFLSyMqRmqA",
      "Notes" : "",
      "lat" : 38.9756105,
      "pitch_from_down" : 85.4,
      "MAPS_URL" : "https://www.google.com/maps/@38.9756105,-77.0212529,3a,75y,88.4h,85.4t/data=!3m6!1e1!3m4!1sjHfwU2sbsX-BFLSyMqRmqA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 88.4,
      "TITLE" : "Trinity Episcopal Church, Piney Branch Road and Dahlia Street NW.",
      "y" : 75,
      "OBJECTID" : "WY 0149.02"
   },
   {
      "TITLE" : "Takoma Elementary School, Piney Branch Road and Dahlia Street NW.",
      "y" : 75,
      "OBJECTID" : "WY 0150.02",
      "pano" : "XnvubFyGOw5bFdpqa21NNw",
      "lat" : 38.9748715,
      "Notes" : "",
      "lng" : -77.0217813,
      "a" : 3,
      "image_url" : "collection/800/WY 0150.jpg",
      "pitch_from_down" : 81.11,
      "heading" : 299.01,
      "MAPS_URL" : "https://www.google.com/maps/@38.9748715,-77.0217813,3a,75y,299.01h,81.11t/data=!3m6!1e1!3m4!1sXnvubFyGOw5bFdpqa21NNw!2e0!7i13312!8i6656!6m1!1e1"
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9758061,-77.0229354,3a,75y,44.29h,78.18t/data=!3m6!1e1!3m4!1sIEHuefBuQhwslM_JR5Bu7g!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 44.29,
      "pitch_from_down" : 78.18,
      "image_url" : "collection/800/WY 0151.jpg",
      "lng" : -77.0229354,
      "a" : 3,
      "lat" : 38.9758061,
      "Notes" : "",
      "pano" : "IEHuefBuQhwslM_JR5Bu7g",
      "OBJECTID" : "WY 0151.02",
      "y" : 75,
      "TITLE" : "Takoma Lutheran Church, 7th and Dahlia Street NW."
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9725618,-77.0234308,3a,75y,89.25h,82.87t/data=!3m6!1e1!3m4!1sDY4889dz4YASmwOS6WUNoQ!2e0!7i3328!8i1664!6m1!1e1",
      "heading" : 89.25,
      "pitch_from_down" : 82.87,
      "lng" : -77.0234308,
      "a" : 3,
      "image_url" : "collection/800/WY 0152.jpg",
      "lat" : 38.9725618,
      "Notes" : "",
      "pano" : "DY4889dz4YASmwOS6WUNoQ",
      "OBJECTID" : "WY 0152.02",
      "y" : 75,
      "TITLE" : "Takoma Park Baptist Church"
   },
   {
      "pitch_from_down" : 84.76,
      "MAPS_URL" : "https://www.google.com/maps/@38.9712719,-77.0230594,3a,75y,6.8h,84.76t/data=!3m6!1e1!3m4!1sSwYn_j7tv7ZmMo9HfU3_HA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 6.8,
      "a" : 3,
      "lng" : -77.0230594,
      "image_url" : "collection/800/WY 0154.jpg",
      "pano" : "SwYn_j7tv7ZmMo9HfU3_HA",
      "lat" : 38.9712719,
      "Notes" : "",
      "OBJECTID" : "WY 0154.02",
      "TITLE" : "719 Whittier Street NW (where I live).",
      "y" : 75
   },
   {
      "heading" : 275.5,
      "MAPS_URL" : "https://www.google.com/maps/@38.9661312,-77.0242058,3a,75y,275.5h,74.94t/data=!3m6!1e1!3m4!1s-xnnnBoJUfcmNwJRjn7QKQ!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 74.94,
      "a" : 3,
      "lng" : -77.0242058,
      "image_url" : "collection/800/WY 0155.jpg",
      "lat" : 38.9661312,
      "Notes" : "",
      "pano" : "-xnnnBoJUfcmNwJRjn7QKQ",
      "OBJECTID" : "WY 0155.02",
      "y" : 75,
      "TITLE" : "Sheridan Street looking west from 8th Street NW."
   },
   {
      "OBJECTID" : "WY 0156.02",
      "TITLE" : "Paul Junior High School, 8th and Nicholson Street NW.",
      "y" : 75,
      "pitch_from_down" : 87.64,
      "heading" : 1.88,
      "MAPS_URL" : "https://www.google.com/maps/@38.9601681,-77.02494,3a,75y,1.88h,87.64t/data=!3m6!1e1!3m4!1sLwvCtPCmO7DZ4b3LBJz3zA!2e0!7i13312!8i6656!6m1!1e1",
      "a" : 3,
      "lng" : -77.02494,
      "image_url" : "collection/800/WY 0156.jpg",
      "pano" : "LwvCtPCmO7DZ4b3LBJz3zA",
      "lat" : 38.9601681,
      "Notes" : ""
   },
   {
      "OBJECTID" : "WY 0157.02",
      "y" : 75,
      "TITLE" : "North side, Rittenhouse Street between 5th and 7th Streets NW",
      "heading" : 238.71,
      "MAPS_URL" : "https://www.google.com/maps/@38.9649508,-77.0200809,3a,75y,238.71h,77.37t/data=!3m6!1e1!3m4!1s3IacxSxEJNsizcU3CHFh0A!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 77.37,
      "image_url" : "collection/800/WY 0157.jpg",
      "lng" : -77.0200809,
      "a" : 3,
      "Notes" : "",
      "lat" : 38.9649508,
      "pano" : "3IacxSxEJNsizcU3CHFh0A"
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9723467,-77.020042,3a,75y,332.54h,79.54t/data=!3m6!1e1!3m4!1skw8zQSCxq4klDXYnaNnulg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 332.54,
      "pitch_from_down" : 79.54,
      "image_url" : "collection/800/WY 0158.jpg",
      "lng" : -77.020042,
      "a" : 3,
      "Notes" : "",
      "lat" : 38.9723467,
      "pano" : "kw8zQSCxq4klDXYnaNnulg",
      "OBJECTID" : "WY 0158.02",
      "y" : 75,
      "TITLE" : "Czecho-Slavokian Embassy, 5th and Aspen Streets NW."
   },
   {
      "OBJECTID" : "WY 0159.02",
      "TITLE" : "Takoma Park Public Library, 5th and Cedar Streets NW.",
      "y" : 75,
      "pitch_from_down" : 86.19,
      "heading" : 226.28,
      "MAPS_URL" : "https://www.google.com/maps/@38.9747053,-77.0198925,3a,75y,226.28h,86.19t/data=!3m6!1e1!3m4!1sfm5u9oD3CYQ5XOgBKBqxJQ!2e0!7i3328!8i1664!6m1!1e1",
      "pano" : "fm5u9oD3CYQ5XOgBKBqxJQ",
      "lat" : 38.9747053,
      "Notes" : "",
      "image_url" : "collection/800/WY 0159.jpg",
      "lng" : -77.0198925,
      "a" : 3
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9743386,-77.0198965,3a,90y,4.11h,78.36t/data=!3m6!1e1!3m4!1sFgQrPpmrRttgMjYy3pDzNQ!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 4.11,
      "pitch_from_down" : 78.36,
      "Notes" : "",
      "lat" : 38.9743386,
      "pano" : "FgQrPpmrRttgMjYy3pDzNQ",
      "image_url" : "collection/800/WY 0160.jpg",
      "lng" : -77.0198965,
      "a" : 3,
      "OBJECTID" : "WY 0160.02",
      "y" : 90,
      "TITLE" : "Takoma Park Public Library."
   },
   {
      "Notes" : "",
      "lat" : 38.9723466,
      "pano" : "5JzTyfUPzmeS_58hs6xYYA",
      "a" : 3,
      "lng" : -77.0167597,
      "image_url" : "collection/800/WY 0161.jpg",
      "MAPS_URL" : "https://www.google.com/maps/@38.9723466,-77.0167597,3a,75y,84.87h,72.9t/data=!3m6!1e1!3m4!1s5JzTyfUPzmeS_58hs6xYYA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 84.87,
      "pitch_from_down" : 72.9,
      "y" : 75,
      "TITLE" : "B and O Takoma Park Station, Aspen Street and Blair Road NW.",
      "OBJECTID" : "WY 0161.02"
   },
   {
      "TITLE" : "Boys playing baseball, Takoma Park Playground, Van Buren Street at 4th Street NW.",
      "y" : 75,
      "OBJECTID" : "WY 0162.02",
      "pano" : "LYpXg7xZbBO8ORpWDRhJHA",
      "lat" : 38.9699264,
      "Notes" : "",
      "a" : 3,
      "lng" : -77.0177295,
      "image_url" : "collection/800/WY 0162.02.jpg",
      "pitch_from_down" : 77.13,
      "MAPS_URL" : "https://www.google.com/maps/@38.9699264,-77.0177295,3a,75y,183.03h,77.13t/data=!3m6!1e1!3m4!1sLYpXg7xZbBO8ORpWDRhJHA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 183.03
   },
   {
      "pano" : "qz7dWV5-wCycL2GjqWCK9g",
      "Notes" : "",
      "lat" : 38.9699548,
      "lng" : -77.0180397,
      "a" : 3,
      "image_url" : "collection/800/WY 0163.03.jpg",
      "pitch_from_down" : 87.18,
      "heading" : 305.91,
      "MAPS_URL" : "https://www.google.com/maps/@38.9699548,-77.0180397,3a,75y,305.91h,87.18t/data=!3m6!1e1!3m4!1sqz7dWV5-wCycL2GjqWCK9g!2e0!7i13312!8i6656!6m1!1e1",
      "TITLE" : "Roberts Memorial Free Methodist Church, 4th and Van Buren Streets NW.",
      "y" : 75,
      "OBJECTID" : "WY 0163.03"
   },
   {
      "image_url" : "collection/800/WY 0164.jpg",
      "lng" : -77.0210605,
      "a" : 3,
      "pano" : "qsF9i6TpCvFjUZzKTcpeWQ",
      "lat" : 38.9672876,
      "Notes" : "",
      "pitch_from_down" : 77.81,
      "heading" : 94.36,
      "MAPS_URL" : "https://www.google.com/maps/@38.9672876,-77.0210605,3a,75y,94.36h,77.81t/data=!3m6!1e1!3m4!1sqsF9i6TpCvFjUZzKTcpeWQ!2e0!7i13312!8i6656!6m1!1e1",
      "TITLE" : "Calvin Coolidge High School, looking from 6th and Tuckerman Street NW.",
      "y" : 75,
      "OBJECTID" : "WY 0164.03"
   },
   {
      "heading" : 17.58,
      "MAPS_URL" : "https://www.google.com/maps/@38.9661335,-77.0197934,3a,75y,17.58h,80.69t/data=!3m6!1e1!3m4!1sS4j4fSlACkSVPvYKX9tmdg!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 80.69,
      "Notes" : "",
      "lat" : 38.9661335,
      "pano" : "S4j4fSlACkSVPvYKX9tmdg",
      "image_url" : "collection/800/WY 0165.jpg",
      "lng" : -77.0197934,
      "a" : 3,
      "OBJECTID" : "WY 0165.03",
      "y" : 75,
      "TITLE" : "Calvin Coolidge High School, 5th and Sheridan Streets NW."
   },
   {
      "lng" : -77.022427,
      "image_url" : "collection/800/WY 0166.jpg",
      "a" : 3,
      "pano" : "YiSj4tQdjyzq-bHsJ0OEHA",
      "Notes" : "",
      "lat" : 38.9620075,
      "pitch_from_down" : 75.12,
      "heading" : 1.87,
      "MAPS_URL" : "https://www.google.com/maps/place/7th+St+NW+%26+Oneida+Pl+NW,+Washington,+DC+20011/@38.9620075,-77.022427,3a,75y,1.87h,75.12t/data=!3m7!1e1!3m5!1sYiSj4tQdjyzq-bHsJ0OEHA!2e0!6s%2F%2Fgeo0.ggpht.com%2Fcbk%3Fpanoid%3DYiSj4tQdjyzq-bHsJ0OEHA%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D47.263638%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c8634fab5ed3:0xee645d59862e8579!6m1!1e1",
      "TITLE" : "7th Street NW north of Oneida Place.",
      "y" : 75,
      "OBJECTID" : "WY 0166.03"
   },
   {
      "y" : 75,
      "TITLE" : "Oneida Place NW west of 7th Street.",
      "OBJECTID" : "WY 0167.03",
      "lat" : 38.962006,
      "Notes" : "",
      "pano" : "R5r073m_pL_Sg1z8wFb4uA",
      "lng" : -77.0228254,
      "a" : 3,
      "image_url" : "collection/800/WY 0167.jpg",
      "MAPS_URL" : "https://www.google.com/maps/@38.962006,-77.0228254,3a,75y,259.4h,90.07t/data=!3m6!1e1!3m4!1sR5r073m_pL_Sg1z8wFb4uA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 259.4,
      "pitch_from_down" : 90.07
   },
   {
      "OBJECTID" : "WY 0169.03",
      "TITLE" : "Alley between Peabody Street and Oneida Place NW, looking east from 7th Street.",
      "y" : 75,
      "pitch_from_down" : 77.86,
      "MAPS_URL" : "https://www.google.com/maps/@38.9623482,-77.0224632,3a,75y,70.28h,77.86t/data=!3m6!1e1!3m4!1sx3Rio3-1w1BpHMruQvBzGA!2e0!7i3328!8i1664!6m1!1e1",
      "heading" : 70.28,
      "pano" : "x3Rio3-1w1BpHMruQvBzGA",
      "lat" : 38.9623482,
      "Notes" : "",
      "image_url" : "collection/800/WY 0169.jpg",
      "lng" : -77.0224632,
      "a" : 3
   },
   {
      "OBJECTID" : "WY 0170.03",
      "TITLE" : "Whittier School, 5th and Sheridan Streets NW.",
      "y" : 75,
      "pitch_from_down" : 77.07,
      "MAPS_URL" : "https://www.google.com/maps/@38.9661965,-77.0198928,3a,75y,126.98h,77.07t/data=!3m6!1e1!3m4!1sdDJhF2kFoZ7yT6M64e-xWw!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 126.98,
      "pano" : "dDJhF2kFoZ7yT6M64e-xWw",
      "lat" : 38.9661965,
      "Notes" : "",
      "lng" : -77.0198928,
      "image_url" : "collection/800/WY 0170.jpg",
      "a" : 3
   },
   {
      "lng" : -77.0180325,
      "image_url" : "collection/800/WY 0171.jpg",
      "a" : 3,
      "lat" : 38.964924,
      "Notes" : "",
      "pano" : "hhbYPRoeVROU7PehbTbN1g",
      "MAPS_URL" : "https://www.google.com/maps/@38.964924,-77.0180325,3a,75y,278.07h,83.91t/data=!3m6!1e1!3m4!1shhbYPRoeVROU7PehbTbN1g!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 278.07,
      "pitch_from_down" : 83.91,
      "y" : 75,
      "TITLE" : "Albright Memorial Evangelical Church 4th and Rittenhouse Streets NW.",
      "OBJECTID" : "WY 0171.03"
   },
   {
      "heading" : 321.4,
      "MAPS_URL" : "https://www.google.com/maps/@38.9620069,-77.0198566,3a,75y,321.4h,82.11t/data=!3m6!1e1!3m4!1sSnDwbWY50PheQDoxXthciA!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 82.11,
      "lng" : -77.0198566,
      "image_url" : "collection/800/WY 0173.jpg",
      "a" : 3,
      "Notes" : "",
      "lat" : 38.9620069,
      "pano" : "SnDwbWY50PheQDoxXthciA",
      "OBJECTID" : "WY 0172a.03",
      "y" : 75,
      "TITLE" : "5th Streets NW north of Oneida Place."
   },
   {
      "OBJECTID" : "WY 0174.03",
      "TITLE" : "House in the 400 block of Quackenbos NW.",
      "y" : 75,
      "pitch_from_down" : 79.02,
      "MAPS_URL" : "https://www.google.com/maps/@38.9637716,-77.0188084,3a,75y,315.17h,79.02t/data=!3m7!1e1!3m5!1s3nGVykyAuE98IAsxAt5Tig!2e0!5s20090701T000000!7i13312!8i6656",
      "heading" : 315.17,
      "pano" : "3nGVykyAuE98IAsxAt5Tig",
      "Notes" : "",
      "lat" : 38.9637716,
      "lng" : -77.0188084,
      "a" : 3,
      "image_url" : "collection/800/WY 0174.jpg"
   },
   {
      "pitch_from_down" : 74.86,
      "heading" : 242.29,
      "MAPS_URL" : "https://www.google.com/maps/@38.9636637,-77.0180356,3a,75y,242.29h,74.86t/data=!3m6!1e1!3m4!1sNIqzE1yvCVg4-tJai2p_Ug!2e0!7i13312!8i6656",
      "pano" : "NIqzE1yvCVg4-tJai2p_Ug",
      "lat" : 38.9636637,
      "Notes" : "",
      "a" : 3,
      "lng" : -77.0180356,
      "image_url" : "collection/800/WY 0175.jpg",
      "OBJECTID" : "WY 0175.03",
      "TITLE" : "House on the southwest corner of Quackenbos Street and 4th Street NW.",
      "y" : 75
   },
   {
      "Notes" : "",
      "lat" : 38.9636721,
      "pano" : "hzVqyE8v9jq3G0jR_iZqvg",
      "lng" : -77.0180357,
      "image_url" : "collection/800/WY 0176.jpg",
      "a" : 3,
      "heading" : 60.07,
      "MAPS_URL" : "https://www.google.com/maps/@38.9636721,-77.0180357,3a,75y,60.07h,79.89t/data=!3m6!1e1!3m4!1shzVqyE8v9jq3G0jR_iZqvg!2e0!7i13312!8i6656",
      "pitch_from_down" : 79.89,
      "y" : 75,
      "TITLE" : "West side of 4th Street NW looking north toward Quackenbos Street.",
      "OBJECTID" : "WY 0176.03"
   },
   {
      "image_url" : "collection/800/WY 0177.jpg",
      "lng" : -77.018033,
      "a" : 3,
      "pano" : "YQIv8GKCpahTNsnFsuAbFQ",
      "lat" : 38.962938,
      "Notes" : "",
      "pitch_from_down" : 77.42,
      "heading" : 49.85,
      "MAPS_URL" : "https://www.google.com/maps/@38.962938,-77.018033,3a,75y,49.85h,77.42t/data=!3m6!1e1!3m4!1sYQIv8GKCpahTNsnFsuAbFQ!2e0!7i13312!8i6656",
      "TITLE" : "House on the east side of 4th Street NW between Quackenbos and Peabody Streets.",
      "y" : 75,
      "OBJECTID" : "WY 0177.03"
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9574138,-77.0171199,3a,75y,302.8h,86.96t/data=!3m6!1e1!3m4!1sjeYte5ivhQWmlVDPipUZ1Q!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 302.8,
      "pitch_from_down" : 86.96,
      "Notes" : "",
      "lat" : 38.9574138,
      "pano" : "jeYte5ivhQWmlVDPipUZ1Q",
      "lng" : -77.0171199,
      "a" : 3,
      "image_url" : "collection/800/WY 0184.jpg",
      "OBJECTID" : "WY 0184.03",
      "y" : 75,
      "TITLE" : "Missouri Avenue west of 3rd Street NW."
   },
   {
      "y" : 75,
      "TITLE" : "Kennedy Street west of 3rd Street NW.",
      "OBJECTID" : "WY 0185.03",
      "Notes" : "",
      "lat" : 38.9565488,
      "pano" : "ls9PAi-JMiZQYwu2--lK2A",
      "lng" : -77.0161922,
      "a" : 3,
      "image_url" : "collection/800/WY 0185.jpg",
      "MAPS_URL" : "https://www.google.com/maps/@38.9565488,-77.0161922,3a,75y,258.66h,86.46t/data=!3m6!1e1!3m4!1sls9PAi-JMiZQYwu2--lK2A!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 258.66,
      "pitch_from_down" : 86.46
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9699779,-77.0116761,3a,75y,359.32h,85.9t/data=!3m6!1e1!3m4!1shIM_aUQxhQomRTdSB_hYEg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 359.32,
      "pitch_from_down" : 85.9,
      "lat" : 38.9699779,
      "Notes" : "",
      "pano" : "hIM_aUQxhQomRTdSB_hYEg",
      "lng" : -77.0116761,
      "image_url" : "collection/800/WY 0187.jpg",
      "a" : 3,
      "OBJECTID" : "WY 0187.03",
      "y" : 75,
      "TITLE" : "First Street NW north of Van Buren Street."
   },
   {
      "pano" : "64wLoZzKviEuN7FJVIG2ug",
      "lat" : 38.9714041,
      "Notes" : "",
      "lng" : -77.0116127,
      "a" : 3,
      "image_url" : "collection/800/WY 0188.jpg",
      "pitch_from_down" : 77.36,
      "MAPS_URL" : "https://www.google.com/maps/@38.9714041,-77.0116127,3a,75y,350.79h,77.36t/data=!3m6!1e1!3m4!1s64wLoZzKviEuN7FJVIG2ug!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 350.79,
      "TITLE" : "House at First and Whittier Streets NW.",
      "y" : 75,
      "OBJECTID" : "WY 0188.03"
   },
   {
      "heading" : 105.5,
      "MAPS_URL" : "https://www.google.com/maps/@38.9673368,-77.0067376,3a,75y,105.5h,89.67t/data=!3m6!1e1!3m4!1sBZzQx7Sts2S7PRM9TJDrCQ!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 89.67,
      "Notes" : "",
      "lat" : 38.9673368,
      "pano" : "BZzQx7Sts2S7PRM9TJDrCQ",
      "a" : 3,
      "lng" : -77.0067376,
      "image_url" : "collection/800/WY 0191.jpg",
      "OBJECTID" : "WY 0191.03",
      "y" : 75,
      "TITLE" : "New houses, Tuckerman Street NE, east of Kansas Avenue."
   },
   {
      "pitch_from_down" : 75.96,
      "MAPS_URL" : "https://www.google.com/maps/@38.9686311,-77.0144272,3a,75y,49.92h,75.96t/data=!3m6!1e1!3m4!1sqWQvk9F2dpDbliaqQ1WrGA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 49.92,
      "pano" : "qWQvk9F2dpDbliaqQ1WrGA",
      "Notes" : "",
      "lat" : 38.9686311,
      "lng" : -77.0144272,
      "image_url" : "collection/800/WY 0192.jpg",
      "a" : 3,
      "OBJECTID" : "WY 0192.03",
      "TITLE" : "John Meiklejohn Coal Yard, Blair Road and Underwood Street NW.",
      "y" : 75
   },
   {
      "lng" : -77.0036153,
      "a" : 3,
      "image_url" : "collection/800/WY 0193.jpg",
      "lat" : 38.9666,
      "Notes" : "",
      "pano" : "Smm36mYUv6N-8_M3Ud_tdQ",
      "heading" : 318.23,
      "MAPS_URL" : "https://www.google.com/maps/@38.9666,-77.0036153,3a,75y,318.23h,85.16t/data=!3m6!1e1!3m4!1sSmm36mYUv6N-8_M3Ud_tdQ!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 85.16,
      "y" : 75,
      "TITLE" : "Eastern Avenue looking Northwest from Sheridan Street NW.",
      "OBJECTID" : "WY 0193.03"
   },
   {
      "OBJECTID" : "WY 0194.03",
      "TITLE" : "House at 26 Longfellow Street NW.",
      "y" : 75,
      "pitch_from_down" : 88.21,
      "MAPS_URL" : "https://www.google.com/maps/@38.9576701,-77.0096712,3a,75y,331.78h,88.21t/data=!3m6!1e1!3m4!1slzTuglqi7gRaL9eN23mPjg!2e0!7i13312!8i6656",
      "heading" : 331.78,
      "pano" : "lzTuglqi7gRaL9eN23mPjg",
      "lat" : 38.9576701,
      "Notes" : "",
      "lng" : -77.0096712,
      "a" : 3,
      "image_url" : "collection/800/WY 0194.jpg"
   },
   {
      "lng" : -77.0024515,
      "image_url" : "collection/800/WY 0195.jpg",
      "a" : 3,
      "pano" : "-8KqhT00AOLxylc45cQLJQ",
      "Notes" : "",
      "lat" : 38.9657003,
      "pitch_from_down" : 77.22,
      "MAPS_URL" : "https://www.google.com/maps/@38.9657003,-77.0024515,3a,75y,14.45h,77.22t/data=!3m6!1e1!3m4!1s-8KqhT00AOLxylc45cQLJQ!2e0!7i13312!8i6656",
      "heading" : 14.45,
      "TITLE" : "Eastern Avenue looking from New Hampshire Avenue NE.",
      "y" : 75,
      "OBJECTID" : "WY 0195.03"
   },
   {
      "pitch_from_down" : 80.4,
      "MAPS_URL" : "https://www.google.com/maps/@38.961275,-77.0056103,3a,75y,92.9h,80.4t/data=!3m6!1e1!3m4!1sWptd1pkNV2Mn5Yne-zVMSA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 92.9,
      "pano" : "Wptd1pkNV2Mn5Yne-zVMSA",
      "lat" : 38.961275,
      "Notes" : "",
      "image_url" : "collection/800/WY 0196.jpg",
      "lng" : -77.0056103,
      "a" : 3,
      "OBJECTID" : "WY 0196.03",
      "TITLE" : "Oglethorpe Street NE looking east from New Hampshire Avenue NE.",
      "y" : 75
   },
   {
      "OBJECTID" : "WY 0197.03",
      "y" : 75,
      "TITLE" : "Baltimore and Ohio Railroad tracks looking northwest from New Hampshire Avenue overpass NE.",
      "MAPS_URL" : "https://www.google.com/maps/@38.9606109,-77.0062868,3a,75y,134.64h,79.71t/data=!3m6!1e1!3m4!1sosf5J1qFEwmU6KI0aG8jJQ!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 134.64,
      "pitch_from_down" : 79.71,
      "Notes" : "",
      "lat" : 38.9606109,
      "pano" : "osf5J1qFEwmU6KI0aG8jJQ",
      "lng" : -77.0062868,
      "a" : 3,
      "image_url" : "collection/800/WY 0197.jpg"
   },
   {
      "pitch_from_down" : 81.94,
      "heading" : 311.79,
      "MAPS_URL" : "https://www.google.com/maps/@38.9596698,-77.0072843,3a,75y,311.79h,81.94t/data=!3m6!1e1!3m4!1sk2DdgbnP4wJBOhIjjYGlIA!2e0!7i13312!8i6656!6m1!1e1",
      "pano" : "k2DdgbnP4wJBOhIjjYGlIA",
      "Notes" : "",
      "lat" : 38.9596698,
      "lng" : -77.0072843,
      "a" : 3,
      "image_url" : "collection/800/WY 0200.jpg",
      "OBJECTID" : "WY 0200.03",
      "TITLE" : "Chillum Heights Gospel Chapel, South Dakota Avenue and McDonald Place NE.",
      "y" : 75
   },
   {
      "pitch_from_down" : 86.44,
      "MAPS_URL" : "https://www.google.com/maps/place/South+Dakota+Ave+NE+%26+McDonald+Pl+NE,+Washington,+DC+20011/@38.9567026,-77.0092279,3a,75y,205.26h,86.44t/data=!3m7!1e1!3m5!1swAnZFyVZcilgiAiLfU9M4g!2e0!6s%2F%2Fgeo3.ggpht.com%2Fcbk%3Fpanoid%3DwAnZFyVZcilgiAiLfU9M4g%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D178.15201%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c7d4297b52a1:0xb32cb09bd8426a28!6m1!1e1",
      "heading" : 205.26,
      "image_url" : "collection/800/WY 0201.jpg",
      "lng" : -77.0092279,
      "a" : 3,
      "pano" : "wAnZFyVZcilgiAiLfU9M4g",
      "lat" : 38.9567026,
      "Notes" : "",
      "OBJECTID" : "WY 0201.03",
      "TITLE" : "New Hampshire Avenue NW South of Kennedy Street.",
      "y" : 75
   },
   {
      "TITLE" : "Luther Memorial Baptist Church, North Capitol Street NE between Missouri Avenue and Jefferson Street NE.",
      "y" : 75,
      "OBJECTID" : "WY 0202.03",
      "pano" : "WBGxFsGDBduK_1Xff9wTzw",
      "lat" : 38.9551969,
      "Notes" : "",
      "image_url" : "collection/800/WY 0202.jpg",
      "lng" : -77.0090331,
      "a" : 3,
      "pitch_from_down" : 72.78,
      "MAPS_URL" : "https://www.google.com/maps/@38.9551969,-77.0090331,3a,75y,50.28h,72.78t/data=!3m7!1e1!3m5!1sWBGxFsGDBduK_1Xff9wTzw!2e0!5s20150701T000000!7i13312!8i6656!6m1!1e1",
      "heading" : 50.28
   },
   {
      "OBJECTID" : "WY 0203.03",
      "y" : 75,
      "TITLE" : "Apartment Houses at Missouri Avenue and Riggs Road NE.",
      "heading" : 97.46,
      "MAPS_URL" : "https://www.google.com/maps/@38.9548144,-77.0090237,3a,75y,97.46h,73.03t/data=!3m7!1e1!3m5!1sBzU03sQv2fllSyMdF0WtIg!2e0!5s20150701T000000!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 73.03,
      "lat" : 38.9548144,
      "Notes" : "",
      "pano" : "BzU03sQv2fllSyMdF0WtIg",
      "image_url" : "collection/800/WY 0203.03.jpg",
      "lng" : -77.0090237,
      "a" : 3
   },
   {
      "a" : 3,
      "lng" : -77.038847,
      "image_url" : "collection/800/WY 0204.16.jpg",
      "pano" : "kQKdEzptSzJqfdDdUJJANw",
      "Notes" : "",
      "lat" : 38.948574,
      "pitch_from_down" : 88.32,
      "MAPS_URL" : "https://www.google.com/maps/@38.948574,-77.038847,3a,75y,107.54h,88.32t/data=!3m6!1e1!3m4!1skQKdEzptSzJqfdDdUJJANw!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 107.54,
      "TITLE" : "House at the corner of 17th Street and Blagden Avenue NW.",
      "y" : 75,
      "OBJECTID" : "WY 0204.16"
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9493183,-77.0401817,3a,75y,151.39h,75.37t/data=!3m7!1e1!3m5!1stGiVbQ9vxEcBSNcTN8tQJQ!2e0!5s20090701T000000!7i13312!8i6656!6m1!1e1",
      "heading" : 151.39,
      "pitch_from_down" : 75.37,
      "lat" : 38.9493183,
      "Notes" : "",
      "pano" : "tGiVbQ9vxEcBSNcTN8tQJQ",
      "lng" : -77.0401817,
      "a" : 3,
      "image_url" : "collection/800/WY 0205.jpg",
      "OBJECTID" : "WY 0205.16",
      "y" : 75,
      "TITLE" : "House at the corner of 17th Street and Colorado Avenue NW."
   },
   {
      "pano" : "7seowEq43plWgj6NLMz0YQ",
      "Notes" : "",
      "lat" : 38.9507698,
      "a" : 3,
      "lng" : -77.036462,
      "image_url" : "collection/800/WY 0206.jpg",
      "pitch_from_down" : 78.83,
      "MAPS_URL" : "https://www.google.com/maps/@38.9507698,-77.036462,3a,75y,45.06h,78.83t/data=!3m6!1e1!3m4!1s7seowEq43plWgj6NLMz0YQ!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 45.06,
      "TITLE" : "House on the northeast corner of 16th and Farragut Streets NW.",
      "y" : 75,
      "OBJECTID" : "WY 0206.16"
   },
   {
      "y" : 75,
      "TITLE" : "Christ Lutheran Church at 16th and Ballatin Streets NW.",
      "OBJECTID" : "WY 0207.16",
      "lat" : 38.951912,
      "Notes" : "",
      "pano" : "ePDElGhGc1ZUDvc7HX-jcw",
      "a" : 3,
      "lng" : -77.036354,
      "image_url" : "collection/800/WY 0207.jpg",
      "heading" : 45.75,
      "MAPS_URL" : "https://www.google.com/maps/@38.951912,-77.036354,3a,75y,45.75h,80.86t/data=!3m6!1e1!3m4!1sePDElGhGc1ZUDvc7HX-jcw!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 80.86
   },
   {
      "TITLE" : "Honduran Embassy at 16th and Decatur Streets NW.",
      "y" : 75,
      "OBJECTID" : "WY 0208.16",
      "pano" : "cah2aKurJJaafdZ6SOwxkA",
      "Notes" : "",
      "lat" : 38.9478669,
      "lng" : -77.0364665,
      "image_url" : "collection/800/WY 0208.jpg",
      "a" : 3,
      "pitch_from_down" : 83.02,
      "heading" : 70.5,
      "MAPS_URL" : "https://www.google.com/maps/@38.9478669,-77.0364665,3a,75y,70.5h,83.02t/data=!3m6!1e1!3m4!1scah2aKurJJaafdZ6SOwxkA!2e0!7i13312!8i6656!6m1!1e1"
   },
   {
      "y" : 75,
      "TITLE" : "Haitian Embassy on the southwest corner of 16th and Farragut Streets NW.",
      "OBJECTID" : "WY 0209.16",
      "lng" : -77.0363575,
      "image_url" : "collection/800/WY 0209.jpg",
      "a" : 3,
      "lat" : 38.950233,
      "Notes" : "",
      "pano" : "RGCUzvmMg0qZdBETtTBIxQ",
      "heading" : 239.22,
      "MAPS_URL" : "https://www.google.com/maps/@38.950233,-77.0363575,3a,75y,239.22h,82.96t/data=!3m6!1e1!3m4!1sRGCUzvmMg0qZdBETtTBIxQ!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 82.96
   },
   {
      "TITLE" : "General view of 14th Street NW south from Jefferson Street.",
      "y" : 75,
      "OBJECTID" : "WY 0210.16",
      "lng" : -77.0334312,
      "image_url" : "collection/800/WY 0210.jpg",
      "a" : 3,
      "pano" : "W1Nyhx2tPTg5pxPRSkVW-A",
      "Notes" : "",
      "lat" : 38.9551493,
      "pitch_from_down" : 78.23,
      "MAPS_URL" : "https://www.google.com/maps/@38.9551493,-77.0334312,3a,75y,179.03h,78.23t/data=!3m6!1e1!3m4!1sW1Nyhx2tPTg5pxPRSkVW-A!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 179.03
   },
   {
      "OBJECTID" : "WY 0211.16",
      "TITLE" : "Houses on east side of 16th Street NW between Farragut and Emerson Streets.",
      "y" : 75,
      "pitch_from_down" : 91.36,
      "MAPS_URL" : "https://www.google.com/maps/@38.9502121,-77.0364645,3a,75y,46.68h,91.36t/data=!3m6!1e1!3m4!1sHsj2X70mQYdqZmgnhWaYvw!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 46.68,
      "pano" : "Hsj2X70mQYdqZmgnhWaYvw",
      "Notes" : "",
      "lat" : 38.9502121,
      "a" : 3,
      "lng" : -77.0364645,
      "image_url" : "collection/800/WY 0211.jpg"
   },
   {
      "y" : 75,
      "TITLE" : "House at the northeast corner of 16th and Emerson Streets NW.",
      "OBJECTID" : "WY 0212.16",
      "lng" : -77.0363585,
      "image_url" : "collection/800/WY 0212.jpg",
      "a" : 3,
      "Notes" : "",
      "lat" : 38.9497855,
      "pano" : "QgwPG_0b8Q1ngAkJ_zsnTA",
      "heading" : 52.01,
      "MAPS_URL" : "https://www.google.com/maps/place/14th+St+NW+%26+Jefferson+St+NW,+Washington,+DC+20011/@38.9497855,-77.0363585,3a,75y,52.01h,83.18t/data=!3m7!1e1!3m5!1sQgwPG_0b8Q1ngAkJ_zsnTA!2e0!6s%2F%2Fgeo3.ggpht.com%2Fcbk%3Fpanoid%3DQgwPG_0b8Q1ngAkJ_zsnTA%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D115.92467%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c86829c2dafb:0x559101e127fc2643!6m1!1e1",
      "pitch_from_down" : 83.18
   },
   {
      "OBJECTID" : "WY 0213.16",
      "y" : 75,
      "TITLE" : "Garden at northwest corner of Emerson and Piney Branch Road NW.",
      "MAPS_URL" : "https://www.google.com/maps/@38.9499161,-77.0350509,3a,75y,285.22h,76.82t/data=!3m6!1e1!3m4!1sh_npPwwtTfrsd6ajKiepRA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 285.22,
      "pitch_from_down" : 76.82,
      "a" : 3,
      "lng" : -77.0350509,
      "image_url" : "collection/800/WY 0213.jpg",
      "Notes" : "",
      "lat" : 38.9499161,
      "pano" : "h_npPwwtTfrsd6ajKiepRA"
   },
   {
      "TITLE" : "General view down Piney Branch Road between Emerson and Farragut Streets.",
      "y" : 75,
      "OBJECTID" : "WY 0214.16",
      "pano" : "cQMcLpBpljYq6-PvP8Aj5w",
      "Notes" : "",
      "lat" : 38.9507628,
      "lng" : -77.0348509,
      "a" : 3,
      "image_url" : "collection/800/WY 0214.jpg",
      "pitch_from_down" : 80.73,
      "MAPS_URL" : "https://www.google.com/maps/@38.9507628,-77.0348509,3a,75y,186.67h,80.73t/data=!3m6!1e1!3m4!1scQMcLpBpljYq6-PvP8Aj5w!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 186.67
   },
   {
      "pitch_from_down" : 84.16,
      "MAPS_URL" : "https://www.google.com/maps/@38.9508113,-77.0356101,3a,75y,211.72h,84.16t/data=!3m6!1e1!3m4!1sDDY-Jz8d70YlyVZ2MQMCoA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 211.72,
      "pano" : "DDY-Jz8d70YlyVZ2MQMCoA",
      "Notes" : "",
      "lat" : 38.9508113,
      "image_url" : "collection/800/WY 0216.jpg",
      "lng" : -77.0356101,
      "a" : 3,
      "OBJECTID" : "WY 0216.16",
      "TITLE" : "House on south side of Farragut Street NW west of Piney Branch Road.",
      "y" : 75
   },
   {
      "heading" : 261.15,
      "MAPS_URL" : "https://www.google.com/maps/@38.9508304,-77.0348359,3a,75y,261.15h,80.7t/data=!3m6!1e1!3m4!1swG_rkt-KTBg37zm36D0fRg!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 80.7,
      "lng" : -77.0348359,
      "a" : 3,
      "image_url" : "collection/800/WY 0217.jpg",
      "Notes" : "",
      "lat" : 38.9508304,
      "pano" : "wG_rkt-KTBg37zm36D0fRg",
      "OBJECTID" : "WY 0217.16",
      "y" : 75,
      "TITLE" : "Farragut Street NW; general view looking west from Piney Branch Road."
   },
   {
      "OBJECTID" : "WY 0218.16",
      "TITLE" : "Piney Branch Road NW, general view south of Emerson Street.",
      "y" : 75,
      "pitch_from_down" : 75.4,
      "heading" : 218.05,
      "MAPS_URL" : "https://www.google.com/maps/@38.9497729,-77.0350844,3a,75y,218.05h,75.4t/data=!3m6!1e1!3m4!1sdAoFQbzEF6uuVaF26NTi7g!2e0!7i13312!8i6656!6m1!1e1",
      "lng" : -77.0350844,
      "a" : 3,
      "image_url" : "collection/800/WY 0218.jpg",
      "pano" : "dAoFQbzEF6uuVaF26NTi7g",
      "lat" : 38.9497729,
      "Notes" : ""
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9488827,-77.0345157,3a,75y,305.97h,77.06t/data=!3m6!1e1!3m4!1sXLEB2BlnXCZQCHOfE5cjHA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 305.97,
      "pitch_from_down" : 77.06,
      "lng" : -77.0345157,
      "image_url" : "collection/800/WY 0220.jpg",
      "a" : 3,
      "lat" : 38.9488827,
      "Notes" : "",
      "pano" : "XLEB2BlnXCZQCHOfE5cjHA",
      "OBJECTID" : "WY 0220.16",
      "y" : 75,
      "TITLE" : "Dalafield Place NW between Piney Branch Road and 15th Street."
   },
   {
      "pitch_from_down" : 84.58,
      "MAPS_URL" : "https://www.google.com/maps/@38.9490513,-77.0345156,3a,75y,223.88h,84.58t/data=!3m6!1e1!3m4!1sLCVdQCY3gD3AnrfWpqb4Yw!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 223.88,
      "pano" : "LCVdQCY3gD3AnrfWpqb4Yw",
      "lat" : 38.9490513,
      "Notes" : "",
      "lng" : -77.0345156,
      "a" : 3,
      "image_url" : "collection/800/WY 0221.jpg",
      "OBJECTID" : "WY 0221.16",
      "TITLE" : "House on southwest corner of 15th Street and Delafield Place NW.",
      "y" : 75
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9497418,-77.0329419,3a,75y,349.05h,77.62t/data=!3m6!1e1!3m4!1sqh_tuAxctYmzQDtfMF0RFQ!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 349.05,
      "pitch_from_down" : 77.62,
      "lng" : -77.0329419,
      "image_url" : "collection/800/WY 0223.jpg",
      "a" : 3,
      "lat" : 38.9497418,
      "Notes" : "",
      "pano" : "qh_tuAxctYmzQDtfMF0RFQ",
      "OBJECTID" : "WY 0223.16",
      "y" : 75,
      "TITLE" : "B'nai Israel Synagogue at 14th and Emerson Streets NW."
   },
   {
      "lat" : 38.9518652,
      "Notes" : "",
      "pano" : "UvR80TLmHlQJbYDwbisb4w",
      "lng" : -77.033276,
      "image_url" : "collection/800/WY 0224.jpg",
      "a" : 3,
      "heading" : 18.86,
      "MAPS_URL" : "https://www.google.com/maps/@38.9518652,-77.033276,3a,75y,18.86h,70.06t/data=!3m6!1e1!3m4!1sUvR80TLmHlQJbYDwbisb4w!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 70.06,
      "y" : 75,
      "TITLE" : "Church of St. Mark and the Incarnation (Lutheran) at 14th and Gallatin Street NW.",
      "OBJECTID" : "WY 0224.16"
   },
   {
      "Notes" : "",
      "lat" : 38.9482614,
      "pano" : "fLGtWIi3fGy6znKulgQdhA",
      "lng" : -77.0328619,
      "image_url" : "collection/800/WY 0228.jpg",
      "a" : 3,
      "MAPS_URL" : "https://www.google.com/maps/@38.9482614,-77.0328619,3a,75y,137.96h,79.82t/data=!3m6!1e1!3m4!1sfLGtWIi3fGy6znKulgQdhA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 137.96,
      "pitch_from_down" : 79.82,
      "y" : 75,
      "TITLE" : "Capital Transit Company Decatur Street Street-car Barn on the corner of 14th and Decatur Street.",
      "OBJECTID" : "WY 0228.16"
   },
   {
      "lng" : -77.0323516,
      "a" : 3,
      "image_url" : "collection/800/WY 0229.jpg",
      "Notes" : "",
      "lat" : 38.9551544,
      "pano" : "IKoWlXsAjpWU7b1I5NrkYQ",
      "MAPS_URL" : "https://www.google.com/maps/@38.9551544,-77.0323516,3a,75y,58.1h,86.2t/data=!3m6!1e1!3m4!1sIKoWlXsAjpWU7b1I5NrkYQ!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 58.1,
      "pitch_from_down" : 86.2,
      "y" : 75,
      "TITLE" : "Houses on the north side of the 1300 block of Jefferson Street NW.",
      "OBJECTID" : "WY 0229.16"
   },
   {
      "pitch_from_down" : 80.47,
      "heading" : 2.28,
      "MAPS_URL" : "https://www.google.com/maps/@38.9529114,-77.0322452,3a,75y,2.28h,80.47t/data=!3m6!1e1!3m4!1skCZSL56KHwPnfIE8RrCKMg!2e0!7i13312!8i6656!6m1!1e1",
      "lng" : -77.0322452,
      "a" : 3,
      "image_url" : "collection/800/WY 0230.jpg",
      "pano" : "kCZSL56KHwPnfIE8RrCKMg",
      "Notes" : "",
      "lat" : 38.9529114,
      "OBJECTID" : "WY 0230.16",
      "TITLE" : "Houses on the north side of the 1300 block of Hamilton Street NW.",
      "y" : 75
   },
   {
      "lat" : 38.9469366,
      "Notes" : "",
      "pano" : "YmWtsO1emOrdhFTEvaA7rw",
      "a" : 3,
      "lng" : -77.0297033,
      "image_url" : "collection/800/WY 0232.jpg",
      "MAPS_URL" : "https://www.google.com/maps/@38.9469366,-77.0297033,3a,75y,316.31h,83.47t/data=!3m6!1e1!3m4!1sYmWtsO1emOrdhFTEvaA7rw!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 316.31,
      "pitch_from_down" : 83.47,
      "y" : 75,
      "TITLE" : "St. Paul's Methodist Church, 13th and Crittenden Streets NW.",
      "OBJECTID" : "WY 0232.16"
   },
   {
      "y" : 75,
      "TITLE" : "General view northeast down Georgia Avenue NW from Madison Street.",
      "OBJECTID" : "WY 0233.16",
      "lat" : 38.9583833,
      "Notes" : "",
      "pano" : "1Du7ZWX14HOAxGd7BAGWhw",
      "image_url" : "collection/800/WY 0233.jpg",
      "lng" : -77.028222,
      "a" : 3,
      "heading" : 29.92,
      "MAPS_URL" : "https://www.google.com/maps/place/14th+St+NW+%26+Iowa+Ave+NW,+Washington,+DC+20011/@38.9583833,-77.028222,3a,75y,29.92h,82.09t/data=!3m7!1e1!3m5!1s1Du7ZWX14HOAxGd7BAGWhw!2e0!6s%2F%2Fgeo3.ggpht.com%2Fcbk%3Fpanoid%3D1Du7ZWX14HOAxGd7BAGWhw%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D52.401047%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c86a861b9ce1:0xe3bfc69148d60f9!6m1!1e1",
      "pitch_from_down" : 82.09
   },
   {
      "TITLE" : "Commercial buildings on the west side of Georgia Avenue NW south of Missouri Avenue.",
      "y" : 75,
      "OBJECTID" : "WY 0234.16",
      "lng" : -77.0277491,
      "a" : 3,
      "image_url" : "collection/800/WY 0234.jpg",
      "pano" : "VRiMYvdgluTTItqeFPbDpg",
      "lat" : 38.9609045,
      "Notes" : "",
      "pitch_from_down" : 81.78,
      "MAPS_URL" : "https://www.google.com/maps/@38.9609045,-77.0277491,3a,75y,306.24h,81.78t/data=!3m6!1e1!3m4!1sVRiMYvdgluTTItqeFPbDpg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 306.24
   },
   {
      "OBJECTID" : "WY 0235.16",
      "y" : 75,
      "TITLE" : "Commercial buildings on the west side of Georgia Avenue NW south of Missouri Avenue.",
      "MAPS_URL" : "https://www.google.com/maps/@38.9605347,-77.028058,3a,75y,309.51h,79.42t/data=!3m6!1e1!3m4!1syLQxY2Ao4kBhfci_ic-0nQ!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 309.51,
      "pitch_from_down" : 79.42,
      "Notes" : "",
      "lat" : 38.9605347,
      "pano" : "yLQxY2Ao4kBhfci_ic-0nQ",
      "lng" : -77.028058,
      "image_url" : "collection/800/WY 0235.jpg",
      "a" : 3
   },
   {
      "OBJECTID" : "WY 0236.16",
      "TITLE" : "Buildings on the west side of Georgia Avenue NW north of Madison Street.",
      "y" : 75,
      "pitch_from_down" : 83.33,
      "heading" : 322.4,
      "MAPS_URL" : "https://www.google.com/maps/@38.9598823,-77.0281084,3a,75y,322.4h,83.33t/data=!3m6!1e1!3m4!1spu1MVUWTsDPkyXM5Mf_I2g!2e0!7i13312!8i6656!6m1!1e1",
      "pano" : "pu1MVUWTsDPkyXM5Mf_I2g",
      "lat" : 38.9598823,
      "Notes" : "",
      "lng" : -77.0281084,
      "image_url" : "collection/800/WY 0236.jpg",
      "a" : 3
   },
   {
      "lng" : -77.0281791,
      "a" : 3,
      "image_url" : "collection/800/WY 0239.jpg",
      "pano" : "CzaXWFNdYJpOYPs0f5rq-w",
      "lat" : 38.9590226,
      "Notes" : "",
      "pitch_from_down" : 79.79,
      "heading" : 316.5,
      "MAPS_URL" : "https://www.google.com/maps/@38.9590226,-77.0281791,3a,75y,316.5h,79.79t/data=!3m7!1e1!3m5!1sCzaXWFNdYJpOYPs0f5rq-w!2e0!5s20111001T000000!7i13312!8i6656!6m1!1e1",
      "TITLE" : "Buildings on the west side of Georgia Avenue NW north of Madison Street.",
      "y" : 75,
      "OBJECTID" : "WY 0239.16"
   },
   {
      "pitch_from_down" : 85.8,
      "heading" : 322.88,
      "MAPS_URL" : "https://www.google.com/maps/@38.9583489,-77.0281702,3a,75y,322.88h,85.8t/data=!3m6!1e1!3m4!1sn-VtUFt5A4ojlgOE2G55tQ!2e0!7i13312!8i6656!6m1!1e1",
      "lng" : -77.0281702,
      "image_url" : "collection/800/WY 0241.jpg",
      "a" : 3,
      "pano" : "n-VtUFt5A4ojlgOE2G55tQ",
      "Notes" : "",
      "lat" : 38.9583489,
      "OBJECTID" : "WY 0241.16",
      "TITLE" : "Northwest near the corner of Madison Street and Georgia Avenue NW.",
      "y" : 75
   },
   {
      "TITLE" : "Madison Street NW east of Georgia Avenue NW.",
      "y" : 75,
      "OBJECTID" : "WY 0242.16",
      "a" : 3,
      "lng" : -77.0282215,
      "image_url" : "collection/800/WY 0242.jpg",
      "pano" : "14Z6WGGhKQKJed7LiYq7kA",
      "Notes" : "",
      "lat" : 38.9583923,
      "pitch_from_down" : 75.73,
      "MAPS_URL" : "https://www.google.com/maps/@38.9583923,-77.0282215,3a,75y,118.3h,75.73t/data=!3m6!1e1!3m4!1s14Z6WGGhKQKJed7LiYq7kA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 118.3
   },
   {
      "Notes" : "",
      "lat" : 38.9584799,
      "pano" : "2etvhHXT7wKmjMsAB32KDw",
      "lng" : -77.0258633,
      "image_url" : "collection/800/WY 0244.jpg",
      "a" : 3,
      "heading" : 237.06,
      "MAPS_URL" : "https://www.google.com/maps/@38.9584799,-77.0258633,3a,75y,237.06h,84.11t/data=!3m6!1e1!3m4!1s2etvhHXT7wKmjMsAB32KDw!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 84.11,
      "y" : 75,
      "TITLE" : "Row houses near the northeast corner of Madison Street and 9th Street NW.",
      "OBJECTID" : "WY 0244.16"
   },
   {
      "pitch_from_down" : 81.91,
      "heading" : 47.72,
      "MAPS_URL" : "https://www.google.com/maps/@38.9584143,-77.0259303,3a,75y,47.72h,81.91t/data=!3m6!1e1!3m4!1s2yOllLGusnjy2MBiqmNzlg!2e0!7i13312!8i6656!6m1!1e1",
      "image_url" : "collection/800/WY 0245.jpg",
      "lng" : -77.0259303,
      "a" : 3,
      "pano" : "2yOllLGusnjy2MBiqmNzlg",
      "Notes" : "",
      "lat" : 38.9584143,
      "OBJECTID" : "WY 0245.16",
      "TITLE" : "Row houses on Ninth Street NW between Missouri Avenue and Madison Street NW.",
      "y" : 75
   },
   {
      "y" : 75,
      "TITLE" : "Row houses on Ninth Street NW between Missouri Avenue and Madison Street NW.",
      "OBJECTID" : "WY 0246.16",
      "lat" : 38.9601273,
      "Notes" : "",
      "pano" : "JhifWXmfYIxm9lbEEGkrIg",
      "lng" : -77.0259407,
      "image_url" : "collection/800/WY 0246.jpg",
      "a" : 3,
      "heading" : 144.15,
      "MAPS_URL" : "https://www.google.com/maps/@38.9601273,-77.0259407,3a,75y,144.15h,86.09t/data=!3m7!1e1!3m5!1sJhifWXmfYIxm9lbEEGkrIg!2e0!5s20140801T000000!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 86.09
   },
   {
      "a" : 3,
      "lng" : -77.0259457,
      "image_url" : "collection/800/WY 0247.jpg",
      "lat" : 38.9602254,
      "Notes" : "",
      "pano" : "ZtEfmcxCD1ACb3ZDH-CzlA",
      "MAPS_URL" : "https://www.google.com/maps/@38.9602254,-77.0259457,3a,75y,322.01h,76.94t/data=!3m6!1e1!3m4!1sZtEfmcxCD1ACb3ZDH-CzlA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 322.01,
      "pitch_from_down" : 76.94,
      "y" : 75,
      "TITLE" : "Buildings on Missouri Avenue NW between 9th Street and Georgia Avenue.",
      "OBJECTID" : "WY 0247.16"
   },
   {
      "y" : 75,
      "TITLE" : "Commercial Credit Corporation on the northeast corner of Georgia and Missouri Avenues.",
      "OBJECTID" : "WY 0248.16",
      "lng" : -77.02801,
      "image_url" : "collection/800/WY 0248.16.jpg",
      "a" : 3,
      "Notes" : "",
      "lat" : 38.9611832,
      "pano" : "MACv5P5AB9xLqw82TqSEvg",
      "heading" : 94.74,
      "MAPS_URL" : "https://www.google.com/maps/@38.9611832,-77.02801,3a,75y,94.74h,82.29t/data=!3m6!1e1!3m4!1sMACv5P5AB9xLqw82TqSEvg!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 82.29
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9610036,-77.0280222,3a,75y,147.92h,77.08t/data=!3m7!1e1!3m5!1sRheLUu-kAQcXwHwq2CfwLA!2e0!5s20110701T000000!7i13312!8i6656!6m1!1e1",
      "heading" : 147.92,
      "pitch_from_down" : 77.08,
      "lng" : -77.0280222,
      "image_url" : "collection/800/WY 0250.jpg",
      "a" : 3,
      "lat" : 38.9610036,
      "Notes" : "",
      "pano" : "RheLUu-kAQcXwHwq2CfwLA",
      "OBJECTID" : "WY 0249.16",
      "y" : 75,
      "TITLE" : "Southeast corner of Georgia and Missouri Avenues NW."
   },
   {
      "image_url" : "collection/800/WY 0252.jpg",
      "lng" : -77.0282498,
      "a" : 3,
      "pano" : "UTfYp7WOykiOgATPJXGMDg",
      "Notes" : "",
      "lat" : 38.9572796,
      "pitch_from_down" : 80.65,
      "MAPS_URL" : "https://www.google.com/maps/@38.9572796,-77.0282498,3a,75y,54.01h,80.65t/data=!3m6!1e1!3m4!1sUTfYp7WOykiOgATPJXGMDg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 54.01,
      "TITLE" : "Ida's Department Store on the corner of Georgia Avenue at Longfellow Street NW.",
      "y" : 75,
      "OBJECTID" : "WY 0250.16"
   },
   {
      "heading" : 161.29,
      "MAPS_URL" : "https://www.google.com/maps/@38.9509481,-77.0273098,3a,75y,161.29h,85.12t/data=!3m6!1e1!3m4!1souw4-RHjjaewwE6E154nKw!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 85.12,
      "image_url" : "collection/800/WY 0253.jpg",
      "lng" : -77.0273098,
      "a" : 3,
      "Notes" : "",
      "lat" : 38.9509481,
      "pano" : "ouw4-RHjjaewwE6E154nKw",
      "OBJECTID" : "WY 0252.16",
      "y" : 75,
      "TITLE" : "Colony Theatre on the corner of Georgia Avenue and Farragut Street NW."
   },
   {
      "TITLE" : "Petworth Branch, District of Columbia Public Library, Georgia and Iowa Avenues NW.",
      "y" : 75,
      "OBJECTID" : "WY 0253.16",
      "pano" : "Y-EMFwjH11II10rCnMx6rg",
      "lat" : 38.9424967,
      "Notes" : "",
      "lng" : -77.0254661,
      "a" : 3,
      "image_url" : "collection/800/WY 0254.jpg",
      "pitch_from_down" : 80.22,
      "MAPS_URL" : "https://www.google.com/maps/@38.9424967,-77.0254661,3a,75y,250.68h,80.22t/data=!3m6!1e1!3m4!1sY-EMFwjH11II10rCnMx6rg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 250.68
   },
   {
      "image_url" : "collection/800/WY 0255.jpg",
      "lng" : -77.027777,
      "a" : 3,
      "lat" : 38.9418699,
      "Notes" : "",
      "pano" : "pV7yAjWbvko_rmZ6KmZObw",
      "MAPS_URL" : "https://www.google.com/maps/@38.9418699,-77.027777,3a,75y,316.08h,78.56t/data=!3m6!1e1!3m4!1spV7yAjWbvko_rmZ6KmZObw!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 316.08,
      "pitch_from_down" : 78.56,
      "y" : 75,
      "TITLE" : "Roosevelt High School, 13th Street NW between Upshur and Allison Streets.",
      "OBJECTID" : "WY 0255.16"
   },
   {
      "lng" : -77.0279026,
      "a" : 3,
      "image_url" : "collection/800/WY 0256.jpg",
      "Notes" : "",
      "lat" : 38.9418698,
      "pano" : "7oxGB49cvi3jys0N_OHXXQ",
      "MAPS_URL" : "https://www.google.com/maps/@38.9418698,-77.0279026,3a,75y,0.5h,77.28t/data=!3m6!1e1!3m4!1s7oxGB49cvi3jys0N_OHXXQ!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 0.5,
      "pitch_from_down" : 77.28,
      "y" : 75,
      "TITLE" : "Roosevelt High School, view from Upshur Street.",
      "OBJECTID" : "WY 0256.16"
   },
   {
      "heading" : 293.09,
      "MAPS_URL" : "https://www.google.com/maps/@38.9429399,-77.0262322,3a,75y,293.09h,79.68t/data=!3m6!1e1!3m4!1sCxlFusspBulgoNdnTdSvZg!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 79.68,
      "lng" : -77.0262322,
      "a" : 3,
      "image_url" : "collection/800/WY 0257.jpg",
      "Notes" : "",
      "lat" : 38.9429399,
      "pano" : "CxlFusspBulgoNdnTdSvZg",
      "OBJECTID" : "WY 0257.16",
      "y" : 75,
      "TITLE" : "McFarland Junior High School, Iowa Avenue and Varnum Street NW."
   },
   {
      "TITLE" : "Burdick Vocational High School , 13th and Allison Streets NW.",
      "y" : 75,
      "OBJECTID" : "WY 0258.16",
      "pano" : "znaxiTtKQleq4M5rr9rK3A",
      "Notes" : "",
      "lat" : 38.9450612,
      "a" : 3,
      "lng" : -77.0295272,
      "image_url" : "collection/800/WY 0258.jpg",
      "pitch_from_down" : 75.9,
      "MAPS_URL" : "https://www.google.com/maps/@38.9450612,-77.0295272,3a,75y,246.32h,75.9t/data=!3m6!1e1!3m4!1sznaxiTtKQleq4M5rr9rK3A!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 246.32
   },
   {
      "OBJECTID" : "WY 0260.16",
      "TITLE" : "Petworth School, northwest corner, 8th and Shepard Streets NW.",
      "y" : 75,
      "pitch_from_down" : 82.98,
      "MAPS_URL" : "https://www.google.com/maps/place/Washington,+DC+20011/@38.939874,-77.0232472,3a,75y,301.94h,82.98t/data=!3m7!1e1!3m5!1sqg7ghpDdWAg0H0U1o1lNTg!2e0!6s%2F%2Fgeo0.ggpht.com%2Fcbk%3Fpanoid%3Dqg7ghpDdWAg0H0U1o1lNTg%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D104.39389%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c811eb67005f:0x6e86c3187f04f444!6m1!1e1",
      "heading" : 301.94,
      "pano" : "qg7ghpDdWAg0H0U1o1lNTg",
      "lat" : 38.939874,
      "Notes" : "",
      "lng" : -77.0232472,
      "a" : 3,
      "image_url" : "collection/800/WY 0260.jpg"
   },
   {
      "heading" : 46.53,
      "MAPS_URL" : "https://www.google.com/maps/place/907+Webster+St+NW,+Washington,+DC+20011/@38.944005,-77.0256405,3a,75y,46.53h,93.17t/data=!3m7!1e1!3m5!1sgDJkXI7yIlq7F0hhRCQF0w!2e0!6s%2F%2Fgeo2.ggpht.com%2Fcbk%3Fpanoid%3DgDJkXI7yIlq7F0hhRCQF0w%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D37.200821%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c8130e2b710d:0x871e39248b1b084d!6m1!1e1",
      "pitch_from_down" : 93.17,
      "Notes" : "",
      "lat" : 38.944005,
      "pano" : "gDJkXI7yIlq7F0hhRCQF0w",
      "lng" : -77.0256405,
      "a" : 3,
      "image_url" : "collection/800/WY 0261.jpg",
      "OBJECTID" : "WY 0261.16",
      "y" : 75,
      "TITLE" : "Houses at 905-907 Webster Street NW."
   },
   {
      "OBJECTID" : "WY 0262.16",
      "TITLE" : "Truesdale School on the corner of 8th and Ingraham Streets NW.",
      "y" : 75,
      "pitch_from_down" : 76.14,
      "heading" : 231.33,
      "MAPS_URL" : "https://www.google.com/maps/@38.9541921,-77.0238059,3a,75y,231.33h,76.14t/data=!3m6!1e1!3m4!1s0CQprteRGErTlFXmOIUlvQ!2e0!7i13312!8i6656!6m1!1e1",
      "lng" : -77.0238059,
      "image_url" : "collection/800/WY 0262.jpg",
      "a" : 3,
      "pano" : "0CQprteRGErTlFXmOIUlvQ",
      "Notes" : "",
      "lat" : 38.9541921
   },
   {
      "a" : 3,
      "lng" : -77.0239895,
      "image_url" : "collection/800/WY 0263.jpg",
      "Notes" : "",
      "lat" : 38.9553404,
      "pano" : "baQ6g5qocKJC3lHyaIF__w",
      "heading" : 133.08,
      "MAPS_URL" : "https://www.google.com/maps/@38.9553404,-77.0239895,3a,75y,133.08h,86.78t/data=!3m6!1e1!3m4!1sbaQ6g5qocKJC3lHyaIF__w!2e0!7i3328!8i1664!6m1!1e1",
      "pitch_from_down" : 86.78,
      "y" : 75,
      "TITLE" : "Brightwood Park Methodist Church, 8th and Jefferson Streets NW.",
      "OBJECTID" : "WY 0263.16"
   },
   {
      "Notes" : "",
      "lat" : 38.9473958,
      "pano" : "aC8wNLoHyoQySC7V8VWdhg",
      "a" : 3,
      "lng" : -77.0195198,
      "image_url" : "collection/800/WY 0264.jpg",
      "MAPS_URL" : "https://www.google.com/maps/@38.9473958,-77.0195198,3a,75y,48.56h,78.76t/data=!3m6!1e1!3m4!1saC8wNLoHyoQySC7V8VWdhg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 48.56,
      "pitch_from_down" : 78.76,
      "y" : 75,
      "TITLE" : "Barnard Elementary School on the corner of 5th and Crittenden Streets NW.",
      "OBJECTID" : "WY 0264.16"
   },
   {
      "y" : 75,
      "TITLE" : "Sherman Circle, Illinois and Kansas Avenues NW.",
      "OBJECTID" : "WY 0265.16",
      "image_url" : "collection/800/WY 0265.jpg",
      "lng" : -77.0215225,
      "a" : 3,
      "lat" : 38.9478219,
      "Notes" : "",
      "pano" : "E10iAlxHynHZITyfB2XmQA",
      "MAPS_URL" : "https://www.google.com/maps/@38.9478219,-77.0215225,3a,75y,256.1h,76.63t/data=!3m6!1e1!3m4!1sE10iAlxHynHZITyfB2XmQA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 256.1,
      "pitch_from_down" : 76.63
   },
   {
      "OBJECTID" : "WY 0266.16",
      "y" : 75,
      "TITLE" : "Petworth Methodist Church, Illinois and New Hampshire Avenues NW.",
      "heading" : 277.4,
      "MAPS_URL" : "https://www.google.com/maps/place/Grant+Cir+NW,+Washington,+DC+20011/@38.9425964,-77.0193583,3a,75y,277.4h,80.88t/data=!3m7!1e1!3m5!1s-a5zXadOn-Agzjqh0SFgyQ!2e0!6s%2F%2Fgeo0.ggpht.com%2Fcbk%3Fpanoid%3D-a5zXadOn-Agzjqh0SFgyQ%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D11.658874%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c80d010dbad9:0x32b6c4a252705bcd",
      "pitch_from_down" : 80.88,
      "a" : 3,
      "lng" : -77.0193583,
      "image_url" : "collection/800/WY 0266.jpg",
      "Notes" : "",
      "lat" : 38.9425964,
      "pano" : "-a5zXadOn-Agzjqh0SFgyQ"
   },
   {
      "OBJECTID" : "WY 0267.16",
      "TITLE" : "St.Gabriel's Roman Catholic Church, at 26 Grant Circle.",
      "y" : 75,
      "pitch_from_down" : 76.28,
      "heading" : 338.87,
      "MAPS_URL" : "https://www.google.com/maps/@38.9429593,-77.0199054,3a,75y,338.87h,76.28t/data=!3m6!1e1!3m4!1sagrhBE01zxjHZ01GZg0oCQ!2e0!7i13312!8i6656",
      "pano" : "agrhBE01zxjHZ01GZg0oCQ",
      "lat" : 38.9429593,
      "Notes" : "",
      "lng" : -77.0199054,
      "image_url" : "collection/800/WY 0267.jpg",
      "a" : 3
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/place/5th+St+NW+%26+Webster+St+NW,+Washington,+DC+20011/@38.9441968,-77.0192292,3a,75y,321.23h,82.4t/data=!3m7!1e1!3m5!1sSjco3RGrS7Ar6IBpR4fVFg!2e0!6s%2F%2Fgeo1.ggpht.com%2Fcbk%3Fpanoid%3DSjco3RGrS7Ar6IBpR4fVFg%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D17.293943%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c80d21e2033b:0x72233fcc2c7a59df!6m1!1e1",
      "heading" : 321.23,
      "pitch_from_down" : 82.4,
      "a" : 3,
      "lng" : -77.0192292,
      "image_url" : "collection/800/WY 0268.jpg",
      "lat" : 38.9441968,
      "Notes" : "",
      "pano" : "Sjco3RGrS7Ar6IBpR4fVFg",
      "OBJECTID" : "WY 0268.16",
      "y" : 75,
      "TITLE" : "St.Gabriel's Parochial School on the corner of 5th and Webster Streets NW."
   },
   {
      "OBJECTID" : "WY 0269.16",
      "y" : 75,
      "TITLE" : "Rudolph Elementary School, 2nd and Hamilton Streets NW.",
      "MAPS_URL" : "https://www.google.com/maps/place/Hamilton+St+NW+%26+2nd+St+NW,+Washington,+DC+20011/@38.9533261,-77.0134117,3a,75y,316.93h,80.77t/data=!3m7!1e1!3m5!1shm6nakpWre-u4yeaY_oP6g!2e0!6s%2F%2Fgeo2.ggpht.com%2Fcbk%3Fpanoid%3Dhm6nakpWre-u4yeaY_oP6g%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D356.99045%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c87708e26213:0xa2f2a0b97a7e6dcc!6m1!1e1",
      "heading" : 316.93,
      "pitch_from_down" : 80.77,
      "lng" : -77.0134117,
      "a" : 3,
      "image_url" : "collection/800/WY 0269.jpg",
      "lat" : 38.9533261,
      "Notes" : "",
      "pano" : "hm6nakpWre-u4yeaY_oP6g"
   },
   {
      "y" : 75,
      "TITLE" : "Lewis Memorial Methodist Church, 4th and Hamilton Streets NW.",
      "OBJECTID" : "WY 0270.16",
      "image_url" : "collection/800/WY 0270.jpg",
      "lng" : -77.0176684,
      "a" : 3,
      "Notes" : "",
      "lat" : 38.95323,
      "pano" : "iK9QfFejUhdvewZby8FhNg",
      "heading" : 146.77,
      "MAPS_URL" : "https://www.google.com/maps/@38.95323,-77.0176684,3a,75y,146.77h,81.74t/data=!3m6!1e1!3m4!1siK9QfFejUhdvewZby8FhNg!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 81.74
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9464052,-77.0168138,3a,75y,57.02h,77.48t/data=!3m6!1e1!3m4!1s1MACLzbAWtZyTL3-4Hletg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 57.02,
      "pitch_from_down" : 77.48,
      "Notes" : "",
      "lat" : 38.9464052,
      "pano" : "1MACLzbAWtZyTL3-4Hletg",
      "lng" : -77.0168138,
      "image_url" : "collection/800/WY 0271.jpg",
      "a" : 3,
      "OBJECTID" : "WY 0271.16",
      "y" : 75,
      "TITLE" : "Zion Evangelical Lutheran Church, New Hampshire Avenue and Buchanan Street NW."
   },
   {
      "TITLE" : "Crittenden Street NE east of North Capitol Street.",
      "y" : 75,
      "OBJECTID" : "WY 0272.04",
      "image_url" : "collection/800/WY 0272.jpg",
      "lng" : -77.0086972,
      "a" : 3,
      "pano" : "TPFKQkkfB694PwL_7WtrEw",
      "lat" : 38.9479968,
      "Notes" : "",
      "pitch_from_down" : 69.94,
      "heading" : 28.97,
      "MAPS_URL" : "https://www.google.com/maps/@38.9479968,-77.0086972,3a,75y,28.97h,69.94t/data=!3m6!1e1!3m4!1sTPFKQkkfB694PwL_7WtrEw!2e0!7i13312!8i6656"
   },
   {
      "image_url" : "collection/800/WY 0273.jpg",
      "lng" : -77.0087525,
      "a" : 3,
      "pano" : "U0m7xW0wbEgimCmC9dHgmg",
      "Notes" : "",
      "lat" : 38.9486822,
      "pitch_from_down" : 72.96,
      "heading" : 55.63,
      "MAPS_URL" : "https://www.google.com/maps/@38.9486822,-77.0087525,3a,75y,55.63h,72.96t/data=!3m6!1e1!3m4!1sU0m7xW0wbEgimCmC9dHgmg!2e0!7i13312!8i6656",
      "TITLE" : "Engine Company No. 14 (District of Columbia Fire Department) North Capitol Street north of Crittenden Street NE.",
      "y" : 75,
      "OBJECTID" : "WY 0273.04"
   },
   {
      "y" : 75,
      "TITLE" : "Hawaii Avenue NE west of Bates Road.",
      "OBJECTID" : "WY 0274.04",
      "Notes" : "",
      "lat" : 38.944495,
      "pano" : "_ZTc9GxLWTgb94LHoxGBTg",
      "lng" : -77.0036728,
      "image_url" : "collection/800/WY 0274.jpg",
      "a" : 3,
      "heading" : 269.84,
      "MAPS_URL" : "https://www.google.com/maps/place/Bates+Rd+NE,+Washington,+DC+20011/@38.944495,-77.0036728,3a,75y,269.84h,78.74t/data=!3m7!1e1!3m5!1s_ZTc9GxLWTgb94LHoxGBTg!2e0!6s%2F%2Fgeo3.ggpht.com%2Fcbk%3Fpanoid%3D_ZTc9GxLWTgb94LHoxGBTg%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D45.626175%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c7dc4c0f2723:0xadf4fec05fc4f59e",
      "pitch_from_down" : 78.74
   },
   {
      "OBJECTID" : "WY 0282.04",
      "y" : 75,
      "TITLE" : "Keene Elementary School.",
      "heading" : 146.65,
      "MAPS_URL" : "https://www.google.com/maps/place/Keene+Elementary+School/@38.9553394,-77.006579,3a,75y,146.65h,89.27t/data=!3m7!1e1!3m5!1sYkF-dbbkTJHwFc_BrH4tgA!2e0!6s%2F%2Fgeo1.ggpht.com%2Fcbk%3Fpanoid%3DYkF-dbbkTJHwFc_BrH4tgA%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D310.67062%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c7d7657a88b1:0xdebecbde15ac6ceb!6m1!1e1",
      "pitch_from_down" : 89.27,
      "Notes" : "",
      "lat" : 38.9553394,
      "pano" : "YkF-dbbkTJHwFc_BrH4tgA",
      "lng" : -77.006579,
      "image_url" : "collection/800/WY 0282.jpg",
      "a" : 3
   },
   {
      "OBJECTID" : "WY 0283.04",
      "y" : 75,
      "TITLE" : "Overpass, Baltimore and Ohio Railroad, Riggs Road NE near its intersection with South Dakota Avenue.",
      "MAPS_URL" : "https://www.google.com/maps/@38.9563277,-77.0026325,3a,75y,247.18h,81.89t/data=!3m6!1e1!3m4!1sX8ly1mkSlkDyttS11rrMRA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 247.18,
      "pitch_from_down" : 81.89,
      "Notes" : "",
      "lat" : 38.9563277,
      "pano" : "X8ly1mkSlkDyttS11rrMRA",
      "image_url" : "collection/800/WY 0283.jpg",
      "lng" : -77.0026325,
      "a" : 3
   },
   {
      "y" : 75,
      "TITLE" : "Riggs Road NE northeast of South Dakota Avenue.",
      "OBJECTID" : "WY 0284.04",
      "image_url" : "collection/800/WY 0284.jpg",
      "lng" : -77.0022265,
      "a" : 3,
      "lat" : 38.9569259,
      "Notes" : "",
      "pano" : "vMcPBPsHijEsQ4v0zpNARA",
      "heading" : 30.77,
      "MAPS_URL" : "https://www.google.com/maps/place/South+Dakota+Ave+NE+%26+Riggs+Rd+NE,+Washington,+DC+20011/@38.9569259,-77.0022265,3a,75y,30.77h,81.61t/data=!3m7!1e1!3m5!1svMcPBPsHijEsQ4v0zpNARA!2e0!6s%2F%2Fgeo0.ggpht.com%2Fcbk%3Fpanoid%3DvMcPBPsHijEsQ4v0zpNARA%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D119.11421%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c7d1040e02c1:0x3ea4a79f6b12c570!6m1!1e1",
      "pitch_from_down" : 81.61
   },
   {
      "TITLE" : "Looking southwest from Riggs Road and Eastern Avenue NE.",
      "y" : 75,
      "OBJECTID" : "WY 0286.04",
      "pano" : "VqtuyY-FCEh_3te3WYKPgA",
      "Notes" : "",
      "lat" : 38.9616506,
      "lng" : -76.9971896,
      "a" : 3,
      "image_url" : "collection/800/WY 0286.jpg",
      "pitch_from_down" : 76.03,
      "heading" : 197.11,
      "MAPS_URL" : "https://www.google.com/maps/place/South+Dakota+Ave+NE+%26+Riggs+Rd+NE,+Washington,+DC+20011/@38.9616506,-76.9971896,3a,75y,197.11h,76.03t/data=!3m7!1e1!3m5!1sVqtuyY-FCEh_3te3WYKPgA!2e0!6s%2F%2Fgeo3.ggpht.com%2Fcbk%3Fpanoid%3DVqtuyY-FCEh_3te3WYKPgA%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D13.470759%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c7d1040e02c1:0x3ea4a79f6b12c570!6m1!1e1"
   },
   {
      "OBJECTID" : "WY 0287.04",
      "TITLE" : "South Dakota Avenue NE northwest of Gallatin Street.",
      "y" : 75,
      "pitch_from_down" : 77.75,
      "MAPS_URL" : "https://www.google.com/maps/@38.9518908,-76.9958277,3a,75y,320.64h,77.75t/data=!3m6!1e1!3m4!1smOxHkzWx77SRcIqZcsFb1Q!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 320.64,
      "lng" : -76.9958277,
      "a" : 3,
      "image_url" : "collection/800/WY 0287.jpg",
      "pano" : "mOxHkzWx77SRcIqZcsFb1Q",
      "lat" : 38.9518908,
      "Notes" : ""
   },
   {
      "y" : 75,
      "TITLE" : "South Dakota Avenue NE southeast of 8th Street NE.",
      "OBJECTID" : "WY 0288.04",
      "image_url" : "collection/800/WY 0288.jpg",
      "lng" : -76.994354,
      "a" : 3,
      "Notes" : "",
      "lat" : 38.950745,
      "pano" : "9c0Fb_8ZgubBXGZbINKvBg",
      "MAPS_URL" : "https://www.google.com/maps/@38.950745,-76.994354,3a,75y,137.61h,80.14t/data=!3m6!1e1!3m4!1s9c0Fb_8ZgubBXGZbINKvBg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 137.61,
      "pitch_from_down" : 80.14
   },
   {
      "TITLE" : "Duplex houses under construction, 8th Street NE north of Emerson Street.",
      "y" : 75,
      "OBJECTID" : "WY 0289.04",
      "pano" : "FgNl9NjnD_OeOQvqblLKAw",
      "Notes" : "",
      "lat" : 38.9500833,
      "a" : 3,
      "lng" : -76.9949558,
      "image_url" : "collection/800/WY 0289.jpg",
      "pitch_from_down" : 81.5,
      "heading" : 20.99,
      "MAPS_URL" : "https://www.google.com/maps/place/South+Dakota+Ave+NE+%26+Gallatin+St+NE,+Washington,+DC+20017/@38.9500833,-76.9949558,3a,75y,20.99h,81.5t/data=!3m7!1e1!3m5!1sFgNl9NjnD_OeOQvqblLKAw!2e0!6s%2F%2Fgeo0.ggpht.com%2Fcbk%3Fpanoid%3DFgNl9NjnD_OeOQvqblLKAw%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D61.134903%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c7c59e2ea37d:0xf7dbeffd89109be9!6m1!1e1"
   },
   {
      "pano" : "851mk5HafHM4LLxH5b4vIw",
      "lat" : 38.9500449,
      "Notes" : "",
      "image_url" : "collection/800/WY 0290.jpg",
      "lng" : -76.9953029,
      "a" : 3,
      "pitch_from_down" : 84.55,
      "heading" : 273.91,
      "MAPS_URL" : "https://www.google.com/maps/@38.9500449,-76.9953029,3a,75y,273.91h,84.55t/data=!3m6!1e1!3m4!1s851mk5HafHM4LLxH5b4vIw!2e0!7i13312!8i6656!6m1!1e1",
      "TITLE" : "Housing development, Emerson Street NE west of 8th Street.",
      "y" : 75,
      "OBJECTID" : "WY 0290.04"
   },
   {
      "TITLE" : "Alley behind houses on 12th Street NE looking northeast from South Dakota Avenue.",
      "y" : 75,
      "OBJECTID" : "WY 0291.04",
      "pano" : "dWq5Gm48K8FOqhMJpcKxEg",
      "lat" : 38.9478191,
      "Notes" : "",
      "lng" : -76.9904872,
      "a" : 3,
      "image_url" : "collection/800/WY 0291.jpg",
      "pitch_from_down" : 78.9,
      "heading" : 14.43,
      "MAPS_URL" : "https://www.google.com/maps/@38.9478191,-76.9904872,3a,75y,14.43h,78.9t/data=!3m6!1e1!3m4!1sdWq5Gm48K8FOqhMJpcKxEg!2e0!7i13312!8i6656!6m1!1e1"
   },
   {
      "OBJECTID" : "WY 0292.04",
      "y" : 75,
      "TITLE" : "National Headquarters, Society for the Enthronement of the Sacred Heart in the Home, 4930 South Dakota Avenue NE.",
      "MAPS_URL" : "https://www.google.com/maps/@38.9487363,-76.9917403,3a,75y,344.62h,72.57t/data=!3m6!1e1!3m4!1sY19xtBCJFg2opuZBrDfa8A!2e0!7i13312!8i6656",
      "heading" : 344.62,
      "pitch_from_down" : 72.57,
      "lng" : -76.9917403,
      "a" : 3,
      "image_url" : "collection/800/WY 0292.jpg",
      "Notes" : "",
      "lat" : 38.9487363,
      "pano" : "Y19xtBCJFg2opuZBrDfa8A"
   },
   {
      "pitch_from_down" : 76.08,
      "heading" : 294.99,
      "MAPS_URL" : "https://www.google.com/maps/@38.9473016,-76.9897724,3a,75y,294.99h,76.08t/data=!3m6!1e1!3m4!1shEHuahccTxEqdtuFkSJO6g!2e0!7i13312!8i6656",
      "lng" : -76.9897724,
      "image_url" : "collection/800/WY 0293.jpg",
      "a" : 3,
      "pano" : "hEHuahccTxEqdtuFkSJO6g",
      "lat" : 38.9473016,
      "Notes" : "",
      "OBJECTID" : "WY 0293.04",
      "TITLE" : "House of Studies, Fathers of the Sacred Heart, South Dakota Avenue NE northwest of Crittenden Street.",
      "y" : 75
   },
   {
      "TITLE" : "House on Sargent Road NE at Delafield Place.",
      "y" : 75,
      "OBJECTID" : "WY 0294.04",
      "image_url" : "collection/800/WY 0294.jpg",
      "lng" : -76.9894256,
      "a" : 3,
      "pano" : "Nllw7jKuMqkia-AkXyhf9A",
      "lat" : 38.9482497,
      "Notes" : "",
      "pitch_from_down" : 78.42,
      "MAPS_URL" : "https://www.google.com/maps/place/4930+Sargent+Rd+NE,+Washington,+DC+20017/@38.9482497,-76.9894256,3a,75y,72.53h,78.42t/data=!3m7!1e1!3m5!1sNllw7jKuMqkia-AkXyhf9A!2e0!6s%2F%2Fgeo3.ggpht.com%2Fcbk%3Fpanoid%3DNllw7jKuMqkia-AkXyhf9A%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D93.735138%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c7c73b6aef37:0x517b4439c299590d",
      "heading" : 72.53
   },
   {
      "OBJECTID" : "WY 0296.04",
      "TITLE" : "Row houses on 12th Street NE between Buchanan Street and South Dakota Avenue.",
      "y" : 75,
      "pitch_from_down" : 80.21,
      "heading" : 135.95,
      "MAPS_URL" : "https://www.google.com/maps/@38.9468938,-76.9902405,3a,75y,135.95h,80.21t/data=!3m6!1e1!3m4!1srs52kEj3nDzQipF1EV5wlA!2e0!7i13312!8i6656!6m1!1e1",
      "image_url" : "collection/800/WY 0296.jpg",
      "lng" : -76.9902405,
      "a" : 3,
      "pano" : "rs52kEj3nDzQipF1EV5wlA",
      "Notes" : "",
      "lat" : 38.9468938
   },
   {
      "pitch_from_down" : 88.18,
      "MAPS_URL" : "https://www.google.com/maps/@38.9462729,-76.9890989,3a,75y,310.69h,88.18t/data=!3m6!1e1!3m4!1smxYWJlY7FWAUwIbqYvY0nQ!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 310.69,
      "a" : 3,
      "lng" : -76.9890989,
      "image_url" : "collection/800/WY 0297.jpg",
      "pano" : "mxYWJlY7FWAUwIbqYvY0nQ",
      "Notes" : "",
      "lat" : 38.9462729,
      "OBJECTID" : "WY 0297.04",
      "TITLE" : "Houses on Buchanan Street between 12th Street and South Dakota Avenue NE.",
      "y" : 75
   },
   {
      "lng" : -76.9889103,
      "a" : 3,
      "image_url" : "collection/800/WY 0298.jpg",
      "lat" : 38.946327,
      "Notes" : "",
      "pano" : "e74IiA7gPb-Cqxct3AsfxA",
      "MAPS_URL" : "https://www.google.com/maps/@38.946327,-76.9889103,3a,75y,223.26h,71.06t/data=!3m6!1e1!3m4!1se74IiA7gPb-Cqxct3AsfxA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 223.26,
      "pitch_from_down" : 71.06,
      "y" : 75,
      "TITLE" : "Duplex houses on Buchanan Street between 12th Street and South Dakota Avenue.",
      "OBJECTID" : "WY 0298.04"
   },
   {
      "y" : 75,
      "TITLE" : "Houses on South Dakota Avenue NE, northeast of Buchanan Street.",
      "OBJECTID" : "WY 0299.04",
      "Notes" : "",
      "lat" : 38.9462944,
      "pano" : "80yHb5WwEIqfw6Y6gyhBAg",
      "a" : 3,
      "lng" : -76.9884367,
      "image_url" : "collection/800/WY 0299.jpg",
      "heading" : 29.95,
      "MAPS_URL" : "https://www.google.com/maps/place/12th+St+NE+%26+Buchanan+St+NE,+Washington,+DC+20017/@38.9462944,-76.9884367,3a,75y,29.95h,79.24t/data=!3m7!1e1!3m5!1s80yHb5WwEIqfw6Y6gyhBAg!2e0!6s%2F%2Fgeo2.ggpht.com%2Fcbk%3Fpanoid%3D80yHb5WwEIqfw6Y6gyhBAg%26output%3Dthumbnail%26cb_client%3Dmaps_sv.tactile.gps%26thumb%3D2%26w%3D203%26h%3D100%26yaw%3D31.389126%26pitch%3D0!7i13312!8i6656!4m2!3m1!1s0x89b7c7c1209ef871:0x4adbcd34d846d120!6m1!1e1",
      "pitch_from_down" : 79.24
   },
   {
      "y" : 75,
      "TITLE" : "St. Joseph Seminary.",
      "OBJECTID" : "WY 0300.04",
      "Notes" : "",
      "lat" : 38.9428665,
      "pano" : "Xi88ymvRs3hG3305X91LuQ",
      "lng" : -76.9892076,
      "a" : 3,
      "image_url" : "collection/800/WY 0300.jpg",
      "heading" : 4.57,
      "MAPS_URL" : "https://www.google.com/maps/@38.9428665,-76.9892076,3a,75y,4.57h,84.95t/data=!3m6!1e1!3m4!1sXi88ymvRs3hG3305X91LuQ!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 84.95
   },
   {
      "OBJECTID" : "WY 0301.04",
      "TITLE" : "Catholic Sisters College.",
      "y" : 75,
      "pitch_from_down" : 90.48,
      "heading" : 198.42,
      "MAPS_URL" : "https://www.google.com/maps/@38.9427003,-76.9946436,3a,75y,198.42h,90.48t/data=!3m6!1e1!3m4!1sN8GCAB5atsqHBi3wb4e38g!2e0!7i13312!8i6656!6m1!1e1",
      "a" : 3,
      "lng" : -76.9946436,
      "image_url" : "collection/800/WY 0301.jpg",
      "pano" : "N8GCAB5atsqHBi3wb4e38g",
      "lat" : 38.9427003,
      "Notes" : ""
   },
   {
      "y" : 75,
      "TITLE" : "Brady Hall of Catholic Sisters College.",
      "OBJECTID" : "WY 0302.04",
      "lng" : -76.9950569,
      "a" : 3,
      "image_url" : "collection/800/WY 0302.jpg",
      "Notes" : "",
      "lat" : 38.9433442,
      "pano" : "ya9Y77c8it-zKVy1JvOaqA",
      "heading" : 103.81,
      "MAPS_URL" : "https://www.google.com/maps/@38.9433442,-76.9950569,3a,75y,103.81h,74.4t/data=!3m6!1e1!3m4!1sya9Y77c8it-zKVy1JvOaqA!2e0!7i13312!8i6656",
      "pitch_from_down" : 74.4
   },
   {
      "pitch_from_down" : 81.48,
      "MAPS_URL" : "https://www.google.com/maps/@38.9480533,-76.9893745,3a,75y,93.86h,81.48t/data=!3m6!1e1!3m4!1s1Vu_bRYtA3hljO-VTlTt4g!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 93.86,
      "pano" : "1Vu_bRYtA3hljO-VTlTt4g",
      "Notes" : "",
      "lat" : 38.9480533,
      "lng" : -76.9893745,
      "image_url" : "collection/800/WY 0304.jpg",
      "a" : 3,
      "OBJECTID" : "WY 0304.04",
      "TITLE" : "St. Gertrudes School of Design.",
      "y" : 75
   },
   {
      "pitch_from_down" : 79.03,
      "MAPS_URL" : "https://www.google.com/maps/@38.9364839,-76.9922757,3a,75y,282.25h,79.03t/data=!3m6!1e1!3m4!1sVmSlHOFOaRvaRmNIkJ_K0w!2e0!7i13312!8i6656",
      "heading" : 282.25,
      "image_url" : "collection/800/WY 0308.04.jpg",
      "lng" : -76.9922757,
      "a" : 3,
      "pano" : "VmSlHOFOaRvaRmNIkJ_K0w",
      "Notes" : "",
      "lat" : 38.9364839,
      "OBJECTID" : "WY 0308.05",
      "TITLE" : "Shopping Center, 10th and Perry Streets NE. (Turkey Thicket Playground).",
      "y" : 75
   },
   {
      "TITLE" : "Randolph Sreet NE east of 12th Street.",
      "y" : 75,
      "OBJECTID" : "WY 0310.05",
      "lng" : -76.9892655,
      "a" : 3,
      "image_url" : "collection/800/WY 0310.jpg",
      "pano" : "NTu0O6zRXxkrryEfuBz1Mg",
      "lat" : 38.9383112,
      "Notes" : "",
      "pitch_from_down" : 79.15,
      "heading" : 225.59,
      "MAPS_URL" : "https://www.google.com/maps/@38.9383112,-76.9892655,3a,75y,225.59h,79.15t/data=!3m6!1e1!3m4!1sNTu0O6zRXxkrryEfuBz1Mg!2e0!7i13312!8i6656!6m1!1e1"
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9383109,-76.9896353,3a,75y,325.19h,74.3t/data=!3m6!1e1!3m4!1sXfM3drL8iqyfu5vDWErDvw!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 325.19,
      "pitch_from_down" : 74.3,
      "a" : 3,
      "lng" : -76.9896353,
      "image_url" : "collection/800/WY 0311.jpg",
      "Notes" : "",
      "lat" : 38.9383109,
      "pano" : "XfM3drL8iqyfu5vDWErDvw",
      "OBJECTID" : "WY 0311.05",
      "y" : 75,
      "TITLE" : "Randolph St. NE east of 12th Street."
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9389818,-76.9882873,3a,75y,153.32h,79.03t/data=!3m6!1e1!3m4!1sfQo0LbW7MvKOInoTeISPIg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 153.32,
      "pitch_from_down" : 79.03,
      "Notes" : "",
      "lat" : 38.9389818,
      "pano" : "fQo0LbW7MvKOInoTeISPIg",
      "a" : 3,
      "lng" : -76.9882873,
      "image_url" : "collection/800/WY 0312.jpg",
      "OBJECTID" : "WY 0312.05",
      "y" : 75,
      "TITLE" : "West side of 13th Street NW looking south from Richie Place."
   },
   {
      "OBJECTID" : "WY 0313.05",
      "TITLE" : "13th Street NE (west side) looking south from Richie Place.",
      "y" : 75,
      "pitch_from_down" : 80.38,
      "MAPS_URL" : "https://www.google.com/maps/@38.938982,-76.9882526,3a,75y,230.22h,80.38t/data=!3m6!1e1!3m4!1se7yveQo5iR-wOHAaBanbfA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 230.22,
      "pano" : "e7yveQo5iR-wOHAaBanbfA",
      "lat" : 38.938982,
      "Notes" : "",
      "lng" : -76.9882526,
      "a" : 3,
      "image_url" : "collection/800/WY 0313.jpg"
   },
   {
      "image_url" : "collection/800/WY 0314.jpg",
      "lng" : -76.9882898,
      "a" : 3,
      "pano" : "cnUc_TmIDWNPVAND62EX3A",
      "Notes" : "",
      "lat" : 38.939152,
      "pitch_from_down" : 82.59,
      "MAPS_URL" : "https://www.google.com/maps/@38.939152,-76.9882898,3a,75y,237.79h,82.59t/data=!3m6!1e1!3m4!1scnUc_TmIDWNPVAND62EX3A!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 237.79,
      "TITLE" : "Houses on the west side of 13th Street NE between Richie Place and Shepard Street.",
      "y" : 75,
      "OBJECTID" : "WY 0314.05"
   },
   {
      "pitch_from_down" : 80.64,
      "MAPS_URL" : "https://www.google.com/maps/@38.940419,-76.9882918,3a,75y,125.06h,80.64t/data=!3m6!1e1!3m4!1s9f859X9ufnsmRnuDRbm7ew!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 125.06,
      "pano" : "9f859X9ufnsmRnuDRbm7ew",
      "Notes" : "",
      "lat" : 38.940419,
      "lng" : -76.9882918,
      "image_url" : "collection/800/WY 0315.jpg",
      "a" : 3,
      "OBJECTID" : "WY 0315.05",
      "TITLE" : "House on the west side of 13th Street NE near Michigan Avenue.",
      "y" : 75
   },
   {
      "OBJECTID" : "WY 0316.05",
      "y" : 75,
      "TITLE" : "Michigan Avenue NE at 13th Street.",
      "MAPS_URL" : "https://www.google.com/maps/@38.9402292,-76.988292,3a,75y,280.35h,75.67t/data=!3m6!1e1!3m4!1salLLRU-irWap8BReJEKJGQ!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 280.35,
      "pitch_from_down" : 75.67,
      "lng" : -76.988292,
      "a" : 3,
      "image_url" : "collection/800/WY 0316.jpg",
      "Notes" : "",
      "lat" : 38.9402292,
      "pano" : "alLLRU-irWap8BReJEKJGQ"
   },
   {
      "OBJECTID" : "WY 0317.05",
      "TITLE" : "Michigan Avenue NE, southwest of 13th Street.",
      "y" : 75,
      "pitch_from_down" : 82.6,
      "heading" : 184.87,
      "MAPS_URL" : "https://www.google.com/maps/@38.9398015,-76.98906,3a,75y,184.87h,82.6t/data=!3m6!1e1!3m4!1srWlDTqkU0BLG7YoanPGSLQ!2e0!7i13312!8i6656!6m1!1e1",
      "lng" : -76.98906,
      "image_url" : "collection/800/WY 0317.jpg",
      "a" : 3,
      "pano" : "rWlDTqkU0BLG7YoanPGSLQ",
      "Notes" : "",
      "lat" : 38.9398015
   },
   {
      "lat" : 38.9383342,
      "Notes" : "",
      "pano" : "aqvRpRmi9qvTx3eAsBY2Sw",
      "a" : 3,
      "lng" : -76.9906539,
      "image_url" : "collection/800/WY 0318.jpg",
      "heading" : 338.87,
      "MAPS_URL" : "https://www.google.com/maps/@38.9383342,-76.9906539,3a,75y,338.87h,76.18t/data=!3m6!1e1!3m4!1saqvRpRmi9qvTx3eAsBY2Sw!2e0!7i13312!8i6656!6m1!1e1",
      "pitch_from_down" : 76.18,
      "y" : 75,
      "TITLE" : "House at southeast corner of Michigan Avenue NE and Randolph Street NE.",
      "OBJECTID" : "WY 0318.05"
   },
   {
      "pano" : "xj3jdkunEH-1Z9jygHMVLA",
      "lat" : 38.937241,
      "Notes" : "",
      "lng" : -76.9863368,
      "image_url" : "collection/800/WY 0319.jpg",
      "a" : 3,
      "pitch_from_down" : 82.1,
      "heading" : 327.04,
      "MAPS_URL" : "https://www.google.com/maps/@38.937241,-76.9863368,3a,75y,327.04h,82.1t/data=!3m6!1e1!3m4!1sxj3jdkunEH-1Z9jygHMVLA!2e0!7i3328!8i1664!6m1!1e1",
      "TITLE" : "Pilgrimage Hall (restaurant and rest house), Franciscan Monestary, 14th and Quincy Streets NE.",
      "y" : 75,
      "OBJECTID" : "WY 0319.05"
   },
   {
      "pano" : "crL-khxegbAOju0CNVa7nQ",
      "lat" : 38.9371942,
      "Notes" : "",
      "image_url" : "collection/800/WY 0320.jpg",
      "lng" : -76.9861796,
      "a" : 3,
      "pitch_from_down" : 81.05,
      "heading" : 66.7,
      "MAPS_URL" : "https://www.google.com/maps/@38.9371942,-76.9861796,3a,75y,66.7h,81.05t/data=!3m6!1e1!3m4!1scrL-khxegbAOju0CNVa7nQ!2e0!7i13312!8i6656!6m1!1e1",
      "TITLE" : "Gateway and Church, Franciscan Monastery.",
      "y" : 75,
      "OBJECTID" : "WY 0320.05"
   },
   {
      "TITLE" : "Statue of St. Christopher, Franciscan Monastery Grounds.",
      "y" : 75,
      "OBJECTID" : "WY 0323.05",
      "pano" : "-wRqFzS6oMs0",
      "Notes" : "",
      "lat" : 38.9374658,
      "a" : 3,
      "lng" : -76.9856658,
      "image_url" : "collection/800/WY 0323.jpg",
      "pitch_from_down" : 95.39,
      "MAPS_URL" : "https://www.google.com/maps/@38.9374658,-76.9856658,3a,75y,292.86h,95.39t/data=!3m8!1e1!3m6!1s-wRqFzS6oMs0%2FVX_EMAmaAwI%2FAAAAAAAAMGU%2FT-y2TxPFg1A!2e4!3e11!6s%2F%2Flh5.googleusercontent.com%2F-wRqFzS6oMs0%2FVX_EMAmaAwI%2FAAAAAAAAMGU%2FT-y2TxPFg1A%2Fw203-h101-n-k-no%2F!7i2508!8i1254!6m1!1e1",
      "heading" : 292.86
   },
   {
      "OBJECTID" : "WY 0325.05",
      "TITLE" : "Mass at the Grotto of Lourdes, Franciscan Monastery grounds.",
      "y" : 75,
      "pitch_from_down" : 80.81,
      "heading" : 269.83,
      "MAPS_URL" : "https://www.google.com/maps/@38.9367439,-76.9851258,3a,75y,269.83h,80.81t/data=!3m8!1e1!3m6!1s-LMJlwACpbLc%2FVWNQKGk3aaI%2FAAAAAAAAPDo%2FKzpaHC_KRWI!2e4!3e11!6s%2F%2Flh5.googleusercontent.com%2F-LMJlwACpbLc%2FVWNQKGk3aaI%2FAAAAAAAAPDo%2FKzpaHC_KRWI%2Fw203-h101-n-k-no%2F!7i8192!8i4096!6m1!1e1",
      "pano" : "-LMJlwACpbLc",
      "Notes" : "",
      "lat" : 38.9367439,
      "lng" : -76.9851258,
      "a" : 3,
      "image_url" : "collection/800/WY 0325.jpg"
   },
   {
      "TITLE" : "South Dakota Avenue NE looking southeast from 14th Street.",
      "y" : 75,
      "OBJECTID" : "WY 0326.05",
      "lng" : -76.9857203,
      "image_url" : "collection/800/WY 0326.jpg",
      "a" : 3,
      "pano" : "QrCCzAMCMqVYfU2Ihlh8GA",
      "lat" : 38.9443837,
      "Notes" : "",
      "pitch_from_down" : 73.01,
      "heading" : 161.47,
      "MAPS_URL" : "https://www.google.com/maps/@38.9443837,-76.9857203,3a,75y,161.47h,73.01t/data=!3m6!1e1!3m4!1sQrCCzAMCMqVYfU2Ihlh8GA!2e0!7i13312!8i6656!6m1!1e1"
   },
   {
      "MAPS_URL" : "https://www.google.com/maps/@38.9425545,-76.9846125,3a,75y,197.48h,81.07t/data=!3m6!1e1!3m4!1s5ibdWO_hmP5p0Od4b4Ofdg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 197.48,
      "pitch_from_down" : 81.07,
      "Notes" : "",
      "lat" : 38.9425545,
      "pano" : "5ibdWO_hmP5p0Od4b4Ofdg",
      "a" : 3,
      "lng" : -76.9846125,
      "image_url" : "collection/800/WY 0327.jpg",
      "OBJECTID" : "WY 0327.05",
      "y" : 75,
      "TITLE" : "Bunker Hill School (elementary) Michigan Avenue NE at 14th Street."
   },
   {
      "Notes" : "",
      "lat" : 38.9396517,
      "pano" : "zGgfJJozZm0uHDvl4z5YrA",
      "lng" : -76.9838832,
      "image_url" : "collection/800/WY 0328.jpg",
      "a" : 3,
      "MAPS_URL" : "https://www.google.com/maps/@38.9396517,-76.9838832,3a,75y,110.82h,79.89t/data=!3m6!1e1!3m4!1szGgfJJozZm0uHDvl4z5YrA!2e0!7i3328!8i1664",
      "heading" : 110.82,
      "pitch_from_down" : 79.89,
      "y" : 75,
      "TITLE" : "College of the Holy Name, 14th and Taylor Streets NE.",
      "OBJECTID" : "WY 0328.05"
   },
   {
      "pitch_from_down" : 79.57,
      "MAPS_URL" : "https://www.google.com/maps/@38.9407291,-76.9835204,3a,75y,170.23h,79.57t/data=!3m6!1e1!3m4!1s1esNTZJPfc2oRTZ8e0TDuQ!2e0!7i13312!8i6656",
      "heading" : 170.23,
      "a" : 3,
      "lng" : -76.9835204,
      "image_url" : "collection/800/WY 0329.jpg",
      "pano" : "1esNTZJPfc2oRTZ8e0TDuQ",
      "Notes" : "",
      "lat" : 38.9407291,
      "OBJECTID" : "WY 0329.05",
      "TITLE" : "College of the Holy Name, view from Taylor St. NE.",
      "y" : 75
   },
   {
      "a" : 3,
      "lng" : -76.9864327,
      "image_url" : "collection/800/WY 0330.jpg",
      "Notes" : "",
      "lat" : 38.9347465,
      "pano" : "nmSOW1UJgjmERTATYIYNYA",
      "MAPS_URL" : "https://www.google.com/maps/@38.9347465,-76.9864327,3a,75y,327.81h,85.49t/data=!3m6!1e1!3m4!1snmSOW1UJgjmERTATYIYNYA!2e0!7i13312!8i6656",
      "heading" : 327.81,
      "pitch_from_down" : 85.49,
      "y" : 75,
      "TITLE" : "Fort Bunker Hill Park, 14th and Otis Streets NE.",
      "OBJECTID" : "WY 0330.05"
   },
   {
      "Notes" : "",
      "lat" : 38.9442305,
      "pano" : "BnJbPM94gqbuGVI-9cYXgA",
      "lng" : -76.9823672,
      "image_url" : "collection/800/WY 0331.jpg",
      "a" : 3,
      "MAPS_URL" : "https://www.google.com/maps/@38.9442305,-76.9823672,3a,75y,324.49h,89.12t/data=!3m6!1e1!3m4!1sBnJbPM94gqbuGVI-9cYXgA!2e0!7i13312!8i6656",
      "heading" : 324.49,
      "pitch_from_down" : 89.12,
      "y" : 75,
      "TITLE" : "White Friars Hall, 16th and Webster Street NE.",
      "OBJECTID" : "WY 0331.05"
   },
   {
      "OBJECTID" : "WY 0332.05",
      "TITLE" : "Brookland Baptist Church, 16th and Monroe Streets NE.",
      "y" : 75,
      "pitch_from_down" : 89.57,
      "MAPS_URL" : "https://www.google.com/maps/@38.9323935,-76.9826776,3a,75y,330.92h,89.57t/data=!3m6!1e1!3m4!1sE7v64FCQV13MREj8mEJKEA!2e0!7i13312!8i6656",
      "heading" : 330.92,
      "pano" : "E7v64FCQV13MREj8mEJKEA",
      "Notes" : "",
      "lat" : 38.9323935,
      "lng" : -76.9826776,
      "a" : 3,
      "image_url" : "collection/800/WY 0332.jpg"
   },
   {
      "Notes" : "",
      "lat" : 38.9338902,
      "pano" : "LUewu0emmzs_Kbk2L0O4Iw",
      "a" : 3,
      "lng" : -76.9838542,
      "image_url" : "collection/800/WY 0333.jpg",
      "MAPS_URL" : "https://www.google.com/maps/@38.9338902,-76.9838542,3a,75y,143.53h,83.52t/data=!3m6!1e1!3m4!1sLUewu0emmzs_Kbk2L0O4Iw!2e0!7i13312!8i6656",
      "heading" : 143.53,
      "pitch_from_down" : 83.52,
      "y" : 75,
      "TITLE" : "Houses on Newton Street NE between 15th and 16th Streets.",
      "OBJECTID" : "WY 0333.05"
   },
   {
      "y" : 75,
      "TITLE" : "Houses on Upshur Street NE, east of 18th Street.",
      "OBJECTID" : "WY 0334.05",
      "image_url" : "collection/800/WY 0334.jpg",
      "lng" : -76.9800809,
      "a" : 3,
      "Notes" : "",
      "lat" : 38.9417914,
      "pano" : "FFziMSR5nm5CDf_2Bwnbrg",
      "heading" : 48.23,
      "MAPS_URL" : "https://www.google.com/maps/@38.9417914,-76.9800809,3a,75y,48.23h,77.44t/data=!3m6!1e1!3m4!1sFFziMSR5nm5CDf_2Bwnbrg!2e0!7i13312!8i6656",
      "pitch_from_down" : 77.44
   },
   {
      "y" : 75,
      "TITLE" : "Country Home for Convalescent Children, Bunker Hill Road at 18th Street NE.",
      "OBJECTID" : "WY 0335.05",
      "lng" : -76.9806416,
      "a" : 3,
      "image_url" : "collection/800/WY 0335.jpg",
      "Notes" : "",
      "lat" : 38.9417073,
      "pano" : "242D1iYO3BqTGamdt0xOzw",
      "heading" : 2.55,
      "MAPS_URL" : "https://www.google.com/maps/@38.9417073,-76.9806416,3a,75y,2.55h,78.76t/data=!3m6!1e1!3m4!1s242D1iYO3BqTGamdt0xOzw!2e0!7i13312!8i6656",
      "pitch_from_down" : 78.76
   },
   {
      "OBJECTID" : "WY 0337.05",
      "TITLE" : "Burroughs Elementary School, 18th and Monroe Street NE.",
      "y" : 75,
      "pitch_from_down" : 78.01,
      "heading" : 316.25,
      "MAPS_URL" : "https://www.google.com/maps/@38.9331238,-76.978001,3a,75y,316.25h,78.01t/data=!3m6!1e1!3m4!1sI_Qinol8iLAOW3IFUUTwEg!2e0!7i13312!8i6656",
      "lng" : -76.978001,
      "image_url" : "collection/800/WY 0337.05.jpg",
      "a" : 3,
      "pano" : "I_Qinol8iLAOW3IFUUTwEg",
      "Notes" : "",
      "lat" : 38.9331238
   },
   {
      "OBJECTID" : "WY 0338.05",
      "y" : 75,
      "TITLE" : "Taft Junior High School, 18th and Perry Streets NE.",
      "MAPS_URL" : "https://www.google.com/maps/@38.9350854,-76.9772595,3a,75y,338.57h,79.25t/data=!3m6!1e1!3m4!1szzp1ucNbVQsFpAlP71AQmg!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 338.57,
      "pitch_from_down" : 79.25,
      "lng" : -76.9772595,
      "image_url" : "collection/800/WY 0338.jpg",
      "a" : 3,
      "Notes" : "",
      "lat" : 38.9350854,
      "pano" : "zzp1ucNbVQsFpAlP71AQmg"
   },
   {
      "a" : 3,
      "lng" : -76.9741634,
      "image_url" : "collection/800/WY 0340.jpg",
      "pano" : "2JqGokiDmfzoUTr5mEhuoA",
      "Notes" : "",
      "lat" : 38.9372358,
      "pitch_from_down" : 76,
      "MAPS_URL" : "https://www.google.com/maps/@38.9372358,-76.9741634,3a,75y,93.35h,76t/data=!3m6!1e1!3m4!1s2JqGokiDmfzoUTr5mEhuoA!2e0!7i13312!8i6656!6m1!1e1",
      "heading" : 93.35,
      "TITLE" : "Quincy Street NE between 22nd and 24th Streets NE.",
      "y" : 75,
      "OBJECTID" : "WY 0340.05"
   },
   {
      "OBJECTID" : "WY 0342.05",
      "TITLE" : "Quincy Street NE between 22nd and 24th Streets NE.",
      "y" : 75,
      "pitch_from_down" : 83.88,
      "heading" : 261.06,
      "MAPS_URL" : "https://www.google.com/maps/@38.9372391,-76.9746796,3a,75y,261.06h,83.88t/data=!3m6!1e1!3m4!1s__-OhfFebYRLiJJQUa0rpg!2e0!7i13312!8i6656",
      "pano" : "__-OhfFebYRLiJJQUa0rpg",
      "Notes" : "",
      "lat" : 38.9372391,
      "lng" : -76.9746796,
      "a" : 3,
      "image_url" : "collection/800/WY 0342.jpg"
   },
   {
      "pano" : "qI0JhWsVsNDDD_F-49HEWw",
      "Notes" : "",
      "lat" : 38.9372373,
      "a" : 3,
      "lng" : -76.972168,
      "image_url" : "collection/800/WY 0343.jpg",
      "pitch_from_down" : 79.58,
      "heading" : 272.24,
      "MAPS_URL" : "https://www.google.com/maps/@38.9372373,-76.972168,3a,75y,272.24h,79.58t/data=!3m6!1e1!3m4!1sqI0JhWsVsNDDD_F-49HEWw!2e0!7i13312!8i6656",
      "TITLE" : "Quincy Street NE looking west from 24th Street.",
      "y" : 75,
      "OBJECTID" : "WY 0343.05"
   },
   {
      "OBJECTID" : "WY 0344.05",
      "TITLE" : "24th Street NE north of Quincy Street.",
      "y" : 75,
      "pitch_from_down" : 77.19,
      "heading" : 332.9,
      "MAPS_URL" : "https://www.google.com/maps/@38.9374171,-76.9721685,3a,75y,332.9h,77.19t/data=!3m6!1e1!3m4!1sUMQuPcTlxBNIyzNRd0SBhg!2e0!7i13312!8i6656",
      "lng" : -76.9721685,
      "a" : 3,
      "image_url" : "collection/800/WY 0344.jpg",
      "pano" : "UMQuPcTlxBNIyzNRd0SBhg",
      "Notes" : "",
      "lat" : 38.9374171
   },
   {
      "pano" : "aLVaADpJ-t7lPUFeUQ33EA",
      "Notes" : "",
      "lat" : 38.9377832,
      "lng" : -76.9721678,
      "a" : 3,
      "image_url" : "collection/800/WY 0345.jpg",
      "pitch_from_down" : 76.89,
      "heading" : 164.53,
      "MAPS_URL" : "https://www.google.com/maps/@38.9377832,-76.9721678,3a,75y,164.53h,76.89t/data=!3m6!1e1!3m4!1saLVaADpJ-t7lPUFeUQ33EA!2e0!7i13312!8i6656",
      "TITLE" : "24th Street NE north of Quincy Street.",
      "y" : 75,
      "OBJECTID" : "WY 0345.05"
   }
]
