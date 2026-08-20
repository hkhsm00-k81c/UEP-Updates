$ErrorActionPreference='Stop'
$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$m=Get-Content $main -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8

# UEP 0.80.92 - always bind refresh tokens to the CURRENT policy OAuth client.
# Old teacher PCs can still contain google-user-oauth.bin created with an older client_id.
$old="const clientId=String(saved.client_id||'').trim() || await loadGoogleOAuthClientId();"
$new="const clientId=await loadGoogleOAuthClientId();`n  if(String(saved.client_id||'').trim() && String(saved.client_id).trim()!==clientId){`n    await disconnectGoogleUser();`n    throw googleOAuthError('Google 연결 설정이 갱신되었습니다. Google 계정 연결을 한 번만 다시 승인해 주세요.','UEP_GOOGLE_USER_AUTH_REQUIRED');`n  }"
if(-not $m.Contains($old)){throw 'refreshGoogleUserOAuth legacy client selection not found'}
$m=$m.Replace($old,$new)

# Version only. Preserve all 0.80.91 behavior and 0.80.90 UI/features.
$g=$g.Replace('const APP_VERSION = "0.80.91";','const APP_VERSION = "0.80.92";')
$g=$g.Replace('v0.80.91','v0.80.92')

Set-Content $main $m -Encoding UTF8 -NoNewline
Set-Content $gyo $g -Encoding UTF8 -NoNewline
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.92'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check $main
if($LASTEXITCODE -ne 0){throw 'main.cjs syntax check failed'}
node --check 'app/resources/app/electron/preload.cjs'
if($LASTEXITCODE -ne 0){throw 'preload syntax check failed'}
node --check $gyo
if($LASTEXITCODE -ne 0){throw 'gyomuon syntax check failed'}
$verify=Get-Content $main -Raw -Encoding UTF8
if($verify -match "String\(saved\.client_id\|\|'')\.trim\(\) \|\| await loadGoogleOAuthClientId"){throw 'stale saved client_id precedence still present'}
if($verify -notmatch 'await disconnectGoogleUser\(\)'){throw 'OAuth client migration reset missing'}
if((Get-Content $gyo -Raw -Encoding UTF8) -notmatch '0\.80\.92'){throw 'visible 0.80.92 version missing'}
Write-Host 'UEP 0.80.92 OAuth client migration fix applied.'
