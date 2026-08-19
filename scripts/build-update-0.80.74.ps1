$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$m=Get-Content $main -Raw -Encoding UTF8

# 0.80.74 emergency: align requested scope with configured consent scope.
$m=$m.Replace("authUrl.searchParams.set('scope','openid email https://www.googleapis.com/auth/spreadsheets.readonly');","authUrl.searchParams.set('scope','openid email https://www.googleapis.com/auth/spreadsheets');")

# Save OAuth token immediately after successful exchange. Userinfo is best-effort only.
$old=@'
    const tokenPayload=await response.json();
    if(!tokenPayload.access_token) throw googleOAuthError('Google 액세스 토큰을 받지 못했습니다.','UEP_GOOGLE_OAUTH_TOKEN_FAILED');
    const info=await googleUserInfo(tokenPayload.access_token);
    const saved={...tokenPayload,client_id:clientId,email:String(info?.email||''),sub:String(info?.sub||''),expires_at:Date.now()+Math.max(60,Number(tokenPayload.expires_in||3600))*1000,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    await saveGoogleUserOAuth(saved);
'@
$new=@'
    const tokenPayload=await response.json();
    if(!tokenPayload.access_token) throw googleOAuthError('Google 액세스 토큰을 받지 못했습니다.','UEP_GOOGLE_OAUTH_TOKEN_FAILED');
    let info={};
    try{info=await googleUserInfo(tokenPayload.access_token);}catch{}
    let idTokenInfo={};
    try{
      const parts=String(tokenPayload.id_token||'').split('.');
      if(parts.length>=2) idTokenInfo=JSON.parse(Buffer.from(parts[1].replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'))||{};
    }catch{}
    const fallbackEmail=String(loginHint||'').trim();
    const saved={...tokenPayload,client_id:clientId,email:String(info?.email||idTokenInfo?.email||fallbackEmail||''),sub:String(info?.sub||idTokenInfo?.sub||''),expires_at:Date.now()+Math.max(60,Number(tokenPayload.expires_in||3600))*1000,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    const persistResult=await saveGoogleUserOAuth(saved);
    const verifySaved=await readGoogleUserOAuth();
    if(!verifySaved?.access_token) throw googleOAuthError('Google 승인 토큰 저장 확인에 실패했습니다.','UEP_GOOGLE_OAUTH_PERSIST_FAILED');
'@
if(-not $m.Contains($old)){throw 'OAuth token save block not found in 0.80.73 base'}
$m=$m.Replace($old,$new)

# Make failures visible and persistent in the renderer instead of only a transient toast.
$g=Get-Content $gyo -Raw -Encoding UTF8
$oldUi="if(!result?.ok){if(typeof toast==='function')toast(result?.reason||'Google 계정 연결에 실패했습니다.');return;}"
$newUi="if(!result?.ok){googleConnectionError=result?.reason||'Google 계정 연결에 실패했습니다.'; if(typeof toast==='function')toast(googleConnectionError); try{render(state.activePage||'dashboard');}catch{} return;}"
if($g.Contains($oldUi)){$g=$g.Replace($oldUi,$newUi)}

# Visible/package version.
$g=$g.Replace('const APP_VERSION = "0.80.73";','const APP_VERSION = "0.80.74";')
$g=$g.Replace('v0.80.73','v0.80.74')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

Set-Content $main $m -Encoding UTF8 -NoNewline
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.74'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check $main
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo
Write-Host 'UEP 0.80.74 emergency OAuth exchange/save patch applied.'
