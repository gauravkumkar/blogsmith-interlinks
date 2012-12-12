/*global blogsmith:true, BS:true, _blog_name:true, CKEDITOR:true */

/**
 * Send a message to the user above the text entry area.
 * I want to get this incorporated into the SDK.
 * @param {Object} options
 * @config {string} [class] Class to be added to the missive
 * @config {string} [text] The text of the missive
 */
if (typeof blogsmith.missive !== 'function') {
  blogsmith.missive = function (options) {

    var missive, settings, defaults = {
      'class': 'blogsmith-missive',
      text: ''
    };

    settings = $.extend({}, defaults, options);

    $(document).delegate('.blogsmith-missive', 'click', function (event) {
      var target = $(event.target);

      target.hide('fast', function () {
        $(this).remove();
      });

    });

    missive = $('<div />', {
      'class': settings['class'],
      'text': settings['text']
    }).css({
      margin: '5px 0',
      padding: '10px'
    })

      // Use jQuery UI theme classes
      .addClass('ui-state-highlight ui-corner-all');

    missive.hide().insertBefore('#postcontents').fadeIn('fast', function (e) {
      var missives = $('.blogsmith-missive');

      // If there's another missive already there, click it to dismiss it
      if (missives.length > 1) {
        missives.first().trigger('click');
      }
    });
  };
}

/**
 * Add a button to the Blogsmith CMS that allows writers/editors to submit the
 * contents of a post and get recommended links to internal content placed into
 * their text.
 * @see http://wiki.jqueryui.com/w/page/12138135/Widget%20factory
 */
