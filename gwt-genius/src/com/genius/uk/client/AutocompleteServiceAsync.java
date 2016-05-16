package com.genius.uk.client;

import javax.servlet.Servlet;

import com.google.gwt.user.client.rpc.AsyncCallback;
import com.google.gwt.user.client.rpc.RemoteService;
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath;

/**
 * The async counterpart of <code>AutocompleteService</code>.
 */
public interface AutocompleteServiceAsync{
	void autocompleteServer(String input, AsyncCallback<String> callback) throws IllegalArgumentException;
}
