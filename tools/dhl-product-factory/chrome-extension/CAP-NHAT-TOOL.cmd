@echo off
setlocal
cd /d "%~dp0"
echo DHL PRODUCT FACTORY - CAP NHAT TU GITHUB
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0cap-nhat-tu-git.ps1"
if errorlevel 1 (
  echo.
  echo Cap nhat that bai. Xem thong bao ben tren.
) else (
  echo.
  echo Nhan Reload trong chrome://extensions de dung ban moi.
)
echo.
pause
