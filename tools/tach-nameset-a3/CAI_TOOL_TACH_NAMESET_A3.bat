@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Cai DHL Nameset Layout cho CorelDRAW - V7.4

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
echo   DHL NAMESET LAYOUT - V7.4
echo ================================================
echo Da co quyen Administrator.
echo Dang cai bo chuc nang...

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
call :UPDATE_UI
if errorlevel 1 goto :UI_FAIL

echo.
echo DA CAI XONG DHL NAMESET LAYOUT - V7.4
echo Da them ghep cap gan nhat, can tam ngang, khoang cach 30 mm va chon font ten/so.
echo Neu ten tab Corel chua doi, hay khoi dong lai Corel 1 lan.
echo.
pause
exit /b 0

:RELOAD_UI
echo.
echo Dang cap nhat DHL Nameset Layout V7.4 tu GitHub...
call :UPDATE_UI
if errorlevel 1 exit /b 1
echo DA CAP NHAT XONG V7.4.
exit /b 0

:UPDATE_UI
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$stamp=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();$url=$env:DHL_UI_URL+'?v=74&t='+$stamp;$tmp=Join-Path $env:TEMP 'DockerUI_DHL_Layout_V74.html';Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $tmp;$raw=[IO.File]::ReadAllText($tmp);if($raw -notmatch 'DHL_UI_VERSION=7\.4'){throw 'GitHub chua tra ve giao dien V7.4'};$targets=New-Object System.Collections.Generic.List[string];$roots=@();$pf=[Environment]::GetFolderPath('ProgramFiles');if($pf){$roots+=Join-Path $pf 'Corel'};if($env:APPDATA){$roots+=Join-Path $env:APPDATA 'Corel'};if($env:LOCALAPPDATA){$roots+=Join-Path $env:LOCALAPPDATA 'Corel'};foreach($root in $roots){if(-not(Test-Path -LiteralPath $root)){continue};Get-ChildItem -LiteralPath $root -Directory -Filter 'DHL_A3_Nameset' -Recurse -ErrorAction SilentlyContinue|ForEach-Object{if(Test-Path -LiteralPath (Join-Path $_.FullName 'DockerUI.html')){$targets.Add($_.FullName)}}};if($targets.Count -eq 0){throw 'Khong tim thay thu muc DHL_A3_Nameset nao dang duoc cai'};$uniq=$targets|Sort-Object -Unique;$utf8=New-Object Text.UTF8Encoding($false);foreach($target in $uniq){$dst=Join-Path $target 'DockerUI.html';Copy-Item -LiteralPath $tmp -Destination $dst -Force;Unblock-File -LiteralPath $dst -ErrorAction SilentlyContinue;foreach($f in @('AppUI.xslt','UserUI.xslt')){$p=Join-Path $target $f;if(Test-Path -LiteralPath $p){$t=[IO.File]::ReadAllText($p);$t=$t.Replace('Tách Nameset A3','DHL Nameset Layout').Replace('Tach Nameset A3','DHL Nameset Layout');[IO.File]::WriteAllText($p,$t,$utf8)}};$check=[IO.File]::ReadAllText($dst);if($check -notmatch 'DHL_UI_VERSION=7\.4'){throw ('Ghi giao dien that bai: '+$dst)};Write-Host ('DA CAP NHAT V7.4: '+$dst) -ForegroundColor Green};Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue;Write-Host ('Tong so noi da cap nhat: '+$uniq.Count) -ForegroundColor Cyan"
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
echo TOOL DA CAI NHUNG KHONG GHI DUOC GIAO DIEN V7.4.
echo Gui anh cua so nay de kiem tra duong dan Corel dang dung.
pause
exit /b 5
