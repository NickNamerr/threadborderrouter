var babelify = require('babelify');
var browserify = require('browserify');
var gulp = require('gulp');
var less = require('gulp-less');
var lessify = require('node-lessify');
var notify = require('gulp-notify');
var reactify = require('reactify');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var spawn = require('child_process').spawn;
var streamify = require('gulp-streamify');
var uglify = require('gulp-uglify');

var server;

var paths = {
  app_files: ['./app/*.js'],
  client_app: ['./assets/js/app.js'],
  client_files: ['./assets/js/**/*.js'],
  less_files: ['./assets/style/style.less'],
  build: './public/',
  style: './public/style/',
  src_style: './assets/style/',
  scripts: './assets/js/',
  src: './assets/',
  bundle: 'bundle.js'
};

gulp.task('server', function() {
  if (server) server.kill()
    server = spawn('node', ['app'], {stdio: 'inherit'})
    server.on('close', function (code) {
      if (code === 8) {
      gulp.log('Error detected, waiting for changes...');
    }
  });
});

gulp.task('less', function() {
  gulp.src(paths.less_files)
    .pipe(less())
    .pipe(gulp.dest(paths.style));
});

gulp.task('copy', function() {
  gulp.src(paths.src + 'index.html').pipe(gulp.dest(paths.build));
  gulp.src('./assets/**/*').pipe(gulp.dest(paths.build + 'assets/'));
  gulp.src(paths.src_style + 'default-theme/**/*').pipe(gulp.dest(paths.build + 'themes/default/'));
});

gulp.task('js', function() {
  buildJS(paths.client_app[0])
});

gulp.task('watch', function() {
  try {
    gulp.watch(paths.app_files, ['server']);
    gulp.watch(paths.less_files, ['less']);
    gulp.watch(paths.client_files, ['js']);
  } catch(e) {
    console.log(e);
  }
});

gulp.task('default', ['watch', 'js', 'less', 'copy', 'server']);
gulp.task('build', ['js', 'less', 'copy']);

function buildJS(file) {

  var props = {
    entries: [file],
    debug : true,
    transform: [reactify, babelify, lessify]
  };

  var bundler = browserify(props);

  function rebundle() {
    var stream = bundler.bundle();

    return stream
      .on('error', catchErrors)
      .pipe(source(file))
      .pipe(streamify(uglify()))
      .pipe(rename(paths.bundle))
      .pipe(gulp.dest(paths.build));
  }

  return rebundle();
}

function catchErrors() {
  var args = Array.prototype.slice.call(arguments);
  notify.onError({
    title: 'Compile Error',
    message: '<%= error.message %>'
  }).apply(this, args);
  this.emit('end'); // Keep gulp from hanging on this task
}

