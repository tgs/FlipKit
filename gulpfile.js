var gulp = require("gulp");
var concat = require('gulp-concat');
//var htmlReplace = require('gulp-html-replace');
var browserify = require('browserify');
var browserifyData = require('browserify-data');
var source = require('vinyl-source-stream');
var uglify = require('gulp-uglify');
var buffer = require('vinyl-buffer');
var spawn = require('child_process').spawn,
    gutil = require('gulp-util');
var mocha = require('gulp-mocha');

gulp.task('mocha', function() {
    return gulp.src('test/search.js', {read: false})
    // gulp-mocha needs filepaths so you can't have any plugins before it
        .pipe(mocha({reporter: 'nyan'}));
});

gulp.task('casper', function () {
    var tests = ['test/test_it_loads.js'];

    var casperChild = spawn('node_modules/.bin/casperjs', ['test'].concat(tests), {'stdio': 'inherit'});

    casperChild.on('close', function (code) {
        var success = code === 0; // Will be 1 in the event of failure

        // Do something with success here
    });
});

gulp.task('browserify', function() {
    return browserify()
        .transform(browserifyData)
        .add('./app/index.js')
        .bundle()
        //Pass desired output filename to vinyl-source-stream
        .pipe(source('index.js'))
        .pipe(buffer())
        // Start piping stream to tasks!
        .pipe(gulp.dest('build'));
});

gulp.task('browserifyFixPos', function() {
    return browserify()
        .transform(browserifyData)
        .add('./app/fixPos.js')
        .bundle()
        //Pass desired output filename to vinyl-source-stream
        .pipe(source('fixPos.js'))
        .pipe(buffer())
        // Start piping stream to tasks!
        .pipe(gulp.dest('build'));
});

gulp.task('copyHtml', function(){
    return gulp.src('app/*.html')
        .pipe(gulp.dest('build'));
});

gulp.task('watch', function(){
    gulp.watch(['app/index.js', 'app/js/*'], ['browserify']);
    gulp.watch(['app/fixPos.js', 'app/js/*'], ['browserifyFixPos']);
    gulp.watch(['app/*.html'], ['copyHtml']);
});

gulp.task('distJs', ['browserify'], function(){
    return gulp.src('dist/index.js')
        .pipe(uglify())
        .pipe(gulp.dest('dist'));
});

gulp.task('distHtml', ['copyHtml'], function() {
    return gulp.src('dist/index.html')
        .pipe(gulp.dest('dist'));
});

gulp.task('dist', ['distJs', 'distHtml']);

    
gulp.task('default', ['browserify', 'copyHtml', 'browserifyFixPos']);
gulp.task('test', ['casper', 'mocha']);
