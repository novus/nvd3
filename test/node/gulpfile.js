var gulp = require('gulp');
var browserify = require('browserify');
var transform = require('vinyl-transform');

gulp.task('browserify', function () {
  var browserified = transform(function(filename) {
    var b = browserify(filename);
    return b.bundle();
  });
  return gulp.src('./nodeTest.js')
    .pipe(browserified)
    .pipe(gulp.dest('./build'));
});

gulp.task('css', function () {
  return gulp.src('../../build/nv.d3.css')
    .pipe(gulp.dest('./build'));
});

gulp.task('default', ['browserify', 'css']);
