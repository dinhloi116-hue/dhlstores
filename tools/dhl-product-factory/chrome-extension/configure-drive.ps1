# DHL Product Factory Chrome Extension - Google OAuth Client ID configuration.
# Only edits the public OAuth client ID in manifest.json; do not enter API keys or secrets.
param([string]$ClientId)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ClientId)) { $ClientId = Read-Host 'Dan OAuth Client ID loai Chrome Extension (khong phai API key)' }
if ($ClientId -notmatch '^\d{8,}-[a-z0-9-]+\.apps\.googleusercontent\.com$') { throw 'OAuth Client ID khong dung dinh dang (xxxx.apps.googleusercontent.com)' }
$path = Join-Path $PSScriptRoot 'manifest.json'
if (!(Test-Path $path)) { throw 'Khong tim thay manifest.json. Chay script trong thu muc Chrome Extension.' }
$manifest = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
$manifest.oauth2.client_id = $ClientId
$manifest | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $path -Encoding UTF8
Write-Host 'Da luu Client ID cong khai vao manifest.json.' -ForegroundColor Green
Write-Host '1. Mo chrome://extensions, nhan Reload tren DHL Product Factory.'
Write-Host '2. Mo extension > Cai dat > Ket noi Google Drive.'
Write-Host '3. Chon tai khoan Google cua ban va cho phep truy cap.'
Write-Host 'Extension ID co dinh: ojbejkjaalblfimeojmobicanhbipkel'
