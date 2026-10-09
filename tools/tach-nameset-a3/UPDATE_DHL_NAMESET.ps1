# DHL Nameset Layout updater V8.22 compatibility marker for older installed launchers
# DHL Nameset Layout updater V8.23 compatibility marker
$ErrorActionPreference = 'Stop'

$repoBase = 'https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3'
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$tmpOut = Join-Path $env:TEMP 'DockerUI_DHL_Layout_V832.html'
$log = Join-Path $env:TEMP 'DHL_NAMESET_UPDATE_LOG.txt'

function Log([string]$s){
  $line='['+(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')+'] '+$s
  Add-Content -LiteralPath $log -Value $line -Encoding UTF8
  Write-Host $s
}

try {
  Set-Content -LiteralPath $log -Value ('DHL Nameset Layout updater V8.32 snapshot - '+(Get-Date)) -Encoding UTF8
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

  Log 'Downloading current DHL Nameset Layout V8.32 snapshot...'
  $url=$repoBase+'/src/DockerUI_CURRENT.html?v='+$stamp
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $tmpOut -TimeoutSec 45

  if(!(Test-Path -LiteralPath $tmpOut)){throw 'Current snapshot was not downloaded.'}
  $verify=[IO.File]::ReadAllText($tmpOut)
  if($verify.IndexOf('DHL_UI_VERSION=8.32') -lt 0){throw 'Downloaded snapshot is not V8.32.'}
  if($verify.IndexOf('dhl-v829-ui-outline') -lt 0 -or $verify.IndexOf('dhl-v831-true-contour-nest') -lt 0 -or $verify.IndexOf('dhl-v832-safe-selection') -lt 0){throw 'Current snapshot finalizer is missing.'}
  if($verify.IndexOf('dhl-v87-commercial-license') -ge 0){throw 'License module unexpectedly exists in current snapshot.'}
  Log ('Snapshot ready: '+(Get-Item -LiteralPath $tmpOut).Length+' bytes')

  $targets=New-Object System.Collections.Generic.List[string]
  $roots=@()
  $pf=[Environment]::GetFolderPath('ProgramFiles')
  if($pf){$roots+=(Join-Path $pf 'Corel')}
  if($env:APPDATA){$roots+=(Join-Path $env:APPDATA 'Corel')}
  if($env:LOCALAPPDATA){$roots+=(Join-Path $env:LOCALAPPDATA 'Corel')}

  foreach($root in $roots){
    if(!(Test-Path -LiteralPath $root)){continue}
    Get-ChildItem -LiteralPath $root -Directory -Filter 'DHL_A3_Nameset' -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
      $ui=Join-Path $_.FullName 'DockerUI.html'
      if(Test-Path -LiteralPath $ui){$targets.Add($_.FullName)}
    }
  }

  if($targets.Count -eq 0){throw 'Khong tim thay DHL_A3_Nameset nao dang duoc cai.'}

  $utf8=New-Object Text.UTF8Encoding($false)
  $success=0
  $failed=0

  foreach($target in ($targets|Sort-Object -Unique)){
    $prev=$null
    try{
      $dst=Join-Path $target 'DockerUI.html'
      $prev=Join-Path $target 'DockerUI.PREVIOUS.html'
      Copy-Item -LiteralPath $dst -Destination $prev -Force
      Copy-Item -LiteralPath $tmpOut -Destination $dst -Force
      Unblock-File -LiteralPath $dst -ErrorAction SilentlyContinue

      foreach($f in @('AppUI.xslt','UserUI.xslt')){
        $p=Join-Path $target $f
        if(Test-Path -LiteralPath $p){
          $t=[IO.File]::ReadAllText($p)
          $t=$t.Replace('Tách Nameset A3','DHL Nameset Layout').Replace('Tach Nameset A3','DHL Nameset Layout')
          [IO.File]::WriteAllText($p,$t,$utf8)
        }
      }

      $check=[IO.File]::ReadAllText($dst)
      if($check.IndexOf('DHL_UI_VERSION=8.32') -lt 0){throw 'V8.32 verification failed.'}
      if($check.IndexOf('dhl-v832-safe-selection') -lt 0){throw 'Snapshot finalizer missing after write.'}
      if($check.IndexOf('dhl-v87-commercial-license') -ge 0){throw 'License module found after write.'}

      $success++
      Log ('UPDATED V8.32 SNAPSHOT: '+$dst)
    }catch{
      try{if($prev -and (Test-Path -LiteralPath $prev)){Copy-Item -LiteralPath $prev -Destination $dst -Force}}catch{}
      $failed++
      Log ('SKIP FAILED TARGET: '+$target+' | '+$_.Exception.Message)
    }
  }

  Remove-Item -LiteralPath $tmpOut -Force -ErrorAction SilentlyContinue

  if($failed -gt 0){Log ('WARNING: Some Corel addon locations could not be updated: '+$failed)}
  if($success -lt 1){throw ('Khong cap nhat duoc ban Corel nao. Xem log: '+$log)}
  Log ('DONE - V8.32 snapshot installed to '+$success+' location(s); failed/skipped: '+$failed)
  Write-Host ''
  Write-Host 'DONE - DHL Nameset Layout V8.32 snapshot installed.' -ForegroundColor Cyan
  Write-Host ('Log: '+$log) -ForegroundColor DarkGray
  exit 0
}
catch{
  $msg=$_.Exception.Message
  try{Log ('ERROR: '+$msg)}catch{}
  Write-Host ''
  Write-Host ('UPDATE FAILED: '+$msg) -ForegroundColor Red
  Write-Host ('Log: '+$log) -ForegroundColor Yellow
  exit 1
}
