del provider.zip
adb.exe -e shell md /sdcard/AnyBalance
"C:\Program Files\7-zip\7z.exe" a provider.zip anybalance-manifest.xml icon.png main.js preferences.xml history.xml library.js
adb.exe push provider.zip /sdcard/AnyBalance/provider.zip