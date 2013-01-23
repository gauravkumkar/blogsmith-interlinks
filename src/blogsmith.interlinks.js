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
      // getTagsApi: 'http://irshield.app.aol.com/rtnt/getTagsFromText',
      getTagsApi: 'http://chanel-qa-d0001.cluster.aol.com:8010/rtnt/getTagsFromText',
      taxonomyApi: 'http://taxonomy-tomcat.ops.aol.com/aoltaxo/nodeinfo/meta',
      threshold: 0.0,
      matchAllEntities: true,
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
        contentsCss: ['/js/ckeditor_bs/themes/ckPixie/contents.css', 'http://localhost:8000/src/blogsmith.devinterlinks.css']
      };
    },

    _bindEvents: function () {
      this.element.bind('click', $.proxy(function (event) {
        event.preventDefault();

        // Allow devs to turn on debugging from the console
        if (window.DEBUG_INTERLINKS) {
          this.debug = true;
        } else {
          this.debug = false;
        }

        this._getInterlinks($.proxy(this._chooseUrls, this));
      }, this));
    },

    /**
     * Numbers less than 10 should be written out.
     * @param {Number} int
     */
    _numberize: function (int) {
      var numbers;

      numbers = [
        'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'
      ];

      if (int > 0 && int < 10 && typeof numbers[int - 1] !== 'undefined') {
        return numbers[int - 1];
      } else {
        return int;
      }
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
      var self, options, i, length, content, text, outstandingCalls, matches,
        expectedContent, entities, getTagsFromText, receiveTagsData,
        getMetaForTag, receiveMetaData, urlFilter, contentCallbackQueue;

      // Turn on visual loading state of button
      this._loading(true);

      // Save a reference to this
      self = this;
      options = this.options;

      // Keep track of oustanding AJAX Calls
      // *mumblemumbleDeferredsmumblemumble*
      outstandingCalls = 0;

      // This array will ultimately contain all of our matches and URLs
      matches = [];

      // We'll keep track of what entities have been returned so that we don't
      // link to them more than once
      entities = [];

      // Content is an array of content items set in the options
      // In this case, it's the contents and continued contents portions of
      // the CK Editor
      content = this.options.content;
      expectedContent = content.length;

      // jQuery on an empty object - a perfect queue holder
      contentCallbackQueue = $({});

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
        }, function (data) {
          var queueLength;

          //self._debug('tag data', data);

          contentCallbackQueue.queue('contentCallbacks', function (next) {
            receiveTagsData.call(content, data);
            next();
          });

          queueLength = contentCallbackQueue.queue('contentCallbacks').length;

          //console.log('queueLength', queueLength);

          if (queueLength >= expectedContent) {
            contentCallbackQueue.dequeue('contentCallbacks');
          }
          //contentCallbackQueue.dequeue('contentCallbacks');
        });
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
        //console.log('data', data);

        outstandingCalls -= 1;

        // The Blogsmith AJAX Proxy returns a string - convert it to JS
        tagsData = JSON.parse(data);

        if (tagsData.statusCode !== 200) {
          self._error(tagsData.statusCode, tagsData.statusText);
        }

        tags = tagsData.getTagsFromTextResponse.tags.matchTags.tag;

        // Sort tags according to the position of the text they matched
        tags.sort(function (a, b) {
          var offset1, offset2;

          offset1 = a.instances.instance[0].offset;
          offset2 = b.instances.instance[0].offset;

          return offset1 - offset2;
        });

        self._debug('Returned tags', tags, true);

        callback = function (data) {
          var tag = this;
          receiveMetaData(data, content, tag);
        };

        // Fetch meta data for each tag
        for (i = 0, length = tags.length; i < length; i += 1) {
          tag = tags[i];

          //console.log('tag.name?', tag.name);
          // If it has the proper tag name...
          if (tag.name === 'MATCHTEXT') {

            // And we haven't gotten this entity already...
            if (!options.matchAllEntities || $.inArray(tag.taxoId, entities) < 0) {
              self._debug('Match:', tag);
              self._debug('Score:', tag.score);

              // And it passes our threshold
              if (tag.score > options.threshold) {

                // Call the meta API for URLs
                outstandingCalls += 1;
                entities.push(tag.taxoId);
                getMetaForTag(tag.taxoId, $.proxy(callback, tag));
                //console.log('entities', entities);
              }
            } else {
              self._debug('Tag:', tag);
              self._debug('Skipped:', tag.value + ' (' + tag.taxoId + ') is already present in the returned entities array.');
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

        //console.log('getting meta for tag', tag);

        blogsmith.ajaxProxy(options.taxonomyApi, {
          qTxt: tag,
          f: 'json',
          authKey: 'ao1pcpvLTH7QU4gw',
          client: 'BS'
        }, $.proxy(callback, this));

      };

      /**
       * Provide some domain-specific filtering for URLs. We've been promised that this will be incorporated into the API in the future.
       * @param {Object} meta A meta tag from the API
       * @returns Boolean
       */
      urlFilter = function (meta) {
        var metaTypeId, disallowed;

        metaTypeId = parseInt(meta.metaType.ID, 10);

        disallowed = [
          124, // musicbrainz
          130 // autos.aol.com
        ];

        return ($.inArray(metaTypeId, disallowed) < 0) ? true : false;
      };

      /**
       * Receive data from the meta data API for entities
       * @param {Object} data
       * @param {Object} content
       * @param {Object} tag
       */
      receiveMetaData = function (data, content, tag) {
        var i, length, match, meta, domain;

        self._debug('Meta data for', tag.value, true);

        data = JSON.parse(data);

        self._debug('data', data);

        if (data.getNodeResponse) {
          meta = data.getNodeResponse.node.meta || 'undefined';
        }

        if (meta) {
          match = {
            text: tag.value,
            taxoId: tag.taxoId,
            offset: tag.instances.instance[0].offset,
            // TODO: Is this ever not just the length of the text string?
            length: tag.instances.instance[0].length,
            urls: []
          };

          for (i = 0, length = meta.length; i < length; i += 1) {

            self._debug('Meta:', meta[i].metaType.displayName);

            if (meta[i].metaType.displayName.indexOf('URL') > -1) {
              if (urlFilter(meta[i])) {
                match.urls.push(meta[i].metaValue);
              } else {
                self._debug('URL:', meta[i].metaType.displayName + ' was rejected by the URL filter.');
              }
            }
          }

          if (match.urls.length) {
            content.matches.push(match);
          }
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

      for (i = 0, length = content.length; i < length; i += 1) {
        text = content[i].get();

        if (text) {
          outstandingCalls += 1;
          content[i].matches = [];
          getTagsFromText.call(content[i], text);
        } else {
          expectedContent -= 1;
        }
      }
    },

    _chooseUrls: function () {
      var self, i, j, content, choose, increment, $chooseDialog;

      self = this;
      content = this.options.content;
      i = 0;
      j = 0;

      // Create an element to use as a jQuery UI Dialog
      $chooseDialog = $('<div>').appendTo($('body'));

      choose = function () {
        var match;

        if (i >= content.length) {
          self._addLinks();
        } else {
          if (!content[i].matches) {
            content[i].matches = [];
          }
          match = content[i].matches[j];

          if (match && match.urls.length > 1) {

            // Empty out any previous content from the dialog
            $chooseDialog.empty();

            $chooseDialog.append('<p>We found ' +
              match.urls.length + ' urls for <strong>' + match.text +
              '</strong>. Which one would you like to use?');

            $.each(match.urls, function (i, url) {
              var $radio;

              $radio = $('<input>', {
                name: 'choices',
                type: 'radio',
                value: url
              });

              $chooseDialog.append($radio);
              $radio.wrap('<label />');
              $radio.after(url + ' <a href="' + url + '"> &rarr;</a>');

              $radio.parent().css({
                display: 'block'
              });

            });

            $chooseDialog.find('input[type=radio]')
              .first()
              .trigger('click');

            // TODO: hide the x button
            $chooseDialog.dialog({
              width: '50%',
              title: 'Choose your Interlink',
              closeOnEscape: false,
              resizable: false,
              modal: true,
              //open: onOpen,
              close: function () {
                var selectedRadio, answer;

                selectedRadio = $chooseDialog.find('input[type=radio]:checked');
                answer = selectedRadio.val();

                match.urls = [ answer ];
                increment();
                choose();
              },
              buttons: {
                'Choose': function () {
                  $(this).dialog('close');
                }
              }
            });


          } else {
            increment();
            choose();
          }
        }

      };

      increment = function () {
        j += 1;

        if (j >= content[i].matches.length) {
          i += 1;
          j = 0;
        }
      };

      choose();

    },

    _addLinks: function () {
      var self, content, totalMatches, missiveText;

      self = this;
      content = this.options.content;
      totalMatches = 0;

      $.each(content, function (i, contentItem) {
        var contentArray, newContent;

        // Turn the content string into an array split on each character
        contentArray = contentItem.get().split('');

        if (contentItem.matches.length) {
          self._debug('Final report', '•', true);

          $.each(contentItem.matches, function (i, match) {
            self._debug('Matches with allowed URLs:', match);

            // Use the offset to find the right position in the array to add new
            // html content
            contentArray[match.offset] = [
              "<a class=\"interlink\" onclick=\"bN.set(\'blogsmith_interlink\', \'`\', true); bN.set(\'blogsmith_taxo_id\', \'" + match.taxoId + "\', true);\" href=",
              match.urls[0],
              '">',
              contentArray[match.offset]
            ].join('');

            // Find the end of the match and add new html
            contentArray[match.offset + match.length - 1] = [
              contentArray[match.offset + match.length - 1],
              '</a>'
            ].join('');

            totalMatches += 1;

          });

        }

        newContent = contentArray.join('');
        contentItem.set(newContent);

      });

      if (totalMatches < 1) {
        missiveText = 'We found no interlinks to suggest.';
      } else if (totalMatches === 1) {
        missiveText = 'We found one suggested interlink. We\'ve placed it in your post\'s contents.';
      } else {
        missiveText = 'We found ' + this._numberize(totalMatches) + ' suggested interlinks. We\'ve placed them in your post\'s contents.';
      }

      blogsmith.missive({
        text: missiveText
      });
    },

    _error: function (statusCode, statusText) {
      this._loading(false);
      blogsmith.missive({
        text: statusCode + ': ' + statusText
      });
    },

    /*
     * Ouput debugging info to the console. This lets developers opt in to
     * verbose debugging output if they need to examine the inner workings of
     * the plugin.
     */
    _debug: function (label, message, heading) {
      var i, separator;
      heading = heading || false;
      if (!this.debug) {
        return;
      } else {
        if (window.console) {

          if (heading) {
            // Match the separator to the length of the heading output
            // TODO: fix the hardcoding of characters to labels.
            i = 12 + label.length + 1 + message.length;
            separator = '';
            while (i) {
              separator += '¯';
              i -= 1;
            }
            console.log('\n' + separator);
            console.log('Interlinks:', label, message);
            console.log('\n' + separator);
          } else {
            console.log('Interlinks:', label, message);
          }
        }
      }
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
