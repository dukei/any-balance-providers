del provider.zip
"C:\Program Files\7-zip\7z.exe" a provider.zip anybalance-manifest.xml main.js preferences.xml
C:\Android\android-sdk\platform-tools\adb.exe push provider.zip /sdcard/AnyBalance/provider.zip