(function ($, blogsmith) {
  $.widget('blogsmith.interlinks', {

    // These options will be used as defaults
    options: {
      getTagsApi: 'http://irshield.app.aol.com/rtnt/getTagsFromText',
      taxonomyApi: 'http://taxonomy-tomcat.ops.aol.com/aoltaxo/nodeinfo/meta',
      threshold: 0.0,
      hitThreshold: false,
      content: [
        {
          name: 'Contents',
          get: function () {
            return blogsmith.getContents.call(blogsmith);
          },
          set: function (html) {
            blogsmith.replaceIntoEditor(html, 1);
          }
        },
        {
          name: 'Continued Contents',
          get: function () {
            return blogsmith.getContinuedContents.call(blogsmith);
          },
          set: function (html) {
            blogsmith.replaceIntoEditor(html, 2);
          }
        }
      ]
    },

    /**
     * This object holds the widget's UI elements
     */
    ui: {

      button: $('<a>', {
        title: 'Generate interlinks for your post\'s content',
        href: '#',
        text: 'Add Interlinks'
      }),

      // An animated .gif (pronounced JIFF)
      loadingImage: $('<img />', {
        src: 'http://o.aolcdn.com/os/blogsmith/plugins/aol-interlinks/images/loading.gif?v4'
      }).css({
        margin: '4px 5px 4px',
        position: 'absolute',
        top: 0
      })

    },

    _create: function () {
      console.log('Interlinks: Create');

      this._addTool();
      this._bindEvents();
      this._addCKStyles();
    },

    _setOption: function (key, value) {
      switch (key) {
      case 'threshold':
        // handle changes to the threshold option
        break;
      case 'foo':
        // bar
        break;
      }

      // In jQuery UI 1.8, you have to manually invoke the _setOption method from the base widget
      $.Widget.prototype._setOption.apply(this, arguments);
    },

    /**
     * Add an "Add Interlinks" button to the tools box in the right rail of the
     * CMS. I'd like to get this added to the SDK, too.
     **/
    _addTool: function () {
      this.element.addClass('add-interlinks');
      this.element.append(this.ui.button);
      this.element.appendTo('#postsave_extended');
    },

    /**
     * Add custom CSS to the CK Editor to visually highlight interlinks.
     * TODO: I would really, really like to do this without an external css
     * file so we don't have to manage another file on the origin server.
     */
    _addCKStyles: function () {

      // Add custom config settings to CK Editor
      BS.editor.userConfig._all = {
        //contentsCss: ['/js/ckeditor_bs/themes/ckPixie/contents.css', 'http://o.aolcdn.com/os/blogsmith/plugins/aol-interlinks/css/style.css']
        contentsCss: ['/js/ckeditor_bs/themes/ckPixie/contents.css', 'http://localhost:8000/src/blogsmith.interlinks.css']
      };
    },

    _bindEvents: function () {
      this.element.bind('click', $.proxy(function (event) {
        event.preventDefault();
        this._getInterlinks($.proxy(this._chooseUrls, this));
      }, this));
    },

    /**
     * Toggle a visual loading state for the tool button.
     * @param {Boolean} state Turn loading off or on
     */
    _loading: function (state) {

      if (state === 'undefined') {
        return this.state || false;
      }

      if (state === true) {

        // Turn on loading state
        this.loadingState = true;

        this.ui.loadingImage
          .insertAfter(this.ui.button)
          .hide()
          .css({
            left: this.ui.button.position().left,
            top: this.ui.button.position().top
          });


        this.ui.button.animate({
          opacity: 0
        }, {
          speed: 'fast',
          complete: $.proxy(function () {
            this.ui.loadingImage.fadeIn('fast');
          }, this)
        });

      } else {

        // Turn off loading state
        this.loadingState = false;

        this.ui.loadingImage.fadeOut('fast', $.proxy(function () {
          this.ui.loadingImage.remove();
          this.ui.button.animate({
            opacity: 1,
            speed: 'fast'
          });
        }, this));
      }
    },

    /**
     * Fetch interlinks from two different API sources. The first provides
     * entity matches from the text, the second provides meta information (with
     * URLs) about entities.
     *
     * This is a textbook use case for defferreds, but we have to support
     * jQuery 1.4.
     */
    _getInterlinks: function (callback) {
      var self, options, i, length, content, outstandingCalls, matches,
        getTagsFromText, receiveTagsData, getMetaForTag, receiveMetaData;

      // Save a reference to this
      self = this;
      options = this.options;

      // Keep track of oustanding AJAX Calls
      // *mumblemumbleDeferredsmumblemumble*
      outstandingCalls = 0;

      // This array will ultimately contain all of our matches and URLs
      matches = [];

      // Content is an array of content items set in the options
      // In this case, it's the contents and continued contents portions of
      // the CK Editor
      content = this.options.content;

      /**
       * Submit contents of post to API
       * @see http://wiki.office.aol.com/wiki/Get_Tags_by_SendText
       * @param {string} content The text to submit to the API
       */
      getTagsFromText = function (text) {
        var content = this;

        blogsmith.ajaxProxy(options.getTagsApi, {
          platform: 'BS',
          app: blogsmith.getDomain(),
          channel: _blog_name,
          tagger: 'T',
          title: blogsmith.getTitle(),
          body: text,
          sMatchTextTags: 1,
          sOffsets: 1
        }, $.proxy(receiveTagsData, content));
      };

      /**
       * Receive contents from getTagsFromText API
       * @see http://wiki.office.aol.com/wiki/Get_Tags_by_SendText
       * @param {Object} data Data from the getTagsFromText API
       */
      receiveTagsData = function (data) {
        var content, i, length, tagsData, tag, tags, callback;

        content = this;
        //console.log('content', content);

        outstandingCalls -= 1;

        // The Blogsmith AJAX Proxy returns a string - convert it to JS
        tagsData = JSON.parse(data);

        tags = tagsData.getTagsFromTextResponse.tags.matchTags.tag;

        callback = function (data) {
          var tag = this;
          receiveMetaData(data, content, tag);
        };

        // Fetch meta data for each tag
        for (i = 0, length = tags.length; i < length; i += 1) {
          tag = tags[i];
          if (tag.name === 'MATCHTEXT') {
            if (tag.score > options.threshold) {
              outstandingCalls += 1;
              getMetaForTag(tag.taxoId, $.proxy(callback, tag));
            }
          }
        }
      };

      /**
       * Submit a tag id to the taxonomy API to get meta information about it.
       * For us, the important meta information is URLs.
       * @param {Number} tag A tag id
       * @param {function} callback A callback function
       */
      getMetaForTag = function (tag, callback) {

        blogsmith.ajaxProxy(options.taxonomyApi, {
          qTxt: tag,
          f: 'json',
          authKey: 'ao1pcpvLTH7QU4gw',
          client: 'BS'
        }, $.proxy(callback, this));

      };

      /**
       * Receive data from the meta data API for entities
       * @param {Object} data
       * @param {Object} content
       * @param {Object} tag
       */
      receiveMetaData = function (data, content, tag) {
        var i, length, match, meta;
        //console.log('tag', tag);

        data = JSON.parse(data);

        meta = data.getNodeResponse.node.meta;

        match = {
          text: tag.value,
          offset: tag.instances.instance[0].offset,
          // TODO: Is this ever not just the length of the text string?
          length: tag.instances.instance[0].length,
          urls: []
        };

        for (i = 0, length = meta.length; i < length; i += 1) {
          if (meta[i].metaType.displayName.indexOf('URL') > -1) {
            match.urls.push(meta[i].metaValue);
          }
        }

        if (match.urls.length) {
          content.matches.push(match);
        }

        outstandingCalls -= 1;

        // If there are no more outstanding calls...
        if (outstandingCalls < 1) {

          // Fire the callback
          callback(self.options.content);

          // And turn off the visual loading state
          self._loading(false);
        }

      };

      // Turn on visual loading state of button
      this._loading(true);

      for (i = 0, length = content.length; i < length; i += 1) {
        outstandingCalls += 1;
        content[i].matches = [];
        getTagsFromText.call(content[i], content[i].get());
      }
    },

    _chooseUrls: function () {
      this._addLinks();
    },

    _addLinks: function () {
      var i, length, content;

      content = this.options.content;

      $.each(content, function (i, contentItem) {
        var contentArray, newContent;

        // Turn the content string into an array split on each character
        contentArray = contentItem.get().split('');

        $.each(contentItem.matches, function (i, match) {
          //console.log('match', match);

          // Use the offset to find the right position in the array to add new
          // html content
          contentArray[match.offset] = [
            '<a class="interlink" href="',
            match.urls[0],
            '">',
            contentArray[match.offset]
          ].join('');

          // Find the end of the match and add new html
          contentArray[match.offset + match.length - 1] = [
            contentArray[match.offset + match.length - 1],
            '</a>'
          ].join('');

          newContent = contentArray.join('');
          contentItem.set(newContent);
        });

      });
    },

    destroy: function () {
      // In jQuery UI 1.8, you must invoke the destroy method from the base widget
      $.Widget.prototype.destroy.call(this);
    }
  });
})(jQuery, blogsmith);

// On DOM Ready...
$(document).ready(function () {

  // Initialize the interlinks widget on an empty span
  $('<span>').interlinks();
});
