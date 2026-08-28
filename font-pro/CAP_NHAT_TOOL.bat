@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0\.."

echo ================================
echo   FONT PRO STUDIO - CAP NHAT
echo ================================
echo.

git pull
if errorlevel 1 (
  echo.
  echo [LOI] Khong the git pull. Kiem tra Git/GitHub va mang.
  pause
  exit /b 1
)

echo.
echo [OK] Da cap nhat ban moi nhat.
start "" "%~dp0index.html"
exit /b 0
