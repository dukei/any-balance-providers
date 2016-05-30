if defined ABROOT goto runit
set ABROOT=..\..
:runit
start cscript "%ABROOT%\extra\development\tools\x.wsf"
