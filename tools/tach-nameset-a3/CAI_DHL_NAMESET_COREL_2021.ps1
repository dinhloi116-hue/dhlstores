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

function Get-Corel2021Exe {
  param([string]$CorelRoot)
  $all=Get-ChildItem -LiteralPath $CorelRoot -Filter CorelDRW.exe -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.DirectoryName -match 'Programs64' } |
    Sort-Object FullName -Unique
  $result=@()
  foreach($exe in $all){
    $major=$null
    try{$major=$exe.VersionInfo.FileMajorPart}catch{}
    if($exe.FullName -match '2021' -or $major -eq 23){$result += $exe}
  }
  return $result
}

function Install-BaseAddon2021 {
  param([System.IO.FileInfo]$Exe,[hashtable]$Payload)
  $programsDir=$Exe.DirectoryName
  $target=Join-Path $programsDir 'Addons\DHL_A3_Nameset'
  if(Test-Path -LiteralPath $target){Remove-Item -LiteralPath $target -Recurse -Force}
  New-Item -ItemType Directory -Path $target -Force | Out-Null

  $required=@('CorelDrw.addon','AppUI.xslt','UserUI.xslt','DockerUI.html','main.js')
  foreach($name in $required){
    if(-not $Payload.ContainsKey($name)){throw ('Payload thieu file '+$name)}
    [IO.File]::WriteAllBytes((Join-Path $target $name),$Payload[$name])
  }

  $utf8=New-Object Text.UTF8Encoding($false)
  $html=Join-Path $target 'DockerUI.html'
  $uri=([Uri]$html).AbsoluteUri
  $appui=Join-Path $target 'AppUI.xslt'
  $t=[IO.File]::ReadAllText($appui)
  $t=$t.Replace('__DOCKER_URL__',$uri).Replace('Tách Nameset A3','DHL Nameset Layout').Replace('Tach Nameset A3','DHL Nameset Layout')
  [IO.File]::WriteAllText($appui,$t,$utf8)
  $userui=Join-Path $target 'UserUI.xslt'
  $u=[IO.File]::ReadAllText($userui).Replace('Tách Nameset A3','DHL Nameset Layout').Replace('Tach Nameset A3','DHL Nameset Layout')
  [IO.File]::WriteAllText($userui,$u,$utf8)
  Get-ChildItem -LiteralPath $target -File | Unblock-File -ErrorAction SilentlyContinue

  foreach($name in $required){
    $p=Join-Path $target $name
    if(-not(Test-Path -LiteralPath $p)){throw ('Khong ghi duoc '+$name+' vao '+$target)}
  }
  if(([IO.File]::ReadAllText($appui)) -notmatch '3238d6ae-a42b-40b4-bce4-41d563f43ce9'){
    throw 'AppUI.xslt khong co Docker GUID can thiet.'
  }
  Write-Host ('DA TAO ADDON 2021: '+$target) -ForegroundColor Green
  return $target
}

function Backup-And-ResetWorkspace2021 {
  $roots=@()
  if($env:APPDATA){$roots += Join-Path $env:APPDATA 'Corel'}
  if(-not $roots){return @()}
  $stamp=Get-Date -Format 'yyyyMMdd_HHmmss'
  $backups=@()
  foreach($root in $roots){
    if(-not(Test-Path -LiteralPath $root)){continue}
    $workspaces=Get-ChildItem -LiteralPath $root -Directory -Filter Workspace -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -match '2021' }
    foreach($ws in $workspaces){
      $backup=Join-Path $ws.Parent.FullName ('Workspace_DHL_BACKUP_'+$stamp)
      if(Test-Path -LiteralPath $backup){$backup += '_'+[guid]::NewGuid().ToString('N').Substring(0,6)}
      Move-Item -LiteralPath $ws.FullName -Destination $backup -Force
      $backups += $backup
      Write-Host ('DA BACKUP WORKSPACE: '+$backup) -ForegroundColor Cyan
    }
  }
  return $backups
}

