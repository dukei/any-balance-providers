package com.dukei.android.extension.anybalance.dashclock;

import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import android.preference.ListPreference;
import android.preference.Preference;
import android.preference.PreferenceScreen;
import android.text.TextUtils;
import android.util.Pair;

import com.dukei.android.lib.anybalance.AccountEx;
import com.dukei.android.lib.anybalance.Counter;

public class Misc {
	/**
	 * Заполняем списки счетчиков в PreferenceScreen возможными значениями
	 * 
	 * @param ps
	 * @param acc
	 *            - может быть null
	 */
	public static void initializeCounterListPreferences(PreferenceScreen ps, AccountEx acc) {
		String[] names = null;
		String[] values = null;

		if(acc != null){
			List<Counter> counters = acc.getCounters();
			int reserved = 1;
			Pair<String[], String[]> namevals = addAccountCounters(counters, reserved, acc, null);
			names = namevals.first;
			values = namevals.second;

			names[0] = ps.getContext().getString(R.string.hide_this_counter);
			values[0] = "";
		} else {
			names = new String[] { ps.getContext().getString(R.string.hide_this_counter) };
			values = new String[] { "" };
		}
		
		Preference pref = null;
		for (int i = 0; (pref = ps.findPreference("counter" + i)) != null; ++i) {
			ListPreference lp = (ListPreference) pref;
			lp.setEntries(names);
			lp.setEntryValues(values);
		}
	}

	private static Pair<String[], String[]> addAccountCounters(List<Counter> counters, int reserved, AccountEx acc, String prefix) {
		TreeMap<String, String> map = new TreeMap<String, String>(String.CASE_INSENSITIVE_ORDER);
		for (Counter counter : counters) {
			if(!counter.isTariff()) //The counter without name is __tariff. Skipping it.
				map.put(counter.getName(), counter.getKey());
		}

		String[] names = new String[map.size() + reserved];
		String[] values = new String[map.size() + reserved];

		addAccountCounters(map, reserved, acc, names, values, prefix);
		return new Pair<String[], String[]>(names, values);
	}

	private static void addAccountCounters(TreeMap<String, String> map, int startIndex, AccountEx acc, String[] names, String[] values, String prefix) {
		int i = startIndex;
		for (Map.Entry<String, String> entry : map.entrySet()) {
			String name = entry.getKey();
			if (acc != null) {
				String curval = acc.getValueDisplay(entry.getValue());
				if (curval == null)
					curval = "?";
				name += " [" + curval + "]";
			}
			names[i] = prefix == null ? name : prefix + name;
			values[i] = entry.getValue();
			++i;
		}
	}

	public static void initializeAccountListPreferences(List<AccountEx> list, ListPreference lp) {
		if(list.isEmpty()){
			lp.setEnabled(false);
		}else{
			String[] names = new String[list.size()];
			String[] values = new String[list.size()];
	
			int i=0;
			for(Iterator<AccountEx> it=list.iterator(); it.hasNext();++i){
				AccountEx acc = it.next();
				names[i] = acc.getName();
				values[i] = Long.toString(acc.getId());
			}
			
			lp.setEntries(names);
			lp.setEntryValues(values);
			lp.setEnabled(true);
		}
	}
	
	public static AccountEx findAccount(List<AccountEx> accs, long id){
		AccountEx sel = null;
		for(Iterator<AccountEx> it=accs.iterator(); it.hasNext();){
			AccountEx acc = it.next();
			if(acc.m_id == id){
				sel = acc;
				break;
			}
		}
		return sel;
	}
	
	/*
	 * Set initial settings for counters for an account preference screen
	 */
	public static void initializeCountersForAccount(PreferenceScreen ps, AccountEx acc){
		List<Counter> counters = acc.getCounters();
		Preference pref;
		int i=0;
		for (Iterator<Counter> it=counters.iterator(); it.hasNext() && (pref = ps.findPreference("counter" + i)) != null; ++i) {
			Counter c = it.next();
			if(c.isTariff()){ //The counter without name is __tariff. Skipping it.
				--i; continue;
			}
			
			ListPreference lp = (ListPreference) pref;
			lp.setValue(c.getKey());
		}
		for (; (pref = ps.findPreference("counter" + i)) != null; ++i) {
			ListPreference lp = (ListPreference) pref;
			lp.setValue("");
		}
		
	}

	/**
	 * Method to join array elements of type string
	 * 
	 * @author Dmitry Kochin <dco@mail.ru>
	 * @param inputArray
	 *            Array which contains strings
	 * @param glueString
	 *            String between each array element
	 * @return String containing all array elements separated by glue string
	 */
	public static <T extends Iterable> String implode(T inputArray, String glueString) {
		StringBuilder sb = new StringBuilder();
		boolean appended = false;
		for (Object obj : inputArray) {
			if (appended)
				sb.append(glueString);
			else
				appended = true;
			sb.append(obj.toString());

		}

		String output = sb.toString();
		return output;
	}
}
