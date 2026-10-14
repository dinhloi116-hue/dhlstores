@echo off
setlocal
cd /d "%~dp0"
echo DHL PRODUCT FACTORY - CAI DAT NUT CAP NHAT 1 LAN
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0cai-dat-nut-cap-nhat.ps1"
if errorlevel 1 (echo Cai dat that bai. Gui anh loi de duoc ho tro.) else (echo Hoan tat. Quay ve tab tool va bam Cap nhat ngay tu GitHub.)
pause
