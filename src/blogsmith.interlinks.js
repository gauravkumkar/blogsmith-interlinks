/*global blogsmith:true, BS:true, _blog_name:true */
(function ($, blogsmith) {

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

  // Add custom config settings to CK Editor
  BS.editor.userConfig._all = {
    contentsCss: ['/js/ckeditor_bs/themes/ckPixie/contents.css', 'http://o.aolcdn.com/os/blogsmith/plugins/aol-interlinks/css/style.css']
  };

  // Create button for Interlinks
  var interlinksButton = $('<span />', {
    id: 'aol-interlink',
    html: '<a title="Generate interlinks for your post\'s content" href="#">Add Interlinks</a>'
  });

  // Once the whole DOM is ready...
  $(document).ready(function () {
    // Add it to the tools box on the right rail
    interlinksButton.appendTo('#postsave_extended');
  });

  // Add the event listener for our button
  $(document).delegate('#aol-interlink', 'click', function (e) {

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

      data = $.secureEvalJSON(data);

      taxonomyCallsOutstanding--;

      if (data.statusCode !== '200') {
        // TODO:  Need to report this automatically, perhaps by filing a ticket?
        blogsmith.missive({
          text: 'http://taxonomy-tomcat.ops.aol.com/aoltaxo/nodeinfo/meta returned code (' + data.statusCode + ' - ' + data.statusText + ').   Which is a real bummer.  We suggest trying again later.  If the problem persists, please send a note to central@teamaol.com.'
        });
      } else if ($.type(data.getNodeResponse) !== "undefined") {

        // TODO:  Better validation.  Make sure these fields are present before accessing them.
        var meta = data.getNodeResponse.node.meta,
        currentMeta = 0,
        length = meta.length,
        linked = false,
        pattern = matchIndex[data.getNodeResponse.node.ID].text,
        match = new RegExp('\\b' + pattern + '\\b', 'g'),
        replacement,
        jwalk;

        console.log('INTERLINK PLUGIN - "' + pattern + '" matches taxonomy id ' + meta[currentMeta].ID);

        // See http://jsfiddle.net/v2yp5/4/ and http://stackoverflow.com/questions/6012163/whats-a-good-alternative-to-html-rewriting/6012345#6012345
        jQuery.fn.textWalk = function (fn) {
          this.contents().each(jwalk);

          jwalk = function () {
            var nn = this.nodeName.toLowerCase();
            if (nn === '#text') {
              fn.call(this);
            } else if (this.nodeType === 1 && this.childNodes && this.childNodes[0] && nn !== 'script' && nn !== 'textarea' && nn !== 'a') {
              $(this).contents().each(jwalk);
            }
          };
          return this;
        };

        var replacenator = function () {
          var span = document.createElement('span');

          span.innerHTML = this.nodeValue.replace(match, replacement);
          this.parentNode.insertBefore(span, this);
          this.parentNode.removeChild(this);
        };

        while ((currentMeta < length) && !linked) {

          // TODO:  Searching for the string "url" in a metadata field is pretty lame.  Need to work with Taxo team (Madhu) on getting better results.
          // TODO: There is actually a ranking of which URLs are better than other URLs (should one entity link to more than one URL).  Shawn has asked for the taxo folks to just include the ranking in the results rather than email them to us ad hoc.
          if (meta[currentMeta].metaType.name.toLowerCase().indexOf('url') >= 0) {

            // Try to build a valid url.
            var url = meta[currentMeta].metaValue;
            if (url.indexOf('http://') < 0) {
              url = 'http://' + meta[currentMeta].metaValue;
            }

            // console.log('INTERLINK PLUGIN - found URL: ' + url);
            if (/^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url)) {

              matches++;
              replacement = "<a class='interlink' onclick=\"bN.set(\'blogsmith_interlink\', \'1\', true); bN.set(\'blogsmith_taxo_id\', \'" + meta[currentMeta].ID + "\', true);\" href=\'" + url + "'>" + pattern + "</a>";

              console.log('INTERLINK PLUGIN - linking "' + pattern + '" to ' + url);

              try {
                newContents.textWalk(replacenator);
                newContinuedContents.textWalk(replacenator);
                total++;
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
          currentMeta++;
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
            blogsmith.ajaxProxy('http://taxonomy-tomcat.ops.aol.com/aoltaxo/nodeinfo/meta?qTxt=' + taxonomyCodes[i].id + '&f=json&authKey=ao1pcpvLTH7QU4gw&client=BS', {}, addLinks);
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
