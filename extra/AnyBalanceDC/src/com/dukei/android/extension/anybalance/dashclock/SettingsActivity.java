package com.dukei.android.extension.anybalance.dashclock;

import java.io.FileNotFoundException;
import java.io.InputStream;
import java.util.Iterator;
import java.util.List;

import android.content.SharedPreferences;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Bundle;
import android.preference.ListPreference;
import android.preference.Preference;
import android.preference.PreferenceActivity;
import android.preference.PreferenceManager;
import android.preference.PreferenceScreen;
import android.view.Menu;
import android.view.MenuItem;

import com.dukei.android.lib.anybalance.AccountEx;
import com.dukei.android.lib.anybalance.AnyBalanceProvider;
import com.dukei.android.lib.anybalance.Counter;
import com.dukei.android.lib.anybalance.IconProvider;
import com.dukei.android.lib.anybalance.preferences.AutoSummaryPreferenceHelper;

abstract class SettingsActivity extends PreferenceActivity {
	private AutoSummaryPreferenceHelper m_asph;
	private List<AccountEx> m_accs;
	
	protected abstract int getSN();
	
	private SharedPreferences.OnSharedPreferenceChangeListener m_spl = new SharedPreferences.OnSharedPreferenceChangeListener() {
		@Override
		public void onSharedPreferenceChanged(SharedPreferences sharedPreferences, String key) {
			if(m_asph != null){
				m_asph.onSharedPreferenceChanged(SettingsActivity.this, sharedPreferences, key);
				if(key.equals("account")){
					syncWithAccount(true);
				}
			}
		}
	};

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
        
		PreferenceManager prefMgr = getPreferenceManager();
		prefMgr.setSharedPreferencesName("prefs" + getSN());
		prefMgr.setSharedPreferencesMode(MODE_PRIVATE);
		
		addPreferencesFromResource(R.xml.widget_preferences_pleasewait);
        
/*        Uri uri = IconProvider.MetaData.Icon.CONTENT_URI.buildUpon().appendQueryParameter("text", "ru").appendQueryParameter("type","png").build();
        InputStream inputStream;
		try {
			inputStream = getContentResolver().openInputStream(uri);
		} catch (FileNotFoundException e) {
			throw new RuntimeException(e);
		}
        Drawable yourDrawable = Drawable.createFromStream(inputStream, uri.toString() );
  */      
        new AccountsGetTask().execute(0);
	}
	
	@Override
	protected void onResume(){
		super.onResume();
		getPreferenceScreen().getSharedPreferences().registerOnSharedPreferenceChangeListener(m_spl);
	}
	
	@Override
	protected void onPause(){
		getPreferenceScreen().getSharedPreferences().unregisterOnSharedPreferenceChangeListener(m_spl);
		super.onPause();
	}
	
	@Override
	public boolean onCreateOptionsMenu(Menu menu) {
		// Inflate the menu; this adds items to the action bar if it is present.
		getMenuInflater().inflate(R.menu.settings, menu);
		return true;
	}

	@Override
	public boolean onOptionsItemSelected(MenuItem item) {
		// Handle action bar item clicks here. The action bar will
		// automatically handle clicks on the Home/Up button, so long
		// as you specify a parent activity in AndroidManifest.xml.
		int id = item.getItemId();
		if (id == R.id.action_settings) {
			return true;
		}
		return super.onOptionsItemSelected(item);
	}
	
	private class AccountsGetTask extends AsyncTask<Integer, Integer, List<AccountEx>> {
		
		protected List<AccountEx> doInBackground(Integer... dummies) {
			List<AccountEx> l = AnyBalanceProvider.getAccountsEx(SettingsActivity.this);
			return l;
		}

		protected void onPostExecute(List<AccountEx> accs) {
			getPreferenceScreen().removeAll();

			addPreferencesFromResource(R.xml.widget_preferences_val7diff);
			
			m_asph = new AutoSummaryPreferenceHelper();
			m_asph.setInitialSummaries(getPreferenceScreen());
			
			m_accs = accs;
			
			ListPreference pAcc = (ListPreference)findPreference("account");

			Misc.initializeAccountListPreferences(accs, pAcc);
			
			long accId = pAcc.getValue() != null ? Long.valueOf(pAcc.getValue()) : 0;
			if(accId == 0 && accs.size() > 0){
				pAcc.setValue(Long.toString(accs.get(0).m_id));
			}else{
				syncWithAccount(false);
			}
		}
	}
	
	private void syncWithAccount(boolean reinitCounters){
		PreferenceScreen ps = getPreferenceScreen();
		long accId = Long.valueOf(ps.getSharedPreferences().getString("account", "0"));
		AccountEx acc = Misc.findAccount(m_accs, accId);
		
		Misc.initializeCounterListPreferences(ps, acc);
		if(reinitCounters)
			Misc.initializeCountersForAccount(ps, acc);
		
		m_asph.setSummaries(ps);
	}
	
	

}
