package com.dukei.android.lib.anybalance;

import java.util.ArrayList;
import java.util.List;

import org.apache.http.client.utils.URIUtils;

import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.BaseColumns;
import android.provider.OpenableColumns;

public class AnyBalanceProvider {
	public static final class MetaDataIcon {
		public static final String AUTHORITY = "com.dukei.android.provider.anybalance.icon";
		
		// inner class describing Account Icon
		public static final class AccountIcon implements OpenableColumns{
			// uri and MIME type definitions
			public static final Uri CONTENT_URI = Uri.parse("content://" + AUTHORITY + "/account-icon");
			public static final String CONTENT_ITEM_TYPE = "image/png,image/gif,image/jpeg";
		}

	}
	
	public static final class MetaData {
		public static final String AUTHORITY = "com.dukei.android.provider.anybalance";
		public static final String DATABASE_NAME = "anybalance.db";
		public static final String PROVIDER_TABLE_NAME = "provider";
		public static final String ACCOUNT_TABLE_NAME = "account";
		public static final String COUNTER_TABLE_NAME = "counter";
		public static final String WIDGET_TABLE_NAME = "widget";
		public static final String ACCLOG_TABLE_NAME = "acclog";
		public static final String NOTIFICATION_TABLE_NAME = "notification";

		// inner class describing Provider Table
		public static final class Provider implements BaseColumns {
			public static final String TABLE_NAME = PROVIDER_TABLE_NAME;
			// uri and MIME type definitions
			public static final Uri CONTENT_URI = Uri.parse("content://"
					+ AUTHORITY + "/providers");
			public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.provider";
			public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.provider";
			// Additional Columns start here.
			public static final String TEXTID = "textid";
			public static final String NAME = "name";
			public static final String FILES = "files";
			public static final String JSFILES = "jsfiles";
			public static final String VERSION = "version";
			public static final String DESCRIPTION = "description";
			public static final String AUTHOR = "author";
			public static final String ORDER = "norder"; // Порядок для чтения!
			public static final String VORDER = "vorder"; // Порядок для записи!

			public static final String DEFAULT_SORT_ORDER = ORDER + " ASC";
		}

		// inner class describing Account Table
		public static final class Account implements BaseColumns {
			public static final String TABLE_NAME = ACCOUNT_TABLE_NAME;
			// uri and MIME type definitions
			public static final Uri CONTENT_URI = Uri.parse("content://"
					+ AUTHORITY + "/accounts");
			public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.account";
			public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.account";
			// Additional Columns start here.
			public static final String PROVIDERID = "providerid";
			public static final String NAME = "account_name";
			public static final String LAST_CHECKED = "last_checked";
			public static final String LAST_COUNTERS = "last_counters";
			public static final String LAST_CHECKED_ERROR = "last_checked_error";
			public static final String LAST_ERROR = "last_error";
			public static final String ORDER = "norder"; // Порядок для чтения!
			public static final String VORDER = "vorder"; // Порядок для записи!
			public static final String DATA = "data";

			public static final String DEFAULT_SORT_ORDER = ORDER + " ASC";
		}

		// inner class describing Account Table which is friendly for export
		public static final class AccountEx implements BaseColumns {
			public static final String TABLE_NAME = ACCOUNT_TABLE_NAME;
			// uri and MIME type definitions
			public static final Uri CONTENT_URI = Uri.parse("content://" + AUTHORITY + "/accounts-ex");
			public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.accountex";
			public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.accountex";
			// Additional Columns start here.
			public static final String PROVIDERID = "providerid";
			public static final String NAME = "account_name";
			public static final String LAST_CHECKED = "last_checked";
			public static final String LAST_COUNTERS = "last_counters";
			public static final String LAST_CHECKED_ERROR = "last_checked_error";
			public static final String LAST_ERROR = "last_error";
			public static final String ICON = "icon";
			public static final String ORDER = "norder"; // Порядок для чтения!

			public static final String DEFAULT_SORT_ORDER = ORDER + " ASC";
		}

		// inner class describing Counter Table
		public static final class Counter implements BaseColumns {
			public static final String TABLE_NAME = COUNTER_TABLE_NAME;
			// uri and MIME type definitions
			public static final Uri CONTENT_URI = Uri.parse("content://"
					+ AUTHORITY + "/counters");
			public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.counter";
			public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.counter";
			// Additional Columns start here.
			public static final String ACCOUNTID = "accountid";
			public static final String TIME = "request_time";
			public static final String COUNTERS = "counters";

			public static final String DEFAULT_SORT_ORDER = _ID + " ASC";
		}

		// inner class describing Widget Table
		public static final class Widget implements BaseColumns {
			public static final String TABLE_NAME = WIDGET_TABLE_NAME;
			// uri and MIME type definitions
			public static final Uri CONTENT_URI = Uri.parse("content://"
					+ AUTHORITY + "/widgets");
			public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.widget";
			public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.widget";
			// Additional Columns start here.
			public static final String ACCOUNTID = "accountid";

			public static final String DEFAULT_SORT_ORDER = _ID + " ASC";
		}

		// inner class describing Acclog Table
		public static final class Acclog implements BaseColumns {
			public static final String TABLE_NAME = ACCLOG_TABLE_NAME;
			// uri and MIME type definitions
			public static final Uri CONTENT_URI = Uri.parse("content://"
					+ AUTHORITY + "/acclogs");
			public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.acclog";
			public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.acclog";
			// Additional Columns start here.
			public static final String TIME = "event_time";
			public static final String ACCOUNTID = "accountid";
			public static final String CATEGORY = "cat";
			public static final String MESSAGE = "message";

			public static final String DEFAULT_SORT_ORDER = _ID + " ASC";
		}

		// inner class describing Notification Table
		public static final class Notification implements BaseColumns {
			public static final String TABLE_NAME = NOTIFICATION_TABLE_NAME;
			// uri and MIME type definitions
			public static final Uri CONTENT_URI = Uri.parse("content://"
					+ AUTHORITY + "/notifications");
			public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.notification";
			public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.notification";
			// Additional Columns start here.
			public static final String TIME = "event_time";
			public static final String ACCOUNTID = "accountid";
			public static final String MESSAGE = "message";

			public static final String DEFAULT_SORT_ORDER = _ID + " ASC";
		}
	}
	
	public static List<AccountEx> getAccountsEx(Context ctx){
		Cursor cursor = ctx.getContentResolver().query(MetaData.AccountEx.CONTENT_URI, null, null, null, null);
		try{
			ArrayList<AccountEx> al = new ArrayList<AccountEx>(cursor == null ? 0 : cursor.getCount());
			if(cursor != null){
				for(cursor.moveToFirst(); !cursor.isAfterLast(); cursor.moveToNext()){
					AccountEx acc = new AccountEx(cursor);
					al.add(acc);
				}
			}
			return al;
		}finally{
			if(cursor != null)
				cursor.close();
		}
	}

	public static AccountEx getAccountEx(Context ctx, long id){
		Cursor cursor = ctx.getContentResolver().query(ContentUris.withAppendedId(MetaData.AccountEx.CONTENT_URI, id), null, null, null, null);
		if(cursor == null)
			return null;
		try{
			cursor.moveToFirst();
			if(cursor.isAfterLast())
				return null;
			return new AccountEx(cursor); 
		}finally{
			cursor.close();
		}
	}
}
