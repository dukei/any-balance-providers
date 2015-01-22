package com.dukei.android.extension.anybalance.dashclock;

import java.io.InputStream;
import java.util.ArrayList;

import android.content.ComponentName;
import android.content.ContentUris;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.preference.PreferenceManager;
import android.text.TextUtils;

import com.dukei.android.lib.anybalance.AccountEx;
import com.dukei.android.lib.anybalance.AnyBalanceProvider;
import com.dukei.android.lib.anybalance.Counter;
import com.dukei.android.lib.anybalance.IconProvider;
import com.google.android.apps.dashclock.api.DashClockExtension;
import com.google.android.apps.dashclock.api.ExtensionData;

abstract class Extension extends DashClockExtension {
    private static final String TAG = "Extension";
    private static final int MAX_COUNTERS = 7;
    
    protected abstract int getSN();

    @Override
	protected void onInitialize(boolean isReconnect) {
		super.onInitialize(isReconnect);
		
		addWatchContentUris(new String[] {
			AnyBalanceProvider.MetaData.Account.CONTENT_URI.toString()	
		});
	}

	@Override
    protected void onUpdateData(int reason) {
        // Get preference value.
        SharedPreferences sp = getSharedPreferences("prefs" + getSN(), 0);
        long accId = Long.valueOf(sp.getString("account", "0"));
        AccountEx acc = null;
        if(accId != 0)
        	acc = AnyBalanceProvider.getAccountEx(this, accId);
        
        Counter mainCnt = null;
        String description = "";
        if(acc != null){
	        String mainCntId = sp.getString("counter0", "");
	        if(!TextUtils.isEmpty(mainCntId)){
	        	mainCnt = acc.getCounterByKey(mainCntId);
	        }
	        
	        description = joinCounters(acc, sp);
        }else if(accId != 0){
        	description = "Account is deleted. Please choose new account";
        }else{
        	description = "Please choose an AnyBalance account to show here";
        }
        
        Intent i = new Intent();
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        i.setAction(Intent.ACTION_VIEW);
        i.setComponent(ComponentName.unflattenFromString("com.dukei.android.apps.anybalance/com.dukei.android.apps.anybalance.AnyBalanceActivity"));
        
        ExtensionData ex = new ExtensionData()
	        .visible(true)
	        .status(mainCnt != null ? mainCnt.getValueDisplay() : "AnyBalance")
	        .expandedTitle(acc != null ? acc.getName() + (acc.isError() ? "*" : "") : "AnyBalance")
	        .expandedBody(description)
	        .clickIntent(i);
        
        String ic = sp.getString("icon", "name");
        if(acc == null || "app".equals(ic) || TextUtils.isEmpty(acc.getName())){
	        ex.icon(R.drawable.logo2);
        }else if("name".equals(ic)){
            ex.iconUri(IconProvider.MetaData.Icon.CONTENT_URI.buildUpon().appendQueryParameter("text", acc.getName().substring(0, 2)).appendQueryParameter("type","png").build());
        }else if("acc".equals(ic)){
        	ex.iconUri(ContentUris.withAppendedId(AnyBalanceProvider.MetaDataIcon.AccountIcon.CONTENT_URI, accId));
        }else{
	        ex.icon(R.drawable.logo2);
        }
        
        // Publish the extension data update.
        publishUpdate(ex);
    }
	
	private String joinCounters(AccountEx acc, SharedPreferences sp){
        ArrayList<String> values = new ArrayList<String>();
        boolean bUnits = sp.getBoolean("counter_units", true);
        for(int i=0; i<MAX_COUNTERS; ++i){
	        String cntId = sp.getString("counter" + i, "");
	        if(TextUtils.isEmpty(cntId))
	        	continue;
	        
	        Counter cnt = acc.getCounterByKey(cntId);
	        if(cnt != null)
	        	values.add(bUnits ? cnt.getValueDisplay() : cnt.getValueNoUnits());
	        else
	        	values.add("?");
        }
        
        return Misc.implode(values, " | ");
	}
}
