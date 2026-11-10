# DHL Nameset Layout — one-time recovery for a legacy CorelDRAW 2025 Docker.
# Windows PowerShell 5.1. Does not reinstall Corel or modify CDR / Workspace.
param([string]$DockerUIPath = '')
$ErrorActionPreference = 'Stop'
$repo = 'https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3'
$reportPath = Join-Path $env:TEMP 'DHL_NAMESET_COREL2025_REPORT.txt'
$desktop = [Environment]::GetFolderPath('DesktopDirectory')
$desktopReport = if($desktop -and (Test-Path -LiteralPath $desktop -PathType Container)) { Join-Path $desktop 'DHL_NAMESET_COREL2025_REPORT.txt' } else { $reportPath }
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$stageRemote = Join-Path $env:TEMP ('DHL_NAMESET_2025_VLATEST_' + $PID + '.html')
$entries = New-Object System.Collections.ArrayList
$seen = @{}
$roots = New-Object System.Collections.ArrayList
$rootKeys = @{}
$success = 0
$failures = 0
$latest = ''
function Log([string]$line) {
  $text = '[' + (Get-Date -Format 'HH:mm:ss') + '] ' + $line
  Write-Host $text
  Add-Content -LiteralPath $reportPath -Value $text -Encoding UTF8
}
function Add-Root([string]$path,[string]$origin) {
  if(-not $path) { return }
  try {
    if(-not (Test-Path -LiteralPath $path -PathType Container)) { return }
    $full = [IO.Path]::GetFullPath($path).TrimEnd('\')
    $key = $full.ToLowerInvariant()
    if($rootKeys.ContainsKey($key)){return}
    $rootKeys[$key] = $true
    [void]$roots.Add([pscustomobject]@{Path=$full;Source=$origin})
  }catch{}
}
function Add-Docker([string]$file,[string]$origin,[bool]$is2025) {
  if(-not $file){return}
  try {
    if(-not (Test-Path -LiteralPath $file -PathType Leaf)){return}
    $full = [IO.Path]::GetFullPath($file)
    if([IO.Path]::GetFileName($full) -ine 'DockerUI.html'){return}
    $key = $full.ToLowerInvariant()
    if($seen.ContainsKey($key)){
      if($is2025){$entries[$seen[$key]].Is2025 = $true}
      return
    }
    $raw = [IO.File]::ReadAllText($full)
    if($raw -notmatch '(?i)DHL_UI_VERSION\s*=\s*[0-9]+\.[0-9]+' -or $raw -notmatch '(?i)DHL.NAMESET.LAYOUT'){return}
    $ver = [regex]::Match($raw,'DHL_UI_VERSION\s*=\s*([0-9]+\.[0-9]+)').Groups[1].Value
    $entry = [pscustomobject]@{Path=$full;Version=$ver;Origin=$origin;Is2025=($is2025 -or $full -match '(?i)2025');Result='NOT UPDATED'}
    $seen[$key] = $entries.Count
    [void]$entries.Add($entry)
    Log ('FOUND V' + $ver + ' | 2025=' + $entry.Is2025 + ' | ' + $full + ' | ' + $origin)
  }catch { Log ('INSPECT ERROR | ' + $file + ' | ' + $_.Exception.Message) }
}
function Scan-Addons([string]$root,[string]$origin) {
  if(-not (Test-Path -LiteralPath $root -PathType Container)){return}
  $progs = @($root, (Join-Path $root 'Programs64'), (Join-Path $root 'Programs'),(Join-Path $root 'Draw'))
  foreach($prog in $progs){
    $addons = Join-Path $prog 'Addons'
    if(-not (Test-Path -LiteralPath $addons -PathType Container)){continue}
    $folders = @(Get-ChildItem -LiteralPath $addons -Directory -ErrorAction SilentlyContinue | Where-Object {$_.Name -match '(?i)DHL|NAMESET|TACH.?A3'})
    foreach($folder in $folders){
      $p = Join-Path $folder.FullName 'DockerUI.html'
      Add-Docker $p $origin ($origin -match '2025' -or $root -match '2025')
      # A custom XSLT may point to a different DockerUI.html.
      $xslt = Join-Path $folder.FullName 'AppUI.xslt'
      if(Test-Path -LiteralPath $xslt -PathType Leaf){
        try{
          $xml = [IO.File]::ReadAllText($xslt)
          $uriMatches = [regex]::Matches($xml, '(?i)file:///([^"''<> ]+/DockerUI[.]html)')
          foreach($um in $uriMatches){
            $uri = 'file:///' + $um.Groups[1].Value
            $target = ([Uri]$uri).LocalPath
            Add-Docker $target ($origin + '/AppUI.xslt') ($origin -match '2025' -or $root -match '2025')
          }
        }catch{Log ('XSLT path check skipped: ' + $_.Exception.Message)}
      }
    }
  }
}
function Add-CorelRoot([string]$corel,[string]$origin){
  Add-Root $corel $origin
  if(-not (Test-Path -LiteralPath $corel -PathType Container)){return}
  foreach($child in @(Get-ChildItem -LiteralPath $corel -Directory -ErrorAction SilentlyContinue)){
    Add-Root $child.FullName ($origin + '/' + $child.Name)
  }
}
try{
  Set-Content -LiteralPath $reportPath -Encoding UTF8 -Value ('DHL NAMESET Corel 2025 rescue | '+(Get-Date -Format s))
  Log 'Checking administrator rights and CorelDRAW process...'
  $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
  if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
    throw 'Please run as Administrator (Run as administrator).'
  }
  $running = @(Get-Process CorelDRW -ErrorAction SilentlyContinue)
  if($running.Count){
    foreach($p in $running){try{Log ('RUNNING COREL: ' + $p.Path)}catch{}}
    throw 'CorelDRAW is open. Save all CDR files and close CorelDRAW, then run this tool again. Nothing was changed.'
  }
  if($DockerUIPath){
    Add-Docker $DockerUIPath 'Explicit selected Docker' $true
    if(-not $entries.Count){throw 'The specified path is not a valid DHL DockerUI.html: '+$DockerUIPath}
  }else{
    $bases = @([Environment]::GetFolderPath('ProgramFiles'),[Environment]::GetFolderPath('ProgramFilesX86'),$env:ProgramW6432,$env:APPDATA,$env:LOCALAPPDATA) | Where-Object {$_} | Select-Object -Unique
    foreach($base in $bases){
      Add-CorelRoot (Join-Path $base 'Corel') ('Known Corel root ' + $base)
      Add-CorelRoot (Join-Path $base 'CorelDRAW') ('Known CorelDRAW root ' + $base)
    }
    # Installation registry is essential for nonstandard/custom OEM locations.
    foreach($key in @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
                     'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
                     'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*')){
      foreach($item in @(Get-ItemProperty -Path $key -ErrorAction SilentlyContinue)){
        $name = [string]$item.DisplayName
        if($name -notmatch '(?i)CorelDRAW'){continue}
        if($name -notmatch '2025' -and $name -notmatch '(?i)OEM'){continue}
        $loc = [string]$item.InstallLocation
        if($loc){Add-Root $loc ('Registry ' + $name)}
        $icon = [string]$item.DisplayIcon
        if($icon){
          $exe = $icon.Trim('"') -replace ',[0-9-]+$',''
          if(Test-Path -LiteralPath $exe -PathType Leaf){
            Add-Root (Split-Path -Parent $exe) ('Registry executable ' + $name)
            Add-Root (Split-Path -Parent (Split-Path -Parent $exe)) ('Registry product ' + $name)
          }
        }
      }
    }
    foreach($key in @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\CorelDRW.exe',
                     'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\CorelDRW.exe')){
      try{
        $item = Get-ItemProperty -LiteralPath $key -ErrorAction Stop
        $exe = [string]$item.'(default)'
        if(-not $exe){$exe=[string]$item.Path}
        $exe=$exe.Trim('"')
        if(Test-Path -LiteralPath $exe -PathType Leaf){
          Add-Root (Split-Path -Parent $exe) ('App Paths CorelDRAW 2025')
          Add-Root (Split-Path -Parent (Split-Path -Parent $exe)) ('App Paths CorelDRAW 2025')
        }
      }catch{}
    }
    # Search only within discovered installation roots, not the full hard drive.
    foreach($r in $roots){
      Scan-Addons $r.Path $r.Source
    }
  }
  $targets = @($entries | Where-Object {$_.Is2025})
  if($targets.Count -eq 0){
    Log ('No confirmed Corel 2025 addon found. Total DHL addons discovered=' + $entries.Count)
    Log 'Use the file-picker to locate the currently installed DockerUI.html for Corel 2025.'
    try{
      Add-Type -AssemblyName System.Windows.Forms
      $picker = New-Object System.Windows.Forms.OpenFileDialog
      $picker.Title = 'Choose CorelDRAW 2025 DHL_A3_Nameset\DockerUI.html'
      $picker.Filter = 'DHL DockerUI.html|DockerUI.html'
      $picker.FileName = 'DockerUI.html'
      $picker.CheckFileExists = $true
      $picker.Multiselect = $false
      if($picker.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){
        Add-Docker $picker.FileName 'User selected 2025 Docker' $true
        $targets=@($entries | Where-Object {$_.Is2025})
      }
    }catch{Log ('Picker unavailable: '+$_.Exception.Message)}
  }
  if($targets.Count -eq 0){throw 'Corel 2025 DHL addon not identified. No file was modified. Please send the report.'}
  Log 'RESCUE ENGINE V8.55.2 (Copy-Item, not File.Replace)'
  Log ('Confirmed target(s) for Corel 2025: ' + $targets.Count)
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $url = $repo + '/src/DockerUI_CURRENT.html?fresh=' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  Invoke-WebRequest -Uri $url -OutFile $stageRemote -UseBasicParsing -TimeoutSec 50
  if(-not (Test-Path -LiteralPath $stageRemote -PathType Leaf)){throw 'Download failed to create a snapshot.'}
  $remoteText = [IO.File]::ReadAllText($stageRemote)
  $versionMatch = [regex]::Match($remoteText, 'DHL_UI_VERSION=([0-9]+(?:\.[0-9]+)+)')
  if(-not $versionMatch.Success -or $remoteText.IndexOf('dhl-v854-composer') -lt 0 -or $remoteText.IndexOf('dhl-v840-fast-update') -lt 0 -or $remoteText.IndexOf('</html>') -lt 0){
    throw 'Downloaded GitHub snapshot is incomplete or is not V8.54+. No file was modified.'
  }
  $latest = $versionMatch.Groups[1].Value
  $hash = (Get-FileHash -LiteralPath $stageRemote -Algorithm SHA256).Hash
  Log ('GitHub latest: V'+$latest+' | SHA256 '+$hash.Substring(0,16))
  foreach($entry in $targets){
    $dst = $entry.Path
    $dir = Split-Path -Parent $dst
    $backup = Join-Path $dir ('DockerUI.BACKUP_'+$stamp+'.html')
    $stage = Join-Path $dir ('DockerUI.NEW_'+$PID+'.html')
    try{
      $originalHash=(Get-FileHash -LiteralPath $dst -Algorithm SHA256).Hash
      if($originalHash -eq $hash){
        $entry.Result='Already current V'+$latest
        Log ('ALREADY CURRENT | '+$dst);$success++;continue
      }
      # CorelDRAW 2025 OEM: .NET File.Replace failed even with a valid
      # third backup argument. Use PowerShell Copy-Item instead (no File.Replace).
      # Keep a separately verified backup; rollback below on any write failure.
      Log ('COPY ENGINE V8.55.2 | preparing target ' + $dst)
      Copy-Item -LiteralPath $dst -Destination $backup -ErrorAction Stop
      if(-not (Test-Path -LiteralPath $backup -PathType Leaf)){throw 'Original version backup not created.'}
      if((Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash -ne $originalHash){throw 'Original version backup checksum mismatch.'}
      Log ('BACKUP VERIFIED | '+$backup)
      Copy-Item -LiteralPath $stageRemote -Destination $stage -ErrorAction Stop
      if((Get-FileHash -LiteralPath $stage -Algorithm SHA256).Hash -ne $hash){throw 'Staged file checksum mismatch.'}
      # CorelDRAW must be closed; no executable/code files or CDR are touched.
      Copy-Item -LiteralPath $stage -Destination $dst -Force -ErrorAction Stop
      if((Get-FileHash -LiteralPath $dst -Algorithm SHA256).Hash -ne $hash){throw 'Installed file hash mismatch. Backup will be restored.'}
      $installedText = [IO.File]::ReadAllText($dst)
      if($installedText.IndexOf('DHL_UI_VERSION='+$latest) -lt 0 -or $installedText.IndexOf('dhl-v854-composer') -lt 0){
        throw 'Installed UI content/version verification failed. Backup will be restored.'
      }
      Unblock-File -LiteralPath $dst -ErrorAction SilentlyContinue
      Log ('INSTALL VERIFIED | V'+$latest+' | SHA256 '+$hash.Substring(0,16))
      $entry.Result='UPDATED V'+$entry.Version+' to V'+$latest
      Log ('SUCCESS '+$entry.Result+' | '+$dst)
      Log ('Backup saved | '+$backup)
      $success++
    }catch{
      $entry.Result='FAILED: '+$_.Exception.Message
      $failures++
      Log ('ERROR | '+$dst+' | '+$_.Exception.Message)
      try{
        if((Test-Path -LiteralPath $backup -PathType Leaf) -and ((Get-FileHash -LiteralPath $dst -Algorithm SHA256).Hash -ne $originalHash)){
          Copy-Item -LiteralPath $backup -Destination $dst -Force
          Log ('RESTORED original from backup | '+$dst)
        }
      }catch{Log ('RESTORE FAILED | '+$dst+' | '+$_.Exception.Message)}
    }finally{Remove-Item -LiteralPath $stage -Force -ErrorAction SilentlyContinue}
  }
  Log ('RESULT: success='+$success+' / targets='+$targets.Count+' | failed='+$failures)
  foreach($x in $entries){Log ('FOUND TARGET | '+$x.Path+' | from V'+$x.Version+' | '+$x.Result)}
  if($failures -gt 0 -or $success -ne $targets.Count){throw 'One or more Corel 2025 updates failed. Read the report.'}
  Log ('COMPLETE. Close this window, launch Corel 2025, and confirm DHL Nameset shows V'+$latest+'.')
  exit 0
}catch{
  Log ('STOP: '+$_.Exception.Message)
  exit 1
}finally{
  Remove-Item -LiteralPath $stageRemote -Force -ErrorAction SilentlyContinue
  if($desktopReport -ne $reportPath){try{Copy-Item -LiteralPath $reportPath -Destination $desktopReport -Force}catch{}}
  Write-Host ('REPORT: '+$desktopReport)
}
