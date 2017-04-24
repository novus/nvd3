module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        shell: {
            jekyllServe: {
                dest: '_dest',
                server : true,
                server_port : 8000,
                auto : true
            },
            jekyllBuild: {
                command: "node ./node_modules/grunt-jekyll/bin/grunt-jekyll build --config _config-dev.yml"
            }
        }
    });

    grunt.loadNpmTasks('grunt-jekyll');
    grunt.loadNpmTasks('grunt-shell');

    // jekyll
    grunt.registerTask('serve',
        [ 'shell:jekyllServe' ]
    );

    // Default task(s).
    grunt.registerTask('default', []);

};