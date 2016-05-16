/**
 *  Autocomplete for CodeMirror 2.
 *  Uses adql.js by Gregory Mantelet
 *  Extended to allow dynamic metadata keyword loading from webservice
 *  @author Stelios Voutsinas (ROE)
 *  @version 11/Feb/2015
 */

var TapAutocomplete = function(params) {

	this.istap = false;
	this.servicemode = "TAP";

	if (params.textfieldid)
		this.textfieldid = params.textfieldid
	if (params.web_service_path)
		this.web_service_path = params.web_service_path;
	if (params.html_resource)
		this.html_resource = params.html_resource;
	if (params.tap_resource)
		this.tap_resource = params.tap_resource;
	if (params.autocomplete_info_id)
		this.autocomplete_info = params.autocomplete_info_id;
	if (params.autocomplete_loader_id)
		this.autocomplete_loader = params.autocomplete_loader_id;
	if (params.servicemode)
		this.servicemode = params.servicemode;
	if (params.initial_catalogues) {
		this.initial_catalogues = params.initial_catalogues;
	} else {
		this.initial_catalogues = [];
	}

	if (this.servicemode.toLowerCase() == "tap") {
		this.istap = true;
	}

	if (this.editor == null && !jQuery('.CodeMirror').length > 0) {
		CodeMirror.commands.autocomplete = function(cm) {
			CodeMirror.tapHint(cm, CodeMirror.adqlHint,
					{
						webServicePath : params.web_service_path,
						tapResource : params.tap_resource,
						useAutocompleteService : (params.servicemode.toLowerCase() == "tap"),
						autocompleteLoader : params.autocomplete_loader_id,
						autocompleteInfo : params.autocomplete_info_id,
					});
		}

		this.editor = CodeMirror.fromTextArea(document.getElementById(params.textfieldid), {
			mode : "text/x-adql",
			tabMode : "indent",
			lineNumbers : true,
			matchBrackets : true,
			lineWrapping : true,
			textWrapping : true,
			extraKeys : {
				"Ctrl-Space" : "autocomplete",
			},

		});
	}

	if (typeof this.editor.availableTags == 'undefined') {
		this.editor.availableTags = [ "SELECT", "FROM", "ORDER BY", "WHERE",
				"TOP", "IN", "AND", "OR", "WITH", "DESC", "ASC", "JOIN", "AS",
				"HAVING", "ABS", "GROUP", "BY", "INNER", "OUTER", "CROSS",
				"LEFT", "RIGHT", "FULL", "ON", "USING", "MIN", "MAX", "COUNT",
				"DISTINCT", "ALL", "LIKE", "ACOS", "ASIN", "ATAN", "ATAN2",
				"COS", "SIN", "TAN", "COT", "IS", "NOT", "NULL", "NATURAL",
				"EXISTS", "BETWEEN", "AREA", "BOX", "CENTROID", "CIRCLE",
				"CONTAINS", "COORD1", "COORD2", "COORDSYS", "DISTANCE",
				"INTERSECTS", "POINT", "POLYGON", "REGION" ];
	}

	if (params.servicemode.toLowerCase() == "tap") {
		this.load_metadata_for_autocomplete(this.initial_catalogues);
	} else {
		this.load_metadata_from_html();
	}
}

/**
 * Get the medata content from the HTML data to be used by the auto-completion
 * functions Store the content in the keywords list
 * 
 */
TapAutocomplete.prototype.push_metadata_content_html = function(data) {

	var content = document.createElement('div');
	content.innerHTML = data;
	var tr = content.getElementsByClassName('heading');
	var tr2 = content.getElementsByClassName('expand');
	for (var i = 0; i < tr.length; i++) {
		var str = jQuery.trim(jQuery(tr[i]).justtext());
		var arr = str.split(".");
		for (var y = 0; y < arr.length; y++) {
			this.editor.availableTags.push(arr[y]);
		}
	}
	for (var i = 0; i < tr2.length; i++) {
		if (!contains(this.editor.availableTags, tr2[i].innerHTML)) {
			this.editor.availableTags.push(tr2[i].innerHTML);
		}
	}

};

/**
 * Get the medata content from the Json data to be used by the auto-completion
 * functions Store the content in the keywords list
 * 
 */

TapAutocomplete.prototype.push_metadata_json = function(data) {

	if (data.length > 0) {
		for (var i = 0; i < data.length; i++) {
			var str = jQuery.trim(data[i]);
			var arr = str.split(".");
			for (var y = 0; y < arr.length; y++) {
				this.editor.availableTags.push(arr[y]);
			}
		}
	}

};

/**
 * Run Autocomplete class
 */
TapAutocomplete.prototype.run = function() {
	if (this.servicemode.toLowerCase() == "tap") {
		this.load_metadata_for_autocomplete();
	} else {
		this.load_metadata_from_html();
	}
};

/**
 * Refresh autocomplete
 */
