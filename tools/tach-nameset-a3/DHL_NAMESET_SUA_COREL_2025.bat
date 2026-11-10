@echo off
setlocal EnableExtensions
chcp 65001 >nul
title DHL NAMESET - REPAIR COREL 2025 / V8.54
color 1F

echo =============================================================
echo    DHL NAMESET LAYOUT - SUA CAP NHAT COREL 2025
echo =============================================================
echo.
echo KHONG cai lai Corel, KHONG reset Workspace, KHONG sua/xoa CDR.
echo.
echo [1/4] Kiem tra CorelDRAW dang mo...
tasklist /FI "IMAGENAME eq CorelDRW.exe" 2>nul | find /I "CorelDRW.exe" >nul
if not errorlevel 1 (
    echo.
    echo [DUNG] CorelDRAW dang chay. Hay luu CDR, dong TAT CA CorelDRAW roi chay lai.
    echo.
    pause
    exit /b 2
)

echo [2/4] Tai bo sua truc tiep tu GitHub DHL Stores...
echo [3/4] Khi Windows yeu cau quyen Administrator, bam Yes.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $url='https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3/RESCUE_COREL2025_V855.ps1?fresh='+[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); $script=Join-Path $env:TEMP 'DHL_COREL2025_RESCUE_CURRENT.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 45 -OutFile $script; if((Get-Item -LiteralPath $script).Length -lt 5000){throw 'Invalid recovery script';}; $args='-NoProfile -ExecutionPolicy Bypass -File '+[char]34+$script+[char]34; $job=Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $args -Wait -PassThru; exit $job.ExitCode } catch { Write-Host ('REPAIR ERROR: '+$_.Exception.Message); exit 1 }"
set "RC=%errorlevel%"
echo.
echo [4/4] Bao cao cap nhat:
if exist "%TEMP%\DHL_NAMESET_COREL2025_REPORT.txt" (
    type "%TEMP%\DHL_NAMESET_COREL2025_REPORT.txt"
) else (
    echo Chua tao duoc bao cao. Co the chua duoc quyen Administrator hoac loi tai GitHub.
)
echo.
if "%RC%"=="0" (
    echo [THANH CONG] Khoi dong lai CorelDRAW 2025, kiem tra DHL Nameset Layout V8.54.
) else (
    echo [CHUA THANH CONG] Ma loi: %RC%
    echo Gui file DHL_NAMESET_COREL2025_REPORT.txt tren Desktop cho ChatGPT de sua dung duong dan.
)
echo.
pause
exit /b %RC%
