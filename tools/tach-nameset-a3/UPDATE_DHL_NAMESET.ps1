$ErrorActionPreference = 'Stop'

$repoBase = 'https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3'
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$tmp = Join-Path $env:TEMP 'DockerUI_DHL_Layout_V75.html'
$url = "$repoBase/src/DockerUI.html?v=$stamp"

Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $tmp
$raw = [IO.File]::ReadAllText($tmp)
if ($raw -notmatch 'DHL_UI_VERSION=7\.4') { throw 'GitHub source UI is not V7.4.' }

$raw = $raw.Replace('DHL_UI_VERSION=7.4','DHL_UI_VERSION=7.5').Replace('v7.4','v7.5')

$patchB64 = 'PHNjcmlwdCBpZD0iZGhsLXY3NS1kaXJlY3QtdXBkYXRlciI+CihmdW5jdGlvbigpewogIGZ1bmN0aW9uIG5vcm1hbGl6ZVNlbGVjdGVkUGFpclY3NShzaG93KXsKICAgIHZhciBkPUkxOE5bY3VycmVudExhbmddLGEsZG9jLG9sZFVuaXQscGFpcnMsaSxnOwogICAgdHJ5ewogICAgICBhPWNvcmVsQXBwKCk7IGRvYz1hLkFjdGl2ZURvY3VtZW50OyBvbGRVbml0PWRvYy5Vbml0OyBkb2MuVW5pdD0zOwogICAgICBwYWlycz1wYWlyTmVhcmVzdChzZWxlY3RlZFNoYXBlc1Y3NCgpKTsKICAgICAgZm9yKGk9MDtpPHBhaXJzLmxlbmd0aDtpKyspe2c9bm9ybWFsaXplUGFpck9iamVjdHMocGFpcnNbaV0ubmFtZSxwYWlyc1tpXS5udW1iZXIpO30KICAgICAgZG9jLlVuaXQ9b2xkVW5pdDsKICAgICAgaWYoc2hvdyl7YnlJZCgnZm9udFN0YXR1cycpLmlubmVySFRNTD1kLnBhaXJEb25lK2crJyBtbS4gJytkLnRleHRPbmx5O30KICAgICAgdHJ5e2EuQWN0aXZlV2luZG93LlJlZnJlc2goKTt9Y2F0Y2goeCl7fQogICAgICByZXR1cm4gdHJ1ZTsKICAgIH1jYXRjaChlKXsKICAgICAgdHJ5e2lmKGRvYyYmb2xkVW5pdCE9PXVuZGVmaW5lZCl7ZG9jLlVuaXQ9b2xkVW5pdDt9fWNhdGNoKHgyKXt9CiAgICAgIGlmKHNob3cpe2J5SWQoJ2ZvbnRTdGF0dXMnKS5pbm5lckhUTUw9ZS5tZXNzYWdlO30KICAgICAgcmV0dXJuIGZhbHNlOwogICAgfQogIH0KCiAgZnVuY3Rpb24gcmVsb2FkRnJvbUdpdFY3NSgpewogICAgdmFyIGI9YnlJZCgncmVsb2FkR2l0JyksZD1JMThOW2N1cnJlbnRMYW5nXSxzaCxmc28sdGVtcCxwczEsdGYsc2NyaXB0LGNtZCxyYyxiYXNlLHN0YW1wOwogICAgdHJ5ewogICAgICBpZihiKXtiLmRpc2FibGVkPXRydWU7Yi5pbm5lckhUTUw9ZC5sb2FkaW5nO30KICAgICAgc2g9bmV3IEFjdGl2ZVhPYmplY3QoJ1dTY3JpcHQuU2hlbGwnKTsKICAgICAgZnNvPW5ldyBBY3RpdmVYT2JqZWN0KCdTY3JpcHRpbmcuRmlsZVN5c3RlbU9iamVjdCcpOwogICAgICB0ZW1wPXNoLkV4cGFuZEVudmlyb25tZW50U3RyaW5ncygnJVRFTVAlJyk7CiAgICAgIHBzMT10ZW1wKydcXERITF9OQU1FU0VUX0xBVU5DSF9VUERBVEUucHMxJzsKICAgICAgc3RhbXA9KG5ldyBEYXRlKCkpLmdldFRpbWUoKTsKICAgICAgc2NyaXB0PSIkRXJyb3JBY3Rpb25QcmVmZXJlbmNlPSdTdG9wJ1xyXG4iCiAgICAgICAgKyIkdT0naHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2Rpbmhsb2kxMTYtaHVlL2RobHN0b3Jlcy9tYWluL3Rvb2xzL3RhY2gtbmFtZXNldC1hMy9VUERBVEVfREhMX05BTUVTRVQucHMxP3Y9IitzdGFtcCsiJ1xyXG4iCiAgICAgICAgKyIkcD1Kb2luLVBhdGggJGVudjpURU1QICdVUERBVEVfREhMX05BTUVTRVQucHMxJ1xyXG4iCiAgICAgICAgKyJJbnZva2UtV2ViUmVxdWVzdCAtVXNlQmFzaWNQYXJzaW5nIC1VcmkgJHUgLU91dEZpbGUgJHBcclxuIgogICAgICAgICsiJGFyZ3M9Jy1Ob1Byb2ZpbGUgLUV4ZWN1dGlvblBvbGljeSBCeXBhc3MgLUZpbGUgXCInKyRwKydcIidcclxuIgogICAgICAgICsiJHByb2M9U3RhcnQtUHJvY2VzcyAtRmlsZVBhdGggKEpvaW4tUGF0aCAkUFNIT01FICdwb3dlcnNoZWxsLmV4ZScpIC1Bcmd1bWVudExpc3QgJGFyZ3MgLVZlcmIgUnVuQXMgLVdhaXQgLVBhc3NUaHJ1XHJcbiIKICAgICAgICArImV4aXQgJHByb2MuRXhpdENvZGVcclxuIjsKICAgICAgdGY9ZnNvLkNyZWF0ZVRleHRGaWxlKHBzMSx0cnVlLGZhbHNlKTsgdGYuV3JpdGUoc2NyaXB0KTsgdGYuQ2xvc2UoKTsKICAgICAgY21kPSdwb3dlcnNoZWxsLmV4ZSAtTm9Qcm9maWxlIC1FeGVjdXRpb25Qb2xpY3kgQnlwYXNzIC1GaWxlICInK3BzMSsnIic7CiAgICAgIHJjPXNoLlJ1bihjbWQsMSx0cnVlKTsKICAgICAgdHJ5e2lmKGZzby5GaWxlRXhpc3RzKHBzMSkpZnNvLkRlbGV0ZUZpbGUocHMxLHRydWUpO31jYXRjaChkeCl7fQogICAgICBpZihyYz09PTApe2Jhc2U9d2luZG93LmxvY2F0aW9uLmhyZWYuc3BsaXQoJz8nKVswXTt3aW5kb3cubG9jYXRpb24ucmVwbGFjZShiYXNlKyc/dj0nKyhuZXcgRGF0ZSgpKS5nZXRUaW1lKCkpO30KICAgICAgZWxzZXthbGVydChkLnJlbG9hZEZhaWwrcmMpO30KICAgIH1jYXRjaChlKXthbGVydChkLnJlbG9hZEVycm9yK2UubWVzc2FnZSk7fQogICAgZmluYWxseXtpZihiKXtiLmRpc2FibGVkPWZhbHNlO2IuaW5uZXJIVE1MPUkxOE5bY3VycmVudExhbmddLnJlbG9hZDt9fQogIH0KCiAgd2luZG93Lm5vcm1hbGl6ZVNlbGVjdGVkUGFpcj1ub3JtYWxpemVTZWxlY3RlZFBhaXJWNzU7CiAgd2luZG93LnJlbG9hZEZyb21HaXQ9cmVsb2FkRnJvbUdpdFY3NTsKfSkoKTsKPC9zY3JpcHQ+'
$patch = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($patchB64))
$raw = $raw.Replace('</body>', $patch + "`r`n</body>")

$utf8 = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($tmp,$raw,$utf8)

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
  Copy-Item -LiteralPath $tmp -Destination $dst -Force
  Unblock-File -LiteralPath $dst -ErrorAction SilentlyContinue
  foreach ($f in @('AppUI.xslt','UserUI.xslt')) {
    $p = Join-Path $target $f
    if (Test-Path -LiteralPath $p) {
      $t = [IO.File]::ReadAllText($p)
      $t = $t.Replace('Tách Nameset A3','DHL Nameset Layout').Replace('Tach Nameset A3','DHL Nameset Layout')
      [IO.File]::WriteAllText($p,$t,$utf8)
    }
  }
  Write-Host ('UPDATED: ' + $dst) -ForegroundColor Green
}

Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
Write-Host ''
Write-Host 'DONE - DHL Nameset Layout V7.5 installed.' -ForegroundColor Cyan
Write-Host 'Close and reopen the Docker in CorelDRAW if the version does not refresh immediately.'
exit 0