# DHL Nameset Layout updater V8.23 - legacy launcher compatibility marker only. This executes the latest direct-snapshot updater, NOT old versions.
# DHL Nameset Layout: DIRECT LATEST snapshot updater (V8.40+).
# No reinstall, historical version chain, workspace reset, or recursive folder scan.
# Run elevated when the addon is installed under Program Files.
param([string]$CurrentAddonDir = '')
$ErrorActionPreference = 'Stop'
$repo = 'https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3'
$log = Join-Path $env:TEMP 'DHL_NAMESET_UPDATE_LOG.txt'
$tmp = Join-Path $env:TEMP ('DHL_NAMESET_LATEST_'+$PID+'.html')
$targets = New-Object System.Collections.Generic.List[string]
$seen = @{}
$success = 0
$changed = 0
$unchanged = 0
$failed = 0

function Log([string]$msg) {
  $line = '['+(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')+'] '+$msg
  Add-Content -LiteralPath $log -Value $line -Encoding UTF8
  Write-Host $msg
}
function Add-Target([string]$dir) {
  if([string]::IsNullOrWhiteSpace($dir)){return}
  $file = Join-Path $dir 'DockerUI.html'
  if(-not (Test-Path -LiteralPath $file -PathType Leaf)){return}
  try{$key = [IO.Path]::GetFullPath($dir).TrimEnd('\').ToLowerInvariant()}catch{return}
  if(-not $seen.ContainsKey($key)){$seen[$key]=$true;$targets.Add($dir)}
}
function Find-InstalledAddons {
  if($CurrentAddonDir){Add-Target $CurrentAddonDir}
  # Only inspect the known Corel -> product -> Programs64/Programs -> Addons path.
  # Previous versions scanned ALL of Program Files, Roaming and LocalAppData recursively.
  $bases = @(
    [Environment]::GetFolderPath('ProgramFiles'),
    [Environment]::GetFolderPath('ProgramFilesX86'),
    $env:ProgramW6432,
    $env:APPDATA,
    $env:LOCALAPPDATA
  ) | Where-Object {$_} | Select-Object -Unique
  foreach($base in $bases){
    $corel = Join-Path $base 'Corel'
    if(-not (Test-Path -LiteralPath $corel -PathType Container)){continue}
    Add-Target (Join-Path $corel 'Addons\DHL_A3_Nameset')
    foreach($product in @(Get-ChildItem -LiteralPath $corel -Directory -ErrorAction SilentlyContinue)){
      Add-Target (Join-Path $product.FullName 'Programs64\Addons\DHL_A3_Nameset')
      Add-Target (Join-Path $product.FullName 'Programs\Addons\DHL_A3_Nameset')
      Add-Target (Join-Path $product.FullName 'Addons\DHL_A3_Nameset')
    }
  }
}

try {
  Set-Content -LiteralPath $log -Value ('DHL Nameset DIRECT latest update '+(Get-Date)) -Encoding UTF8
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Find-InstalledAddons
  if($targets.Count -eq 0){throw 'DHL addon not found. Run the full installer ONCE; subsequent updates use this fast updater.'}
  Log ('Found '+$targets.Count+' installed Corel addon folder(s) without recursive scanning.')

  # Download EXACTLY ONE consolidated latest release from main, never older patches.
  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $url = $repo+'/src/DockerUI_CURRENT.html?fresh='+$stamp
  Log 'Downloading the single latest DockerUI snapshot...'
  Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30 -OutFile $tmp
  if(-not (Test-Path -LiteralPath $tmp -PathType Leaf)){throw 'Download did not produce a snapshot.'}
  $source = [IO.File]::ReadAllText($tmp)
  $match = [regex]::Match($source, 'DHL_UI_VERSION=([0-9]+(?:\.[0-9]+)+)')
  if(-not $match.Success){throw 'Snapshot has no valid DHL_UI_VERSION marker.'}
  if($source.IndexOf('dhl-v840-fast-update') -lt 0 -or $source.IndexOf('</html>') -lt 0 -or $source.IndexOf('DHL NAMESET LAYOUT') -lt 0){
    throw 'Snapshot is incomplete or missing the fast-update module.'
  }
  $version = $match.Groups[1].Value
  $remoteHash = (Get-FileHash -LiteralPath $tmp -Algorithm SHA256).Hash
  Log ('Latest release: V'+$version+' | SHA256 '+$remoteHash.Substring(0,12))

  foreach($dir in $targets){
    $dst = Join-Path $dir 'DockerUI.html'
    $stage = Join-Path $dir ('DockerUI.NEW.'+$PID+'.html')
    $backup = Join-Path $dir 'DockerUI.PREVIOUS.html'
    try {
      $localHash = (Get-FileHash -LiteralPath $dst -Algorithm SHA256).Hash
      if($localHash -eq $remoteHash) {
        $unchanged++;$success++
        Log ('UP TO DATE (skip): '+$dst)
        continue
      }
      # Stage and validate in the SAME directory for atomic replacement.
      Copy-Item -LiteralPath $tmp -Destination $stage -Force
      $stageHash = (Get-FileHash -LiteralPath $stage -Algorithm SHA256).Hash
      if($stageHash -ne $remoteHash){throw 'Staging checksum mismatch; existing UI left untouched.'}
      [IO.File]::Replace($stage,$dst,$backup)
      $installedHash = (Get-FileHash -LiteralPath $dst -Algorithm SHA256).Hash
      if($installedHash -ne $remoteHash){
        try{if(Test-Path -LiteralPath $backup){Copy-Item -LiteralPath $backup -Destination $dst -Force}}catch{}
        throw 'Installed checksum mismatch after replace; previous UI restored if possible.'
      }
      Unblock-File -LiteralPath $dst -ErrorAction SilentlyContinue
      $changed++;$success++
      Log ('UPDATED directly to V'+$version+': '+$dst)
    }catch{
      $failed++
      Log ('FAILED (old UI retained if replace was not completed): '+$dst+' | '+$_.Exception.Message)
    }finally{
      Remove-Item -LiteralPath $stage -Force -ErrorAction SilentlyContinue
    }
  }
  Log ('DONE: latest V'+$version+' | changed='+$changed+' | already latest='+$unchanged+' | failed='+$failed)
  Log ('Log: '+$log)
  if($failed -gt 0){exit 1}
  if($success -eq 0){exit 1}
  exit 0
}catch{
  try{Log ('UPDATE ERROR: '+$_.Exception.Message)}catch{Write-Host $_.Exception.Message}
  exit 1
}finally{
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
