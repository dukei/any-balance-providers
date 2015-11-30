/*
Use this file from provider folder only, otherwise it will not work properly
*/
if defined ABROOT goto runit
set ABROOT=..\..
:runit
start wscript %ABROOT%\extra\development\tools\x.wsf