TapAutocomplete.prototype.refresh = function() {
	CodeMirror.commands.autocomplete = function(cm) {
		CodeMirror.tapHint(cm, CodeMirror.adqlHint, {
			webServicePath : this.web_service_path,
			tapResource : this.tap_resource,
			useAutocompleteService : this.istap,
			autocompleteInfo : this.autocomplete_info,
			autocompleteLoader : this.autocomplete_loader
		});
	}

	if (this.servicemode.toLowerCase() == "tap") {
		this.load_metadata_for_autocomplete();
	} else {
		this.load_metadata_from_html();
	}
};

/**
 * Load catalogue tables
 * 
 */
TapAutocomplete.prototype.load_catalogue_tables = function(catalogue_list) {

	if (this.servicemode.toLowerCase() == "tap") {
		this.load_metadata_for_autocomplete(catalogue_list);
	} else {
		this.load_metadata_from_html();
	}
};

/**
 * Load metadata for autocomplete from HTML resource. Talks with a Web service
 * that fetches the initial list of keywords
 * 
 */
TapAutocomplete.prototype.load_metadata_from_html = function() {
	_this = this;

	if (_this.autocomplete_info)
		jQuery("#" + _this.autocomplete_info).html(
				"Loading catalogue metadata keywords for auto-complete");
	if (_this.autocomplete_loader)
		jQuery("#" + _this.autocomplete_loader).show();

	/**
	 * Check whether an object (obj) is contained in a list (a)
	 * 
	 */
	function contains(a, obj) {
		var i = a.length;
		while (i--) {
			if (a[i] === obj) {
				return true;
			}
		}
		return false;
	}

	function push_metadata_content_html(data) {
		if (!_this.editor.availableTags) {
			_this.editor.availableTags = [];
		}

		var content = document.createElement('div');
		content.innerHTML = data;
		var tr = content.getElementsByClassName('heading');
		var tr2 = content.getElementsByClassName('expand');
		for (var i = 0; i < tr.length; i++) {
			var str = jQuery.trim(jQuery(tr[i]).text());
			var arr = str.split(".");
			for (var y = 0; y < arr.length; y++) {
				_this.editor.availableTags.push(arr[y]);
			}
		}

		for (var i = 0; i < tr2.length; i++) {
			if (!contains(_this.editor.availableTags, tr2[i].innerHTML)) {
				_this.editor.availableTags.push(tr2[i].innerHTML);
			}
		}

	}

	jQuery.ajax({
		type : "POST",
		async : false,
		data : {
			resource : _this.html_resource,
			mode : "vosi"
		},
		url : _this.web_service_path,
		timeout : 1000000,
		error : function() {
			if (_this.autocomplete_info)
				jQuery("#" + _this.autocomplete_info).html(
						"CTRL + Space to activate auto-complete");
			if (_this.autocomplete_loader)
				jQuery("#" + _this.autocomplete_loader).hide();

		},
		success : function(data) {

			if (data != "") {
				push_metadata_content_html(data);
			}
			if (_this.autocomplete_info)
				jQuery("#" + _this.autocomplete_info).html(
						"CTRL + Space to activate auto-complete");
			if (_this.autocomplete_loader)
				jQuery("#" + _this.autocomplete_loader).hide();

		}
	});
};

/**
 * Load metadata for autocomplete. Talks with a Web service that fetches the
 * initial list of keywords
 * 
 */
TapAutocomplete.prototype.load_metadata_for_autocomplete = function(
		optional_catalogues) {
	_this = this;

	optional_catalogues = (typeof optional_catalogues === 'undefined') ? []
			: optional_catalogues;

	if (_this.autocomplete_info)
		jQuery("#" + _this.autocomplete_info).html(
				"Loading catalogue metadata keywords for auto-complete");
	if (_this.autocomplete_loader)
		jQuery("#" + _this.autocomplete_loader).show();

	function push_metadata_json(data) {
		if (data.length > 0) {
			for (var i = 0; i < data.length; i++) {
				var str = jQuery.trim(data[i]);
				var arr = str.split(".");
				for (var y = 0; y < arr.length; y++) {
					_this.editor.availableTags.push(arr[y]);
				}
			}
		}

	}

	optional_catalogues = JSON.stringify(optional_catalogues);
	jQuery.ajax({
		type : "POST",
		async : false,
		data : {
			resource : _this.tap_resource,
			optional_catalogues : optional_catalogues,
			mode : "tap",
		},
		url : _this.web_service_path,
		timeout : 1000000,
		error : function(e) {
			if (_this.autocomplete_info)
				jQuery("#" + _this.autocomplete_info).html(
						"CTRL + Space to activate auto-complete");
			if (_this.autocomplete_loader)
				jQuery("#" + _this.autocomplete_loader).hide();
		},
		success : function(data) {

			if (data != "") {
				push_metadata_json(data);
			}
			if (_this.autocomplete_info)
				jQuery("#" + _this.autocomplete_info).html(
						"CTRL + Space to activate auto-complete");
			if (_this.autocomplete_loader)
				jQuery("#" + _this.autocomplete_loader).hide();
		}
	});

};
