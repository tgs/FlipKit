requirejs.config({
    baseUrl: 'js',
    paths: {
        jquery: 'jquery-1.12.0.min',
        mousetrap: 'mousetrap.min',
        "ua-parser-js": "ua-parser.min",
        imageList: 'imageList'
    }
});

requirejs(['fancy']);
