package com.dukei.android.lib.anybalance;

import org.json.JSONObject;

public class Counter {
	JSONObject m_data;
	
	public Counter(JSONObject json){
		m_data = json;
	}

	public String getName() {
		return m_data.optString("name");
	}

	public String getKey() {
		return m_data.optString("key");
	}

	public String getValueDisplay() {
		return m_data.optString("valueDisplay");
	}
	
	public String getValueNoUnits() {
		return m_data.optString("valueNoUnits");
	}
	
	public boolean isInactive() {
		return m_data.optBoolean("inactive");
	}
	
	public boolean isTariff(){
		return "__tariff".equals(getKey());
	}
}
