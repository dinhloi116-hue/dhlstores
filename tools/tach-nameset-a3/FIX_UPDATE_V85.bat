@echo off
setlocal EnableExtensions
chcp 65001 >nul
title SUA CAP NHAT DHL NAMESET LAYOUT V8.5

fltmc >nul 2>&1
if errorlevel 1 (
  echo Dang xin quyen Administrator...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo ================================================
echo   SUA CAP NHAT DHL NAMESET LAYOUT V8.5
echo ================================================
echo.

set "PS1=%TEMP%\UPDATE_DHL_NAMESET.ps1"
set "LOG=%TEMP%\DHL_NAMESET_FIX_UPDATE_LOG.txt"
set "URL=https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3/UPDATE_DHL_NAMESET.ps1"

>"%LOG%" echo DHL V8.5 standalone updater - %date% %time%
>>"%LOG%" echo URL=%URL%
>>"%LOG%" echo PS1=%PS1%

if exist "%PS1%" del /q "%PS1%" >nul 2>&1

echo [1/3] Dang tai updater moi nhat tu GitHub...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri '%URL%?t=' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() -OutFile '%PS1%'; if(-not (Test-Path -LiteralPath '%PS1%')){throw 'Khong tao duoc file updater'}; Write-Host ('Da tai: ' + (Get-Item -LiteralPath '%PS1%').Length + ' bytes') -ForegroundColor Green; exit 0 } catch { Write-Host $_.Exception.Message -ForegroundColor Red; Add-Content -LiteralPath '%LOG%' -Value ('DOWNLOAD ERROR: ' + $_.Exception.ToString()); exit 11 }"
if errorlevel 1 goto :FAIL

echo [2/3] Dang chay updater V8.5...
echo ------------------------------------------------
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set "RC=%errorlevel%"
echo ------------------------------------------------
>>"%LOG%" echo UPDATE EXIT CODE=%RC%
if not "%RC%"=="0" goto :FAIL

echo [3/3] HOAN TAT.
echo.
echo Da cap nhat DHL Nameset Layout V8.5.
echo Hay dong Docker roi mo lai. Neu chua doi version thi dong CorelDRAW va mo lai 1 lan.
echo.
pause
exit /b 0

:FAIL
echo.
echo ==================================================
echo CAP NHAT VAN LOI. MA LOI: %errorlevel%
echo ==================================================
echo.
echo Log launcher:
echo %LOG%
echo.
if exist "%TEMP%\DHL_NAMESET_UPDATE_LOG.txt" (
  echo Tim thay log updater:
  echo %TEMP%\DHL_NAMESET_UPDATE_LOG.txt
  echo.
  type "%TEMP%\DHL_NAMESET_UPDATE_LOG.txt"
) else (
  echo CHUA CO DHL_NAMESET_UPDATE_LOG.txt - nghia la updater chua chay den phan ghi log.
)
echo.
echo --- Launcher log ---
if exist "%LOG%" type "%LOG%"
echo.
pause
exit /b 1
