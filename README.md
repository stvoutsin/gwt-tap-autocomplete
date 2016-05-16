# tap-autocomplete
Autocomplete library, wrapped in GWT sample project, that allows dynamic metadata keyword loading from TAP services 

# Usage Example:  

var params = { <br>     
    textfieldid: "textfield",<br>
    web_service_path: 'genius/autocompleteAsync',<br>
  	tap_resource: 'https://gaia.esac.esa.int/tap-server/tap/', <br>
    servicemode: "TAP"<br>
} 

var autocompleteInstance = new TapAutocomplete(params);
