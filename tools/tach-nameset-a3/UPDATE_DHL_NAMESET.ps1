$ErrorActionPreference = 'Stop'

$repoBase = 'https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3'
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$tmpBase = Join-Path $env:TEMP 'DockerUI_DHL_Base.html'
$tmpOut = Join-Path $env:TEMP 'DockerUI_DHL_Layout_V85.html'
$patchNames = @('V77_PATCH.html','V78_PATCH.html','V79_PATCH.html','V80_PATCH.html','V81_PATCH.html','V82_PATCH.html','V83_PATCH.html','V84_PATCH.html','V85_PATCH.html')
$markers = @{
  'V77_PATCH.html'='dhl-v77-features'
  'V78_PATCH.html'='dhl-v78-outline-fix'
  'V79_PATCH.html'='dhl-v79-cm-ui'
  'V80_PATCH.html'='dhl-v80-modes'
  'V81_PATCH.html'='dhl-v81-guillotine'
  'V82_PATCH.html'='dhl-v82-tabs'
  'V83_PATCH.html'='dhl-v83-roll45'
  'V84_PATCH.html'='dhl-v84-excel'
  'V85_PATCH.html'='dhl-v85-copy-size'
}
$tmpPatches = @{}

Write-Host 'Downloading DHL Nameset Layout V8.5...' -ForegroundColor Cyan
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/DockerUI.html?v=$stamp" -OutFile $tmpBase
foreach($name in $patchNames){
  $tmp = Join-Path $env:TEMP ('DHL_' + $name)
  Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/$name?v=$stamp" -OutFile $tmp
  $tmpPatches[$name] = $tmp
}

$raw = [IO.File]::ReadAllText($tmpBase)
if ($raw -notmatch 'DHL_UI_VERSION=7\.4') { throw 'GitHub base UI is not V7.4.' }

$append = ''
foreach($name in $patchNames){
  $txt = [IO.File]::ReadAllText($tmpPatches[$name])
  if($txt -notmatch [Regex]::Escape($markers[$name])){ throw ($name + ' is missing marker ' + $markers[$name]) }
  $append += $txt + "`r`n"
}

$raw = $raw.Replace('DHL_UI_VERSION=7.4','DHL_UI_VERSION=8.5').Replace('v7.4','v8.5')
$raw = $raw.Replace('</body>', $append + '</body>')
$utf8 = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($tmpOut,$raw,$utf8)
$verify = [IO.File]::ReadAllText($tmpOut)
if ($verify -notmatch 'DHL_UI_VERSION=8\.5' -or $verify -notmatch 'dhl-v85-copy-size') { throw 'Could not build V8.5 UI.' }

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
  if ($check -notmatch 'DHL_UI_VERSION=8\.5' -or $check -notmatch 'dhl-v85-copy-size') { throw ('Write failed: ' + $dst) }
  Write-Host ('UPDATED V8.5: ' + $dst) -ForegroundColor Green
}

Remove-Item -LiteralPath $tmpBase,$tmpOut -Force -ErrorAction SilentlyContinue
foreach($name in $patchNames){ Remove-Item -LiteralPath $tmpPatches[$name] -Force -ErrorAction SilentlyContinue }
Write-Host ''
Write-Host 'DONE - DHL Nameset Layout V8.5 installed.' -ForegroundColor Cyan
Write-Host 'Changed: quantity + target width/height before nesting, aspect-ratio lock, source-size pickup, original source preserved, and combined undo for generated copies + nesting.'
Write-Host 'Close and reopen the Docker in CorelDRAW if the version does not refresh immediately.'
exit 0