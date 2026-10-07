$ErrorActionPreference='Stop'

function Stop-CorelSafely {
  $corelProc=Get-Process -Name CorelDRW -ErrorAction SilentlyContinue
  if(-not $corelProc){return}
  Write-Host ''
  Write-Host 'DANG CO COREL DRAW CHAY.' -ForegroundColor Yellow
  foreach($p in $corelProc){
    $path=''
    try{$path=$p.Path}catch{}
    Write-Host (' - CorelDRW PID '+$p.Id+($(if($path){' | '+$path}else{''})))
  }
  Write-Host ''
  Write-Host 'HAY LUU HET FILE DANG LAM TRUOC.' -ForegroundColor Yellow
  $ans=Read-Host 'Nhap DONG de tool tu dong tat tat ca CorelDRAW, hoac Enter de huy'
  if($ans -ne 'DONG'){
    Write-Host 'Da huy de tranh mat du lieu.' -ForegroundColor Yellow
    exit 2
  }
  $corelProc | Stop-Process -Force -ErrorAction Stop
  Start-Sleep -Milliseconds 900
  if(Get-Process -Name CorelDRW -ErrorAction SilentlyContinue){
    throw 'Khong tat het CorelDRAW. Hay End task CorelDRW.exe roi chay lai.'
  }
}

function Get-CorelTargets {
  param([string]$CorelRoot)
  $all=Get-ChildItem -LiteralPath $CorelRoot -Filter CorelDRW.exe -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.DirectoryName -match 'Programs64' } |
    Sort-Object FullName -Unique
  $result=@()
  foreach($exe in $all){
    $major=$null
    try{$major=$exe.VersionInfo.FileMajorPart}catch{}
    $year=''
    if($exe.FullName -match '(?i)2021' -or $major -eq 23){$year='2021'}
    elseif($exe.FullName -match '(?i)2025' -or $major -eq 26){$year='2025'}
    if($year){
      $result += [pscustomobject]@{ Year=$year; Exe=$exe; Major=$major }
    }
  }
  return $result | Sort-Object Year,@{Expression={$_.Exe.FullName}} -Unique
}

function Install-BaseAddon {
  param($Target,[hashtable]$Payload)
  $exe=$Target.Exe
  $programsDir=$exe.DirectoryName
  $dest=Join-Path $programsDir 'Addons\DHL_A3_Nameset'
  if(Test-Path -LiteralPath $dest){Remove-Item -LiteralPath $dest -Recurse -Force}
  New-Item -ItemType Directory -Path $dest -Force | Out-Null

  $required=@('CorelDrw.addon','AppUI.xslt','UserUI.xslt','DockerUI.html','main.js')
  foreach($name in $required){
    if(-not $Payload.ContainsKey($name)){throw ('Payload thieu file '+$name)}
    [IO.File]::WriteAllBytes((Join-Path $dest $name),$Payload[$name])
  }

  $utf8=New-Object Text.UTF8Encoding($false)
  $html=Join-Path $dest 'DockerUI.html'
  $uri=([Uri]$html).AbsoluteUri
  $appui=Join-Path $dest 'AppUI.xslt'
  $t=[IO.File]::ReadAllText($appui)
  $t=$t.Replace('__DOCKER_URL__',$uri).Replace('Tách Nameset A3','DHL Nameset Layout').Replace('Tach Nameset A3','DHL Nameset Layout')
  [IO.File]::WriteAllText($appui,$t,$utf8)
  $userui=Join-Path $dest 'UserUI.xslt'
  $u=[IO.File]::ReadAllText($userui).Replace('Tách Nameset A3','DHL Nameset Layout').Replace('Tach Nameset A3','DHL Nameset Layout')
  [IO.File]::WriteAllText($userui,$u,$utf8)
  Get-ChildItem -LiteralPath $dest -File | Unblock-File -ErrorAction SilentlyContinue

  foreach($name in $required){
    $p=Join-Path $dest $name
    if(-not(Test-Path -LiteralPath $p)){throw ('Khong ghi duoc '+$name+' vao '+$dest)}
  }
  if(([IO.File]::ReadAllText($appui)) -notmatch '3238d6ae-a42b-40b4-bce4-41d563f43ce9'){
    throw 'AppUI.xslt khong co Docker GUID can thiet.'
  }
  Write-Host ('DA TAO ADDON COREL '+$Target.Year+': '+$dest) -ForegroundColor Green
  return $dest
}

