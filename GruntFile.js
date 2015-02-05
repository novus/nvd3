
var version = '1.7.1';

module.exports = function(grunt) {

    //Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: '',
                // wrap output in a function block.
                banner: '/* nvd3 version ' + version + '(https://github.com/novus/nvd3) ' +
                    '<%= grunt.template.today("yyyy-mm-dd") %> */\n' + '(function(){\n',
                footer: '\nnv.version = "' + version + '";\n})();'
            },
            dist: {
                src: [
                    'src/core.js',
                    'src/interactiveLayer.js',
                    'src/tooltip.js',
                    'src/utils.js',
                    //Include all files in src/models
                    'src/models/*.js'
                    // example to exclude files: '!src/models/excludeMe*'
                     ],
                dest: 'build/nv.d3.js'
            }
        },
        uglify: {
            options: {
                banner: '/* nvd3 version ' + version + ' (https://github.com/novus/nvd3) ' +
                    '<%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            js: {
                files: {
                    'build/nv.d3.min.js': ['build/nv.d3.js']
                }
            }
        },
        jshint: {
            foo: {
                src: "src/**/*.js"
            },
            options: {
                jshintrc: '.jshintrc'
            }
        },
        watch: {
            js: {
                files: ["src/**/*.js"],
                tasks: ['concat']
            }
        },
        copy: {
          css: {
            files: [
              { src: 'src/nv.d3.css', dest: 'build/nv.d3.css' }
            ]
          }
        },
        cssmin: {
          dist: {
            files: {
                'build/nv.d3.min.css' : ['build/nv.d3.css']
            }
          }
        },
        karma: {
            unit: {
                options: {
                    logLevel: 'ERROR',
                    browsers: ['Chrome'],
                    frameworks: [ 'mocha', 'sinon-chai' ],
                    reporters: [ 'spec', 'junit', 'coverage'],
                    singleRun: true,
                    preprocessors: {
                        'src/*.js': ['coverage'],
                        'src/models/*.js': ['coverage'],
                        'test/mocha/*.coffee': ['coffee']
                    },
                    files: [
                        'bower_components/d3/d3.js',
                        'build/nv.d3.js',
                        'test/mocha/*.coffee'
                    ],
                    exclude: [
                        'src/intro.js',
                        'src/outro.js',
                        //Files we don't want to test.
                        'src/models/lineWith*',
                        'src/models/parallelCoordinates*',
                        'src/models/multiBarTime*',
                        'src/models/indented*',
                        'src/models/linePlus*',
                        'src/models/ohlcBar.js',
                        'src/models/multiChart.js'
                    ]
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-karma');

    grunt.registerTask('default', ['concat', 'karma:unit']);
    grunt.registerTask('production', ['concat', 'uglify', 'copy', 'cssmin']);
    grunt.registerTask('release', ['production']);
    grunt.registerTask('lint', ['jshint']);
};
