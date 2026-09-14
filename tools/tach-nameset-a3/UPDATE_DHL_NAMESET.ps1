$ErrorActionPreference = 'Stop'

$repoBase = 'https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3'
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$tmpBase = Join-Path $env:TEMP 'DockerUI_DHL_Base.html'
$tmpPatch77 = Join-Path $env:TEMP 'DHL_V77_PATCH.html'
$tmpPatch78 = Join-Path $env:TEMP 'DHL_V78_PATCH.html'
$tmpOut = Join-Path $env:TEMP 'DockerUI_DHL_Layout_V78.html'

Write-Host 'Downloading DHL Nameset Layout V7.8...' -ForegroundColor Cyan
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/DockerUI.html?v=$stamp" -OutFile $tmpBase
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/V77_PATCH.html?v=$stamp" -OutFile $tmpPatch77
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/V78_PATCH.html?v=$stamp" -OutFile $tmpPatch78

$raw = [IO.File]::ReadAllText($tmpBase)
$patch77 = [IO.File]::ReadAllText($tmpPatch77)
$patch78 = [IO.File]::ReadAllText($tmpPatch78)
if ($raw -notmatch 'DHL_UI_VERSION=7\.4') { throw 'GitHub base UI is not V7.4.' }
if ($patch77 -notmatch 'dhl-v77-features') { throw 'V7.7 feature patch is missing.' }
if ($patch78 -notmatch 'dhl-v78-outline-fix') { throw 'V7.8 outline patch is missing.' }

$raw = $raw.Replace('DHL_UI_VERSION=7.4','DHL_UI_VERSION=7.8').Replace('v7.4','v7.8')
$raw = $raw.Replace('</body>', $patch77 + "`r`n" + $patch78 + "`r`n</body>")

$utf8 = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($tmpOut,$raw,$utf8)
$verify = [IO.File]::ReadAllText($tmpOut)
if ($verify -notmatch 'DHL_UI_VERSION=7\.8' -or $verify -notmatch 'dhl-v77-features' -or $verify -notmatch 'dhl-v78-outline-fix') { throw 'Could not build V7.8 UI.' }

$targets = New-Object System.Collections.Generic.List[string]
$roots = @()
$pf = [Environment]::GetFolderPath('ProgramFiles')
if ($pf) { $roots += (Join-Path $pf 'Corel') }
if ($env:APPDATA) { $roots += (Join-Path $env:APPDATA 'Corel') }
if ($env:LOCALAPPDATA) { $roots += (Join-Path $env:LOCALAPPDATA 'Corel') }

foreach ($root in $roots) {
  if (-not (Test-Path -LiteralPath $root)) { continue }
  Get-ChildItem -LiteralPath $root -Directory -Filter 'DHL_A3_Nameset' -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    if (Test-Path -LiteralPath (Join-Path $_.FullName 'DockerUI.html')) { $targets.Add($_.FullName) }
  }
}

if ($targets.Count -eq 0) { throw 'Khong tim thay thu muc DHL_A3_Nameset.' }
$uniq = $targets | Sort-Object -Unique
foreach ($target in $uniq) {
  $dst = Join-Path $target 'DockerUI.html'
  Copy-Item -LiteralPath $tmpOut -Destination $dst -Force
  Unblock-File -LiteralPath $dst -ErrorAction SilentlyContinue
  foreach ($f in @('AppUI.xslt','UserUI.xslt')) {
    $p = Join-Path $target $f
    if (Test-Path -LiteralPath $p) {
      $t = [IO.File]::ReadAllText($p)
      $t = $t.Replace('Tách Nameset A3','DHL Nameset Layout').Replace('Tach Nameset A3','DHL Nameset Layout')
      [IO.File]::WriteAllText($p,$t,$utf8)
    }
  }
  $check = [IO.File]::ReadAllText($dst)
  if ($check -notmatch 'DHL_UI_VERSION=7\.8' -or $check -notmatch 'dhl-v78-outline-fix') { throw ('Write failed: ' + $dst) }
  Write-Host ('UPDATED V7.8: ' + $dst) -ForegroundColor Green
}

Remove-Item -LiteralPath $tmpBase,$tmpPatch77,$tmpPatch78,$tmpOut -Force -ErrorAction SilentlyContinue
Write-Host ''
Write-Host 'DONE - DHL Nameset Layout V7.8 installed.' -ForegroundColor Cyan
Write-Host 'Fix: outline offset now uses document millimeters, exact outside contour, staged error reporting, and auto-group.'
Write-Host 'Close and reopen the Docker in CorelDRAW if the version does not refresh immediately.'
exit 0