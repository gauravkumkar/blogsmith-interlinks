/*global module:false*/
module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    server: {
      port: 8000,
      base: '.'
    },
    pkg: '<json:blogsmith.interlinks.json>',
    meta: {
      banner: '<!--\n* <%= pkg.title || pkg.name %> - v<%= pkg.version %>' +
        ' - <%= grunt.template.today("yyyy-mm-dd, h:MMTT Z") %>\n' +
        '* <%= pkg.description %>\n' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>\n--> '
    },
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
          '<banner:meta.banner>',
          'templates/head.html',
          'src/blogsmith.interlinks.js',
          'templates/foot.html'
        ],
        dest: 'dist/blogsmith.interlinks.html'
      }
    },
    jshint: {
      options: {
        boss: true,
        browser: true,
        curly: true,
        devel: true,
        eqeqeq: true,
        eqnull: true,
        immed: true,
        indent: 2,
        jquery: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        white: true
      },
      globals: {}
    }
  });

  grunt.loadNpmTasks('grunt-templater');

  // Default task.
  grunt.registerTask('default', 'lint concat');

  grunt.registerTask('watch-serve', 'server watch');

};
