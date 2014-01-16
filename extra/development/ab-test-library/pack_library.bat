@echo off
echo **************************************************
echo Compressing JavaScript...
echo **************************************************

SET yuicompressor=java -jar yuicompressor-2.4.8.jar 

for %%d in ("library.js") do (
  %yuicompressor% --line-break 0 -o "%%~nd.min.js" "%%d"
  echo -------------------------------------
  echo %%~nxd was %%~zd bytes
  for %%a in (%%~nd.min.js) do echo and now it is %%~za bytes
)

for /D %%d in ("..\ab-stark-typical-provider\"      ^
      "..\ab-typical-provider\"                     ^
      "..\"                                         ^
      ) do (
  copy /Y library.min.js %%~pdlibrary.js
)

del library.min.js
