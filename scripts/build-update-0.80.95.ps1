$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$css='app/resources/app/gyomuon.css'
$main='app/resources/app/electron/main.cjs'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$c=Get-Content $css -Raw -Encoding UTF8
$m=Get-Content $main -Raw -Encoding UTF8

# Version bump from shipped 0.80.94 package.
$g=$g.Replace('const APP_VERSION = "0.80.94";','const APP_VERSION = "0.80.95";').Replace('v0.80.94','v0.80.95')

# Google OAuth: actively recover stale user OAuth state instead of repeatedly surfacing invalid_client/invalid_grant.
$oldRefresh="if(!response.ok){let detail='';try{detail=(await response.json())?.error_description||'';}catch{};throw googleOAuthError(`Google 계정 토큰 갱신 실패 (${response.status})${detail?`: ${detail}`:''}`,\"UEP_GOOGLE_USER_AUTH_REQUIRED\");}"
$newRefresh=@'
if(!response.ok){
    let payload={},detail='',errCode='';
    try{payload=await response.json();detail=String(payload?.error_description||'');errCode=String(payload?.error||'');}catch{}
    if(errCode==='invalid_client'||errCode==='invalid_grant'){
      googleOAuthPolicyCache={clientId:'',expiresAt:0};
      await disconnectGoogleUser();
      throw googleOAuthError('저장된 Google 인증정보가 현재 UEP 연결설정과 맞지 않습니다. Google 계정 연결을 다시 승인해 주세요.','UEP_GOOGLE_USER_AUTH_REQUIRED');
    }
    throw googleOAuthError(`Google 계정 토큰 갱신 실패 (${response.status})${detail?`: ${detail}`:''}`,"UEP_GOOGLE_USER_AUTH_REQUIRED");
  }
'@
if(-not $m.Contains($oldRefresh)){throw 'refreshGoogleUserOAuth response block not found'}
$m=$m.Replace($oldRefresh,$newRefresh.Trim())

# Authorization exchange: clear stale state and give an actionable diagnosis for invalid_client.
$oldTokenThrow="throw googleOAuthError(`Google 토큰 교환 실패 (${response.status})${suffix?`: ${suffix}`:''}${!suffix&&raw?`: ${raw}`:''}`,'UEP_GOOGLE_OAUTH_TOKEN_FAILED');"
$newTokenThrow=@'
if(errCode==='invalid_client'){
        googleOAuthPolicyCache={clientId:'',expiresAt:0};
        await disconnectGoogleUser();
        throw googleOAuthError('Google OAuth 클라이언트가 승인되지 않았습니다. UEP 연결설정을 새로 읽은 뒤 다시 연결해 주세요.','UEP_GOOGLE_USER_AUTH_REQUIRED');
      }
      throw googleOAuthError(`Google 토큰 교환 실패 (${response.status})${suffix?`: ${suffix}`:''}${!suffix&&raw?`: ${raw}`:''}`,'UEP_GOOGLE_OAUTH_TOKEN_FAILED');
'@
if(-not $m.Contains($oldTokenThrow)){throw 'authorization token error block not found'}
$m=$m.Replace($oldTokenThrow,$newTokenThrow.Trim())

# Approval line: use the actual shipped approval explorer/nav/detail structure and make it visibly compact.
$approvalCss=@'

/* __UEP_APPROVAL_COMPACT_08095__ */
#drawer.reference-maximized{width:min(1180px,calc(100vw - 56px))!important;max-width:1180px!important}
#drawer .approval-explorer{display:grid!important;grid-template-columns:390px minmax(0,1fr)!important;gap:14px!important;min-height:0!important;align-items:start!important}
#drawer .approval-nav{display:grid!important;gap:5px!important;align-content:start!important;max-height:calc(100vh - 210px)!important;overflow:auto!important;padding-right:4px!important}
#drawer .approval-nav-row{display:grid!important;grid-template-columns:minmax(150px,1fr) minmax(0,1.35fr)!important;gap:10px!important;align-items:center!important;padding:8px 10px!important;min-height:42px!important;height:auto!important;border-radius:9px!important}
#drawer .approval-nav-row b{font-size:13px!important;line-height:1.3!important;white-space:normal!important}
#drawer .approval-nav-row span{font-size:11px!important;line-height:1.3!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
#drawer .approval-detail{display:grid!important;gap:8px!important;align-content:start!important;padding:14px!important;min-height:0!important}
#drawer .approval-detail h3{margin:2px 0 6px!important;font-size:19px!important}
#drawer .approval-detail section{padding:10px 12px!important;margin:0!important;min-height:0!important}
#drawer .approval-detail section b{font-size:12px!important}
#drawer .approval-detail section p{margin:4px 0 0!important;font-size:14px!important;line-height:1.45!important}
#drawer .approval-detail footer{margin-top:2px!important;font-size:11px!important}
'@
if($c -notmatch '__UEP_APPROVAL_COMPACT_08095__'){$c += $approvalCss}

Set-Content $gyo $g -Encoding UTF8
Set-Content $css $c -Encoding UTF8
Set-Content $main $m -Encoding UTF8
node --check $gyo
if($LASTEXITCODE -ne 0){throw 'gyomuon syntax failed'}
node --check $main
if($LASTEXITCODE -ne 0){throw 'main syntax failed'}

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.95'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.80.95 Google recovery and approval compact layout applied.'
