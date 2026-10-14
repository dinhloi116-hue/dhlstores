@echo off
setlocal
cd /d "%~dp0"
echo DHL PRODUCT FACTORY - CAU HINH GOOGLE DRIVE
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0configure-drive.ps1"
if errorlevel 1 (
 echo Cau hinh khong thanh cong, xem loi phia tren.
) else (
 echo Mo chrome://extensions va nhan Reload.
)
echo.
pause
