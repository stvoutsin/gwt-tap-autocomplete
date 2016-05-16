# Tap-autocomplete
Autocomplete library, wrapped in GWT sample project, that allows dynamic metadata keyword loading from TAP services 

# Usage Example:  

Javascript:

<pre>

var params = { <br>     
    textfieldid: "textfield",<br>
    web_service_path: 'genius/autocompleteAsync',<br>
  	tap_resource: 'https://gaia.esac.esa.int/tap-server/tap/', <br>
    servicemode: "TAP"<br>
} 

var autocompleteInstance = new TapAutocomplete(params);

</pre>


HTML:  

    <table align="center">
      <tr>
        <td colspan="2" style="font-weight:bold;">Please enter your query:</td>        
      </tr>
      <tr>
        <td id="nameFieldContainer"><textarea id="textfield" class="gwt-TextArea"></textarea></td>
        <td id="sendButtonContainer"></td>
      </tr>
      <tr>
        <td colspan="2" style="color:red;" id="errorLabelContainer"></td>
      </tr>
    </table>
