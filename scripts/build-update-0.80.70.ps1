$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$preload='app/resources/app/electron/preload.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$m=Get-Content $main -Raw -Encoding UTF8

# Node local loopback server for Google Desktop OAuth callback.
if($m -notmatch 'const http = require\("http"\);'){
  $m=$m.Replace('const crypto = require("crypto");','const crypto = require("crypto");' + "`n" + 'const http = require("http");')
}

# User OAuth token path: never shipped in the update package; stored only in Windows userData via safeStorage.
$pathNeedle='const credentialRecoveryPath = () => path.join(stableUserDataRoot(), "google-service-account.recovery.json");'
if($m.Contains($pathNeedle) -and $m -notmatch 'googleUserOAuthPath'){
  $m=$m.Replace($pathNeedle,$pathNeedle + "`n" + 'const googleUserOAuthPath = () => path.join(stableUserDataRoot(), "google-user-oauth.bin");')
}

# Insert Desktop OAuth + PKCE read-only helpers before service-account token helper.
$tokenNeedle='async function getSheetsToken(credentials) {'
if($m.Contains($tokenNeedle) -and $m -notmatch '__UEP_GOOGLE_USER_OAUTH_08070__'){
$oauth=@'
// __UEP_GOOGLE_USER_OAUTH_08070__
const UEP_UPDATE_POLICY_URL = "https://raw.githubusercontent.com/hkhsm00-k81c/UEP-Updates/main/uep-policy.json";
let googleOAuthPolicyCache={clientId:"",expiresAt:0};

function googleOAuthError(message,code){const e=new Error(message);e.code=code;return e;}
async function loadGoogleOAuthClientId(){
  if(googleOAuthPolicyCache.clientId && googleOAuthPolicyCache.expiresAt>Date.now()) return googleOAuthPolicyCache.clientId;
  let response;
  try{ response=await net.fetch(UEP_UPDATE_POLICY_URL,{cache:"no-store"}); }
  catch(error){ throw googleOAuthError("Google 계정 연결 설정을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.","UEP_GOOGLE_OAUTH_POLICY_UNAVAILABLE"); }
  if(!response.ok) throw googleOAuthError(`Google 계정 연결 설정 조회 실패 (${response.status})`,"UEP_GOOGLE_OAUTH_POLICY_UNAVAILABLE");
  const policy=await response.json();
  const clientId=String(policy?.googleOAuthClientId||"").trim();
  if(!/\.apps\.googleusercontent\.com$/i.test(clientId)) throw googleOAuthError("관리자가 UEP Google OAuth 클라이언트를 아직 설정하지 않았습니다.","UEP_GOOGLE_OAUTH_CLIENT_NOT_CONFIGURED");
  googleOAuthPolicyCache={clientId,expiresAt:Date.now()+10*60*1000};
  return clientId;
}
async function readGoogleUserOAuth(){
  try{return await readEncrypted(googleUserOAuthPath());}
  catch(error){if(error?.code==='ENOENT'||/no such file/i.test(String(error?.message||'')))return null;throw error;}
}
async function googleUserInfo(accessToken){
  const response=await net.fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:`Bearer ${accessToken}`}});
  if(!response.ok) throw googleOAuthError(`Google 사용자 확인 실패 (${response.status})`,'UEP_GOOGLE_OAUTH_USERINFO_FAILED');
  return await response.json();
}
async function refreshGoogleUserOAuth(saved){
  if(!saved?.refresh_token) throw googleOAuthError("Google 계정 연결을 다시 승인해 주세요.","UEP_GOOGLE_USER_AUTH_REQUIRED");
  const clientId=String(saved.client_id||'').trim() || await loadGoogleOAuthClientId();
  const body=new URLSearchParams({client_id:clientId,refresh_token:String(saved.refresh_token),grant_type:'refresh_token'});
  const response=await net.fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  if(!response.ok){let detail='';try{detail=(await response.json())?.error_description||'';}catch{};throw googleOAuthError(`Google 계정 토큰 갱신 실패 (${response.status})${detail?`: ${detail}`:''}`,"UEP_GOOGLE_USER_AUTH_REQUIRED");}
  const next=await response.json();
  const merged={...saved,...next,client_id:clientId,expires_at:Date.now()+Math.max(60,Number(next.expires_in||3600))*1000,updated_at:new Date().toISOString()};
  await saveEncrypted(googleUserOAuthPath(),merged);
  return merged;
}
async function getGoogleUserSheetsToken(){
  let saved=await readGoogleUserOAuth();
  if(!saved) throw googleOAuthError("Google 계정 연결이 필요합니다.","UEP_GOOGLE_USER_AUTH_REQUIRED");
  if(saved.access_token && Number(saved.expires_at||0)>Date.now()+90000) return String(saved.access_token);
  saved=await refreshGoogleUserOAuth(saved);
  if(!saved.access_token) throw googleOAuthError("Google 계정 액세스 토큰을 받지 못했습니다.","UEP_GOOGLE_USER_AUTH_REQUIRED");
  return String(saved.access_token);
}
async function getReadonlySheetsAuth(credentials=null){
  if(credentials){if(!validateServiceAccount(credentials))throw new Error("Google 서비스 계정 인증정보가 올바르지 않습니다.");return {token:await getSheetsToken(credentials),mode:'service_account',account:credentials.client_email||''};}
  try{
    const service=await readEncrypted(credentialPath());
    if(validateServiceAccount(service)) return {token:await getSheetsToken(service),mode:'service_account',account:service.client_email||''};
  }catch(error){
    const fallbackAllowed=error?.code==='UEP_GOOGLE_CREDENTIAL_MISSING'||error?.code==='ENOENT'||error?.code==='UEP_SAFE_STORAGE_DECRYPT_FAILED'||/no such file/i.test(String(error?.message||''));
    if(!fallbackAllowed) throw error;
  }
  const saved=await readGoogleUserOAuth();
  const token=await getGoogleUserSheetsToken();
  return {token,mode:'user_oauth',account:String(saved?.email||'')};
}
async function authorizeGoogleUser({loginHint=''}={}){
  const clientId=await loadGoogleOAuthClientId();
  const verifier=crypto.randomBytes(48).toString('base64url');
  const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
  const state=crypto.randomBytes(24).toString('base64url');
  let timer=null;
  let settled=false;
  let callbackResolve,callbackReject;
  const callbackPromise=new Promise((resolve,reject)=>{callbackResolve=resolve;callbackReject=reject;});
  const server=http.createServer((req,res)=>{
    try{
      const u=new URL(req.url||'/', 'http://127.0.0.1');
      if(u.pathname!=='/oauth2callback'){res.writeHead(404);res.end('Not found');return;}
      const returnedState=String(u.searchParams.get('state')||'');
      const code=String(u.searchParams.get('code')||'');
      const error=String(u.searchParams.get('error')||'');
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
      if(error||returnedState!==state||!code){
        res.end('<!doctype html><meta charset="utf-8"><title>UEP Google 연결</title><h2>UEP Google 계정 연결이 취소되었거나 실패했습니다.</h2><p>이 창을 닫고 UEP에서 다시 시도해 주세요.</p>');
        if(!settled){settled=true;callbackReject(googleOAuthError(error?`Google 승인 취소: ${error}`:'Google 승인 응답 검증에 실패했습니다.','UEP_GOOGLE_OAUTH_CALLBACK_FAILED'));}
        return;
      }
      res.end('<!doctype html><meta charset="utf-8"><title>UEP Google 연결</title><h2>UEP Google 계정 승인이 완료되었습니다.</h2><p>이 창을 닫고 UEP로 돌아가 주세요.</p>');
      if(!settled){settled=true;callbackResolve(code);}
    }catch(error){if(!settled){settled=true;callbackReject(error);}}
  });
  try{
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const address=server.address();
    const port=typeof address==='object'&&address?address.port:0;
    if(!port) throw googleOAuthError('Google 승인용 로컬 포트를 열지 못했습니다.','UEP_GOOGLE_OAUTH_CALLBACK_FAILED');
    const redirectUri=`http://127.0.0.1:${port}/oauth2callback`;
    const authUrl=new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id',clientId);
    authUrl.searchParams.set('redirect_uri',redirectUri);
    authUrl.searchParams.set('response_type','code');
    authUrl.searchParams.set('scope','openid email https://www.googleapis.com/auth/spreadsheets.readonly');
    authUrl.searchParams.set('code_challenge',challenge);
    authUrl.searchParams.set('code_challenge_method','S256');
    authUrl.searchParams.set('state',state);
    authUrl.searchParams.set('access_type','offline');
    authUrl.searchParams.set('prompt','consent');
    if(String(loginHint||'').includes('@')) authUrl.searchParams.set('login_hint',String(loginHint).trim());
    await shell.openExternal(authUrl.toString());
    timer=setTimeout(()=>{if(!settled){settled=true;callbackReject(googleOAuthError('Google 계정 승인이 시간 초과되었습니다.','UEP_GOOGLE_OAUTH_TIMEOUT'));}},180000);
    const code=await callbackPromise;
    const body=new URLSearchParams({client_id:clientId,code,code_verifier:verifier,redirect_uri:redirectUri,grant_type:'authorization_code'});
    const response=await net.fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
    if(!response.ok){let detail='';try{detail=(await response.json())?.error_description||'';}catch{};throw googleOAuthError(`Google 토큰 교환 실패 (${response.status})${detail?`: ${detail}`:''}`,'UEP_GOOGLE_OAUTH_TOKEN_FAILED');}
    const tokenPayload=await response.json();
    if(!tokenPayload.access_token) throw googleOAuthError('Google 액세스 토큰을 받지 못했습니다.','UEP_GOOGLE_OAUTH_TOKEN_FAILED');
    const info=await googleUserInfo(tokenPayload.access_token);
    const saved={...tokenPayload,client_id:clientId,email:String(info?.email||''),sub:String(info?.sub||''),expires_at:Date.now()+Math.max(60,Number(tokenPayload.expires_in||3600))*1000,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    await saveEncrypted(googleUserOAuthPath(),saved);
    liveDataCache=null;liveDataFetchedAt=0;
    const data=await fetchLiveData({force:true});
    return {ok:true,mode:'user_oauth',account:saved.email,sourceName:data?.sourceName||UEP_SPREADSHEET_NAME,preview:data?.summary||null,syncedAt:data?.syncedAt||''};
  }finally{
    if(timer)clearTimeout(timer);
    try{server.close();}catch{}
  }
}
async function disconnectGoogleUser(){
  try{await fs.unlink(googleUserOAuthPath());}catch(error){if(error?.code!=='ENOENT')throw error;}
  liveDataCache=null;liveDataFetchedAt=0;return {ok:true};
}

'@
  $m=$m.Replace($tokenNeedle,$oauth+$tokenNeedle)
}

