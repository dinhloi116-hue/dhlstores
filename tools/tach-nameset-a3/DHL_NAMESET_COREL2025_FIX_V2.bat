@echo off
setlocal EnableExtensions
chcp 65001 >nul
title DHL NAMESET - COREL 2025 FIX V2 (COPY ENGINE)
color 1F
echo =========================================================
echo  DHL NAMESET / COREL 2025 - FIX V2
echo  Khac ban cu: khong dung File.Replace.
echo  Khong cai lai / khong xoa CDR / khong reset Workspace.
echo =========================================================
echo.
tasklist /FI "IMAGENAME eq CorelDRW.exe" 2>nul | find /I "CorelDRW.exe" >nul
if not errorlevel 1 (
  echo [STOP] Hay luu CDR va DONG HET CorelDRAW truoc khi cap nhat.
  pause
  exit /b 2
)
if exist "%TEMP%\DHL_NAMESET_COREL2025_REPORT.txt" del /q "%TEMP%\DHL_NAMESET_COREL2025_REPORT.txt" >nul 2>&1
echo [1/3] Tai script moi va kiem tra COPY ENGINE V8.55.2...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $url='https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3/RESCUE_COREL2025_V855.ps1?force=' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); $p=Join-Path $env:TEMP 'DHL_COREL2025_COPY_ENGINE_V2.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 45 -OutFile $p; $s=[IO.File]::ReadAllText($p); if($s.IndexOf('COPY ENGINE V8.55.2') -lt 0 -or $s.IndexOf('[IO.File]::Replace(') -ge 0){throw 'GitHub still returned older updater; file was NOT modified.'}; Write-Host '[OK] Verified COPY ENGINE V8.55.2 (no File.Replace).' -ForegroundColor Green; $cmd='-NoProfile -ExecutionPolicy Bypass -File '+[char]34+$p+[char]34; $job=Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $cmd -Wait -PassThru; exit $job.ExitCode } catch { Write-Host ('FAILED: '+$_.Exception.Message) -ForegroundColor Red; exit 1 }"
set "RC=%errorlevel%"
echo.
echo [2/3] Bao cao:
if exist "%TEMP%\DHL_NAMESET_COREL2025_REPORT.txt" (
  type "%TEMP%\DHL_NAMESET_COREL2025_REPORT.txt"
) else (
  echo Khong co bao cao: tai script/Administrator chua thanh cong.
)
echo.
if "%RC%"=="0" (
  echo [3/3] THANH CONG. Mo lai CorelDRAW 2025 kiem tra V8.54.
) else (
  echo [3/3] CHUA THANH CONG - ma loi %RC%.
  echo Gui file tren Desktop: DHL_NAMESET_COREL2025_REPORT.txt
)
pause
exit /b %RC%
