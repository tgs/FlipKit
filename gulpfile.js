var gulp = require("gulp");
var concat = require('gulp-concat');
var htmlReplace = require('gulp-html-replace');
var browserify = require('browserify');
var browserifyData = require('browserify-data');
var source = require('vinyl-source-stream');
var uglify = require('gulp-uglify');
var buffer = require('vinyl-buffer');

gulp.task('browserify', function() {
    return browserify()
        .transform(browserifyData)
        .add('./app.js')
        .bundle()
        //Pass desired output filename to vinyl-source-stream
        .pipe(source('index.js'))
        .pipe(buffer())
        .pipe(uglify())
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

gulp.task('watch', function(){
    gulp.watch(['app.js', 'js/*'], ['browserify']);
    gulp.watch(['index.html'], ['htmlReplace']);
});
    
gulp.task('default', ['browserify', 'htmlReplace']);
