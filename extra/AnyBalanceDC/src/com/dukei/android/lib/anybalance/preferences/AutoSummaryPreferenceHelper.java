package com.dukei.android.lib.anybalance.preferences;

import java.util.HashMap;

import android.content.SharedPreferences;
import android.os.Build;
import android.preference.EditTextPreference;
import android.preference.ListPreference;
import android.preference.Preference;
import android.preference.PreferenceActivity;
import android.preference.PreferenceGroup;
import android.text.InputType;
import android.text.TextUtils;

public class AutoSummaryPreferenceHelper {
	private HashMap<String, Format> m_initialSummaries;

	public AutoSummaryPreferenceHelper() {
		m_initialSummaries = new HashMap<String, Format>();
	}

	protected static class Format {
		String ifEmpty;
		String ifNotEmpty;
		String description;
		CharSequence original;

		public Format(CharSequence fmt) {
			original = fmt;
			if (fmt != null) {
				String str = fmt.toString();
				String[] a = str.split("\\|", 3);
				description = a[0].replace("{@s}", "%s");
				if (a.length > 1)
					ifEmpty = a[1].replace("{@s}", "%s");
				if (a.length > 2)
					ifNotEmpty = a[2].replace("{@s}", "%s");
			}
		}

		public String format(CharSequence value) {
			String out = "";
			if (TextUtils.isEmpty(value)) {
				if (!TextUtils.isEmpty(ifEmpty))
					out = ifEmpty;
			} else {
				if (!TextUtils.isEmpty(ifNotEmpty))
					out = String.format(ifNotEmpty, value);
			}
			out += String.format(description, value);
			return out;
		}
	}

	/**
	 * �?нициализирует невидимые элементы
	 * @param pGroup
	 */
	public void setInitialSummaries(PreferenceGroup pGroup) {
		// Setup the initial values
		for (int i = 0; i < pGroup.getPreferenceCount(); i++) {
			Preference pref = pGroup.getPreference(i);
			if (pref instanceof PreferenceGroup) {
				setInitialSummaries((PreferenceGroup) pref, true);
			} else {
				setInitialSummary(pref);
			}
		}
	}
	
	public void setInitialSummary(Preference pref){
		if (pref instanceof EditTextPreference || pref instanceof ListPreference) {
			setInitialSummary(pref, true);
		}		
	}

	

	public void setInitialSummaries(PreferenceGroup pGroup, boolean init) {
		// Setup the initial values
		for (int i = 0; i < pGroup.getPreferenceCount(); i++) {
			Preference pref = pGroup.getPreference(i);
			if (pref instanceof PreferenceGroup) {
				setInitialSummaries((PreferenceGroup) pref, init);
			} else {
				setInitialSummary(pref, init);
			}
		}
	}
	
	public void setInitialSummary(Preference pref, boolean init){
		if (pref instanceof EditTextPreference
				|| pref instanceof ListPreference) {
			if (init) {
				String key = pref.getKey();
				if (!TextUtils.isEmpty(key)) {
					CharSequence sum = pref.getSummary();
					if (sum != null)
						m_initialSummaries.put(key, new Format(sum));
				}
			}
			setSummary(pref);
		}		
	}

	public void setSummaries(PreferenceGroup pGroup) {
		setInitialSummaries(pGroup, false);
	}

	public void setSummary(Preference pref) {
		String key = pref.getKey();
		if (key == null)
			return;

		Format fmt = m_initialSummaries.get(pref.getKey());
		if (fmt == null)
			return;

		if (pref instanceof ListPreference) {
			ListPreference listPref = (ListPreference) pref;
			String sum = onFormatSummary(pref,
					escapePercent(listPref.getEntry()), fmt);
			pref.setSummary(sum);
		} else if (pref instanceof EditTextPreference) {
			EditTextPreference etPref = (EditTextPreference) pref;
			String val = etPref.getText();
			if (etPref.getEditText().getInputType() == (InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD)) {
				if (!TextUtils.isEmpty(val)) {
					val = "******";
				}
			}
			String sum = onFormatSummary(pref, escapePercent(etPref.getText()),
					fmt);
			pref.setSummary(sum);
		}

	}

	public static CharSequence escapePercent(CharSequence sum) {
		if (TextUtils.isEmpty(sum))
			return sum;

		// На хоникомбе сделана тупость в виде передачи саммари в String.Format.
		// Вот ведь козлы.
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB) {
			String sumS = sum.toString();
			sum = sumS.replace("%", "%%");
		}
		return sum;
	}

	/**
	 * You can override it for custom behaviour
	 * 
	 * @param pref
	 * @param value
	 * @param fmt
	 * @return
	 */
	protected String onFormatSummary(Preference pref, CharSequence value,
			Format fmt) {
		return fmt.format(value);
	}

	public void onSharedPreferenceChanged(PreferenceActivity pa,
			SharedPreferences sharedPreferences, String key) {
		Preference pref = pa.findPreference(key);
		if (pref != null)
			setSummary(pref);
	}

}
