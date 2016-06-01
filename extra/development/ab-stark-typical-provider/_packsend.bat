del provider.zip
adb.exe -e shell md /sdcard/AnyBalance

if defined ABROOT goto runit
set ABROOT=..\..
:runit
cscript "%ABROOT%\extra\development\tools\build\assemble_provider.wsf" "C:\Program Files\7-zip\7z.exe" %1

adb.exe push provider.zip /sdcard/AnyBalance/provider.zip