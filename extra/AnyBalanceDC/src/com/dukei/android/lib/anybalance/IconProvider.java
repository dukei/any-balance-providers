package com.dukei.android.lib.anybalance;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.util.Date;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.UriMatcher;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Bitmap.CompressFormat;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Rect;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.text.TextUtils;
import android.util.Base64;

public class IconProvider extends ContentProvider {
	public static class MetaData{
		public static final String AUTHORITY = "com.dukei.android.provider.texticon";
		
		// inner class describing Account Icon
		public static final class Icon implements OpenableColumns{
			// uri and MIME type definitions
			public static final Uri CONTENT_URI = Uri.parse("content://" + AUTHORITY + "/icon");
			public static final String CONTENT_ITEM_TYPE = "image/png,image/gif,image/jpeg";
		}

	}

	@Override
	public boolean onCreate() {
		// TODO Auto-generated method stub
		return true;
	}

	@Override
	public Cursor query(Uri uri, String[] projection, String selection,
			String[] selectionArgs, String sortOrder) {
		throw new UnsupportedOperationException("query is not supported");
	}

	@Override
	public String getType(Uri uri) {
		String type = uri.getQueryParameter("type");
		if("png".equals(type))
			return "image/png";
		if("webp".equals(type))
			return "image/webp";
		if("jpg".equals(type))
			return "image/jpeg";
		return "image/png";
	}

	@Override
	public Uri insert(Uri uri, ContentValues values) {
		throw new UnsupportedOperationException("insert is not supported");
	}

	@Override
	public int delete(Uri uri, String selection, String[] selectionArgs) {
		throw new UnsupportedOperationException("delete is not supported");
	}

	@Override
	public int update(Uri uri, ContentValues values, String selection,
			String[] selectionArgs) {
		throw new UnsupportedOperationException("update is not supported");
	}
	
	@Override
	public ParcelFileDescriptor openFile (Uri uri, String mode) throws FileNotFoundException{
		switch (sUriMatcher.match(uri)) {
		case INCOMING_TEXTICON_URI_INDICATOR:
			try{
				String text = uri.getQueryParameter("text");
				if(TextUtils.isEmpty(text))
					throw new IllegalArgumentException("text parameter can not be empty!");
				
				String fname = "img_" + Base64.encodeToString(uri.getQuery().getBytes(), Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING) + getType(uri).replace("image/", ".");
				File file = new File(getContext().getCacheDir().getAbsolutePath() + '/' + fname);
				if(!file.exists()){
				    String color = uri.getQueryParameter("color");
				    int c = color == null ? 0xFF000000 : Integer.valueOf(color, 16);
					
					Paint p = new Paint();
					Rect bounds = new Rect();
					
					p.setColor(c);
					p.setAntiAlias(true);
					p.setTextSize(72);
					p.setStrokeWidth(3);
					p.getTextBounds(text, 0, text.length(), bounds); 
					
					int dim = Math.max(bounds.width(), bounds.height());
				    Bitmap mutableBitmap = Bitmap.createBitmap(dim, dim, Bitmap.Config.ARGB_8888);
				    Canvas canvas = new Canvas(mutableBitmap);
				    canvas.drawText(text, -bounds.left, -bounds.top + (dim-bounds.height())/2, p);
				    
				    FileOutputStream fos = new FileOutputStream(file);
				    mutableBitmap.compress(CompressFormat.PNG, 60, fos);
				    file = file.getAbsoluteFile();
				}else{
			    	file.setLastModified(new Date().getTime());
				}
				
				if(Math.random() < 0.05) // Иногда удаляем старые файлы
					purgeCache(3);
				
			    return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
			}catch(AnyBalanceException e){
				throw new IllegalArgumentException(e.getMessage());
			}

		}
		return null;
	}
	
	private void purgeCache(int numDays) {
		File directory = getContext().getCacheDir();
		File[] fList = directory.listFiles();

		if (fList != null) {
			for (File file : fList) {
				if (file.isFile() && file.getName().startsWith("img_")) {

					long diff = new Date().getTime() - file.lastModified();
					long cutoff = (numDays * (24 * 60 * 60 * 1000));

					if (diff > cutoff) {
						file.delete();
					}
				}
			}
		}
	}
	
	// Provide a mechanism to identify all the incoming uri patterns.
	private static final UriMatcher sUriMatcher;
	private static final int INCOMING_TEXTICON_URI_INDICATOR = 1;

	static {
		sUriMatcher = new UriMatcher(UriMatcher.NO_MATCH);
		sUriMatcher.addURI(MetaData.AUTHORITY, "icon", INCOMING_TEXTICON_URI_INDICATOR);
	}
}
