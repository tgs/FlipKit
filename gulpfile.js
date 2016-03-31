var gulp = require("gulp");
var concat = require('gulp-concat');
var rjs = require('requirejs');
var htmlReplace = require('gulp-html-replace');

rjs_config = {
    baseUrl: 'js',
    paths: {
        jquery: 'jquery-1.12.0.min',
        mousetrap: 'mousetrap.min',
        "ua-parser-js": "ua-parser.min",
        imageList: 'imageList',
        requireLib: 'require'
    },
    include: ['requireLib'],
    name: 'fancy',
    out: 'dist/index.js'
};

gulp.task('scripts', function(cb){
    rjs.optimize(rjs_config, function(buildResponse){
        console.log('build response', buildResponse);
        cb();
    }, cb);
});

gulp.task('htmlReplace', function(){
    return gulp.src('index.html')
        .pipe(htmlReplace({
            'amdbuild' : 'index.js'
        }))
        .pipe(gulp.dest('dist'));
});


    
gulp.task('default', ['scripts', 'htmlReplace']);
