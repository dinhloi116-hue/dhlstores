@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Cai tool Tach Nameset A3 cho CorelDRAW - V7.1

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
echo   TACH NAMESET A3 - V7.1
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
echo DA CAI XONG TOOL TACH NAMESET A3 - BAN V7.1
echo Co chu da can theo giao dien Corel, giu VI / EN va nut Reload.
echo Hay dong va mo lai Docker neu no dang mo.
echo.
pause
exit /b 0

:RELOAD_UI
echo.
echo Dang Reload giao dien V7.1 tu GitHub...
call :UPDATE_COMPACT_UI
if errorlevel 1 exit /b 1
echo DA RELOAD XONG GIAO DIEN V7.1 TU GITHUB.
exit /b 0

:UPDATE_COMPACT_UI
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$stamp=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();$url=$env:DHL_UI_URL+'?v=71&t='+$stamp;$tmp=Join-Path $env:TEMP 'DockerUI_DHL_A3_V71.html';Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $tmp;$raw=[IO.File]::ReadAllText($tmp);if($raw -notmatch 'DHL_UI_VERSION=7\.0'){throw 'GitHub chua tra ve giao dien goc V7.0'};$raw=$raw.Replace('DHL_UI_VERSION=7.0','DHL_UI_VERSION=7.1').Replace('v7.0','v7.1');$css=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('PHN0eWxlIGlkPSJkaGwtZm9udC1tYXRjaC1jb3JlbCI+Cmh0bWwsYm9keXtmb250LXNpemU6MTJweCFpbXBvcnRhbnQ7bGluZS1oZWlnaHQ6MS40IWltcG9ydGFudH0KLnRpdGxle2ZvbnQtc2l6ZToxNnB4IWltcG9ydGFudH0KLnZlcntmb250LXNpemU6MTBweCFpbXBvcnRhbnR9Ci5sYW5nYnRue2ZvbnQtc2l6ZToxMHB4IWltcG9ydGFudDttaW4td2lkdGg6MjlweCFpbXBvcnRhbnQ7cGFkZGluZzo1cHggNnB4IWltcG9ydGFudH0KLmdpdGJ0bntmb250LXNpemU6MTFweCFpbXBvcnRhbnQ7cGFkZGluZzo2cHggOHB4IWltcG9ydGFudH0KLnN0YXR1cywubm90ZXtmb250LXNpemU6MTFweCFpbXBvcnRhbnQ7bGluZS1oZWlnaHQ6MS40IWltcG9ydGFudDttaW4taGVpZ2h0OjMwcHghaW1wb3J0YW50O3BhZGRpbmc6N3B4IDhweCFpbXBvcnRhbnR9Ci5sYWJlbHtmb250LXNpemU6MTJweCFpbXBvcnRhbnQ7bGluZS1oZWlnaHQ6MS4zNSFpbXBvcnRhbnQ7bWFyZ2luLXRvcDo4cHghaW1wb3J0YW50fQoubWluaSwubXV0ZWQsLnNhdmVkLC5mb290ZXJ7Zm9udC1zaXplOjEwcHghaW1wb3J0YW50O2xpbmUtaGVpZ2h0OjEuMzUhaW1wb3J0YW50fQpzZWxlY3QsaW5wdXRbdHlwZT1maWxlXSxpbnB1dFt0eXBlPW51bWJlcl17Zm9udC1zaXplOjEycHghaW1wb3J0YW50O21pbi1oZWlnaHQ6MzJweCFpbXBvcnRhbnQ7bGluZS1oZWlnaHQ6MS4zNSFpbXBvcnRhbnR9Ci5yYWRpb3MsLmNoZWNre2ZvbnQtc2l6ZToxMXB4IWltcG9ydGFudDtsaW5lLWhlaWdodDoxLjUhaW1wb3J0YW50fQpidXR0b257Zm9udC1zaXplOjEycHghaW1wb3J0YW50O2xpbmUtaGVpZ2h0OjEuMyFpbXBvcnRhbnQ7cGFkZGluZy10b3A6OHB4IWltcG9ydGFudDtwYWRkaW5nLWJvdHRvbTo4cHghaW1wb3J0YW50fQouc2VjdGlvbm5hbWV7Zm9udC1zaXplOjE0cHghaW1wb3J0YW50fQouY29sbGFwc2VidG4sLnF1aWNrYnRuLC5zbWFsbGJ0bntmb250LXNpemU6MTBweCFpbXBvcnRhbnQ7bGluZS1oZWlnaHQ6MS4zIWltcG9ydGFudDtwYWRkaW5nLXRvcDo2cHghaW1wb3J0YW50O3BhZGRpbmctYm90dG9tOjZweCFpbXBvcnRhbnR9Ci5zZWN0aW9uYmFyPmRpdntwYWRkaW5nLXRvcDo3cHghaW1wb3J0YW50O3BhZGRpbmctYm90dG9tOjdweCFpbXBvcnRhbnR9Ci5jYXJke3BhZGRpbmc6MTBweCFpbXBvcnRhbnR9Cjwvc3R5bGU+Cg=='));$raw=$raw.Replace('</head>',$css+'</head>');[IO.File]::WriteAllText($tmp,$raw,(New-Object Text.UTF8Encoding($false)));$verify=[IO.File]::ReadAllText($tmp);if($verify -notmatch 'DHL_UI_VERSION=7\.1' -or $verify -notmatch 'dhl-font-match-corel'){throw 'Khong tao duoc giao dien V7.1'};$targets=New-Object System.Collections.Generic.List[string];$roots=@();$pf=[Environment]::GetFolderPath('ProgramFiles');if($pf){$roots+=Join-Path $pf 'Corel'};if($env:APPDATA){$roots+=Join-Path $env:APPDATA 'Corel'};if($env:LOCALAPPDATA){$roots+=Join-Path $env:LOCALAPPDATA 'Corel'};foreach($root in $roots){if(-not(Test-Path -LiteralPath $root)){continue};Get-ChildItem -LiteralPath $root -Directory -Filter 'DHL_A3_Nameset' -Recurse -ErrorAction SilentlyContinue|ForEach-Object{if(Test-Path -LiteralPath (Join-Path $_.FullName 'DockerUI.html')){$targets.Add($_.FullName)}}};if($targets.Count -eq 0){throw 'Khong tim thay thu muc DHL_A3_Nameset nao dang duoc cai'};$uniq=$targets|Sort-Object -Unique;foreach($target in $uniq){$dst=Join-Path $target 'DockerUI.html';Copy-Item -LiteralPath $tmp -Destination $dst -Force;Unblock-File -LiteralPath $dst -ErrorAction SilentlyContinue;$check=[IO.File]::ReadAllText($dst);if($check -notmatch 'DHL_UI_VERSION=7\.1'){throw ('Ghi giao dien that bai: '+$dst)};Write-Host ('DA CAP NHAT V7.1: '+$dst) -ForegroundColor Green};Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue;Write-Host ('Tong so noi da cap nhat: '+$uniq.Count) -ForegroundColor Cyan"
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
echo TOOL DA CAI NHUNG KHONG GHI DUOC GIAO DIEN V7.1.
echo Gui anh cua so nay de kiem tra duong dan Corel dang dung.
pause
exit /b 5