# Read-only data fetch: service account first (admin), user OAuth fallback (homeroom distribution).
$oldFetch=@'
  const account = credentials || await readEncrypted(credentialPath());
  if (!validateServiceAccount(account)) throw new Error("저장된 Google 서비스 계정 인증정보가 올바르지 않습니다.");
  const token = await getSheetsToken(account);
'@
$newFetch=@'
  const readonlyAuth = await getReadonlySheetsAuth(credentials);
  const token = readonlyAuth.token;
'@
if($m.Contains($oldFetch)){$m=$m.Replace($oldFetch,$newFetch)}

# Hybrid credential status + OAuth IPC.
$m=[regex]::Replace($m,'ipcMain\.handle\("google:credentialStatus", async \(\) => \{[\s\S]*?\n\s*\}\);',@'
ipcMain.handle("google:credentialStatus", async () => {
  try {
    const credentials = await readEncrypted(credentialPath());
    if (validateServiceAccount(credentials)) return {ok:true,encryption:safeStorage.isEncryptionAvailable(),local:false,mode:"service_account",account:credentials.client_email||""};
  } catch (error) {}
  try {
    const userOAuth=await readGoogleUserOAuth();
    if(userOAuth && (userOAuth.refresh_token || (userOAuth.access_token && Number(userOAuth.expires_at||0)>Date.now()+60000))){
      return {ok:true,encryption:safeStorage.isEncryptionAvailable(),local:true,mode:"user_oauth",account:String(userOAuth.email||""),userOAuth:true};
    }
  } catch (error) {}
  return {ok:false,setupRequired:true,missing:true,userOAuth:true,reason:"담임용 Google 계정 연결이 필요합니다. 아래의 Google 계정 연결 버튼으로 1회 승인해 주세요."};
});
ipcMain.handle("google:authorizeUser", async (_event,payload={}) => {
  try{return await authorizeGoogleUser({loginHint:String(payload?.loginHint||payload?.email||"")});}
  catch(error){return {ok:false,reason:error?.message||String(error),code:error?.code||""};}
});
ipcMain.handle("google:disconnectUser", async () => {
  try{return await disconnectGoogleUser();}catch(error){return {ok:false,reason:error?.message||String(error)};}
});
'@,1)

Set-Content $main $m -Encoding UTF8 -NoNewline

# Expose OAuth actions to renderer.
$pr=Get-Content $preload -Raw -Encoding UTF8
if($pr -notmatch 'authorizeGoogleUser'){
  $pr=$pr.Replace('  googleCredentialStatus: () => ipcRenderer.invoke("google:credentialStatus"),','  googleCredentialStatus: () => ipcRenderer.invoke("google:credentialStatus"),' + "`n" + '  authorizeGoogleUser: (payload) => ipcRenderer.invoke("google:authorizeUser", payload || {}),' + "`n" + '  disconnectGoogleUser: () => ipcRenderer.invoke("google:disconnectUser"),')
}
Set-Content $preload $pr -Encoding UTF8 -NoNewline

# Renderer: scoped Google authorization button in connection drawer, then refresh data immediately.
$g=Get-Content $gyo -Raw -Encoding UTF8
if($g -notmatch '__UEP_GOOGLE_OAUTH_UI_08070__'){
$g += @'

// __UEP_GOOGLE_OAUTH_UI_08070__
(function(){
  let busy=false;
  async function connectGoogleUser(){
    if(busy)return;busy=true;
    const btn=document.querySelector('[data-uep-google-oauth]');if(btn){btn.disabled=true;btn.textContent='Google 승인 진행 중…';}
    try{
      const profile=(typeof currentUserProfile==='function'?currentUserProfile():{})||{};
      const result=await window.schoolBoard?.authorizeGoogleUser?.({loginHint:String(profile.email||'')});
      if(!result?.ok){if(typeof toast==='function')toast(result?.reason||'Google 계정 연결에 실패했습니다.');return;}
      const status=await window.schoolBoard?.googleCredentialStatus?.();if(status)googleConnectionStatus=status;
      googleConnectionError='';
      if(window.schoolBoard?.readReadonlyCache){const cached=await window.schoolBoard.readReadonlyCache();if(cached?.ok)readonlyCache=cached.data;}
      if(typeof refreshReadonlyCacheSilently==='function')await refreshReadonlyCacheSilently({force:true,rerender:true});
      if(typeof updateTopSyncStatus==='function')updateTopSyncStatus();
      if(typeof startReadonlyAutoRefresh==='function')startReadonlyAutoRefresh();
      if(typeof toast==='function')toast(`Google 시트 연결 완료${result.account?' · '+result.account:''}`);
      document.querySelector('[data-uep-google-oauth]')?.remove();
    }catch(error){if(typeof toast==='function')toast(error?.message||'Google 계정 연결에 실패했습니다.');}
    finally{busy=false;const b=document.querySelector('[data-uep-google-oauth]');if(b){b.disabled=false;b.textContent='Google 계정 연결';}}
  }
  function enhance(){
    const drawer=document.querySelector('#drawerBody');if(!drawer)return;
    const text=String(drawer.textContent||'');
    if(!googleConnectionStatus?.setupRequired && !text.includes('Google 시트 연결 승인') && !text.includes('Google 계정 연결'))return;
    if(drawer.querySelector('[data-uep-google-oauth]'))return;
    const button=document.createElement('button');button.type='button';button.className='btn primary';button.dataset.uepGoogleOauth='1';button.textContent='Google 계정 연결';button.addEventListener('click',connectGoogleUser);
    const actions=[...drawer.querySelectorAll('div')].find(el=>{const t=String(el.textContent||'');return t.includes('연결 설정')&&t.includes('새로고침')&&el.querySelector('button');});
    if(actions)actions.appendChild(button);else{const wrap=document.createElement('div');wrap.className='connection-actions';wrap.style.marginTop='12px';wrap.appendChild(button);drawer.appendChild(wrap);}
  }
  const obs=new MutationObserver(()=>requestAnimationFrame(enhance));obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(enhance,300);
})();
'@
}
$g=$g.Replace('const APP_VERSION = "0.80.69";','const APP_VERSION = "0.80.70";')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8
$p=[regex]::Replace($p,'"version"\s*:\s*"0\.80\.69"','"version": "0.80.70"',1)
Set-Content $pkg $p -Encoding UTF8 -NoNewline

node --check $main
node --check $preload
node --check $gyo
