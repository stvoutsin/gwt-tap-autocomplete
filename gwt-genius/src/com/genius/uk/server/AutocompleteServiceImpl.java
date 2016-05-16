package com.genius.uk.server;

import com.genius.uk.client.AutocompleteService;
import com.google.gwt.user.server.rpc.RemoteServiceServlet;

/**
 * The server-side implementation of the RPC service.
 */
@SuppressWarnings("serial")
public class AutocompleteServiceImpl extends RemoteServiceServlet implements AutocompleteService {

	public String autocompleteServer(String input) throws IllegalArgumentException {
		return "";
	}

}
