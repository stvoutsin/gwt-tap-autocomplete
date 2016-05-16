/**
 *  Autocomplete for CodeMirror 2.
 *  Uses adql.js by Gregory Mantelet
 *  Extended to allow dynamic metadata keyword loading from webservice
 *  @author Stelios Voutsinas (ROE)
 *  @version 11/Feb/2015
 */
(function() {


  function forEach(arr, f) {
    for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
  }

  function jsArrayContains(arr, item) {

    if (!Array.prototype.indexOf) {
      var i = arr.length;
      while (i--) {
        if (arr[i].toUpperCase() === item.toUpperCase()) {
          return true;
        }
      }
      return false;
    }
    var arr2 = arr.map(function(elem) {
      return elem.toLowerCase();
    });
    return arr2.indexOf(item.toLowerCase()) != -1;
  }


  CodeMirror.tapHint = function(editor, getHints, givenOptions) {

    // Determine effective options based on given values and defaults.
    var options = {},
      defaults = CodeMirror.tapHint.defaults;

    if (givenOptions["tapResource"]) editor.tapResource = givenOptions["tapResource"];
    if (givenOptions["webServicePath"]) editor.webServicePath = givenOptions["webServicePath"];
    if (givenOptions["autocompleteLoader"]) editor.autocompleteLoader = givenOptions["autocompleteLoader"];
    if (givenOptions["autocompleteInfo"]) editor.autocompleteInfo = givenOptions["autocompleteInfo"];
    if (givenOptions["useAutocompleteService"]) editor.useAutocompleteService = givenOptions["useAutocompleteService"];
    if (givenOptions["availableTags"]){
    	editor.availableTags = givenOptions["availableTags"];
    } else {
    	if (!editor.availableTags){
    	    editor.availableTags = [
    	              		"SELECT", "FROM", "ORDER BY","WHERE", "TOP","IN", "AND", "OR", "WITH", "DESC", "ASC", "JOIN", "AS", "HAVING", "ABS",
    	          			"GROUP","BY", "INNER","OUTER","CROSS","LEFT","RIGHT","FULL","ON","USING","MIN","MAX","COUNT","DISTINCT","ALL","LIKE","ACOS","ASIN","ATAN","ATAN2","COS","SIN","TAN","COT","IS","NOT","NULL","NATURAL","EXISTS","BETWEEN","AREA","BOX","CENTROID","CIRCLE","CONTAINS","COORD1","COORD2","COORDSYS","DISTANCE","INTERSECTS","POINT","POLYGON","REGION"
    	          		];
    	}
    }

    for (var opt in defaults)
      if (defaults.hasOwnProperty(opt)) {
        options[opt] = (givenOptions && givenOptions.hasOwnProperty(opt) ? givenOptions : defaults)[opt];
      }


    function collectHints(previousToken) {

      // We want a single cursor position.
      if (editor.somethingSelected()) return;

      var tempToken = editor.getTokenAt(editor.getCursor());

      // Don't show completions if token has changed and the option is set.
      if (options.closeOnTokenChange && previousToken != null &&
        (tempToken.start != previousToken.start || tempToken.type != previousToken.type)) {
        return;
      }
      var result = getHints(editor, givenOptions);
      if (!result || !result.list.length) return;
      var completions = result.list;

      function insert(str) {
        editor.replaceRange(str, result.from, result.to);
      }
      // When there is only one completion, use it directly.
      if (options.completeSingle && completions.length == 1) {
        insert(completions[0]);
        return true;
      }

      // Build the select widget
      var complete = document.createElement("div");
      complete.className = "CodeMirror-completions";
      var sel = complete.appendChild(document.createElement("select"));
      // Opera doesn't move the selection when pressing up/down in a
      // multi-select, but it does properly support the size property on
      // single-selects, so no multi-select is necessary.
      if (!window.opera) sel.multiple = true;
      for (var i = 0; i < completions.length; ++i) {
        var opt = sel.appendChild(document.createElement("option"));
        opt.appendChild(document.createTextNode(completions[i]));
      }
      sel.firstChild.selected = true;
      sel.size = Math.min(10, completions.length);
      var pos = editor.cursorCoords(options.alignWithWord ? result.from : null);
      complete.style.left = pos.left + "px";
      complete.style.top = pos.bottom + "px";
      document.body.appendChild(complete);
      // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
      var winW = window.innerWidth || Math.max(document.body.offsetWidth, document.documentElement.offsetWidth);
      if (winW - pos.left < sel.clientWidth)
        complete.style.left = (pos.left - sel.clientWidth) + "px";
      // Hack to hide the scrollbar.
      if (completions.length <= 10)
        complete.style.width = (sel.clientWidth - 1) + "px";

      var done = false;

      function close() {
        if (done) return;
        done = true;
        complete.parentNode.removeChild(complete);
      }

      function pick() {
        insert(completions[sel.selectedIndex]);
        close();
        setTimeout(function() {
          editor.focus();
        }, 50);
      }
      CodeMirror.on(sel, "blur", close);
      CodeMirror.on(sel, "keydown", function(event) {
        var code = event.keyCode;
        // Enter
        if (code == 13) {
          CodeMirror.e_stop(event);
          pick();
        }
        // Escape
        else if (code == 27) {
          CodeMirror.e_stop(event);
          close();
          editor.focus();
        } else if (code != 38 && code != 40 && code != 33 && code != 34 && !CodeMirror.isModifierKey(event)) {
          close();
          editor.focus();
          // Pass the event to the CodeMirror instance so that it can handle things like backspace properly.
          editor.triggerOnKeyDown(event);
          // Don't show completions if the code is backspace and the option is set.
          if (!options.closeOnBackspace || code != 8) {
            setTimeout(function() {
              collectHints(tempToken);
            }, 50);
          }
        }
      });
      CodeMirror.on(sel, "dblclick", pick);

      sel.focus();
      // Opera sometimes ignores focusing a freshly created node
      if (window.opera) setTimeout(function() {
        if (!done) sel.focus();
      }, 100);
      return true;
    }
    return collectHints();
  };


  CodeMirror.tapHint.defaults = {
    closeOnBackspace: true,
    closeOnTokenChange: false,
    completeSingle: true,
    alignWithWord: true,


  };

  function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds) {
        break;
      }
    }

  }


  function getCompletionsAdql(token, context, keywords, options, editor, optional_keyword) {

    optional_keyword = (typeof optional_keyword === 'undefined') ? '' : optional_keyword;
    var found = [],
      start = token.string;

    function maybeAdd(str) {

      if (str.toLowerCase().indexOf(start.toLowerCase()) == 0 && !jsArrayContains(found, str)) found.push(str);
    }

    function gatherCompletions(obj) {
      if (typeof obj == "string") forEach(editor.availableTags, maybeAdd);
      else if (obj instanceof Array) forEach(editor.availableTags, maybeAdd);
      else if (obj instanceof Function) forEach(editor.availableTags, maybeAdd);
      for (var name in obj) maybeAdd(name);
    }

    if (context) {

      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(),
        base;
      loadMetadataForAutocomplete(obj.string, start, found, editor, optional_keyword);
      return found.sort();


    } else {

      // If not, just look in the window object and any local scope
      // (reading into JS mode internals to get at the local and global variables)

      forEach(keywords, maybeAdd);
      return found.sort();
    }

  }


  /**
   * Load the medata content from (data) to be used by the
   * auto-completion functions Store the content in the
   * tags list
   *
   */
  function pushMetadataJson(data, tags, start, keyword) {

    if (data.length > 0) {
      for (var i = 0; i < data.length; i++) {

        var str = jQuery.trim(data[i]);
        var arr = str.split(".");
        for (var y = 0; y < arr.length; y++) {

          if (arr[y].toLowerCase().indexOf(start.toLowerCase()) == 0 && !jsArrayContains(tags, arr[y]) && !(arr[y].toLowerCase() == keyword.toLowerCase())) tags.push(arr[y]);

        }
      }
    }

  }



  /**
   *  Load metadata for autocomplete
   *  Sends Ajax request to autocomplete service with keyword & optional keyword
   *
   */
  function loadMetadataForAutocomplete(keyword, parentText, tags, editor, optional_keyword) {

    optional_keyword = (typeof optional_keyword === 'undefined') ? '' : optional_keyword;

    if (editor.autocompleteInfo) jQuery("#" + editor.autocompleteInfo).html("Loading catalogue metadata keywords for auto-complete");
    if (editor.autocompleteLoader) jQuery("#" + editor.autocompleteLoader).show();


    jQuery.ajax({
      type: "POST",
      async: false,
      data: {
        keyword: keyword,
        optional_keyword: optional_keyword,
        mode: "tap",
        resource: editor.tapResource

      },
      url: editor.webServicePath,
      timeout: 1000000,
      error: function() {
        if (editor.autocompleteInfo) jQuery("#" + editor.autocompleteInfo).html("CTRL + Space to activate auto-complete");
        if (editor.autocompleteLoader) jQuery("#" + editor.autocompleteLoader).hide();
      },
      success: function(data) {
        if (data != "") {
          pushMetadataJson(data, tags, parentText, keyword);
        }

        if (editor.autocompleteInfo) jQuery("#" + editor.autocompleteInfo).html("CTRL + Space to activate auto-complete");
        if (editor.autocompleteLoader) jQuery("#" + editor.autocompleteLoader).hide();
      }

    });

    return;
  }


  /**
   * Get autocomplete keywords for given token
   */
  function getCompletions(token, context, keywords, options) {
    var found = [],
      start = token.string;

    function maybeAdd(str) {

      if (str.toLowerCase().indexOf(start.toLowerCase()) == 0 && !jsArrayContains(found, str)) found.push(str);
    }
    function gatherCompletions(obj) {
      if (typeof obj == "string") forEach(editor.availableTags, maybeAdd);
      else if (obj instanceof Array) forEach(editor.availableTags, maybeAdd);
      else if (obj instanceof Function) forEach(editor.availableTags, maybeAdd);
      for (var name in obj) maybeAdd(name);
    }

    if (context) {
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(),
        base;


      if (obj.type.indexOf("variable") === 0) {
        if (options && options.additionalContext)
          base = options.additionalContext[obj.string];
        base = base || window[obj.string];
      } else if (obj.type == "string") {
        base = "";
      } else if (obj.type == "atom") {
        base = 1;
      } else if (obj.type == "function") {
        if (window.jQuery != null && (obj.string == '$' || obj.string == 'jQuery') &&
          (typeof window.jQuery == 'function'))
          base = window.jQuery();
        else if (window._ != null && (obj.string == '_') && (typeof window._ == 'function'))
          base = window._();
      }
      while (base != null && context.length)
        base = base[context.pop().string];
      if (base != null) gatherCompletions(base);
    } else {
      // If not, just look in the window object and any local scope
      // (reading into JS mode internals to get at the local and global variables)

      forEach(keywords, maybeAdd);
    }

    return found.sort();

  }


  function scriptHint(editor, keywords, getToken, options) {

    // Find the token at the cursor
    var cur = editor.getCursor(),
    token = getToken(editor, cur),
    tprop = token;
    var optional_keyword = null;

    // If it's not a 'word-style' token, ignore the token.
    if (!/^[\w$_]*$/.test(token.string)) {
      token = tprop = {
        start: cur.ch,
        end: cur.ch,
        string: "",
        state: token.state,
        type: token.string == "." ? "property" : null
      };
    }

    token_start_original = token.start;
    token_end_original = token.end;
    line_original = cur.line;

    cur_temp = {}
    cur_temp.line=cur.line;
    cur_temp.ch=token.start;
    token_temp = getToken(editor, cur_temp);


    if ( token_temp.string=="."){
      optional_keyword = token.string;
      token = tprop = {
        start: cur_temp.ch,
        end: cur_temp.ch,
        string: "",
        state: token_temp,
        type: token_temp.string == "." ? "property" : null
      };   

    }

    // If it is a property, find out what it is a property of.
    while (tprop.type == "property") {
      tprop = getToken(editor, {
        line: cur.line,
        ch: tprop.start
      });
      if (tprop.string != ".") return;
      tprop = getToken(editor, {
        line: cur.line,
        ch: tprop.start
      });
      if (tprop.string == ')') {
        var level = 1;
        do {
          tprop = getToken(editor, {
            line: cur.line,
            ch: tprop.start
          });
          switch (tprop.string) {
            case ')':
              level++;
              break;
            case '(':
              level--;
              break;
            default:
              break;
          }
        } while (level > 0);
        tprop = getToken(editor, {
          line: cur.line,
          ch: tprop.start
        });
        if (tprop.type.indexOf("variable") === 0)
          tprop.type = "function";
        else return; // no clue
      }
      if (!context) var context = [];

      context.push(tprop);

    }
    if (editor.useAutocompleteService != true) {

      return {
        list: getCompletions(token, context, keywords, options),
        from: {
          line: line_original,
          ch: token_start_original
        },
        to: {
          line: line_original,
          ch: token_end_original
        }
      };
    } else {

      return {
        
        list: getCompletionsAdql(token, context, keywords, options, editor, optional_keyword),
        from: {
          line: line_original,
          ch: token_start_original
        },
        to: {
          line: line_original,
          ch: token_end_original
        }
      };
    }

  }

  CodeMirror.adqlHint = function(editor, options) {
    return scriptHint(editor, editor.availableTags,
      function(e, cur) {
        return e.getTokenAt(cur);
      },
      options);
  };



})();
