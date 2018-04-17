if defined ABROOT goto runit
set ABROOT=..\..
:runit
cscript "%ABROOT%\extra\development\tools\x.wsf"
