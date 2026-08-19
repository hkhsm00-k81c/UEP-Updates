$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$m=Get-Content $main -Raw -Encoding UTF8

# 0.80.76: corrected OAuth loopback callback syntax + token diagnostics.
$oldCallback=@'
if(u.pathname!=='/oauth2callback'){res.writeHead(404);res.end('Not found');return;}
'@
$newCallback=@'
if(u.pathname!=='/' && u.pathname!=='/oauth2callback'){res.writeHead(404);res.end('Not found');return;}
'@
if(-not $m.Contains($oldCallback)){throw '0.80.74 OAuth callback guard not found'}
$m=$m.Replace($oldCallback,$newCallback)
$m=$m.Replace('const redirectUri=`http://127.0.0.1:${port}/oauth2callback`;','const redirectUri=`http://127.0.0.1:${port}/`;')

$old=@'
    const body=new URLSearchParams({client_id:clientId,code,code_verifier:verifier,redirect_uri:redirectUri,grant_type:'authorization_code'});
    const response=await net.fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
    if(!response.ok){let detail='';try{detail=(await response.json())?.error_description||'';}catch{};throw googleOAuthError(`Google 토큰 교환 실패 (${response.status})${detail?`: ${detail}`:''}`,'UEP_GOOGLE_OAUTH_TOKEN_FAILED');}
'@
$new=@'
    const body=new URLSearchParams();
    body.set('client_id',clientId);
    body.set('code',code);
    body.set('code_verifier',verifier);
    body.set('redirect_uri',redirectUri);
    body.set('grant_type','authorization_code');
    const response=await net.fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8','accept':'application/json'},body:body.toString()});
    if(!response.ok){
      let errCode='',detail='',raw='';
      try{const payload=await response.json();errCode=String(payload?.error||'');detail=String(payload?.error_description||'');raw=JSON.stringify(payload);}catch{try{raw=await response.text();}catch{}}
      const suffix=[errCode,detail].filter(Boolean).join(' · ');
      throw googleOAuthError(`Google 토큰 교환 실패 (${response.status})${suffix?`: ${suffix}`:''}${!suffix&&raw?`: ${raw}`:''}`,'UEP_GOOGLE_OAUTH_TOKEN_FAILED');
    }
'@
if(-not $m.Contains($old)){throw '0.80.74 token exchange block not found'}
$m=$m.Replace($old,$new)

Set-Content $main $m -Encoding UTF8 -NoNewline

$g=Get-Content $gyo -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.80.74";','const APP_VERSION = "0.80.76";')
$g=$g.Replace('v0.80.70','v0.80.76')
$g=$g.Replace('v0.80.71','v0.80.76')
$g=$g.Replace('v0.80.72','v0.80.76')
$g=$g.Replace('v0.80.73','v0.80.76')
$g=$g.Replace('v0.80.74','v0.80.76')
$g=$g.Replace('v0.80.75','v0.80.76')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.76'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check $main
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo
Write-Host 'UEP 0.80.76 OAuth callback syntax/token diagnostics patch applied.'
