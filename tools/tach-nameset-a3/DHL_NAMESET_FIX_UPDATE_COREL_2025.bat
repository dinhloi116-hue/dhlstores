@echo off
setlocal EnableExtensions
chcp 65001 >nul
title DHL NAMESET - SUA CAP NHAT COREL 2025

echo ======================================================
echo DHL NAMESET LAYOUT - CAP NHAT TRUC TIEP TU GITHUB
echo Khong cai lai, khong reset Workspace, khong xoa CDR.
echo ======================================================
echo.

REM CorelDRAW should be closed to avoid file locks and unsaved work.
tasklist /FI "IMAGENAME eq CorelDRW.exe" 2>nul | find /I "CorelDRW.exe" >nul
if not errorlevel 1 (
    echo [DUNG] CorelDRAW dang chay. Hay SAVE file CDR, dong het CorelDRAW roi chay lai.
    echo [STOP] CorelDRAW is still open. Save your work and close the app first.
    echo.
    pause
    exit /b 2
)

echo [1/3] Tai bo cap nhat chinh thuc tu GitHub cua DHL Stores...
echo [2/3] Windows se yeu cau quyen Administrator. Hay bam YES.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $u='https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3/UPDATE_DHL_NAMESET.ps1?fresh='+[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); $p=Join-Path $env:TEMP 'DHL_NAMESET_COREL_RESCUE.ps1'; Invoke-WebRequest -UseBasicParsing -TimeoutSec 45 -Uri $u -OutFile $p; $arg='-NoProfile -ExecutionPolicy Bypass -File '+[char]34+$p+[char]34; $child=Start-Process -FilePath 'powershell.exe' -ArgumentList $arg -Verb RunAs -Wait -PassThru; $code=$child.ExitCode; Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue; exit $code } catch { Write-Host ('UPDATE FAILED: '+$_.Exception.Message); exit 1 }"
set "RC=%errorlevel%"
echo.
if "%RC%"=="0" (
    echo [3/3] CAP NHAT THANH CONG. MO LAI COREL VA KIEM TRA SO PHIEN BAN.
) else (
    echo [3/3] CHUA CAP NHAT XONG. MA LOI: %RC%
    echo Mo nhat ky: %%TEMP%%\DHL_NAMESET_UPDATE_LOG.txt
    echo Gui anh man hinh nay va nhat ky neu can xu ly tiep.
)
echo.
pause
exit /b %RC%
