$ErrorActionPreference = 'Stop'

$repoBase = 'https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3'
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$tmpBase = Join-Path $env:TEMP 'DockerUI_DHL_Base.html'
$tmpPatch77 = Join-Path $env:TEMP 'DHL_V77_PATCH.html'
$tmpPatch78 = Join-Path $env:TEMP 'DHL_V78_PATCH.html'
$tmpPatch79 = Join-Path $env:TEMP 'DHL_V79_PATCH.html'
$tmpPatch80 = Join-Path $env:TEMP 'DHL_V80_PATCH.html'
$tmpPatch81 = Join-Path $env:TEMP 'DHL_V81_PATCH.html'
$tmpPatch82 = Join-Path $env:TEMP 'DHL_V82_PATCH.html'
$tmpPatch83 = Join-Path $env:TEMP 'DHL_V83_PATCH.html'
$tmpOut = Join-Path $env:TEMP 'DockerUI_DHL_Layout_V83.html'

Write-Host 'Downloading DHL Nameset Layout V8.3...' -ForegroundColor Cyan
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/DockerUI.html?v=$stamp" -OutFile $tmpBase
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/V77_PATCH.html?v=$stamp" -OutFile $tmpPatch77
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/V78_PATCH.html?v=$stamp" -OutFile $tmpPatch78
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/V79_PATCH.html?v=$stamp" -OutFile $tmpPatch79
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/V80_PATCH.html?v=$stamp" -OutFile $tmpPatch80
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/V81_PATCH.html?v=$stamp" -OutFile $tmpPatch81
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/V82_PATCH.html?v=$stamp" -OutFile $tmpPatch82
Invoke-WebRequest -UseBasicParsing -Uri "$repoBase/src/V83_PATCH.html?v=$stamp" -OutFile $tmpPatch83

$raw = [IO.File]::ReadAllText($tmpBase)
$patch77 = [IO.File]::ReadAllText($tmpPatch77)
$patch78 = [IO.File]::ReadAllText($tmpPatch78)
$patch79 = [IO.File]::ReadAllText($tmpPatch79)
$patch80 = [IO.File]::ReadAllText($tmpPatch80)
$patch81 = [IO.File]::ReadAllText($tmpPatch81)
$patch82 = [IO.File]::ReadAllText($tmpPatch82)
$patch83 = [IO.File]::ReadAllText($tmpPatch83)
if ($raw -notmatch 'DHL_UI_VERSION=7\.4') { throw 'GitHub base UI is not V7.4.' }
if ($patch77 -notmatch 'dhl-v77-features') { throw 'V7.7 feature patch is missing.' }
if ($patch78 -notmatch 'dhl-v78-outline-fix') { throw 'V7.8 outline patch is missing.' }
if ($patch79 -notmatch 'dhl-v79-cm-ui') { throw 'V7.9 cm patch is missing.' }
if ($patch80 -notmatch 'dhl-v80-modes') { throw 'V8.0 mode patch is missing.' }
if ($patch81 -notmatch 'dhl-v81-guillotine') { throw 'V8.1 guillotine patch is missing.' }
if ($patch82 -notmatch 'dhl-v82-tabs') { throw 'V8.2 tab patch is missing.' }
if ($patch83 -notmatch 'dhl-v83-roll45') { throw 'V8.3 roll/45 patch is missing.' }

$raw = $raw.Replace('DHL_UI_VERSION=7.4','DHL_UI_VERSION=8.3').Replace('v7.4','v8.3')
$raw = $raw.Replace('</body>', $patch77 + "`r`n" + $patch78 + "`r`n" + $patch79 + "`r`n" + $patch80 + "`r`n" + $patch81 + "`r`n" + $patch82 + "`r`n" + $patch83 + "`r`n</body>")

$utf8 = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($tmpOut,$raw,$utf8)
$verify = [IO.File]::ReadAllText($tmpOut)
if ($verify -notmatch 'DHL_UI_VERSION=8\.3' -or $verify -notmatch 'dhl-v83-roll45') { throw 'Could not build V8.3 UI.' }

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
  if ($check -notmatch 'DHL_UI_VERSION=8\.3' -or $check -notmatch 'dhl-v83-roll45') { throw ('Write failed: ' + $dst) }
  Write-Host ('UPDATED V8.3: ' + $dst) -ForegroundColor Green
}

Remove-Item -LiteralPath $tmpBase,$tmpPatch77,$tmpPatch78,$tmpPatch79,$tmpPatch80,$tmpPatch81,$tmpPatch82,$tmpPatch83,$tmpOut -Force -ErrorAction SilentlyContinue
Write-Host ''
Write-Host 'DONE - DHL Nameset Layout V8.3 installed.' -ForegroundColor Cyan
Write-Host 'Changed: default roll 58 cm x 20 m, 1.5 cm object gap, zero frame/margins, corrected cm presets, optional 45-degree compact rotation.'
Write-Host 'Close and reopen the Docker in CorelDRAW if the version does not refresh immediately.'
exit 0