/*global blogsmith:true, BS:true, _blog_name:true, CKEDITOR:true */
(function ($, blogsmith) {

  var API_URL,

    // variables
    options, validUrl,

    // functions
    getEntityUrls, chooseUrls;

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

  /**
   * Check a url string to see if it's valid.
   * @param {string} url A string containing a URL to be tested for validity
   * @returns {Boolean}
   */
  validUrl = function (url) {
    var exp;

    exp = new RegExp(/^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i);

    return exp.test(url);
  };

  /**
   * Take a data object returned from the API and make a simpler object with only entities and URLs
   * @param {Object} data
   * @returns {Object} Entities and URLs
   */
  getEntityUrls = function (data) {
    var i, length, meta, pattern, entityUrls, url;

    meta = data.getNodeResponse.node.meta;
    entityUrls = [];

    //console.log('meta', meta);
    for (i = 0, length = meta.length; i < length; i += 1) {
      if (meta[i].metaType.name.toLowerCase().indexOf('url') >= 0) {

        // Try to build a valid url.
        url = meta[i].metaValue;

        if (url.indexOf('http://') < 0) {
          url = 'http://' + meta[i].metaValue;
        }

        if (validUrl(url)) {
          entityUrls.push({
            id: meta[i].ID,
            url: url
          });
        }
      }
    }

    return entityUrls;
  };

  /**
   * Take an array of arrays and prompt the user to choose one item from each list
   * @param {Array} questions An array of arrays
   * @param {function} callback A function to call when the user has finished choosing
   * @returns {Array} An array of the selections a user has made
   */
  chooseUrls = function (pattern, urls, callback) {
    console.log('There were', urls.length, 'urls found. Let\'s choose the best.');
    var i, choose, answer, $chooseDialog, $body;

    $body = $('body');

    // Create an element to use as a jQuery UI Dialog
    $chooseDialog = $('<div>').appendTo($body);

    i = 0;

    /**
     * Choose a single item from an array of choices
     * @param {Array} choices An array of choices
     */
    choose = function (choices) {
      var j, length, choice, onOpen, onChoose;

      // Empty out any previous content from the dialog
      $chooseDialog.empty();

      $chooseDialog.append('<p>We found ' + choices.length + ' urls for ' + pattern + '. Which one would you like to use?');

      onOpen = function (event, ui) {
        console.log(event, ui);
      };

      onChoose = function (event, ui) {
        var selectedRadio;

        $(this).dialog('close');
        i += 1;

        selectedRadio = $chooseDialog.find('input[type=radio]:checked');
        answer = selectedRadio.val();

        // Otherwise, remove this dialog
        $chooseDialog.remove();

        // And fire the callback
        console.log('firing callback', answer);
        callback(answer);

      };

      // Generate markup for each choice
      for (j = 0, length = choices.length; j < length; j += 1) {
        var $radio;

        choice = choices[j].url;

        $radio = $('<input>', {
          name: 'choices',
          type: 'radio',
          value: choice
        });

        $chooseDialog.append($radio);
        $radio.wrap('<label />');
        $radio.after(choice + '<a href="' + choice + '"> &rarr;</a>');

        $radio.parent().css({
          display: 'block'
        });
      }

      //$chooseDialog.find('input[type=radio]').first().attr('checked', true);

      // TODO: hide the x button
      $chooseDialog.dialog({
        width: '50%',
        title: 'Choose your Interlink',
        closeOnEscape: false,
        resizable: false,
        modal: true,
        open: onOpen,
        buttons: {
          'Choose': onChoose
        }
      });

    };

    // Start with the first set
    choose(urls);
  };

  // Add custom config settings to CK Editor
  BS.editor.userConfig._all = {
    contentsCss: ['/js/ckeditor_bs/themes/ckPixie/contents.css', 'http://o.aolcdn.com/os/blogsmith/plugins/aol-interlinks/css/style.css']
    //contentsCss: ['/js/ckeditor_bs/themes/ckPixie/contents.css', 'http://localhost:8000/src/blogsmith.interlinks.css']
  };


  // Create button for Interlinks
  // TODO: Replace with SDK method for adding a tool once it's available
  var interlinksButton = $('<span />', {
    'class': 'plugin-interlink add-interlinks',
    html: '<a title="Generate interlinks for your post\'s content" href="#">Add Interlinks</a>'
  });

  // Once the whole DOM is ready...
  $(document).ready(function () {
    // Add it to the tools box on the right rail
    interlinksButton.appendTo('#postsave_extended');
  });

  // Add the event listener for our button
  $(document).delegate('.plugin-interlink.add-interlinks', 'click', function (e) {

    var collectTaxonomyCodes, receiveApiData, addLinks, submitContents, startLoading, endLoading, error, errorTimeout, $this = $(this),
      button = $this.children('a'),
      plugin = $this,
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

    /**
     * Receive and process the data returned by the API
     * @param {Object} data A data object from the API.
     */
    receiveApiData = function (data) {
      var urls, pattern, done;

      // http://code.google.com/p/jquery-json/
      data = $.secureEvalJSON(data);

      taxonomyCallsOutstanding -= 1;

      if (data.statusCode !== 200) {

        // TODO:  Need to report this automatically, perhaps by filing a ticket?
        blogsmith.missive({
          text: API_URL + ' returned code (' + data.statusCode + ' - ' + data.statusText + ').   Which is a real bummer.  We suggest trying again later.  If the problem persists, please send a note to <a href="mailto:central@teamaol.com">central@teamaol.com</a>.'
        });

      } else if ($.type(data.getNodeResponse) !== "undefined") {

        // Retrieve the text we originally matched against
        pattern = matchIndex[data.getNodeResponse.node.ID].text;

        urls = getEntityUrls(data);
        console.log('urls', urls);

        // Fired when all the data is ready
        done = function (url) {
          addLinks({
            id: urls[0].id,
            pattern: pattern,
            url: url
          });
        };

        if (urls.length > 1) {
          chooseUrls(pattern, urls, done);
        } else {
          done(urls[0].url);
        }

      } else {
        console.warn('INTERLINK PLUGIN - taxonomy call has returned no data');
      }
    },

    addLinks = function (data) {
      var i, length, meta, currentMeta, linked, pattern, match, matched,
        replacement, replacenator;

      // Set the regex to global if we're supposed to match all entities
      if (options.matchAllEntities) {
        match = new RegExp('\\b' + data.pattern + '\\b', 'g');
      } else {
        // Otherwise just get the first
        match = new RegExp('\\b' + data.pattern + '\\b');
      }

      //console.log('INTERLINK PLUGIN - "' + pattern + '" matches taxonomy id ' + meta[currentMeta].ID);

      /**
       * Perform a regex replacement on a textnode with text that may include
       * html
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

      // Reset the matched state for each new entity
      matched = false;

      // If we only want entities matched once
      if (!options.matchAllEntities) {

        // Check for existing interlinks first
        if ($('a.interlink[href="' + data.url + '"]', newContents).length) {
          matched = true;
        }
      }

      // console.log('INTERLINK PLUGIN - found URL: ' + url);

      //matches += 1;
      replacement = "<a class='interlink' onclick=\"bN.set(\'blogsmith_interlink\', \'1\', true); bN.set(\'blogsmith_taxo_id\', \'" + data.id + "\', true);\" href=\'" + data.url + "'>" + data.pattern + "</a>";

      console.info('INTERLINK PLUGIN - linking "' + data.pattern + '" to ' + data.url);

      try {
        newContents.textWalk(replacenator, replacement);
        newContinuedContents.textWalk(replacenator, replacement);
        total += 1;
      } catch (e) {
        console.warn('INTERLINK PLUGIN - unable to modify post content to establish interlink');
      }

      blogsmith.replaceIntoEditor(newContents.html(), 1);
      blogsmith.replaceIntoEditor(newContinuedContents.html(), 2);

      if (!taxonomyCallsOutstanding) {

        // Visually highlight the content area to indicate change
        // FIXME:  This is busted.  Need to investigate.
        $('a.interlink').effect('highlight', 2000);

        var message;

        if (matches === 0) {
          message = 'We found no interlinks to suggest.';
        } else if (matches === 1) {
          message = 'We found one suggested interlink, which has been placed in your post\'s contents.';
        } else if (matches > 1) {
          message = 'We found ' + matches + ' suggested interlinks, which have been placed in your post\'s contents.';
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
            blogsmith.ajaxProxy(API_URL + '?qTxt=' + taxonomyCodes[i].id + '&f=json&authKey=ao1pcpvLTH7QU4gw&client=BS', {}, receiveApiData);
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