function Backup-And-ResetWorkspaces {
  param([string[]]$Years)
  if(-not $env:APPDATA){return @()}
  $root=Join-Path $env:APPDATA 'Corel'
  if(-not(Test-Path -LiteralPath $root)){return @()}
  $stamp=Get-Date -Format 'yyyyMMdd_HHmmss'
  $backups=@()
  $workspaces=Get-ChildItem -LiteralPath $root -Directory -Filter Workspace -Recurse -ErrorAction SilentlyContinue
  foreach($ws in $workspaces){
    $hit=$false
    foreach($year in $Years){if($ws.FullName -match [regex]::Escape($year)){$hit=$true;break}}
    if(-not $hit){continue}
    $backup=Join-Path $ws.Parent.FullName ('Workspace_DHL_BACKUP_'+$stamp)
    if(Test-Path -LiteralPath $backup){$backup += '_'+[guid]::NewGuid().ToString('N').Substring(0,6)}
    Move-Item -LiteralPath $ws.FullName -Destination $backup -Force
    $backups += $backup
    Write-Host ('DA BACKUP WORKSPACE: '+$backup) -ForegroundColor Cyan
  }
  return $backups
}

Stop-CorelSafely

$pf=[Environment]::GetFolderPath('ProgramFiles')
$corelRoot=Join-Path $pf 'Corel'
if(-not(Test-Path -LiteralPath $corelRoot)){throw 'Khong tim thay C:\Program Files\Corel.'}

$targets=Get-CorelTargets -CorelRoot $corelRoot
if(-not $targets){
  Write-Host 'Cac CorelDRAW tim thay:' -ForegroundColor Yellow
  Get-ChildItem -LiteralPath $corelRoot -Filter CorelDRW.exe -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object { Write-Host (' - '+$_.FullName) }
  throw 'Khong tim thay CorelDRAW 2021 hoac 2025 64-bit.'
}

Write-Host ''
Write-Host 'COREL SE DUOC DONG BO:' -ForegroundColor Cyan
foreach($t in $targets){
  Write-Host (' - Corel '+$t.Year+' | '+$t.Exe.FullName+' | version '+$t.Exe.VersionInfo.FileVersion)
}

$stamp=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$payloadFile=Join-Path $env:TEMP 'DHL_NAMESET_BASE_2021_2025.bat'
$payloadUrl='https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/f176332b86db8f5575007d5d930c32887e8dfda4/tools/tach-nameset-a3/CAI_TOOL_TACH_NAMESET_A3.bat?v='+$stamp
Write-Host ''
Write-Host 'Dang tai bo dang ky Docker goc tu Git...' -ForegroundColor Cyan
Invoke-WebRequest -UseBasicParsing -Uri $payloadUrl -OutFile $payloadFile -TimeoutSec 30

