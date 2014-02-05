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
                     'src/models/axis.js',
                     'src/models/historicalBar.js',
                     'src/models/bullet.js',
                     'src/models/bulletChart.js',
                     'src/models/cumulativeLineChart.js',
                     'src/models/discreteBar.js',
                     'src/models/discreteBarChart.js',
                     'src/models/distribution.js',
                     'src/models/historicalBar.js',
                     'src/models/historicalBarChart.js',
                     'src/models/indentedTree.js',
                     'src/models/legend.js',
                     'src/models/line.js',
                     'src/models/lineChart.js',
                     'src/models/linePlusBarChart.js',
                     'src/models/lineWithFocusChart.js',
                     'src/models/linePlusBarWithFocusChart.js',
                     'src/models/multiBar.js',
                     'src/models/multiBarChart.js',
                     'src/models/multiBarHorizontal.js',
                     'src/models/multiBarHorizontalChart.js',
                     'src/models/multiChart.js',
                     'src/models/ohlcBar.js',
                     'src/models/pie.js',
                     'src/models/pieChart.js',
                     'src/models/scatter.js',
                     'src/models/scatterChart.js',
                     'src/models/scatterPlusLineChart.js',
                     'src/models/sparkline.js',
                     'src/models/sparklinePlus.js',
                     'src/models/stackedArea.js',
                     'src/models/stackedAreaChart.js',
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
            },
            less: {
                files: ["src/**/*.less"],
                tasks: ['less']
            }
        },
        less: {
            dev: {
                src:  './src/nv.d3.less',
                dest: './src/nv.d3.css'
            },
            production: {
                options: {
                    cleancss: true,
                    compress: true,
                    yuicompress: true,
                    report: 'min'
                },
                src:  './src/nv.d3.less',
                dest: './nv.d3.min.css'
            }
        },
        copy: {
          css: {
            files: [
              { src: 'src/nv.d3.css', dest: 'nv.d3.css' }
            ]
          }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');

    grunt.registerTask('default', ['concat', 'less', 'copy']);
    grunt.registerTask('production', ['concat', 'uglify', 'less', 'copy']);
    grunt.registerTask('release', ['production']);
    grunt.registerTask('lint', ['jshint']);
};
