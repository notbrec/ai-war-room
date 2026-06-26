@echo off
title AI WAR ROOM - Building for Netlify...
cd /d "%~dp0"

echo.
echo  ==========================================
echo   AI WAR ROOM - Netlify Build
echo  ==========================================
echo.
echo  Building... (ovo traje 15-30 sekundi)
echo.

call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [GRESKA] Build nije uspio!
    echo  Provjeri greske iznad.
    echo.
    pause
    exit /b 1
)

echo.
echo  ==========================================
echo   BUILD USPJESAN!
echo  ==========================================
echo.
echo  Tvoj "dist" folder je spreman za Netlify.
echo.
echo  KORACI:
echo  1. Idi na: https://app.netlify.com/drop
echo  2. Prevuci "dist" folder na stranicu
echo  3. Gotovo!
echo.
echo  Folder se nalazi ovdje:
echo  %~dp0dist
echo.

start "" explorer "%~dp0dist"

pause
