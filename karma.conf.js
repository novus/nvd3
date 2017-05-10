module.exports = function(config) {
  config.set({
    logLevel: "ERROR",
    browsers: ["Firefox"],
    frameworks: ["mocha", "sinon-chai"],
    reporters: ["spec", "junit", "coverage"],
    singleRun: false,
    browserNoActivityTimeout: 60000,
    browserify: {
      debug: true
    },
    preprocessors: {
      "src/*.js": ["coverage"],
      "src/models/*.js": ["coverage"],
      "test/mocha/*.coffee": ["coffee"],
    },
    files: [
      "bower_components/d3/d3.js",
      "src/*.js",
      "src/models/*.js",
      "test/mocha/*.coffee",
      "test/mocha/*.js"
    ],
    exclude: [
      "src/intro.js",
      "src/outro.js",
      //Files we don't want to test.
      "src/models/parallelCoordinates*",
      "src/models/multiBarTime*",
      "src/models/indented*",
      "src/models/linePlus*",
      "src/models/ohlcBar.js",
      "src/models/candlestickBar.js"
    ]
  });
};
