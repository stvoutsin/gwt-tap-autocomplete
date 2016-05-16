package com.genius.uk.client;

import com.google.gwt.user.client.rpc.RemoteService;
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath;

/**
 * The client-side stub for the RPC service.
 */
@RemoteServiceRelativePath("autocomplete")
public interface AutocompleteService extends RemoteService {
	String autocompleteServer(String name) throws IllegalArgumentException;
}
