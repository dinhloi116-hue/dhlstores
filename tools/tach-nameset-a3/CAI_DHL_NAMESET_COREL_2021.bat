@echo off
setlocal
chcp 65001 >nul
title Cai DHL Nameset Layout cho CorelDRAW 2021
powershell -NoProfile -ExecutionPolicy Bypass -Command "$self='%~f0'; if(-not([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){Start-Process -FilePath $self -Verb RunAs; exit}; $u='https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3/CAI_DHL_NAMESET_COREL_2021.ps1?v='+[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); $p=Join-Path $env:TEMP 'CAI_DHL_NAMESET_COREL_2021.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $u -OutFile $p; & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p; $c=$LASTEXITCODE; Remove-Item $p -Force -ErrorAction SilentlyContinue; exit $c"
set ERR=%errorlevel%
echo.
if "%ERR%"=="0" (
  echo DA XONG. MO LAI COREL 2021 ROI VAO WINDOW ^> DOCKERS ^> DHL NAMESET LAYOUT.
) else (
  echo CAI DAT CHUA XONG. MA LOI: %ERR%
)
pause
exit /b %ERR%