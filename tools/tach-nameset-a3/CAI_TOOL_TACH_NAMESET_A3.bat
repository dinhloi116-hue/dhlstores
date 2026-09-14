@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Cai DHL Nameset Layout cho CorelDRAW - V7.5 HOTFIX

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
powershell -NoProfile -ExecutionPolicy Bypass -Command "$al=@();if($env:DHL_ARGS){$al=@($env:DHL_ARGS)};$p=Start-Process -FilePath $env:DHL_SELF -ArgumentList $al -Verb RunAs -Wait -PassThru;exit $p.ExitCode"
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
echo   DHL NAMESET LAYOUT - V7.5 HOTFIX
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
echo DA CAI XONG DHL NAMESET LAYOUT - V7.5
echo Da sua loi 30 mm bi hieu thanh 30 cm.
echo Da sua nut CAP NHAT bi loi 9009.
echo.
pause
exit /b 0

:RELOAD_UI
echo.
echo Dang cap nhat DHL Nameset Layout V7.5 tu GitHub...
call :UPDATE_UI
if errorlevel 1 exit /b 1
echo DA CAP NHAT XONG V7.5.
exit /b 0

:UPDATE_UI
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$stamp=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();$url=$env:DHL_UI_URL+'?v=75&t='+$stamp;$tmp=Join-Path $env:TEMP 'DockerUI_DHL_Layout_V75.html';Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $tmp;$raw=[IO.File]::ReadAllText($tmp);if($raw -notmatch 'DHL_UI_VERSION=7\.4'){throw 'GitHub chua tra ve giao dien nen V7.4'};$raw=$raw.Replace('DHL_UI_VERSION=7.4','DHL_UI_VERSION=7.5').Replace('v7.4','v7.5');$patch=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('PHNjcmlwdCBpZD0iZGhsLXY3NS1ob3RmaXgiPgooZnVuY3Rpb24oKXsKICBmdW5jdGlvbiBub3JtYWxpemVTZWxlY3RlZFBhaXJWNzUoc2hvdyl7CiAgICB2YXIgZD1JMThOW2N1cnJlbnRMYW5nXSxhLGRvYyxvbGRVbml0LHBhaXJzLGksZzsKICAgIHRyeXsKICAgICAgYT1jb3JlbEFwcCgpOwogICAgICBkb2M9YS5BY3RpdmVEb2N1bWVudDsKICAgICAgb2xkVW5pdD1kb2MuVW5pdDsKICAgICAgZG9jLlVuaXQ9MzsKICAgICAgcGFpcnM9cGFpck5lYXJlc3Qoc2VsZWN0ZWRTaGFwZXNWNzQoKSk7CiAgICAgIGZvcihpPTA7aTxwYWlycy5sZW5ndGg7aSsrKXtnPW5vcm1hbGl6ZVBhaXJPYmplY3RzKHBhaXJzW2ldLm5hbWUscGFpcnNbaV0ubnVtYmVyKTt9CiAgICAgIGRvYy5Vbml0PW9sZFVuaXQ7CiAgICAgIGlmKHNob3cpe2J5SWQoJ2ZvbnRTdGF0dXMnKS5pbm5lckhUTUw9ZC5wYWlyRG9uZStnKycgbW0uICcrZC50ZXh0T25seTt9CiAgICAgIHRyeXthLkFjdGl2ZVdpbmRvdy5SZWZyZXNoKCk7fWNhdGNoKHgpe30KICAgICAgcmV0dXJuIHRydWU7CiAgICB9Y2F0Y2goZSl7CiAgICAgIHRyeXtpZihkb2MmJm9sZFVuaXQhPT11bmRlZmluZWQpe2RvYy5Vbml0PW9sZFVuaXQ7fX1jYXRjaCh4Mil7fQogICAgICBpZihzaG93KXtieUlkKCdmb250U3RhdHVzJykuaW5uZXJIVE1MPWUubWVzc2FnZTt9CiAgICAgIHJldHVybiBmYWxzZTsKICAgIH0KICB9CgogIGZ1bmN0aW9uIHJlbG9hZEZyb21HaXRWNzUoKXsKICAgIHZhciBiPWJ5SWQoJ3JlbG9hZEdpdCcpLGQ9STE4TltjdXJyZW50TGFuZ10sc2gsZnNvLHRlbXAscHMxLGJhdCxzdGFtcCx0ZixzY3JpcHQsY21kLHJjLGJhc2U7CiAgICB0cnl7CiAgICAgIGlmKGIpe2IuZGlzYWJsZWQ9dHJ1ZTtiLmlubmVySFRNTD1kLmxvYWRpbmc7fQogICAgICBzaD1uZXcgQWN0aXZlWE9iamVjdCgnV1NjcmlwdC5TaGVsbCcpOwogICAgICBmc289bmV3IEFjdGl2ZVhPYmplY3QoJ1NjcmlwdGluZy5GaWxlU3lzdGVtT2JqZWN0Jyk7CiAgICAgIHRlbXA9c2guRXhwYW5kRW52aXJvbm1lbnRTdHJpbmdzKCclVEVNUCUnKTsKICAgICAgc3RhbXA9KG5ldyBEYXRlKCkpLmdldFRpbWUoKTsKICAgICAgcHMxPXRlbXArJ1xcREhMX05BTUVTRVRfVVBEQVRFLnBzMSc7CiAgICAgIGJhdD10ZW1wKydcXENBSV9UT09MX1RBQ0hfTkFNRVNFVF9BM19MQVRFU1QuYmF0JzsKICAgICAgc2NyaXB0PSIkRXJyb3JBY3Rpb25QcmVmZXJlbmNlPSdTdG9wJ1xyXG4iCiAgICAgICAgKyIkdT0naHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2Rpbmhsb2kxMTYtaHVlL2RobHN0b3Jlcy9tYWluL3Rvb2xzL3RhY2gtbmFtZXNldC1hMy9DQUlfVE9PTF9UQUNIX05BTUVTRVRfQTMuYmF0P3Y9IitzdGFtcCsiJ1xyXG4iCiAgICAgICAgKyIkcD0nIitiYXQucmVwbGFjZSgvJy9nLCInJyIpKyInXHJcbiIKICAgICAgICArIkludm9rZS1XZWJSZXF1ZXN0IC1Vc2VCYXNpY1BhcnNpbmcgLVVyaSAkdSAtT3V0RmlsZSAkcFxyXG4iCiAgICAgICAgKyIkYT0nL2QgL3MgL2MgXCJcIicrJHArJ1wiIC0tcmVsb2FkLXVpXCInXHJcbiIKICAgICAgICArIiRwcm9jPVN0YXJ0LVByb2Nlc3MgLUZpbGVQYXRoICRlbnY6Q29tU3BlYyAtQXJndW1lbnRMaXN0ICRhIC1WZXJiIFJ1bkFzIC1XYWl0IC1QYXNzVGhydVxyXG4iCiAgICAgICAgKyJleGl0ICRwcm9jLkV4aXRDb2RlXHJcbiI7CiAgICAgIHRmPWZzby5DcmVhdGVUZXh0RmlsZShwczEsdHJ1ZSxmYWxzZSk7CiAgICAgIHRmLldyaXRlKHNjcmlwdCk7CiAgICAgIHRmLkNsb3NlKCk7CiAgICAgIGNtZD0ncG93ZXJzaGVsbC5leGUgLU5vUHJvZmlsZSAtRXhlY3V0aW9uUG9saWN5IEJ5cGFzcyAtRmlsZSAiJytwczErJyInOwogICAgICByYz1zaC5SdW4oY21kLDEsdHJ1ZSk7CiAgICAgIHRyeXtpZihmc28uRmlsZUV4aXN0cyhwczEpKWZzby5EZWxldGVGaWxlKHBzMSx0cnVlKTt9Y2F0Y2goZHgpe30KICAgICAgaWYocmM9PT0wKXsKICAgICAgICBiYXNlPXdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCc/JylbMF07CiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlcGxhY2UoYmFzZSsnP3Y9JysobmV3IERhdGUoKSkuZ2V0VGltZSgpKTsKICAgICAgfWVsc2V7CiAgICAgICAgYWxlcnQoZC5yZWxvYWRGYWlsK3JjKTsKICAgICAgfQogICAgfWNhdGNoKGUpewogICAgICBhbGVydChkLnJlbG9hZEVycm9yK2UubWVzc2FnZSk7CiAgICB9ZmluYWxseXsKICAgICAgaWYoYil7Yi5kaXNhYmxlZD1mYWxzZTtiLmlubmVySFRNTD1JMThOW2N1cnJlbnRMYW5nXS5yZWxvYWQ7fQogICAgfQogIH0KCiAgd2luZG93Lm5vcm1hbGl6ZVNlbGVjdGVkUGFpcj1ub3JtYWxpemVTZWxlY3RlZFBhaXJWNzU7CiAgd2luZG93LnJlbG9hZEZyb21HaXQ9cmVsb2FkRnJvbUdpdFY3NTsKfSkoKTsKPC9zY3JpcHQ+Cg=='));$raw=$raw.Replace('</body>',$patch+'</body>');$utf8=New-Object Text.UTF8Encoding($false);[IO.File]::WriteAllText($tmp,$raw,$utf8);$verify=[IO.File]::ReadAllText($tmp);if($verify -notmatch 'DHL_UI_VERSION=7\.5' -or $verify -notmatch 'dhl-v75-hotfix'){throw 'Khong tao duoc giao dien V7.5'};$targets=New-Object System.Collections.Generic.List[string];$roots=@();$pf=[Environment]::GetFolderPath('ProgramFiles');if($pf){$roots+=Join-Path $pf 'Corel'};if($env:APPDATA){$roots+=Join-Path $env:APPDATA 'Corel'};if($env:LOCALAPPDATA){$roots+=Join-Path $env:LOCALAPPDATA 'Corel'};foreach($root in $roots){if(-not(Test-Path -LiteralPath $root)){continue};Get-ChildItem -LiteralPath $root -Directory -Filter 'DHL_A3_Nameset' -Recurse -ErrorAction SilentlyContinue|ForEach-Object{if(Test-Path -LiteralPath (Join-Path $_.FullName 'DockerUI.html')){$targets.Add($_.FullName)}}};if($targets.Count -eq 0){throw 'Khong tim thay thu muc DHL_A3_Nameset nao dang duoc cai'};$uniq=$targets|Sort-Object -Unique;foreach($target in $uniq){$dst=Join-Path $target 'DockerUI.html';Copy-Item -LiteralPath $tmp -Destination $dst -Force;Unblock-File -LiteralPath $dst -ErrorAction SilentlyContinue;foreach($f in @('AppUI.xslt','UserUI.xslt')){$p=Join-Path $target $f;if(Test-Path -LiteralPath $p){$t=[IO.File]::ReadAllText($p);$t=$t.Replace('Tách Nameset A3','DHL Nameset Layout').Replace('Tach Nameset A3','DHL Nameset Layout');[IO.File]::WriteAllText($p,$t,$utf8)}};$check=[IO.File]::ReadAllText($dst);if($check -notmatch 'DHL_UI_VERSION=7\.5' -or $check -notmatch 'dhl-v75-hotfix'){throw ('Ghi giao dien that bai: '+$dst)};Write-Host ('DA CAP NHAT V7.5: '+$dst) -ForegroundColor Green};Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue;Write-Host ('Tong so noi da cap nhat: '+$uniq.Count) -ForegroundColor Cyan"
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
echo TOOL DA CAI NHUNG KHONG GHI DUOC GIAO DIEN V7.5.
echo Gui anh cua so nay de kiem tra duong dan Corel dang dung.
pause
exit /b 5