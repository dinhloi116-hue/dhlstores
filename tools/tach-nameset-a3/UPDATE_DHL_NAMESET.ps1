$ErrorActionPreference = 'Stop'

$repoBase = 'https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3'
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$tmpBase = Join-Path $env:TEMP 'DockerUI_DHL_Base.html'
$tmpOut = Join-Path $env:TEMP 'DockerUI_DHL_Layout_V810.html'
$log = Join-Path $env:TEMP 'DHL_NAMESET_UPDATE_LOG.txt'
$patchNames = @('V77_PATCH.html','V78_PATCH.html','V79_PATCH.html','V80_PATCH.html','V81_PATCH.html','V82_PATCH.html','V83_PATCH.html','V84_PATCH.html','V85_PATCH.html','V86_PATCH.html','V87_LICENSE.html','V88_FONT_FIX.html','V89_FONT_FREEZE_FIX.html','V810_WORKFLOW_ORDER.html')
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
  'V86_PATCH.html'='dhl-v86-excel-rowgroups'
  'V87_LICENSE.html'='dhl-v87-commercial-license'
  'V88_FONT_FIX.html'='dhl-v88-font-fix'
  'V89_FONT_FREEZE_FIX.html'='dhl-v89-font-freeze-fix'
  'V810_WORKFLOW_ORDER.html'='dhl-v810-workflow-order'
}
$tmpPatches = @{}

function Log([string]$s){
  $line = ('[' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '] ' + $s)
  Add-Content -LiteralPath $log -Value $line -Encoding UTF8
  Write-Host $s
}

try {
  Set-Content -LiteralPath $log -Value ('DHL Nameset Layout updater V8.10 - ' + (Get-Date)) -Encoding UTF8
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Log 'Downloading DHL Nameset Layout V8.10...'

  Invoke-WebRequest -UseBasicParsing -Uri ($repoBase + '/src/DockerUI.html?v=' + $stamp) -OutFile $tmpBase
  foreach($name in $patchNames){
    $tmp = Join-Path $env:TEMP ('DHL_' + $name)
    Invoke-WebRequest -UseBasicParsing -Uri ($repoBase + '/src/' + $name + '?v=' + $stamp) -OutFile $tmp
    $tmpPatches[$name] = $tmp
    Log ('Downloaded ' + $name)
  }

  $raw = [IO.File]::ReadAllText($tmpBase)
  if ($raw.IndexOf('DHL_UI_VERSION=7.4') -lt 0) { throw 'GitHub base UI is not V7.4.' }

  $append = New-Object System.Text.StringBuilder
  foreach($name in $patchNames){
    $txt = [IO.File]::ReadAllText($tmpPatches[$name])
    $marker = [string]$markers[$name]
    if($txt.IndexOf($marker) -lt 0){ throw ($name + ' is missing marker ' + $marker) }
    [void]$append.Append($txt)
    [void]$append.Append("`r`n")
  }

  $raw = $raw.Replace('DHL_UI_VERSION=7.4','DHL_UI_VERSION=8.10').Replace('v7.4','v8.10')
  if($raw.IndexOf('</body>') -lt 0){ throw 'Base UI is missing </body>.' }
  $raw = $raw.Replace('</body>', $append.ToString() + '</body>')

  $utf8 = New-Object Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($tmpOut,$raw,$utf8)
  $verify = [IO.File]::ReadAllText($tmpOut)
  if ($verify.IndexOf('DHL_UI_VERSION=8.10') -lt 0 -or $verify.IndexOf('dhl-v810-workflow-order') -lt 0) { throw 'Could not build V8.10 UI.' }
  Log ('Built V8.10 UI: ' + (Get-Item -LiteralPath $tmpOut).Length + ' bytes')

  $targets = New-Object System.Collections.Generic.List[string]
  $roots = @()
  $pf = [Environment]::GetFolderPath('ProgramFiles')
  if ($pf) { $roots += (Join-Path $pf 'Corel') }
  if ($env:APPDATA) { $roots += (Join-Path $env:APPDATA 'Corel') }
  if ($env:LOCALAPPDATA) { $roots += (Join-Path $env:LOCALAPPDATA 'Corel') }

  foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    Get-ChildItem -LiteralPath $root -Directory -Filter 'DHL_A3_Nameset' -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
      $ui = Join-Path $_.FullName 'DockerUI.html'
      if (Test-Path -LiteralPath $ui) { $targets.Add($_.FullName) }
    }
  }

  if ($targets.Count -eq 0) { throw 'Khong tim thay thu muc DHL_A3_Nameset nao dang duoc cai.' }
  $uniq = $targets | Sort-Object -Unique
  $success = 0
  $failed = 0

  foreach ($target in $uniq) {
    try {
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
      if ($check.IndexOf('DHL_UI_VERSION=8.10') -lt 0 -or $check.IndexOf('dhl-v810-workflow-order') -lt 0) { throw 'Verification failed after write.' }
      $success++
      Log ('UPDATED V8.10: ' + $dst)
    } catch {
      $failed++
      Log ('SKIP FAILED TARGET: ' + $target + ' | ' + $_.Exception.Message)
    }
  }

  if($success -lt 1){ throw ('Khong cap nhat duoc bat ky ban Corel nao. Xem log: ' + $log) }

  Remove-Item -LiteralPath $tmpBase,$tmpOut -Force -ErrorAction SilentlyContinue
  foreach($name in $patchNames){
    if($tmpPatches.ContainsKey($name)){ Remove-Item -LiteralPath $tmpPatches[$name] -Force -ErrorAction SilentlyContinue }
  }

  Log ('DONE - V8.10 installed to ' + $success + ' location(s); failed/skipped: ' + $failed)
  Write-Host ''
  Write-Host 'DONE - DHL Nameset Layout V8.10 installed.' -ForegroundColor Cyan
  Write-Host 'V8.10: Excel workflow reordered and gated from Step 1 through Step 5.'
  Write-Host ('Log: ' + $log) -ForegroundColor DarkGray
  exit 0
}
catch {
  $msg = $_.Exception.Message
  try { Log ('ERROR: ' + $msg) } catch {}
  Write-Host ''
  Write-Host ('UPDATE FAILED: ' + $msg) -ForegroundColor Red
  Write-Host ('Log: ' + $log) -ForegroundColor Yellow
  exit 1
}
