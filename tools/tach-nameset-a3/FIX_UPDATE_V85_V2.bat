@echo off
setlocal EnableExtensions
chcp 65001 >nul
title SUA CAP NHAT DHL NAMESET LAYOUT V8.5 - V2

fltmc >nul 2>&1
if errorlevel 1 (
  echo Dang xin quyen Administrator...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo ================================================
echo   DHL NAMESET LAYOUT V8.5 - FIX UPDATE V2
echo ================================================
echo.

set "PS1=%TEMP%\UPDATE_DHL_NAMESET_V85.ps1"
set "LOG=%TEMP%\DHL_NAMESET_FIX_V2_LOG.txt"
set "URL=https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3/UPDATE_DHL_NAMESET.ps1?v=85fix2"

>"%LOG%" echo DHL V8.5 updater V2 - %date% %time%
>>"%LOG%" echo URL=%URL%
>>"%LOG%" echo PS1=%PS1%

if exist "%PS1%" del /q "%PS1%" >nul 2>&1

echo [1/3] Dang tai updater V8.5 tu GitHub...
where curl.exe >nul 2>&1
if not errorlevel 1 (
  curl.exe -L --fail --silent --show-error -o "%PS1%" "%URL%"
  set "RC=%errorlevel%"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -OutFile '%PS1%'; exit 0 } catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 11 }"
  set "RC=%errorlevel%"
)

if not "%RC%"=="0" (
  >>"%LOG%" echo DOWNLOAD EXIT CODE=%RC%
  goto :FAIL
)
if not exist "%PS1%" (
  >>"%LOG%" echo ERROR=Updater file was not created
  goto :FAIL
)
for %%I in ("%PS1%") do set "SIZE=%%~zI"
if %SIZE% LSS 1000 (
  >>"%LOG%" echo ERROR=Updater too small: %SIZE% bytes
  goto :FAIL
)
echo Da tai updater: %SIZE% bytes
>>"%LOG%" echo DOWNLOADED=%SIZE% bytes

echo.
echo [2/3] Dang chay updater V8.5...
echo ------------------------------------------------
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set "RC=%errorlevel%"
echo ------------------------------------------------
>>"%LOG%" echo UPDATE EXIT CODE=%RC%
if not "%RC%"=="0" goto :FAIL

echo.
echo [3/3] HOAN TAT.
echo Da cap nhat DHL Nameset Layout V8.5.
echo Dong Docker roi mo lai. Neu chua hien V8.5, dong CorelDRAW va mo lai 1 lan.
echo.
pause
exit /b 0

:FAIL
echo.
echo ==================================================
echo CAP NHAT VAN LOI. MA LOI: %RC%
echo ==================================================
echo.
echo Launcher log: %LOG%
if exist "%TEMP%\DHL_NAMESET_UPDATE_LOG.txt" (
  echo.
  echo --- UPDATER LOG ---
  type "%TEMP%\DHL_NAMESET_UPDATE_LOG.txt"
)
echo.
echo --- LAUNCHER LOG ---
if exist "%LOG%" type "%LOG%"
echo.
pause
exit /b 1
