/*global module:false*/
module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    lint: {
      files: ['grunt.js', 'src/**/*.js']
    },
    watch: {
      files: [
        '<config:lint.files>',
        'templates/**/*.html'
      ],
      tasks: 'lint concat'
    },
    concat: {
      dist: {
        src: [
          'templates/head.html',
          'src/blogsmith.interlinks.js',
          'templates/foot.html'
        ],
        dest: 'dist/blogsmith.interlinks.html'
      }
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true,
        indent: 2,
        jquery: true,
        white: true
      },
      globals: {}
    }
  });

  grunt.loadNpmTasks('grunt-templater');

  // Default task.
  grunt.registerTask('default', 'lint concat');

};
