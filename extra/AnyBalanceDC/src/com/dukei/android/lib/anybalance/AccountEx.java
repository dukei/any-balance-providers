package com.dukei.android.lib.anybalance;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.database.Cursor;
import android.text.TextUtils;
import android.util.Log;

public class AccountEx {
	private static final String TAG = "AccountEx";
	
	public long m_id;
	public String m_name;
	public int m_order;

	public long m_lastChecked;
	private String m_strLastCounters;

	public long m_lastCheckedError;
	private String m_strLastError;
	
	public AccountEx(Cursor cursor){
		if (cursor.isBeforeFirst())
			cursor.moveToFirst();

		int idx = cursor.getColumnIndex(AnyBalanceProvider.MetaData.Account._ID);
		if(idx >= 0) m_id = cursor.getLong(idx);
		
		idx = cursor.getColumnIndex(AnyBalanceProvider.MetaData.Account.NAME);
		if(idx >= 0) m_name = cursor.getString(idx);
		
		idx = cursor.getColumnIndex(AnyBalanceProvider.MetaData.Account.LAST_CHECKED);
		if(idx >= 0) m_lastChecked = cursor.getLong(idx);

		idx = cursor.getColumnIndex(AnyBalanceProvider.MetaData.Account.LAST_CHECKED_ERROR);
		if(idx >= 0) m_lastCheckedError = cursor.getLong(idx);

		idx = cursor.getColumnIndex(AnyBalanceProvider.MetaData.Account.LAST_ERROR);
		if(idx >= 0) m_strLastError = cursor.getString(idx);
		
		idx = cursor.getColumnIndex(AnyBalanceProvider.MetaData.Account.LAST_COUNTERS);
		if(idx >= 0) m_strLastCounters = cursor.getString(idx);

		idx = cursor.getColumnIndex(AnyBalanceProvider.MetaData.Account.ORDER);
		if(idx >= 0) m_order = cursor.getInt(idx);

		try {
			initCounters();
		} catch (JSONException e) {
			throw new AnyBalanceException("Could not initialize counters for account " + m_id, e);
		}
	}
	
	public JSONObject getLastError() {
		return getJSONObject(m_strLastError, JSONField.ERROR);
	}

	public List<Counter> getCounters(){
		return m_countersOrder;
	}
	
	public Counter getCounterByKey(String key){
		return m_mapCounters.get(key);
	}
	
	public String getValueDisplay(String key) {
		Counter c = getCounterByKey(key);
		if(c != null)
			return c.getValueDisplay();
		return c != null ? c.getValueDisplay() : null;
	}
	
	public String getValueNoUnits(String key) {
		Counter c = getCounterByKey(key);
		if(c != null)
			return c.getValueDisplay();
		return c != null ? c.getValueDisplay() : null;
	}

	
	
	
	private enum JSONField {
		COUNTERS, ERROR
	}
	private Map<JSONField, JSONObject> m_mapJSONCache;

	private JSONObject getJSONObject(String str, JSONField what) {
		JSONObject o;
		if (m_mapJSONCache != null && (o = m_mapJSONCache.get(what)) != null)
			return o;

		try {
			if (TextUtils.isEmpty(str))
				o = new JSONObject();
			else
				o = new JSONObject(str);
		} catch (JSONException e) {
			Log.e(TAG, "Cannot parse json: " + str);
			o = new JSONObject();

		}

		if (m_mapJSONCache == null)
			m_mapJSONCache = new HashMap<JSONField, JSONObject>();
		m_mapJSONCache.put(what, o);

		return o;
	}

	public String getName() {
		return m_name;
	}

	public long getId() {
		return m_id;
	}
	
	public boolean isError(){
		return m_lastCheckedError > m_lastChecked;
	}
	
	
	
	
	
	
	
	
	
	
	
	
	private ArrayList<Counter> m_countersOrder;
	private HashMap<String, Counter> m_mapCounters;
	
	private void initCounters() throws JSONException{
		JSONObject data = getLastCounters();
		JSONArray counters = data.optJSONArray("counters");
		
		int size = counters != null ? counters.length() : 0;
		m_countersOrder = new ArrayList<Counter>(size);
		m_mapCounters = new HashMap<String, Counter>(size);
		
		for(int i=0; i<counters.length(); ++i){
			Counter c = new Counter(counters.getJSONObject(i));
			m_countersOrder.add(c);
			m_mapCounters.put(c.getKey(), c);
		}
	}

	private JSONObject getLastCounters() {
		return getJSONObject(m_strLastCounters, JSONField.COUNTERS);
	}

	
	

}
