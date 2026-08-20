$ErrorActionPreference='Stop'
$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$m=Get-Content $main -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8

# UEP 0.80.91 - Desktop OAuth secretless token exchange.
# Remove the stale secret injected by 0.80.78. Use single-quoted
# PowerShell regex strings so quote escaping cannot break the parser.

$objectSecret = '(?s),\s*client_secret\s*:\s*["''][^"'']+["'']'
$leadingSecret = '(?s)client_secret\s*:\s*["''][^"'']+["'']\s*,?'
$setterSecret = '(?m)^\s*[A-Za-z_$][\w$]*\.(set|append)\(\s*["'']client_secret["'']\s*,\s*["''][^"'']*["'']\s*\);?\s*$'
$constantSecret = '(?m)^\s*const\s+clientSecret\s*=\s*["''][^"'']+["''];?\s*$'

$m=[regex]::Replace($m,$objectSecret,'')
$m=[regex]::Replace($m,$leadingSecret,'')
$m=[regex]::Replace($m,$setterSecret,'')
$m=[regex]::Replace($m,$constantSecret,'')

# Keep teacher OAuth read-only and loopback redirect normalized.
$m=$m.Replace("authUrl.searchParams.set('scope','openid email https://www.googleapis.com/auth/spreadsheets');","authUrl.searchParams.set('scope','openid email https://www.googleapis.com/auth/spreadsheets.readonly');")
$m=$m.Replace('const redirectUri=`http://127.0.0.1:${port}/`;','const redirectUri=`http://127.0.0.1:${port}`;')
$m=$m.Replace('const redirectUri=`http://127.0.0.1:${port}/oauth2callback`;','const redirectUri=`http://127.0.0.1:${port}`;')

# Version only; all 0.80.90 UI/features remain intact.
$g=$g.Replace('const APP_VERSION = "0.80.90";','const APP_VERSION = "0.80.91";')
$g=$g.Replace('v0.80.90','v0.80.91')

Set-Content $main $m -Encoding UTF8 -NoNewline
Set-Content $gyo $g -Encoding UTF8 -NoNewline
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.91'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check $main
if($LASTEXITCODE -ne 0){throw 'main.cjs syntax check failed'}
node --check 'app/resources/app/electron/preload.cjs'
if($LASTEXITCODE -ne 0){throw 'preload syntax check failed'}
node --check $gyo
if($LASTEXITCODE -ne 0){throw 'gyomuon syntax check failed'}

$verify=Get-Content $main -Raw -Encoding UTF8
if($verify -match 'client_secret\s*[:),]'){throw 'legacy client_secret token parameter still present'}
if($verify -notmatch 'spreadsheets\.readonly'){throw 'teacher readonly OAuth scope missing'}
if((Get-Content $gyo -Raw -Encoding UTF8) -notmatch '0\.80\.91'){throw 'visible 0.80.91 version missing'}
Write-Host 'UEP 0.80.91 Desktop OAuth secretless fix applied.'
