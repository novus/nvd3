// stryker.conf.js
module.exports = function(config) {
  config.set({
    // logLevel: "trace",
    testRunner: 'mocha',
    testFramework: 'mocha',
    coverageAnalysis: 'perTest',
    reporter: ['html', 'clear-text', 'progress'],
    files: [
      { pattern: 'src/**/*.js', mutated: false, included: false },
      { pattern: 'test/**/*.coffee', mutated: false, included: false },
      'test/mocha/lineWithFocusPlusSecondaryChart.js'
    ],
    timeoutMs: 120000,
    maxConcurrentTestRunners: 4,
    mutate: ['src/models/lineWithFocusPlusSecondaryChart.js']
  });
};
