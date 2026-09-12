@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Cai tool Tach Nameset A3 cho CorelDRAW - Hotfix V6.3

rem ============================================================
rem HOTFIX V6.3
rem Sua loi bam file BAT chi roi ve dau nhac D:\OneDrive\DOWNLOADS>
rem Khong Start-Process truc tiep file .bat nua.
rem Neu chua co quyen admin, mo cmd.exe bang RunAs roi chay lai chinh file nay.
rem Khi da co quyen admin, nap payload V6.2 tu commit co dinh va cai truc tiep.
rem ============================================================

set "DHL_SELF=%~f0"
set "DHL_PAYLOAD=%TEMP%\DHL_NAMESET_A3_V62_PAYLOAD.bat"
set "DHL_URL=https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/f176332b86db8f5575007d5d930c32887e8dfda4/tools/tach-nameset-a3/CAI_TOOL_TACH_NAMESET_A3.bat"

fltmc >nul 2>&1
if errorlevel 1 goto :ELEVATE
goto :ADMIN

:ELEVATE
echo.
echo Dang xin quyen Administrator...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$q=[char]34; $arg=$q+$q+$env:DHL_SELF+$q+$q; $p=Start-Process -FilePath $env:ComSpec -ArgumentList '/d','/c',$arg -Verb RunAs -Wait -PassThru; exit $p.ExitCode"
set "DHL_EXIT=%errorlevel%"
if "%DHL_EXIT%"=="0" exit /b 0
echo.
echo KHONG MO DUOC QUYEN ADMINISTRATOR. MA LOI: %DHL_EXIT%
pause
exit /b %DHL_EXIT%

:ADMIN
echo.
echo ================================================
echo   TACH NAMESET A3 - HOTFIX V6.3
echo ================================================
echo Da co quyen Administrator.
echo Dang nap bo cai V6.2 da dong goi...

if exist "%DHL_PAYLOAD%" del /q "%DHL_PAYLOAD%" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri $env:DHL_URL -OutFile $env:DHL_PAYLOAD; exit 0 } catch { Write-Host ''; Write-Host 'KHONG TAI DUOC BO CAI TU GITHUB:' -ForegroundColor Red; Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }"
if errorlevel 1 goto :DOWNLOAD_FAIL

if not exist "%DHL_PAYLOAD%" goto :MISSING_PAYLOAD

for %%I in ("%DHL_PAYLOAD%") do set "DHL_SIZE=%%~zI"
if %DHL_SIZE% LSS 40000 goto :BAD_PAYLOAD

echo Da tai xong. Bat dau cai...
echo.
call "%DHL_PAYLOAD%"
set "DHL_EXIT=%errorlevel%"
del /q "%DHL_PAYLOAD%" >nul 2>&1

if "%DHL_EXIT%"=="0" goto :SUCCESS
echo.
echo BO CAI KET THUC VOI MA LOI %DHL_EXIT%.
exit /b %DHL_EXIT%

:SUCCESS
echo.
echo HOTFIX V6.3: BO CAI DA CHAY XONG.
exit /b 0

:DOWNLOAD_FAIL
echo.
echo HAY KIEM TRA INTERNET ROI CHAY LAI FILE NAY.
pause
exit /b 1

:MISSING_PAYLOAD
echo.
echo LOI: KHONG TAO DUOC FILE CAI TAM.
pause
exit /b 2

:BAD_PAYLOAD
echo.
echo LOI: FILE CAI TAI VE KHONG DAY DU ^(%DHL_SIZE% bytes^).
del /q "%DHL_PAYLOAD%" >nul 2>&1
pause
exit /b 3
