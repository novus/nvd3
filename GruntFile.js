module.exports = function(grunt) {

    //Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: ''
            },
            dist: {
                src: [
                    'src/intro.js',
                    'src/core.js',
                    'src/interactiveLayer.js',
                    'src/tooltip.js',
                    'src/utils.js',
                    //Include all files in src/models, excluding some charts
                    //that are no longer supported.
                    'src/models/*.js',
                    '!src/models/lineWithFisheye*',
                    '!src/models/parallelCoordinates*',
                    '!src/models/multiBarTime*',
                    'src/outro.js'
                ],
                dest: 'nv.d3.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                    '<%= grunt.template.today("yyyy-mm-dd") %> */'
            },
            js: {
                files: {
                    'nv.d3.min.js': ['nv.d3.js']
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
              { src: 'src/nv.d3.css', dest: 'nv.d3.css' }
            ]
          }
        },
        cssmin: {
          dist: {
            files: {
              'nv.d3.min.css' : ['nv.d3.css']
            }
          }
        },
        karma: {
            unit: {
                options: {
                    logLevel: 'ERROR',
                    browsers: ['Chrome'],
                    frameworks: [ 'mocha', 'sinon-chai' ],
                    reporters: [ 'spec', 'junit'],
                    singleRun: true,
                    preprocessors: {
                        'test/mocha/*.coffee': ['coffee']
                    },
                    files: [
                        'test/mocha/*.coffee'
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

    grunt.registerTask('default', ['concat', 'copy', 'karma:unit']);
    grunt.registerTask('production', ['concat', 'uglify', 'copy', 'cssmin']);
    grunt.registerTask('release', ['production']);
    grunt.registerTask('lint', ['jshint']);
};
