define(['mousetrap', 'jquery'], function(mousetrap, $) {
    // also depends on google maps, but only once the inner func gets called,
    // and I don't want to give the async callback twice
    function addKeybindings(svo) {
        svo.map.setOptions({keyboardShortcuts: false});
        function up() {
            svo.m_calcImagePoint(); svo.m_updateMarker();
            $('#adjust-out').text(
                JSON.stringify({
                fixedHeading:  svo.sheading,
                fixedPitch:    svo.spitch,
                fixedDistance: svo.imageDistance,
                imageID:       svo.imageID
            },
            function(key, val) {
                return val.toFixed ? Number(val.toFixed(3)) : val;
            },
            2)).blur();
        }
        Mousetrap.bind('a', function() { svo.imageDistance += 2; up(); });
        Mousetrap.bind('s', function() { svo.imageDistance -= 2; up(); });

        Mousetrap.bind('up',   function() { svo.spitch += 1; up(); });
        Mousetrap.bind('down', function() { svo.spitch -= 1; up(); });

        Mousetrap.bind('right', function() { svo.sheading += 1; up(); });
        Mousetrap.bind('left',  function() { svo.sheading -= 1; up(); });

        Mousetrap.bind('space', function() { svo.m_toggleVisible(); });

        function padToFour(number) {
            if (number<=9999) { number = ("000"+number).slice(-4); }
            return number;
        }

        function wynum(s) { return +(s.slice(2)) }
        function nextImage(direction) {
            var num = wynum(svo.imageID);
            var id = svo.imageID;
            do {
                num += direction;
                id = 'WY' + padToFour(num);
                console.log(id);
                if ((num < 0) || (num > 3000)) {  // id number limits
                    return svo.imageID;
                }
            } while (! (id in markerIndex));
            return id;
        }
        Mousetrap.bind('n', function() {
            google.maps.event.trigger(markerIndex[nextImage(1)], "click");
            $("#adjust-out").text("");
        });
        Mousetrap.bind('p', function() {
            google.maps.event.trigger(markerIndex[nextImage(-1)], "click");
            $("#adjust-out").text("");
        });
    }

    return { 'addKeybindings': addKeybindings };
});
