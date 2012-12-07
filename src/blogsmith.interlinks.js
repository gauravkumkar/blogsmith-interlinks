/*global blogsmith:true, BS:true, _blog_name:true, CKEDITOR:true */
(function ($, blogsmith) {

  var API_URL, options;

  // Constants
  API_URL = 'http://taxonomy-tomcat.ops.aol.com/aoltaxo/nodeinfo/meta';

  // Default Options
  options = {
    matchAllEntities: false
  };

  // Missive
  if (typeof blogsmith.missive !== 'function') {
    blogsmith.missive = function (options) {

      var missive, settings, defaults = {
        'class': 'blogsmith-missive',
        text: ''
      };

      settings = $.extend({}, defaults, options);

      $(document).delegate('.blogsmith-missive', 'click', function (e) {
        var target = $(e.target);

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
      }).addClass('ui-state-highlight ui-corner-all');

      missive.hide().insertBefore('#postcontents').fadeIn('fast', function (e) {
        var missives = $('.blogsmith-missive');

        if (missives.length > 1) {
          missives.first().trigger('click');
        }
      });
    };
  }

  // Create a small textWalk jQuery plugin that walks through a bit of HTML and
  // stops when it reaches text nodes or script/textarea/anchor tags.
  if (typeof jQuery.fn.textWalk !== 'function') {
    jQuery.fn.textWalk = function (fn, args) {
      var jwalk;

      jwalk = function () {
        var nn = this.nodeName.toLowerCase();

        if (nn === '#text') {
          if (args) {
            if ($.isArray(args)) {
              fn.apply(this, args);
            } else {
              fn.call(this, args);
            }
          } else {
            fn.call(this);
          }
        } else if (this.nodeType === 1 && this.childNodes && this.childNodes[0] && nn !== 'script' && nn !== 'textarea' && nn !== 'a') {
          $(this).contents().each(jwalk);
        }
      };

      this.contents().each(jwalk);

      return this;
    };
  }

  // Add custom config settings to CK Editor
  BS.editor.userConfig._all = {
    //contentsCss: ['/js/ckeditor_bs/themes/ckPixie/contents.css', 'http://o.aolcdn.com/os/blogsmith/plugins/aol-interlinks/css/style.css']
    contentsCss: ['/js/ckeditor_bs/themes/ckPixie/contents.css', 'http://localhost:8000/src/blogsmith.interlinks.css']
  };

  // Create button for Interlinks
  // TODO: Replace with SDK method for adding a tool once it's available
  var interlinksButton = $('<span />', {
    'class': 'plugin-interlink add-interlinks',
    html: '<a style="background-color: red;" title="Generate interlinks for your post\'s content" href="#">Add Interlinks</a>'
  });

  // Once the whole DOM is ready...
  $(document).ready(function () {
    // Add it to the tools box on the right rail
    interlinksButton.appendTo('#postsave_extended');
  });

  // Add the event listener for our button
  $(document).delegate('.plugin-interlink.add-interlinks', 'click', function (e) {

    var collectTaxonomyCodes, addLinks, submitContents, startLoading, endLoading, error, errorTimeout, $this = $(this),
      button = $this.children('a'),
      plugin = $this.parent(),
      title = blogsmith.getTitle(),
      matches = 0,
      total = 0,
      name = _blog_name,
      taxonomyCodes = [],
      currentTaxonomyCode = 0,
      matchIndex = {},
      taxonomyCallsOutstanding = 0,
      postContents = blogsmith.getContents(),
      postContinuedContents = blogsmith.getContinuedContents(),
      newContents = $('<div/>', {
        html: postContents
      }),
      newContinuedContents = $('div/>', {
        html: postContinuedContents
      }),
      loadingImage = $('<img />', {

        src: 'http://o.aolcdn.com/os/blogsmith/plugins/aol-interlinks/images/loading.gif?v4'
      }).css({
        margin: '4px 5px 4px'
      });

    console.log('button', button);

    // Send contents of post to API
    submitContents = function (proxy, name, title, contents, continuedContents, settings) {

      var defaults = {
        domain: blogsmith.getDomain(),
        // town: 'realestate',
        // url: 'http://vm-149-174-12-89.asset.aol.com:8080/WM/api.jsp?jsoncallback=?',
        url: 'http://irshield.app.aol.com/rtnt/getTagsFromText',
        callback: collectTaxonomyCodes
      },
      txt = contents + continuedContents;

      settings = $.extend({}, defaults, settings);

      blogsmith.ajaxProxy(
        settings.url, {
        // town: settings.town,
        tagger: 'T',
        platform: 'BS',
        app: blogsmith.getDomain(),
        channel: name,
        title: title,
        body: txt,
        'sMatchTextTags': 1,
        supplies: {}
      }, settings.callback);

      errorTimeout = setTimeout(error, 10000);
    },

    addLinks = function (data) {
      var meta, currentMeta, length, linked, pattern, match, matched,
        replacement, replacenator;

      data = $.secureEvalJSON(data);

      taxonomyCallsOutstanding--;

      if (data.statusCode !== 200) {
        // TODO:  Need to report this automatically, perhaps by filing a ticket?
        blogsmith.missive({
          text: API_URL + ' returned code (' + data.statusCode + ' - ' + data.statusText + ').   Which is a real bummer.  We suggest trying again later.  If the problem persists, please send a note to <a href="mailto:central@teamaol.com">central@teamaol.com</a>.'
        });
      } else if ($.type(data.getNodeResponse) !== "undefined") {

        // TODO:  Better validation.  Make sure these fields are present before accessing them.

        meta = data.getNodeResponse.node.meta;
        currentMeta = 0;
        length = meta.length;
        linked = false;
        pattern = matchIndex[data.getNodeResponse.node.ID].text;

        if (options.matchAllEntities) {
          match = new RegExp('\\b' + pattern + '\\b', 'g');
        } else {
          match = new RegExp('\\b' + pattern + '\\b');
        }

        console.log('INTERLINK PLUGIN - "' + pattern + '" matches taxonomy id ' + meta[currentMeta].ID);

        /*
         * @param {string} replacement
         * @see http://jsfiddle.net/v2yp5/4/
         * @see http://stackoverflow.com/questions/6012163/whats-a-good-alternative-to-html-rewriting/6012345#6012345
         */
        replacenator = function (replacement) {
          var $span, text;

          if (!options.matchAllEntities && matched) {
            return;
          }

          text = this.nodeValue;

          if (this.nodeValue.match(match)) {

            matched = true;

            matches += this.nodeValue.match(match).length;

            // We can't just change the text in the text node because our new
            // content contains HTML. Instead, we create a blank span tag and
            // populate its HTML with our new content.
            $span = $('<span>', {
              html: this.nodeValue.replace(match, replacement)
            });

            // Insert our new content
            $span.insertBefore(this);

            // Remove the old content
            this.parentNode.removeChild(this);

            // Unwrap the blank span from around our new content
            $span.contents().unwrap();
          }
        };

        while ((currentMeta < length) && !linked) {
          // Reset the matched state for each new entity
          matched = false;

          // TODO: Searching for the string "url" in a metadata field is pretty lame.  Need to work with Taxo team (Madhu) on getting better results.
          // TODO: There is actually a ranking of which URLs are better than other URLs (should one entity link to more than one URL).  Shawn has asked for the taxo folks to just include the ranking in the results rather than email them to us ad hoc.
          if (meta[currentMeta].metaType.name.toLowerCase().indexOf('url') >= 0) {

            // Try to build a valid url.
            var url = meta[currentMeta].metaValue;
            if (url.indexOf('http://') < 0) {
              url = 'http://' + meta[currentMeta].metaValue;
            }

            // If we only want entities matched once
            if (!options.matchAllEntities) {

              // Check for existing interlinks first
              if ($('a.interlink[href="' + url + '"]', newContents).length) {
                matched = true;
              }
            }

            // console.log('INTERLINK PLUGIN - found URL: ' + url);
            // TODO: Provide some commenting on this giant regex - what does it do?
            if (/^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url)) {

              //matches += 1;
              replacement = "<a class='interlink' onclick=\"bN.set(\'blogsmith_interlink\', \'1\', true); bN.set(\'blogsmith_taxo_id\', \'" + meta[currentMeta].ID + "\', true);\" href=\'" + url + "'>" + pattern + "</a>";

              console.info('INTERLINK PLUGIN - linking "' + pattern + '" to ' + url);

              try {
                newContents.textWalk(replacenator, replacement);
                newContinuedContents.textWalk(replacenator, replacement);
                total += 1;
              } catch (e) {
                console.warn('INTERLINK PLUGIN - unable to modify post content to establish interlink');
              }

              blogsmith.replaceIntoEditor(newContents.html(), 1);
              blogsmith.replaceIntoEditor(newContinuedContents.html(), 2);

              linked = true;
            } else {
              console.warn('INTERLINK PLUGIN - bad URL: ' + url);
            }
          }
          currentMeta += 1;
        }
      } else {
        console.warn('INTERLINK PLUGIN - taxonomy call has returned no data');
      }

      if (!taxonomyCallsOutstanding) {

        // Visually highlight the content area to indicate change
        // FIXME:  This is busted.  Need to investigate.
        $('a.interlink').effect('highlight', 2000);

        var message;

        if (matches === 0) {
          message = 'We found no interlinks to suggest.';
        } else if (matches !== total) {
          message = 'We found ' + matches + ' suggested interlinks, but the plugin was unable to link ' + (matches - total) + ' of them to your post\'s contents.  Please report this problem to central@teamaol.com.';
        } else if (total === 1) {
          message = 'We found one suggested interlink, which has been placed in your post\'s contents.';
        } else if (total > 1) {
          message = 'We found ' + total + ' suggested interlinks, which have been placed in your post\'s contents.';
        }

        blogsmith.missive({
          text: message
        });

        endLoading();
      }
    },

    collectTaxonomyCodes = function (data) {

      data = $.secureEvalJSON(data);

      // Clear the error timer - we got results!
      clearTimeout(errorTimeout);

      if (data.statusCode !== 200) {
        // TODO:  Need to report this automatically, perhaps by filing a ticket?
        blogsmith.missive({
          text: 'http://irshield.app.aol.com/rtnt/getTagsFromText returned code (' + data.statusCode + ' - ' + data.statusText + ').  Which is a real bummer.  We suggest trying again later.  If the problem persists, please send a note to central@teamaol.com.'
        });
        endLoading();
      } else if ($.type(data.getTagsFromTextResponse.tags) === "undefined") {
        blogsmith.missive({
          text: 'We found no interlinks to suggest for your post\'s text. Thanks for checking!'
        });
        endLoading();
      } else if (data.getTagsFromTextResponse.tags.matchTags.tag.length === 0) {
        blogsmith.missive({
          text: 'We found no interlinks to suggest for your post\'s text. Thanks for checking!'
        });
        endLoading();
      } else {

        var i = 0,
        tags = data.getTagsFromTextResponse.tags.matchTags.tag,
        length = tags.length,

        // TODO:  Expose this in the UI to make it tunable.
        threshold = 0.0,
        hitThreshold = false;

        while ((i < length) && !hitThreshold) {
          if (tags[i].name === 'MATCHTEXT') {
            if (tags[i].score > threshold) {
              taxonomyCodes.push({
                value: tags[i].value,
                id: tags[i].taxoId
              });
            } else {
              hitThreshold = true;
            }
          }
          i++;
        }

        if (taxonomyCodes.length === 0) {
          blogsmith.missive({
            text: 'We found no interlinks to suggest for your post\'s text. Thanks for checking!'
          });
          endLoading();
        } else {
          taxonomyCallsOutstanding = taxonomyCodes.length;
          i = taxonomyCallsOutstanding - 1;

          while (i >= 0) {
            // Remember which match text coes with which code so we can find the match text again when we get results back.
            matchIndex[taxonomyCodes[i].id] = {
              text: taxonomyCodes[i].value
            };
            blogsmith.ajaxProxy(API_URL + '?qTxt=' + taxonomyCodes[i].id + '&f=json&authKey=ao1pcpvLTH7QU4gw&client=BS', {}, addLinks);
            console.log('INTERLINK PLUGIN - requesting taxononmy entries for "' + taxonomyCodes[i].value + '"');
            i--;
          }
        }
      }
    },

    // Visually indicate loading status
    startLoading = function () {
      // Temporarily set height to prevent it from changing as a result of adding the loading graphic
      plugin.height(plugin.height());

      // Fade in loading graphic
      button.fadeOut('fast', function () {
        loadingImage.wrap('<span />').hide().insertAfter(button).fadeIn('fast');
      });
    },

    // End visual indication of loading status
    endLoading = function () {
      loadingImage.fadeOut('fast', function () {
        $(this).remove();
        button.fadeIn('fast');
        plugin.height('auto');
      });
    };

    startLoading();
    submitContents(blogsmith, _blog_name, title, postContents, postContinuedContents);

    e.preventDefault();

  });

})(jQuery, blogsmith);
