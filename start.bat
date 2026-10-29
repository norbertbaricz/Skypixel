@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Easy-to-tune launcher settings. Application settings stay in .env.
set "NODE_EXECUTABLE=node"
if not defined SKYPIXEL_PAUSE_ON_ERROR set "SKYPIXEL_PAUSE_ON_ERROR=1"
set "START_EXIT_CODE=1"

pushd "%~dp0" >nul 2>&1
if errorlevel 1 goto directory_error
where "%NODE_EXECUTABLE%" >nul 2>&1
if errorlevel 1 goto missing_node
if /I "%~1"=="--check" goto check_only

"%NODE_EXECUTABLE%" "%~dp0scripts\prepare-start.cjs"
if errorlevel 1 goto preparation_error
echo [Skypixel] Starting the Express server. Press Ctrl+C to stop.
"%NODE_EXECUTABLE%" "%~dp0app.js" %*
set "START_EXIT_CODE=%ERRORLEVEL%"
goto finish

:check_only
"%NODE_EXECUTABLE%" "%~dp0scripts\prepare-start.cjs" --check
set "START_EXIT_CODE=%ERRORLEVEL%"
goto finish

:preparation_error
set "START_EXIT_CODE=%ERRORLEVEL%"
goto finish

:missing_node
echo [Skypixel] Node.js 22.13.0 or newer is required. Install Node.js with npm, then run start.bat again.
set "START_EXIT_CODE=127"
goto finish

:finish
popd
if not "%START_EXIT_CODE%"=="0" if "%SKYPIXEL_PAUSE_ON_ERROR%"=="1" pause
exit /b %START_EXIT_CODE%

:directory_error
echo [Skypixel] Could not open the project directory.
if "%SKYPIXEL_PAUSE_ON_ERROR%"=="1" pause
exit /b 1
