///////////////////////////////////////
// 静的サイト要 Gulpfile
///////////////////////////////////////

const { src, dest, watch, lastRun, series, parallel } = require("gulp");

// キャッシュ
const cache = require("gulp-cached");
const progeny = require("gulp-progeny");

// 書き出し先
const distDir = "./dist";

// html
const htmlMin = require("gulp-htmlmin");
const rename = require("gulp-rename");

// HTML出力拡張子
const distExtname = ".html";

// Template Engine
const htmlEngine = "pug";
const pug = require("gulp-pug");
const ejs = require("gulp-ejs");

// Sass
const sass = require("gulp-dart-sass");
const notify = require("gulp-notify");
const plumber = require("gulp-plumber");
const postCss = require("gulp-postcss"); //for autoprefixer
const autoprefixer = require("autoprefixer");
const gcmq = require("gulp-group-css-media-queries");

// JavaScript
const babel = require("gulp-babel");
const uglify = require("gulp-uglify");
const terser = require("gulp-terser") //ES6の圧縮用に追加
const babelify = require("babelify");
const browserify = require("browserify");
const through2 = require("through2");

// 画像圧縮
const imagemin = require("gulp-imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminPngquant = require("imagemin-pngquant");
const imageminGifsicle = require("imagemin-gifsicle");
const imageminSvgo = require("imagemin-svgo");

// ブラウザ同期
const browserSync = require("browser-sync").create();

//パス設定
const paths = {
  html: {
    src: "./src/html/**/*.html",
    dist: distDir
  },
  ejs: {
    src: "./src/ejs/**/!(_)*.ejs",
    dist: distDir
  },
  pug: {
    src: "./src/pug/**/!(_)*.pug",
    dist: distDir
  },
  styles: {
    src: "./src/sass/page/!(_)*.sass",
    dist: distDir + "/css/",
    map: "./map"
  },
  scripts: {
    src: "./src/js/**/!(_)*.js",
    dist: distDir + "/js/"
  },
  images: {
    src: "./src/img/**/*.{jpg,jpeg,png,gif,svg}",
    dist: distDir + "/img/"
  },
  php: {
    src: "./src/php/**/*.php",
    dist: distDir
  },
  other: {
    src: ["./src/**/*", "!./src/{pug,sass,js,img,ts,php}/*"],
    dist: distDir
  }
};

// htmlフォーマット
const htmlFormat = (done) => {
  src(paths.html.src)
    .pipe(
      plumber({
        //エラーがあっても処理を止めない
        errorHandler: notify.onError("Error: <%= error.message %>")
      })
    )
    .pipe(cache("html"))
    .pipe(progeny())
    .pipe(
      htmlMin({
        //HTMLの圧縮
        removeComments: true, //コメントを削除
        collapseWhitespace: true, //余白を詰める
        preserveLineBreaks: true, //タグ間の改行を詰める
        removeEmptyAttributes: false //空属性を削除しない
      })
    )
    .pipe(dest(paths.html.dist));
  done();
};

// ejsフォーマット
const ejsFormat = (done) => {
  src(paths.ejs.src)
    .pipe(
      plumber({
        //エラーがあっても処理を止めない
        errorHandler: notify.onError("Error: <%= error.message %>")
      })
    )
    .pipe(cache("ejs"))
    .pipe(progeny())
    .pipe(ejs())
    .pipe(
      htmlMin({
        //HTMLの圧縮
        removeComments: true, //コメントを削除
        collapseWhitespace: true, //余白を詰める
        preserveLineBreaks: true, //タグ間の改行を詰める
        removeEmptyAttributes: false //空属性を削除しない
      })
    )
    .pipe(rename({ extname: distExtname }))
    .pipe(dest(paths.ejs.dist));
  done();
};

// pugフォーマット
const pugFormat = (done) => {
  src(paths.pug.src)
    .pipe(
      plumber({
        //エラーがあっても処理を止めない
        errorHandler: notify.onError("Error: <%= error.message %>")
      })
    )
    .pipe(cache("pug"))
    .pipe(progeny())
    .pipe(pug())
    .pipe(
      htmlMin({
        //HTMLの圧縮
        removeComments: true, //コメントを削除
        collapseWhitespace: true, //余白を詰める
        preserveLineBreaks: true, //タグ間の改行を詰める
        removeEmptyAttributes: false //空属性を削除しない
      })
    )
    .pipe(rename({ extname: distExtname }))
    .pipe(dest(paths.pug.dist));
  done();
};

// Sassコンパイル
const sassCompile = (done) => {
  src(paths.styles.src, {
    sourcemaps: true
  })
    .pipe(
      plumber({
        errorHandler: notify.onError("Error: <%= error.message %>")
      })
    )
    .pipe(cache("sass"))
    .pipe(progeny())
    .pipe(
      sass({
        includePaths: ["node_modules"],
        outputStyle: "expanded"
      }).on("error", sass.logError)
    )
    .pipe(
      postCss([
        autoprefixer({
          // プロパティのインデントを整形しない
          cascade: false,
          // IE11のgrid対応
          grid: "autoplace"
        })
      ])
    )
    //メディアクエリをまとめる
    // .pipe(gcmq())
    .pipe(
      dest(paths.styles.dist, {
        sourcemaps: "./map"
      })
    )
    // 変更があったらリロードせずにCSSのみ更新
    .pipe(browserSync.stream());
  done();
};

// JavaScriptコンパイル
const jsBabel = (done) => {
  src(paths.scripts.src)
    .pipe(
      plumber({
        errorHandler: notify.onError("Error: <%= error.message %>")
      })
    )
    .pipe(cache("js"))
    .pipe(
      through2.obj((file, enc, callback) => {
        browserify(file.path).transform(babelify).bundle((err, buf) => { 
          file.contents = buf
          callback(err,file)
        });
      })
    )
    // .pipe(babel())
    // JS圧縮
    .pipe(uglify())
    .pipe(terser())
    .pipe(dest(paths.scripts.dist));
  done();
};

// 画像圧縮
const imagesCompress = (done) => {
  src(paths.images.src, {
    // 更新があった場合に処理
    since: lastRun(imagesCompress)
  })
    .pipe(
      plumber({
        errorHandler: notify.onError("Error: <%= error.message %>")
      })
    )
    .pipe(cache("image"))
    .pipe(
      imagemin(
        [
          // JPG
          imageminMozjpeg({
            quality: 80
          }),
          // PNG
          imageminPngquant(
            [0.7, 0.8] //画質の最小,最大
          ),
          // GIF
          imageminGifsicle(),
          // SVG
          imageminSvgo({
            plugins: [
              {
                //フォトショやイラレで書きだされるviewboxを消さない
                name: "removeViewBox",
                active: false
              },
              {
                // メタデータを削除しない
                name: "removeMetadata",
                active: false
              },
              {
                // 不明な要素や属性を削除しない
                name: "removeUnknownsAndDefaults",
                active: false
              },
              {
                // <path>に変換しない
                name: "convertShapeToPath",
                active: false
              },
            ]
          })
        ],
        {
          //ターミナルへの情報出力非表示
          verbose: true
        }
      )
    )
    .pipe(dest(paths.images.dist));
  done();
};

const copyOtherFile = (done) => {
  src(paths.other.src)
    .pipe(plumber({ errorHandler: notify.onError("Error: <%= error.message %>") }))
    .pipe(dest(paths.other.dist));
  done();
};

// ローカルサーバー起動

// 静的サイト用
const browserSyncFunc = (done) => {
  browserSync.init({
    //デフォルトのconnectedのメッセージ非表示
    notify: false,
    server: {
      baseDir: "./dist"
    },
    // startPath: "./index.html",
    reloadOnRestart: true
  });
  done();
};

// ブラウザ自動リロード
const browserReloadFunc = (done) => {
  browserSync.reload();
  done();
};

// ファイル監視
const watchFiles = () => {
  if (htmlEngine === "pug") {
    watch(paths.pug.src, series(pugFormat, browserReloadFunc));
  } else if (htmlEngine === "ejs") {
    watch(paths.ejs.src, series(ejsFormat, browserReloadFunc));
  } else {
    watch(paths.html.src, series(htmlFormat, browserReloadFunc));
  }
  watch(paths.styles.src, series(sassCompile));
  watch(paths.scripts.src, series(jsBabel, browserReloadFunc));
  watch(paths.images.src, series(imagesCompress, browserReloadFunc));
  watch(paths.other.src, series(copyOtherFile, browserReloadFunc));
};

// npx gulp実行処理
exports.default = series(
  // parallel(htmlFormat, ejsFormat, pugFormat, sassCompile, jsBabel, imagesCompress, copyOtherFile),
  parallel(jsBabel),
  parallel(watchFiles, browserSyncFunc)
);

// sassコンパイルだけやりたい
exports.sass = sassCompile;
exports.pug = pugFormat;
exports.image = imagesCompress;
exports.js = jsBabel;
exports.other = copyOtherFile;
