$ErrorActionPreference = 'Stop'

$repoBase = 'https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3'
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$tmpBase = Join-Path $env:TEMP 'DockerUI_DHL_Base.html'
$tmpPatch = Join-Path $env:TEMP 'DHL_V77_PATCH.html'
$tmpOut = Join-Path $env:TEMP 'DockerUI_DHL_Layout_V77.html'

Write-Host 'Downloading DHL Nameset Layout V7.7...' -ForegroundColor Cyan
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/DockerUI.html?v=$stamp" -OutFile $tmpBase
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/V77_PATCH.html?v=$stamp" -OutFile $tmpPatch

$raw = [IO.File]::ReadAllText($tmpBase)
$patch = [IO.File]::ReadAllText($tmpPatch)
if ($raw -notmatch 'DHL_UI_VERSION=7\.4') { throw 'GitHub base UI is not V7.4.' }
if ($patch -notmatch 'dhl-v77-features') { throw 'V7.7 feature patch is missing or incomplete.' }

$raw = $raw.Replace('DHL_UI_VERSION=7.4','DHL_UI_VERSION=7.7').Replace('v7.4','v7.7')
$raw = $raw.Replace('</body>', $patch + "`r`n</body>")

$utf8 = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($tmpOut,$raw,$utf8)
$verify = [IO.File]::ReadAllText($tmpOut)
if ($verify -notmatch 'DHL_UI_VERSION=7\.7' -or $verify -notmatch 'dhl-v77-features') { throw 'Could not build V7.7 UI.' }

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
  if ($check -notmatch 'DHL_UI_VERSION=7\.7' -or $check -notmatch 'dhl-v77-features') { throw ('Write failed: ' + $dst) }
  Write-Host ('UPDATED V7.7: ' + $dst) -ForegroundColor Green
}

Remove-Item -LiteralPath $tmpBase,$tmpPatch,$tmpOut -Force -ErrorAction SilentlyContinue
Write-Host ''
Write-Host 'DONE - DHL Nameset Layout V7.7 installed.' -ForegroundColor Cyan
Write-Host 'New: multi-frame nesting, selected-button feedback, clearer outline controls, auto-group outline with image.'
Write-Host 'Close and reopen the Docker in CorelDRAW if the version does not refresh immediately.'
exit 0