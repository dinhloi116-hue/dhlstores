# DHL Product Factory: updater for a manually installed Chrome MV3 extension.
# Run locally by double-clicking CAP-NHAT-TOOL.cmd. No secrets or OAuth tokens are sent to GitHub.
$ErrorActionPreference='Stop'
$Repo='dinhloi116-hue/dhlstores'
$Branch='feature/dhl-product-factory-mvp-20261012'
$Folder='tools/dhl-product-factory/chrome-extension'
$ExpectedName="DHL Product Factory $([char]0x2014) 6 Shop"
$Files=@(
 'README.md','manifest.json','background.js','panel.html','panel.css','panel.js',
 'lib/core.mjs','lib/drive-sync.mjs','lib/google-auth.mjs','lib/update-check.mjs','lib/xlsx-lite.mjs',
 'test/drive-sync.test.mjs','test/extension.test.mjs','test/update-check.test.mjs',
 'configure-drive.ps1','CAU-HINH-DRIVE.cmd','CAP-NHAT-TOOL.cmd','cap-nhat-tu-git.ps1',
 'native-updater/Host.cs','cai-dat-nut-cap-nhat.ps1','CAI-DAT-NUT-CAP-NHAT.cmd'
)
function Read-Manifest([string]$Path) {
  return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}
function Save-Manifest($Data,[string]$Path) {
  $utf8=New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path,($Data | ConvertTo-Json -Depth 32),$utf8)
}
function Get-ExtensionId([string]$PublicKey) {
  $hash=[System.Security.Cryptography.SHA256]::Create().ComputeHash([Convert]::FromBase64String($PublicKey))
  $id=''
  for($i=0;$i -lt 16;$i++) {
    $id+=[char](97+($hash[$i] -shr 4))
    $id+=[char](97+($hash[$i] -band 15))
  }
  return $id
}
$InstallDir=$PSScriptRoot
$ManifestPath=Join-Path $InstallDir 'manifest.json'
if(!(Test-Path -LiteralPath $ManifestPath)) {throw 'Khong tim thay manifest.json trong thu muc cai tool.'}
$Local=Read-Manifest $ManifestPath
if($Local.name -ne $ExpectedName -or $Local.manifest_version -ne 3 -or (Get-ExtensionId $Local.key) -ne 'ojbejkjaalblfimeojmobicanhbipkel') {
  throw 'Sai thu muc cai dat hoac Extension ID khong khop. Dung cap nhat.'
}
$Header=@{'User-Agent'='DHL-Product-Factory-Local-Updater';'Accept'='application/vnd.github+json'}
$Query=[uri]::EscapeDataString($Branch)
$Uri="https://api.github.com/repos/$Repo/commits?sha=$Query&path=$Folder&per_page=1"
Write-Host "Dang kiem tra nhanh GitHub $Branch ..." -ForegroundColor Cyan
$Commits=@(Invoke-RestMethod -Uri $Uri -Headers $Header -Method Get)
if($Commits.Count -eq 0 -or $Commits[0].sha -notmatch '^[0-9a-f]{40}$') {throw 'Khong lay duoc commit tren GitHub.'}
$Sha=$Commits[0].sha
$Temp=Join-Path ([System.IO.Path]::GetTempPath()) ('DHL-Product-Factory-Update-'+[guid]::NewGuid().ToString('N'))
$Stage=Join-Path $Temp 'stage'
$Backup=Join-Path $Temp 'backup'
New-Item -ItemType Directory -Path $Stage -Force | Out-Null
New-Item -ItemType Directory -Path $Backup -Force | Out-Null
try {
  foreach($Relative in $Files) {
    $Part=$Relative.Replace('/',[System.IO.Path]::DirectorySeparatorChar)
    $Dest=Join-Path $Stage $Part
    New-Item -ItemType Directory -Force -Path (Split-Path $Dest -Parent) | Out-Null
    # All download URLs are pinned to an immutable commit of the exact allowlisted repo.
    $Url="https://raw.githubusercontent.com/$Repo/$Sha/$Folder/$Relative"
    Invoke-WebRequest -Uri $Url -UseBasicParsing -OutFile $Dest -TimeoutSec 35
    if((Get-Item $Dest).Length -lt 15) {throw "File cap nhat rong: $Relative"}
  }
  $Remote=Read-Manifest (Join-Path $Stage 'manifest.json')
  if($Remote.name -ne $ExpectedName -or $Remote.manifest_version -ne 3 -or $Remote.key -ne $Local.key) {
    throw 'Manifest GitHub khong khop key/ID, dung cap nhat.'
  }
  if(([version]$Remote.version) -lt ([version]$Local.version)) {throw 'Phien ban GitHub cu hon ban dang cai.'}
  # Keep the user's public OAuth client ID, so reconnecting Google is not necessary.
  if($Local.oauth2.client_id -match '^\d{8,}-[a-z0-9-]+\.apps\.googleusercontent\.com$' -and $Local.oauth2.client_id -notlike '*placeholder*') {
    $Remote.oauth2.client_id=$Local.oauth2.client_id
  }
  Save-Manifest $Remote (Join-Path $Stage 'manifest.json')
  Write-Host "Ban hien tai: $($Local.version) | Ban GitHub: $($Remote.version) | Commit: $Sha" -ForegroundColor Yellow
  $Updated=New-Object System.Collections.Generic.List[string]
  try {
    foreach($Relative in $Files) {
      $Part=$Relative.Replace('/',[System.IO.Path]::DirectorySeparatorChar)
      $Dest=Join-Path $InstallDir $Part
      $Old=Join-Path $Backup $Part
      if(Test-Path -LiteralPath $Dest) {
        New-Item -ItemType Directory -Force -Path (Split-Path $Old -Parent) | Out-Null
        Copy-Item -LiteralPath $Dest -Destination $Old -Force
      }
      New-Item -ItemType Directory -Force -Path (Split-Path $Dest -Parent) | Out-Null
      Copy-Item -LiteralPath (Join-Path $Stage $Part) -Destination $Dest -Force
      $Updated.Add($Relative)
    }
  } catch {
    foreach($Relative in $Updated) {
      $Part=$Relative.Replace('/',[System.IO.Path]::DirectorySeparatorChar)
      $Dest=Join-Path $InstallDir $Part
      $Old=Join-Path $Backup $Part
      if(Test-Path -LiteralPath $Old){Copy-Item -LiteralPath $Old -Destination $Dest -Force}
      elseif(Test-Path -LiteralPath $Dest){Remove-Item -LiteralPath $Dest -Force}
    }
    throw
  }
  Write-Host "Da cap nhat $($Updated.Count) file tu GitHub. OAuth Client ID duoc giu nguyen." -ForegroundColor Green
  Write-Host 'Mo chrome://extensions va bam Reload tren DHL Product Factory.' -ForegroundColor Green
} finally {
  if(Test-Path -LiteralPath $Temp){Remove-Item -LiteralPath $Temp -Recurse -Force -ErrorAction SilentlyContinue}
}
