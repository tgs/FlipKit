casper.test.begin('Wymer\'s DC', function suite(test) {
    casper.start("http://localhost:8080/", function() {
        test.begin("WDC search + filter", function(test) {
            test.assertTitle("Map - Wymer's DC");
            test.assertElementCount('div#filtertags p', 10);
            test.assertSelectorHasText('div#filtertags', 'Search Descriptions');
            test.done();
        });
    });

    /*casper.then(function() {
        test.assertTitle("casperjs - Recherche Google", "google title is ok");
        test.assertUrlMatch(/q=casperjs/, "search term has been submitted");
        test.assertEval(function() {
            return __utils__.findAll("h3.r").length >= 10;
        }, "google search for \"casperjs\" retrieves 10 or more results");
    });*/

    casper.run(function() {
        test.done();
    });
});
