var gulp = require("gulp");
var concat = require('gulp-concat');
var htmlReplace = require('gulp-html-replace');
var browserify = require('browserify');
var browserifyData = require('browserify-data');
var source = require('vinyl-source-stream');

gulp.task('browserify', function() {
    return browserify()
        .transform(browserifyData)
        .add('./app.js')
        .bundle()
        //Pass desired output filename to vinyl-source-stream
        .pipe(source('index.js'))
        // Start piping stream to tasks!
        .pipe(gulp.dest('dist'));
});

gulp.task('htmlReplace', function(){
    return gulp.src('index.html')
        .pipe(htmlReplace({
            'amdbuild' : 'index.js'
        }))
        .pipe(gulp.dest('dist'));
});


    
gulp.task('default', ['browserify', 'htmlReplace']);
