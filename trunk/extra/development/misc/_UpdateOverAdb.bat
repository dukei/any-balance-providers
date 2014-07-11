@echo off
::
:: This little bat script is a simple way to update an already
:: installed provider effortlessly, over ADB, as well as stop
:: AnyBalance before the update, erase the cache and relaunch 
:: after the update. To use, simply copy into your provider 
:: development directory and launch from there.
::
:: IMPORTANT: This script does NOT update the "anybalance.db", 
::            meaning the providers still need to be installed 
::            manually for the first time and each time any 
::            related field, such as <js>...</js> entries, is
::            modified.
::
:: NOTES:
::            * Insecure (rooted) ADB is required.
::            * Always try & test your provider from a clean 
::              install first, before committing into SVN.
::            * Hint - use WiFi ADB to use this script wirelessly.
::

:: anybalance pacakge name
SET package=com.dukei.android.apps.anybalance
SET activity=AnyBalanceActivity

:: set directories naming
SET localdir=%~dp0
SET localdir=%localdir:~0,-1%
for %%f in (%localdir%) do set subdir=%%~nxf
SET providerdir=/data/data/%package%/app_providers/%subdir%
SET cachedir=/data/data/%package%/cache

:: stop the app
echo Stopping %package%...
adb shell am force-stop %package% > NUL

:: adb push the local directory content, delete the bat files (well, this file)
:: and delete the cache directory
echo Updating provider...
adb push %localdir% %providerdir% 2>&1 | find /v "push:"
adb shell rm %providerdir%/*.bat > NUL
adb shell rm -R %cachedir% > NUL

:: restart the app
echo Restarting %package%...
adb shell am start -n %package%/.%activity% > NUL
