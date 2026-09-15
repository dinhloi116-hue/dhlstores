param(
  [string]$MachineCode = '',
  [ValidateSet('LIFE','CREDITS')][string]$Type = 'CREDITS',
  [int]$Credits = 100,
  [string]$Customer = ''
)

$ErrorActionPreference = 'Stop'
$privateKeyPath = Join-Path $PSScriptRoot 'DHL_LICENSE_PRIVATE.xml'
if(-not (Test-Path -LiteralPath $privateKeyPath)){
  Write-Host 'THIEU FILE DHL_LICENSE_PRIVATE.xml' -ForegroundColor Red
  Write-Host 'Private key khong duoc dua len GitHub. Hay dat file private key cua chu tool cung thu muc voi script nay.' -ForegroundColor Yellow
  exit 2
}

if(-not $MachineCode){$MachineCode = Read-Host 'Nhap MA MAY hien tren tool, vd ABCD-EF12-3456'}
$MachineCode = ($MachineCode.Trim()).ToUpper()
if(-not $Customer){$Customer = Read-Host 'Ten khach hang / ghi chu'}

if(-not $PSBoundParameters.ContainsKey('Type')){
  $p = Read-Host 'Chon goi: 1 = Vinh vien, 2 = 100 luot'
  if($p -eq '1'){$Type='LIFE'}else{$Type='CREDITS';$Credits=100}
}
if($Type -eq 'CREDITS' -and $Credits -lt 1){$Credits=100}

function B64Url([byte[]]$bytes){
  return ([Convert]::ToBase64String($bytes)).TrimEnd('=').Replace('+','-').Replace('/','_')
}

$licId = 'DHL-' + (Get-Date -Format 'yyyyMMdd') + '-' + ([Guid]::NewGuid().ToString('N').Substring(0,8).ToUpper())
$payload = [ordered]@{
  p = 'DHL_NAMESET_LAYOUT'
  t = $Type
  m = $MachineCode
  c = $(if($Type -eq 'CREDITS'){$Credits}else{0})
  n = $Customer
  i = $licId
  d = (Get-Date).ToString('yyyy-MM-dd')
}
$json = $payload | ConvertTo-Json -Compress
$data = [Text.Encoding]::UTF8.GetBytes($json)
$privateXml = [IO.File]::ReadAllText($privateKeyPath)
$rsa = New-Object System.Security.Cryptography.RSACryptoServiceProvider
$rsa.FromXmlString($privateXml)
$oid = [System.Security.Cryptography.CryptoConfig]::MapNameToOID('SHA256')
$sig = $rsa.SignData($data,$oid)
$key = (B64Url $data) + '.' + (B64Url $sig)

$out = Join-Path $PSScriptRoot ('LICENSE_' + $licId + '.txt')
[IO.File]::WriteAllText($out,$key,(New-Object Text.UTF8Encoding($false)))
Write-Host ''
Write-Host '================ LICENSE CREATED ================' -ForegroundColor Green
Write-Host ('License ID : ' + $licId)
Write-Host ('Customer   : ' + $Customer)
Write-Host ('Machine    : ' + $MachineCode)
Write-Host ('Type       : ' + $Type)
if($Type -eq 'CREDITS'){Write-Host ('Credits    : ' + $Credits)}
Write-Host ('Saved      : ' + $out)
Write-Host '=================================================' -ForegroundColor Green
Write-Host ''
Write-Host $key
Set-Clipboard -Value $key
Write-Host ''
Write-Host 'Key da duoc copy vao Clipboard.' -ForegroundColor Cyan
