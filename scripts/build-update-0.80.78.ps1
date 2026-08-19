$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$m=Get-Content $main -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8

# UEP 0.80.78 resilient Desktop OAuth patch.
$clientSecret='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'

# Teacher OAuth stays read-only.
$m=$m.Replace("authUrl.searchParams.set('scope','openid email https://www.googleapis.com/auth/spreadsheets');","authUrl.searchParams.set('scope','openid email https://www.googleapis.com/auth/spreadsheets.readonly');")

# Keep authorize/token redirect URI identical.
$m=$m.Replace('const redirectUri=`http://127.0.0.1:${port}/`;','const redirectUri=`http://127.0.0.1:${port}`;')
$m=$m.Replace('const redirectUri=`http://127.0.0.1:${port}/oauth2callback`;','const redirectUri=`http://127.0.0.1:${port}`;')

# Inject client_secret into every URLSearchParams token body that has client_id
# and either authorization_code or refresh_token. This avoids depending on exact
# whitespace/source layout of 0.80.77.
$pattern='(?s)(new URLSearchParams\([^;]*?client_id[^;]*?)(\))'
$m=[regex]::Replace($m,$pattern,{param($match)
  $s=$match.Value
  if(($s -match "authorization_code|refresh_token") -and ($s -notmatch 'client_secret')){
    if($s -match 'client_id\s*:\s*clientId'){
      return ($s -replace 'client_id\s*:\s*clientId',("client_id:clientId,client_secret:'"+$clientSecret+"'"))
    }
  }
  return $s
})

# Handle imperative body.set(...) source shapes.
$m=[regex]::Replace($m,"body\.set\('client_id',\s*clientId\);",{param($match)
  $tail=$m.Substring($match.Index,[Math]::Min(500,$m.Length-$match.Index))
  if(($tail -match "grant_type'.*?(authorization_code|refresh_token)|code'.*?code|refresh_token") -and ($tail -notmatch "body\.set\('client_secret'")){
    return $match.Value+"`n    body.set('client_secret','$clientSecret');"
  }
  return $match.Value
})

# Visible version.
$g=$g.Replace('const APP_VERSION = "0.80.77";','const APP_VERSION = "0.80.78";')
$g=$g.Replace('const APP_VERSION = "0.80.76";','const APP_VERSION = "0.80.78";')
$g=$g.Replace('v0.80.77','v0.80.78')
$g=$g.Replace('v0.80.76','v0.80.78')

Set-Content $main $m -Encoding UTF8 -NoNewline
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.78'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check $main
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo

$verifyMain=Get-Content $main -Raw -Encoding UTF8
$verifyGyo=Get-Content $gyo -Raw -Encoding UTF8
if(-not $verifyMain.Contains('https://www.googleapis.com/auth/spreadsheets.readonly')){throw 'readonly OAuth scope missing'}
if(-not $verifyMain.Contains($clientSecret)){throw 'Desktop OAuth client secret was not injected into token exchange code'}
if(-not $verifyGyo.Contains('0.80.78')){throw 'visible 0.80.78 version missing'}

Write-Host 'UEP 0.80.78 resilient Desktop OAuth patch applied and syntax-checked.'
