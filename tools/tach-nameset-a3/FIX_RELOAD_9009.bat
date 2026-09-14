@echo off
setlocal EnableExtensions
chcp 65001 >nul
title SUA LOI RELOAD 9009 - DHL Nameset Layout

fltmc >nul 2>&1
if errorlevel 1 (
  echo Dang xin quyen Administrator...
  "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

set "LATEST=%TEMP%\CAI_TOOL_TACH_NAMESET_A3_LATEST.bat"
if exist "%LATEST%" del /q "%LATEST%" >nul 2>&1

echo Dang tai ban sua moi nhat tu GitHub...
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$u='https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3/CAI_TOOL_TACH_NAMESET_A3.bat?fix='+[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();Invoke-WebRequest -UseBasicParsing -Uri $u -OutFile $env:LATEST"
if errorlevel 1 goto :FAIL
if not exist "%LATEST%" goto :FAIL

echo Dang sua tool...
call "%LATEST%" --reload-ui
set "RC=%errorlevel%"
if not "%RC%"=="0" goto :FAILCODE

echo.
echo ================================================
echo   DA SUA XONG LOI RELOAD 9009
echo ================================================
echo Hay quay lai CorelDRAW, dong mo lai Docker neu can.
echo Tu lan sau co the bam CAP NHAT truc tiep trong tool.
echo.
pause
exit /b 0

:FAILCODE
echo.
echo SUA KHONG THANH CONG. MA LOI: %RC%
pause
exit /b %RC%

:FAIL
echo.
echo KHONG TAI HOAC CHAY DUOC BAN SUA TU GITHUB.
echo Kiem tra Internet roi chay lai file nay bang quyen Administrator.
pause
exit /b 1
