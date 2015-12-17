@echo off
echo **************************************************
echo Compressing JavaScript...
echo **************************************************

SET yuicompressor=java -jar yuicompressor-2.4.8.jar --line-break 0 
SET gclco=java -jar compiler.jar --language_in ECMASCRIPT6 --language_out ECMASCRIPT5 --charset utf-8 
rem --formatting pretty_print 

copy /b header.js + xregexp.js + html.js + library.js library_tmp.js

for %%d in ("library_tmp.js", "nadapter.js") do (
  rem  %yuicompressor% -o "%%~nd.min.js" "%%d"
  %gclco% --js "%%d" > "%%~nd.min.js"
  echo -------------------------------------
  echo %%~nxd was %%~zd bytes
  for %%a in (%%~nd.min.js) do echo and now it is %%~za bytes
)

for /D %%d in ("..\ab-stark-typical-provider\"      ^
      "..\ab-typical-provider\"                     ^
      "..\ab-nadapter-typical-provider\"            ^
      "..\ab-test-rand\"                            ^
      "..\"                                         ^
      ) do (
  copy /Y library_tmp.min.js %%~pdlibrary.js
)

for /D %%d in ("..\"								^
      "..\ab-nadapter-typical-provider\"            ^
	  ) do (
  copy /Y nadapter.min.js "%%~pd"nadapter.js
)

del *.min.js
del *_tmp.js
