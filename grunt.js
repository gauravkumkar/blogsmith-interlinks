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
      tasks: 'default'
    },
    concat: {
      dist: {
        src: [
          '<banner:meta.banner>',
          'templates/plugin.html'
        ],
        dest: 'dist/blogsmith.interlinks.html'
      }
    },
    replace: {
      dist: {
        options: {
          variables: {
            //'css': '<%= grunt.file.read("src/blogsmith.interlinks.css") %>',
            'js': '<%= grunt.file.read("src/blogsmith.interlinks.js") %>'
          },
          prefix: '@@'
        },
        files: {
          'dist/': 'dist/blogsmith.interlinks.html'
        }
      }
    },
    exec: {
      // Copy the contents of the combined dist file to the clipboard
      copy_dist: {
        command: 'pbcopy < dist/blogsmith.interlinks.html'
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

  grunt.loadNpmTasks('grunt-replace');
  grunt.loadNpmTasks('grunt-exec');

  // Default task.
  grunt.registerTask('default', 'lint concat replace');

  grunt.registerTask('watch-serve', 'server watch');
  grunt.registerTask('copy', 'exec:copy_dist');

};
