package com.genius.uk.server;

import javax.servlet.annotation.WebServlet;
import java.io.IOException;
import java.io.PrintWriter;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.json.JSONArray;
import org.json.JSONException;
import uk.ac.starlink.table.RowSequence;
import uk.ac.starlink.table.StarTable;
import uk.ac.starlink.table.StoragePolicy;
import uk.ac.starlink.table.TableFormatException;
import uk.ac.starlink.util.URLDataSource;
import uk.ac.starlink.votable.VOTableBuilder;

/**
 * The server-side implementation of the  Autocomplete service.
 */
@SuppressWarnings("serial")
@WebServlet(name = "AutocompleteImplAsync", urlPatterns = { "/autocompleteAsync" })
public class AutocompleteServiceImplAsync extends HttpServlet {

	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse res) throws ServletException, IOException {
		handleRequest(req, res);
	}

	@Override
	protected void doPost(HttpServletRequest req, HttpServletResponse res) throws ServletException, IOException {
		handleRequest(req, res);

	}

	/**
	 * Handle a request for the Autocomplete Service
	 * Run a TAP synchronous query to the TAP_SCHEMA to fetch all keywords according to the input
	 * 
	 * @param req
	 * @param res
	 * @throws IOException
	 */
	public void handleRequest(HttpServletRequest req, HttpServletResponse res) throws IOException {

		res.setContentType("application/json");
		res.setCharacterEncoding("UTF-8");
		
		PrintWriter out = res.getWriter();

		// Gather parameters
		
		String keyword = (req.getParameter("keyword") == null) ? "" : req.getParameter("keyword");
		@SuppressWarnings("unused")
		String mode = (req.getParameter("mode") == null) ? "" : req.getParameter("mode");
		String keyword_type = (req.getParameter("keyword_type") == null) ? "" : req.getParameter("keyword_type");
		String optional_keyword = (req.getParameter("optional_keyword") == null) ? ""
				: req.getParameter("optional_keyword");
		String optional_catalogues = (req.getParameter("optional_catalogues") == null) ? ""
				: req.getParameter("optional_catalogues");
		String query = "";
		String resource = (req.getParameter("resource") == null) ? ""
				: req.getParameter("resource");
		String tapService = resource;
		String getRequestString = "/sync?REQUEST=doQuery&VERSION=1.0&FORMAT=VOTABLE&LANG=ADQL&QUERY=";

		JSONArray array = new JSONArray();

		//Number of dots
		int count_dots = keyword.length() - keyword.replace(".", "").length();
		
		// If the keyword_type schema is passed, check tables from TAP_SCHEMA for keyword or optional_keyword 
		if (keyword_type.toLowerCase() == "schema") {
			query = "SELECT table_name FROM TAP_SCHEMA.tables WHERE schema_name='" + keyword + "'";
			if (optional_keyword != null && optional_keyword != "") {
				query += " AND (table_name LIKE '" + optional_keyword + "%' OR table_name LIKE '" + keyword + "."
						+ optional_keyword + "%')";
			}
			String queryURLStr = tapService + getRequestString
					+ URLEncoder.encode(query, "UTF-8");
			array = starTableToJSONArray(urlToStartable(queryURLStr));
			if (optional_keyword != null && optional_keyword != "") {
				array = filter_name(array, optional_keyword);
			}
		
		// If the keyword_type table is passed, check columns from TAP_SCHEMA for keyword or optional_keyword 
		} else if (keyword_type.toLowerCase() == "table" || (count_dots >= 2)) {

			query = "SELECT column_name FROM TAP_SCHEMA.columns WHERE table_name LIKE '%." + keyword
					+ "' OR  table_name='" + keyword + "'";
			if (optional_keyword != null && optional_keyword != "") {
				query += " AND (column_name LIKE '" + optional_keyword + "%' OR column_name LIKE '" + keyword + "."
						+ optional_keyword + "%')";
			}
			String queryURLStr = tapService + getRequestString
					+ URLEncoder.encode(query, "UTF-8");
			array = starTableToJSONArray(urlToStartable(queryURLStr));

		// If no keyword is not empty, Check tables, and then columns if no tables found with keyword
		// (A table name in TAP_SCHEMA may look like schema.tablename or tablename, need to find either)
		} else if (keyword != "") {

			query = "SELECT table_name FROM TAP_SCHEMA.tables WHERE schema_name='" + keyword + "'";
			if (optional_keyword != null && optional_keyword != "") {
				query += " AND (table_name LIKE '" + optional_keyword + "%' OR table_name LIKE '" + keyword + "."
						+ optional_keyword + "%')";
			}
			
			String queryURLStr = tapService + getRequestString
					+ URLEncoder.encode(query, "UTF-8");
			array = starTableToJSONArray(urlToStartable(queryURLStr));
			
			// No tables foundm check columns for keyword
			if (array.length() <= 0) {

				query = "SELECT column_name FROM TAP_SCHEMA.columns WHERE table_name LIKE '%." + keyword
						+ "' OR  table_name='" + keyword + "'";
				if (optional_keyword != null && optional_keyword != "") {
					query += " AND (column_name LIKE '" + optional_keyword + "%' OR column_name LIKE '" + keyword + "."
							+ optional_keyword + "%')";

				}
				queryURLStr = tapService + getRequestString
						+ URLEncoder.encode(query, "UTF-8");
				array = starTableToJSONArray(urlToStartable(queryURLStr));

			}

			if (optional_keyword != null && optional_keyword != "") {
				array = filter_name(array, optional_keyword);
			}

		} else {
			// No keyword found, get initial list of schemas or tables
			try {
				JSONArray json_array = null;
				if (optional_catalogues != "" && optional_catalogues != null) {
					json_array = new JSONArray(optional_catalogues);
				}
				
				if (json_array.length()>0) {
				
					for (int i = 0; i < json_array.length(); i++) {

						query = "SELECT t.table_name, s.schema_name FROM TAP_SCHEMA.tables as t, TAP_SCHEMA.schemas as s WHERE t.schema_name='" + json_array.get(i)
								+ "'";
						String queryURLStr = tapService + getRequestString
								+ URLEncoder.encode(query, "UTF-8");
						JSONArray newArray = starTableToJSONArray(urlToStartable(queryURLStr));
						for (int y = 0; y < newArray.length(); y++) {
							array.put(newArray.get(y));
						}
					}

				} else {
					query = "SELECT schema_name FROM TAP_SCHEMA.schemas";
					String queryURLStr = tapService + getRequestString
							+ URLEncoder.encode(query, "UTF-8");
					array = starTableToJSONArray(urlToStartable(queryURLStr));

				}

			} catch (JSONException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}

		out.print(array);
		out.flush();
	}

	
	/**
	 * Given a query URL (tap/sync?...), generate a StarTable
	 * 
	 * @param queryURLStr
	 * @return StarTable star
	 * @throws TableFormatException
	 * @throws IOException
	 */
	public StarTable urlToStartable(String queryURLStr) throws TableFormatException, IOException {
		URL queryURL = new URL(queryURLStr);
		URLDataSource source = new URLDataSource(queryURL);
		VOTableBuilder builder = new VOTableBuilder();
		StarTable star = builder.makeStarTable(source, false, StoragePolicy.getDefaultPolicy());
		return star;
	}

	
	/**
	 * Get a JSONArray from a Startable
	 * 
	 * @param star
	 * @return JSONArray array
	 */
	public JSONArray starTableToJSONArray(StarTable star) {

		ArrayList<String[]> keyword_list = new ArrayList<String[]>();

		JSONArray array = new JSONArray();
		int nCol = star.getColumnCount();
		RowSequence rseq;
		try {
			rseq = star.getRowSequence();

			while (rseq.next()) {
				Object[] row = rseq.getRow();
				for (int icol = 0; icol < nCol; icol++) {
					keyword_list.add(new String[] { (String) row[icol] });
				}
			}
			rseq.close();
			array = new JSONArray(keyword_list);
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		return array;
	}

	
	/**
	 * Filter a JSONArray for a keyword, return list where elements (split by '.' in case of 'schema.tablename') match keyword
	 * @param original_list
	 * @param keyword
	 * @return
	 */
	public JSONArray filter_name(JSONArray original_list, String keyword) {

		JSONArray filtered_list = new JSONArray();

		for (int i = 0; i < original_list.length(); i++) {

			String string_value = "";
			try {

				String[] item_arr = (String[]) original_list.get(i);
				String item = item_arr[0];

				// Grab the last segment
				string_value = item.substring(item.lastIndexOf(".") + 1);

			} catch (Exception e) {
				e.printStackTrace();
			}

			if (keyword != "") {
				if (string_value.toLowerCase().startsWith(keyword.toLowerCase())) {
					filtered_list.put(string_value);
				}
			} else {
				if (string_value != "") {
					filtered_list.put(string_value);
				}
			}
		}

		return filtered_list;

	}

}
