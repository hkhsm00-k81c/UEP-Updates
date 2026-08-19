$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$m=Get-Content $main -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8

# UEP 0.80.78
# Google Desktop OAuth client uses client_id + client_secret for both
# authorization-code exchange and refresh-token exchange.
# Google documents that installed-app client secrets are not treated as confidential.

$clientSecret='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'

# 1) Keep teacher OAuth read-only.
$m=$m.Replace("authUrl.searchParams.set('scope','openid email https://www.googleapis.com/auth/spreadsheets');","authUrl.searchParams.set('scope','openid email https://www.googleapis.com/auth/spreadsheets.readonly');")

# 2) Normalize loopback URI to the same exact value for authorize + token exchange.
$m=$m.Replace('const redirectUri=`http://127.0.0.1:${port}/`;','const redirectUri=`http://127.0.0.1:${port}`;')
$m=$m.Replace('const redirectUri=`http://127.0.0.1:${port}/oauth2callback`;','const redirectUri=`http://127.0.0.1:${port}`;')

# 3) Authorization-code exchange: add client_secret once.
$codeNeedle="    body.set('client_id',clientId);`n    body.set('code',code);"
$codeReplace="    body.set('client_id',clientId);`n    body.set('client_secret','$clientSecret');`n    body.set('code',code);"
if($m.Contains($codeNeedle)){
  $m=$m.Replace($codeNeedle,$codeReplace)
}elseif(-not $m.Contains("body.set('client_secret','$clientSecret');")){
  throw 'authorization-code token body not found'
}

# 4) Refresh-token exchange: add the same Desktop client secret.
$refreshOld="  const body=new URLSearchParams({client_id:clientId,refresh_token:String(saved.refresh_token),grant_type:'refresh_token'});"
$refreshNew="  const body=new URLSearchParams({client_id:clientId,client_secret:'$clientSecret',refresh_token:String(saved.refresh_token),grant_type:'refresh_token'});"
if($m.Contains($refreshOld)){
  $m=$m.Replace($refreshOld,$refreshNew)
}elseif(-not $m.Contains("client_secret:'$clientSecret'")){
  throw 'refresh-token body not found'
}

# 5) Visible version.
$g=$g.Replace('const APP_VERSION = "0.80.77";','const APP_VERSION = "0.80.78";')
$g=$g.Replace('const APP_VERSION = "0.80.76";','const APP_VERSION = "0.80.78";')
$g=$g.Replace('v0.80.77','v0.80.78')
$g=$g.Replace('v0.80.76','v0.80.78')

Set-Content $main $m -Encoding UTF8 -NoNewline
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.78'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

# Syntax + structural gates.
node --check $main
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo

$verifyMain=Get-Content $main -Raw -Encoding UTF8
$verifyGyo=Get-Content $gyo -Raw -Encoding UTF8
if(-not $verifyMain.Contains('https://www.googleapis.com/auth/spreadsheets.readonly')){throw 'readonly OAuth scope missing'}
if(-not $verifyMain.Contains("body.set('client_secret','$clientSecret');")){throw 'authorization-code client_secret missing'}
if(-not $verifyMain.Contains("client_secret:'$clientSecret'")){throw 'refresh-token client_secret missing'}
if(-not $verifyGyo.Contains('0.80.78')){throw 'visible 0.80.78 version missing'}

Write-Host 'UEP 0.80.78 Desktop OAuth client-secret token exchange/refresh patch applied and syntax-checked.'