$lines=[IO.File]::ReadAllLines($payloadFile)
$payload=@{}
$wanted=@('CorelDrw.addon','AppUI.xslt','UserUI.xslt','DockerUI.html','main.js')
for($i=0;$i -lt $lines.Length;$i++){
  $line=$lines[$i].Trim()
  if(-not $line.StartsWith("`$files['")){continue}
  if(-not $line.EndsWith("] = @'")){continue}
  $p1=$line.IndexOf("'")
  $p2=$line.IndexOf("'",$p1+1)
  if($p1 -lt 0 -or $p2 -le $p1){continue}
  $name=$line.Substring($p1+1,$p2-$p1-1)
  if($wanted -notcontains $name){continue}
  $buf=New-Object System.Collections.Generic.List[string]
  $j=$i+1
  while($j -lt $lines.Length -and $lines[$j].Trim() -ne "'@"){
    $buf.Add($lines[$j].Trim())
    $j++
  }
  if($j -ge $lines.Length){throw ('Khong tim thay ket thuc base64 cho '+$name)}
  $b64=($buf -join '') -replace '\s',''
  if([string]::IsNullOrWhiteSpace($b64)){throw ('Base64 rong cho '+$name)}
  $payload[$name]=[Convert]::FromBase64String($b64)
  Write-Host ('  DOC DUOC: '+$name+' | '+$payload[$name].Length+' bytes') -ForegroundColor DarkGray
  $i=$j
}
Remove-Item -LiteralPath $payloadFile -Force -ErrorAction SilentlyContinue
if($payload.Count -lt 5){throw ('Khong tach duoc du 5 file addon goc. Tim thay '+$payload.Count+'/5.')}

$installed=@()
foreach($t in $targets){$installed += Install-BaseAddon -Target $t -Payload $payload}

$update=Join-Path $env:TEMP 'UPDATE_DHL_NAMESET.ps1'
Invoke-WebRequest -UseBasicParsing -Uri ('https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3/UPDATE_DHL_NAMESET.ps1?v='+$stamp) -OutFile $update -TimeoutSec 30
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $update
$code=$LASTEXITCODE
Remove-Item -LiteralPath $update -Force -ErrorAction SilentlyContinue
if($code -ne 0){throw ('Cap nhat giao dien V8.23 that bai. Ma loi: '+$code)}

Write-Host ''
Write-Host 'KIEM TRA FILE SAU CAI:' -ForegroundColor Cyan
foreach($dest in $installed){
  Write-Host ('Thu muc: '+$dest)
  foreach($name in @('CorelDrw.addon','AppUI.xslt','UserUI.xslt','DockerUI.html','main.js')){
    $p=Join-Path $dest $name
    $size=(Get-Item -LiteralPath $p).Length
    Write-Host ('  OK  '+$name+'  '+$size+' bytes') -ForegroundColor Green
  }
  $ui=[IO.File]::ReadAllText((Join-Path $dest 'DockerUI.html'))
  if($ui.IndexOf('DHL_UI_VERSION=8.23') -lt 0){throw ('DockerUI chua len V8.23 tai '+$dest)}
  if($ui.IndexOf('dhl-v87-commercial-license') -ge 0){throw ('Van con module ban quyen tai '+$dest)}
}

$years=@($targets | ForEach-Object {$_.Year} | Sort-Object -Unique)
Write-Host ''
Write-Host 'Corel luu menu Docker trong Workspace. Neu menu cu dang bi cache, co the reset Workspace cua ca 2021 va 2025.' -ForegroundColor Yellow
$reset=Read-Host 'Nhap RESET de backup + lam moi Workspace cua cac ban vua cai, hoac Enter de bo qua'
if($reset -eq 'RESET'){
  $backups=Backup-And-ResetWorkspaces -Years $years
  if($backups.Count -gt 0){
    Write-Host ''
    Write-Host 'DA RESET WORKSPACE. Ban cu duoc backup, khong bi xoa.' -ForegroundColor Green
  }else{
    Write-Host 'Khong tim thay Workspace phu hop trong AppData; Corel se tu tao neu can.' -ForegroundColor Yellow
  }
}else{
  Write-Host 'Da bo qua reset Workspace.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'HOAN TAT DONG BO DHL NAMESET LAYOUT V8.23.' -ForegroundColor Cyan
Write-Host 'Mo CorelDRAW 2021 hoac 2025 -> Window -> Dockers -> DHL Nameset Layout.'
exit 0