Stop-CorelSafely

$pf=[Environment]::GetFolderPath('ProgramFiles')
$corelRoot=Join-Path $pf 'Corel'
if(-not(Test-Path -LiteralPath $corelRoot)){throw 'Khong tim thay C:\Program Files\Corel.'}

$corel2021=Get-Corel2021Exe -CorelRoot $corelRoot
if(-not $corel2021){
  Write-Host 'Cac CorelDRAW tim thay:' -ForegroundColor Yellow
  Get-ChildItem -LiteralPath $corelRoot -Filter CorelDRW.exe -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object { Write-Host (' - '+$_.FullName) }
  throw 'Khong tim thay CorelDRAW 2021/23.x 64-bit.'
}

Write-Host ''
Write-Host 'COREL 2021 TIM THAY:' -ForegroundColor Cyan
foreach($exe in $corel2021){
  Write-Host (' - '+$exe.FullName+' | version '+$exe.VersionInfo.FileVersion)
}

$stamp=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$payloadFile=Join-Path $env:TEMP 'DHL_NAMESET_BASE_2021.bat'
$payloadUrl='https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/f176332b86db8f5575007d5d930c32887e8dfda4/tools/tach-nameset-a3/CAI_TOOL_TACH_NAMESET_A3.bat?v='+$stamp
Write-Host ''
Write-Host 'Dang tai bo dang ky Docker goc tu Git...' -ForegroundColor Cyan
Invoke-WebRequest -UseBasicParsing -Uri $payloadUrl -OutFile $payloadFile

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
foreach($exe in $corel2021){$installed += Install-BaseAddon2021 -Exe $exe -Payload $payload}

$update=Join-Path $env:TEMP 'UPDATE_DHL_NAMESET.ps1'
Invoke-WebRequest -UseBasicParsing -Uri ('https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3/UPDATE_DHL_NAMESET.ps1?v='+$stamp) -OutFile $update
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $update
$code=$LASTEXITCODE
Remove-Item -LiteralPath $update -Force -ErrorAction SilentlyContinue
if($code -ne 0){throw ('Cap nhat giao dien V8.3 that bai. Ma loi: '+$code)}

Write-Host ''
Write-Host 'KIEM TRA FILE SAU CAI:' -ForegroundColor Cyan
foreach($target in $installed){
  Write-Host ('Thu muc: '+$target)
  foreach($name in @('CorelDrw.addon','AppUI.xslt','UserUI.xslt','DockerUI.html','main.js')){
    $p=Join-Path $target $name
    $size=(Get-Item -LiteralPath $p).Length
    Write-Host ('  OK  '+$name+'  '+$size+' bytes') -ForegroundColor Green
  }
}

Write-Host ''
Write-Host 'Corel luu menu Docker trong Workspace. Vi ban da mo Corel sau lan cai truoc, nen menu cu co the dang bi cache.' -ForegroundColor Yellow
Write-Host 'Tool co the BACKUP Workspace 2021 hien tai roi reset de Corel nap lai AppUI/UserUI.'
$reset=Read-Host 'Nhap RESET de backup + lam moi Workspace 2021 ngay (khuyen dung), hoac Enter de bo qua'
if($reset -eq 'RESET'){
  $backups=Backup-And-ResetWorkspace2021
  if($backups.Count -gt 0){
    Write-Host ''
    Write-Host 'DA RESET WORKSPACE 2021. Ban cu duoc backup, khong bi xoa.' -ForegroundColor Green
  }else{
    Write-Host 'Khong tim thay Workspace 2021 trong AppData; Corel se tu tao neu can.' -ForegroundColor Yellow
  }
}else{
  Write-Host 'Da bo qua reset Workspace. Neu van khong thay tool, chay lai file nay va chon RESET.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'HOAN TAT SUA COREL 2021.' -ForegroundColor Cyan
Write-Host 'Bay gio mo CorelDRAW 2021 -> Window -> Dockers -> DHL Nameset Layout.'
exit 0