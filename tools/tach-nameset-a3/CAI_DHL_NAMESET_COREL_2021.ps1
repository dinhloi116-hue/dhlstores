$ErrorActionPreference='Stop'

$corelProc=Get-Process -Name CorelDRW -ErrorAction SilentlyContinue
if($corelProc){
  Write-Host ''
  Write-Host 'DANG CO COREL DRAW CHAY NEN KHONG THE CAI TOOL AN TOAN.' -ForegroundColor Yellow
  foreach($p in $corelProc){
    $path=''
    try{$path=$p.Path}catch{}
    Write-Host (' - CorelDRW PID '+$p.Id+($(if($path){' | '+$path}else{''})))
  }
  Write-Host ''
  Write-Host 'HAY LUU HET FILE DANG LAM TRUOC.' -ForegroundColor Yellow
  $ans=Read-Host 'Nhap DONG de tool tu dong tat tat ca CorelDRAW, hoac nhan Enter de huy'
  if($ans -ne 'DONG'){
    Write-Host 'Da huy cai dat de tranh mat du lieu.' -ForegroundColor Yellow
    exit 2
  }
  Write-Host 'Dang tat CorelDRAW...'
  $corelProc | Stop-Process -Force -ErrorAction Stop
  Start-Sleep -Milliseconds 800
  if(Get-Process -Name CorelDRW -ErrorAction SilentlyContinue){
    throw 'Khong tat het duoc CorelDRAW. Hay mo Task Manager va End task CorelDRW.exe roi chay lai.'
  }
}

$pf=[Environment]::GetFolderPath('ProgramFiles')
$corelRoot=Join-Path $pf 'Corel'
if(-not(Test-Path -LiteralPath $corelRoot)){throw 'Khong tim thay thu muc Corel trong Program Files.'}

$allCorel=Get-ChildItem -LiteralPath $corelRoot -Filter CorelDRW.exe -File -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.DirectoryName -match 'Programs64' } |
  Sort-Object FullName -Unique
if(-not $allCorel){throw 'Khong tim thay CorelDRAW 64-bit nao.'}

$existing=Get-ChildItem -LiteralPath $corelRoot -Directory -Filter 'DHL_A3_Nameset' -Recurse -ErrorAction SilentlyContinue |
  Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'CorelDrw.addon') }

$source=$null
if($existing){
  $source=$existing | Where-Object {
    (Test-Path -LiteralPath (Join-Path $_.FullName 'DockerUI.html')) -and
    (Test-Path -LiteralPath (Join-Path $_.FullName 'AppUI.xslt')) -and
    (Test-Path -LiteralPath (Join-Path $_.FullName 'UserUI.xslt'))
  } | Select-Object -First 1
}

if(-not $source){
  Write-Host ''
  Write-Host 'Chua tim thay ban DHL Nameset Layout da cai o Corel nao de dong bo.' -ForegroundColor Yellow
  Write-Host 'Hay cai tool tren mot ban Corel dang hoat dong truoc, sau do chay lai file nay.'
  exit 3
}

Write-Host ('Nguon tool: '+$source.FullName) -ForegroundColor Cyan
$installed=@()
foreach($exe in $allCorel){
  $programsDir=$exe.DirectoryName
  $target=Join-Path $programsDir 'Addons\DHL_A3_Nameset'
  $sourcePath=(Resolve-Path -LiteralPath $source.FullName).Path
  $targetResolved=Resolve-Path -LiteralPath $target -ErrorAction SilentlyContinue
  if((-not $targetResolved) -or $sourcePath -ne $targetResolved.Path){
    if(Test-Path -LiteralPath $target){Remove-Item -LiteralPath $target -Recurse -Force}
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    Copy-Item -Path (Join-Path $source.FullName '*') -Destination $target -Recurse -Force
  }
  $installed += $target
  Write-Host ('DA DONG BO: '+$target) -ForegroundColor Green
}

$stamp=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$update=Join-Path $env:TEMP 'UPDATE_DHL_NAMESET.ps1'
Invoke-WebRequest -UseBasicParsing -Uri ('https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3/UPDATE_DHL_NAMESET.ps1?v='+$stamp) -OutFile $update
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $update
$code=$LASTEXITCODE
Remove-Item -LiteralPath $update -Force -ErrorAction SilentlyContinue
if($code -ne 0){throw ('Cap nhat UI that bai. Ma loi: '+$code)}

Write-Host ''
Write-Host 'DA CAI DHL NAMESET LAYOUT CHO TAT CA BAN COREL 64-BIT TIM THAY, BAO GOM COREL 2021.' -ForegroundColor Cyan
Write-Host 'Mo lai CorelDRAW 2021 -> Window -> Dockers, se thay DHL Nameset Layout.'
exit 0