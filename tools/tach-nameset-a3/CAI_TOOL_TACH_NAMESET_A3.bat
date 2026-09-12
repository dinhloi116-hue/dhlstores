@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Cai tool Tach Nameset A3 cho CorelDRAW - V6.5

set "DHL_SELF=%~f0"
set "DHL_ARGS=%*"
set "DHL_PAYLOAD=%TEMP%\DHL_NAMESET_A3_V62_PAYLOAD.bat"
set "DHL_PAYLOAD_URL=https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/f176332b86db8f5575007d5d930c32887e8dfda4/tools/tach-nameset-a3/CAI_TOOL_TACH_NAMESET_A3.bat"
set "DHL_UI_URL=https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3/src/DockerUI.html"
if /i "%~1"=="--reload-ui" set "DHL_RELOAD_UI=1"

fltmc >nul 2>&1
if errorlevel 1 goto :ELEVATE
goto :ADMIN

:ELEVATE
echo.
echo Dang xin quyen Administrator...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$q=[char]34;$cmd=$q+$q+$env:DHL_SELF+$q+$q;if($env:DHL_ARGS){$cmd+=' '+$env:DHL_ARGS};$p=Start-Process -FilePath $env:ComSpec -ArgumentList '/d','/c',$cmd -Verb RunAs -Wait -PassThru;exit $p.ExitCode"
set "DHL_EXIT=%errorlevel%"
if "%DHL_EXIT%"=="0" exit /b 0
echo.
echo KHONG MO DUOC QUYEN ADMINISTRATOR. MA LOI: %DHL_EXIT%
pause
exit /b %DHL_EXIT%

:ADMIN
if "%DHL_RELOAD_UI%"=="1" goto :RELOAD_UI

echo.
echo ================================================
echo   TACH NAMESET A3 - V6.5
echo ================================================
echo Da co quyen Administrator.
echo Dang cai bo chuc nang Nameset A3...

if exist "%DHL_PAYLOAD%" del /q "%DHL_PAYLOAD%" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri $env:DHL_PAYLOAD_URL -OutFile $env:DHL_PAYLOAD; exit 0 } catch { Write-Host ''; Write-Host 'KHONG TAI DUOC BO CAI TU GITHUB:' -ForegroundColor Red; Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }"
if errorlevel 1 goto :DOWNLOAD_FAIL
if not exist "%DHL_PAYLOAD%" goto :MISSING_PAYLOAD
for %%I in ("%DHL_PAYLOAD%") do set "DHL_SIZE=%%~zI"
if %DHL_SIZE% LSS 40000 goto :BAD_PAYLOAD

call "%DHL_PAYLOAD%"
set "DHL_EXIT=%errorlevel%"
del /q "%DHL_PAYLOAD%" >nul 2>&1
if not "%DHL_EXIT%"=="0" goto :INSTALL_FAIL

call :UPDATE_COMPACT_UI
if errorlevel 1 goto :UI_FAIL

echo.
echo DA CAI XONG TOOL TACH NAMESET A3 - BAN V6.5
echo Giao dien nho gon hon, nut RELOAD GIT nam ngay trong tool.
echo Mo CorelDRAW ^> Window ^> Dockers ^> Tach Nameset A3.
echo.
pause
exit /b 0

:RELOAD_UI
echo.
echo Dang Reload giao dien moi tu GitHub...
call :UPDATE_COMPACT_UI
if errorlevel 1 exit /b 1
echo DA RELOAD XONG GIAO DIEN TU GITHUB.
exit /b 0

:UPDATE_COMPACT_UI
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$pf=[Environment]::GetFolderPath('ProgramFiles');$preferred=@('2024','2025','2026','2023','2022')|ForEach-Object{Join-Path $pf ('Corel\CorelDRAW Graphics Suite '+$_+'\Programs64\CorelDRW.exe')};$exe=$preferred|Where-Object{Test-Path -LiteralPath $_}|Select-Object -First 1;if(-not $exe){$root=Join-Path $pf 'Corel';if(Test-Path -LiteralPath $root){$exe=Get-ChildItem -LiteralPath $root -Filter CorelDRW.exe -File -Recurse -ErrorAction SilentlyContinue|Select-Object -ExpandProperty FullName -First 1}};if(-not $exe){throw 'Khong tim thay CorelDRAW 64-bit'};$target=Join-Path (Split-Path -Parent $exe) 'Addons\DHL_A3_Nameset';if(-not(Test-Path -LiteralPath $target)){throw 'Chua tim thay tool DHL_A3_Nameset. Hay cai tool 1 lan truoc.'};$tmp=Join-Path $env:TEMP 'DockerUI_DHL_A3.html';Invoke-WebRequest -UseBasicParsing -Uri $env:DHL_UI_URL -OutFile $tmp;if((Get-Item -LiteralPath $tmp).Length -lt 3000){throw 'File giao dien tai ve khong day du'};Copy-Item -LiteralPath $tmp -Destination (Join-Path $target 'DockerUI.html') -Force;Unblock-File -LiteralPath (Join-Path $target 'DockerUI.html');Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue"
exit /b %errorlevel%

:DOWNLOAD_FAIL
echo.
echo KHONG TAI DUOC BO CAI. HAY KIEM TRA INTERNET.
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

:INSTALL_FAIL
echo.
echo BO CAI KET THUC VOI MA LOI %DHL_EXIT%.
pause
exit /b %DHL_EXIT%

:UI_FAIL
echo.
echo TOOL DA CAI NHUNG KHONG TAI DUOC GIAO DIEN V6.5.
echo Hay chay lai khi co Internet.
pause
exit /b 5
