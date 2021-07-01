let preprocessor = "scss"; // Preprocessor (sass, scss)
let fileswatch = "html,htm,txt,json,md"; // List of files extensions for watching & hard reload (comma separated)
let imageswatch = "jpg,jpeg,png,webp,svg,woff2"; // List of files extensions for watching & hard reload (comma separated)

const { src, dest, parallel, series, watch } = require("gulp");
const sass = require("gulp-sass");
const cleancss = require("gulp-clean-css");
const concat = require("gulp-concat");
const browserSync = require("browser-sync").create();
const uglify = require("gulp-uglify-es").default;
const autoprefixer = require("gulp-autoprefixer");
const imagemin = require("gulp-imagemin");
const newer = require("gulp-newer");
const rsync = require("gulp-rsync");
const del = require("del");
const svgSprite = require("gulp-svg-sprite");
const gulp = require("gulp");
const njkRender = require("gulp-nunjucks-render");
const prettify = require("gulp-html-prettify");

// Local Server

function browsersync() {
  browserSync.init({
    server: { baseDir: "app" },
    notify: false,
    // online: false, // Work offline without internet connection
  });
}

// HTML
function nunjucks() {
  return gulp
    .src("app/njk/pages/*.njk")
    .pipe(njkRender())
    .pipe(
      prettify({
        indent_size: 4, // размер отступа - 4 пробела
      })
    )
    .pipe(gulp.dest("app/html/pages"));
}

// Custom Styles

function styles() {
  return src("app/sass/main." + preprocessor + "")
    .pipe(sass())
    .pipe(concat("app.min.css"))
    .pipe(
      autoprefixer({ overrideBrowserslist: ["last 10 versions"], grid: true })
    )
    .pipe(cleancss({ level: { 1: { specialComments: 0 } } }))
    .pipe(dest("app/css"))
    .pipe(browserSync.stream());
}

// Scripts & JS Libraries

function scripts() {
  return src([
    "node_modules/jquery/dist/jquery.min.js",
    "app/js/app.js", // app.js. Always at the end
  ])
    .pipe(concat("app.min.js"))
    .pipe(uglify()) // Minify JS (opt.)
    .pipe(dest("app/js"))
    .pipe(browserSync.stream());
}

// Images

function images() {
  return src("app/images/src/**/*")
    .pipe(newer("app/images/dest"))
    .pipe(imagemin())
    .pipe(dest("app/images/dest"));
}

function cleanimg() {
  return del("app/images/dest/**/*", { force: true });
}

// SVG Sprite
const configSprite = {
  shape: {
    dimension: {
      // Set maximum dimensions
      maxWidth: 100,
      maxHeight: 100,
    },
    spacing: {
      // Add padding
      padding: 0,
    },
  },
  mode: {
    symbol: {
      dest: ".",
    },
  },
};

function svgSpriteStart() {
  return src("app/images/svg-icon/*.svg")
    .pipe(svgSprite(configSprite))
    .pipe(dest("app/images/sprites"));
}

// Deploy

function deploy() {
  return src("app/").pipe(
    rsync({
      root: "app/",
      hostname: "username@yousite.com",
      destination: "yousite/public_html/",
      // include: ['*.htaccess'], // Included files
      exclude: ["**/Thumbs.db", "**/*.DS_Store"], // Excluded files
      recursive: true,
      archive: true,
      silent: false,
      compress: true,
    })
  );
}

// Watching

function startwatch() {
  watch("./**/*.njk", parallel("nunjucks"));
  watch("app/sass/**/*." + preprocessor + "", parallel("styles"));
  watch(["app/**/*.js", "!app/js/*.min.js"], parallel("scripts"));
  watch(["app/**/*.{" + imageswatch + "}"], parallel("images"));
  watch(["app/**/*.{" + fileswatch + "}"]).on("change", browserSync.reload);
}

exports.browsersync = browsersync;
exports.assets = series(cleanimg, styles, scripts, images);
exports.styles = styles;
exports.scripts = scripts;
exports.images = images;
exports.cleanimg = cleanimg;
exports.deploy = deploy;
exports.svgSpriteStart = svgSpriteStart;
exports.nunjucks = nunjucks;
exports.default = parallel(images, styles, scripts, browsersync, startwatch);
