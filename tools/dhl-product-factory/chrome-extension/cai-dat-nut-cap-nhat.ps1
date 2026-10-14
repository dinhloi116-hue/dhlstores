# One-time Chrome Native Messaging setup. Runs per-user (HKCU) with no elevation.
# Builds the host EXE locally using the preinstalled Windows PowerShell .NET Framework compiler.
$ErrorActionPreference='Stop'
$Base=$PSScriptRoot
$ExpectedId='ojbejkjaalblfimeojmobicanhbipkel'
$ExpectedName="DHL Product Factory $([char]0x2014) 6 Shop"
$NativeName='vn.dhl.product_factory_updater'
$Manifest=Join-Path $Base 'manifest.json'
$Src=Join-Path $Base 'native-updater\Host.cs'
$Exe=Join-Path $Base 'native-updater\DHLProductUpdaterHost.exe'
$NativeManifest=Join-Path $Base 'native-updater\native-messaging-host.json'
if(!(Test-Path -LiteralPath $Src) -or !(Test-Path -LiteralPath $Manifest)) {throw 'Khong co Host.cs/manifest.json. Hay giai nen bo cap nhat vao dung thu muc extension.'}
$M=Get-Content -LiteralPath $Manifest -Raw -Encoding UTF8 | ConvertFrom-Json
if($M.name -ne $ExpectedName -or $M.manifest_version -ne 3) {throw 'Sai thu muc cai DHL Product Factory.'}
if($M.permissions -notcontains 'nativeMessaging') {throw 'Extension hien tai chua ho tro Native Messaging. Cap nhat v0.6.0 truoc.'}
$KeyBytes=[Convert]::FromBase64String($M.key)
$Digest=[Security.Cryptography.SHA256]::Create().ComputeHash($KeyBytes)
$ActualId=''
foreach($v in $Digest[0..15]) {$ActualId+=[char](97+($v -shr 4));$ActualId+=[char](97+($v -band 15))}
if($ActualId -ne $ExpectedId) {throw 'Extension ID khong khop; khong cai host.'}
if(Test-Path -LiteralPath $Exe) {Remove-Item -LiteralPath $Exe -Force}
Write-Host 'Dang tao bo cap nhat Windows cục bộ...' -ForegroundColor Cyan
Add-Type -Path $Src -OutputAssembly $Exe -OutputType ConsoleApplication -ErrorAction Stop
if(!(Test-Path -LiteralPath $Exe)) {throw 'Khong tao duoc host .exe.'}
$HostSpec=@{name=$NativeName;description='DHL Product Factory one-click Git updater';path=$Exe;type='stdio';allowed_origins=@("chrome-extension://$ExpectedId/")}
[IO.File]::WriteAllText($NativeManifest,($HostSpec|ConvertTo-Json -Depth 5),(New-Object System.Text.UTF8Encoding($false)))
$SubKey=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey("Software\Google\Chrome\NativeMessagingHosts\$NativeName")
try {$SubKey.SetValue('',[string]$NativeManifest,[Microsoft.Win32.RegistryValueKind]::String)} finally {$SubKey.Close()}
Write-Host 'Da dang ky Native Messaging cho dung DHL Product Factory.' -ForegroundColor Green
Write-Host 'Quay ve tool -> Cai dat -> Cap nhat ngay tu GitHub.' -ForegroundColor Green
