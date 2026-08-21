$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$preload='app/resources/app/electron/preload.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$gatewayUrl='https://script.google.com/macros/s/AKfycbyLEEam4L2sX653pii69TC3_84wTyfAed_UL8HRY6PBG467im1LmZJ0CIpSKSOj4r6-0w/exec'
$gatewayUrlJson=$gatewayUrl | ConvertTo-Json -Compress

$m=Get-Content $main -Raw -Encoding UTF8
$p=Get-Content $preload -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8

$g=$g.Replace('const APP_VERSION = "0.81.03";','const APP_VERSION = "0.81.04";').Replace('v0.81.03','v0.81.04')

if(-not $m.Contains('__UEP_READONLY_GATEWAY_08104__')){
$helper=@'

// __UEP_READONLY_GATEWAY_08104__
// Google OAuth나 refresh token 없이 승인된 UEP 기기에서 학교 공용 읽기 API를 사용합니다.
const UEP_GATEWAY_URL=__UEP_GATEWAY_URL__;
function uepGatewaySessionPath(){return path.join(stableUserDataRoot(),"uep-gateway-session.enc");}
function uepGatewayDevicePath(){return path.join(stableUserDataRoot(),"uep-device-id.txt");}
async function uepGatewayDeviceId(){
  try{const value=(await fs.readFile(uepGatewayDevicePath(),"utf8")).trim();if(value)return value;}catch{}
  const value=crypto.randomUUID();await fs.mkdir(path.dirname(uepGatewayDevicePath()),{recursive:true});await fs.writeFile(uepGatewayDevicePath(),value,"utf8");return value;
}
async function readUepGatewaySession(){
  try{const session=await readEncrypted(uepGatewaySessionPath());if(session?.token&&session?.deviceId)return session;}catch{}
  return null;
}
async function saveUepGatewaySession(session){await saveEncrypted(uepGatewaySessionPath(),session);return session;}
async function uepGatewayRequest(action,payload={}){
  const response=await fetch(UEP_GATEWAY_URL,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,...payload})});
  if(!response.ok)throw new Error(`UEP 학교자료 API 연결 실패 (${response.status})`);
  const result=await response.json();
  if(!result?.ok){const error=new Error(result?.message||"UEP 학교자료 요청을 처리하지 못했습니다.");error.code=result?.code||"UEP_GATEWAY_ERROR";error.requestId=result?.requestId||"";throw error;}
  return result;
}
async function uepGatewayLogin(payload={}){
  const deviceId=await uepGatewayDeviceId();
  const result=await uepGatewayRequest("login",{name:String(payload.name||"").trim(),email:String(payload.email||"").trim().toLowerCase(),deviceId});
  await saveUepGatewaySession({token:result.token,deviceId,user:result.user,expiresAt:Date.now()+Number(result.expiresIn||0)*1000});
  return result;
}
async function verifiedUepGatewaySession(){
  const session=await readUepGatewaySession();if(!session)return null;
  try{const verified=await uepGatewayRequest("verify-token",{token:session.token,deviceId:session.deviceId});return {...session,user:verified.user||session.user};}catch{return null;}
}
function isUepGatewayToken(token){return Boolean(token&&token.__uepGateway&&token.token&&token.deviceId);}
async function uepGatewayBatchRead(token,spreadsheetId,ranges){
  const result=await uepGatewayRequest("batch-read",{token:token.token,deviceId:token.deviceId,spreadsheetId,ranges});return result.valueRanges||[];
}
'@
$helper=$helper.Replace('__UEP_GATEWAY_URL__',$gatewayUrlJson)
$m+="`r`n"+$helper
}

$readAnchor='async function readSheetBatch(token, spreadsheetId, ranges, attempt = 0) {'
$readReplacement=$readAnchor+"`r`n  if (isUepGatewayToken(token)) return uepGatewayBatchRead(token, spreadsheetId, ranges);"
if(-not $m.Contains('if (isUepGatewayToken(token)) return uepGatewayBatchRead')){
  if(-not $m.Contains($readAnchor)){throw 'readSheetBatch anchor not found'}
  $m=$m.Replace($readAnchor,$readReplacement)
}

if(-not $m.Contains('const gatewaySession = credentials ? null : await verifiedUepGatewaySession();')){
  $fetchAccount='  const account = credentials || await resolveSchoolServiceAccount();'
  $fetchValidate='  if (!validateServiceAccount(account)) throw new Error("저장된 Google 서비스 계정 인증정보가 올바르지 않습니다.");'
  $fetchToken='  const token = await getSheetsToken(account);'
  if(-not $m.Contains($fetchAccount) -or -not $m.Contains($fetchValidate) -or -not $m.Contains($fetchToken)){throw 'fetchLiveData gateway anchor not found'}
  $m=$m.Replace($fetchAccount,"  const gatewaySession = credentials ? null : await verifiedUepGatewaySession();`r`n  const account = credentials || (gatewaySession ? null : await resolveSchoolServiceAccount());")
  $m=$m.Replace($fetchValidate,'  if (!gatewaySession && !validateServiceAccount(account)) throw new Error("UEP 로그인이 필요합니다.");')
  $m=$m.Replace($fetchToken,'  const token = gatewaySession ? {__uepGateway:true,token:gatewaySession.token,deviceId:gatewaySession.deviceId} : await getSheetsToken(account);')
}
$m=$m.Replace('  await ensureSelectedReportNormalization(token);','  if (!isUepGatewayToken(token)) await ensureSelectedReportNormalization(token);')
$m=$m.Replace('    account: account.client_email,','    account: gatewaySession?.user?.email || account?.client_email || "UEP 학교 공용읽기",')

$ipcAnchor='  ipcMain.handle("google:credentialStatus", async () => {'
$ipcInsert=@'
  ipcMain.handle("uep:login", async (_event,payload) => {
    try{return await uepGatewayLogin(payload||{});}catch(error){return {ok:false,code:error.code||"UEP_LOGIN_ERROR",reason:error.message||"UEP 로그인 실패",requestId:error.requestId||""};}
  });
  ipcMain.handle("uep:verifySession", async () => {
    const session=await verifiedUepGatewaySession();return session?{ok:true,user:session.user}:{ok:false};
  });
'@
if(-not $m.Contains('ipcMain.handle("uep:login"')){
  if(-not $m.Contains($ipcAnchor)){throw 'credential status IPC anchor not found'}
  $m=$m.Replace($ipcAnchor,$ipcInsert+"`r`n"+$ipcAnchor)
}
$statusAnchor='  ipcMain.handle("google:credentialStatus", async () => {'
$statusReplacement=@'
  ipcMain.handle("google:credentialStatus", async () => {
    const gatewaySession=await verifiedUepGatewaySession();
    if(gatewaySession)return {ok:true,encryption:safeStorage.isEncryptionAvailable(),local:false,account:gatewaySession.user?.email||"",sourceName:UEP_SPREADSHEET_NAME,sourceUrl:UEP_SPREADSHEET_URL,mode:"uep_readonly_gateway",approvalRequired:false,tokenExchangeRequired:false};
'@
if(-not $m.Contains('mode:"uep_readonly_gateway"')){
  if(-not $m.Contains($statusAnchor)){throw 'credential status gateway anchor not found'}
  $m=$m.Replace($statusAnchor,$statusReplacement)
}

$preloadAnchor='  googleCredentialStatus: () => ipcRenderer.invoke("google:credentialStatus"),'
$preloadNew=@'
  googleCredentialStatus: () => ipcRenderer.invoke("google:credentialStatus"),
  uepLogin: (payload) => ipcRenderer.invoke("uep:login", payload),
  uepVerifySession: () => ipcRenderer.invoke("uep:verifySession"),
'@
if(-not $p.Contains('uepLogin:')){
  if(-not $p.Contains($preloadAnchor)){throw 'preload gateway anchor not found'}
  $p=$p.Replace($preloadAnchor,$preloadNew)
}

$rememberedOld="document.getElementById('rememberedUserContinue')?.addEventListener('click',async()=>{const account=findUserAccount(remembered.name,remembered.email);if(!account)return renderUserAuthGate({switchUser:true});state.auth.user=accountToSession(account);await save();hideUserAuthGate();navigate(state.activePage||'dashboard');});"
$rememberedNew="document.getElementById('rememberedUserContinue')?.addEventListener('click',async()=>{authGateMessage('학교 계정 확인 중…');const result=await window.schoolBoard?.uepLogin?.({name:remembered.name,email:remembered.email});if(!result?.ok){authGateMessage(result?.requestId?``${result.reason} 요청번호: ${result.requestId}``:(result?.reason||'로그인 확인에 실패했습니다.'));return;}const account={id:result.user.userId,name:result.user.name,email:result.user.email,grade:result.user.grade,classNo:result.user.homeroom,department:``${result.user.grade||''}학년부``,role:result.user.role,admin:result.user.isAdmin?'Y':'N'};state.auth.user=accountToSession(account);googleConnectionStatus={ok:true,mode:'uep_readonly_gateway',account:result.user.email};await save();const sync=await window.schoolBoard?.previewReadonlySync?.();if(sync?.ok){const cached=await window.schoolBoard?.readReadonlyCache?.();if(cached?.ok)readonlyCache=cached.data;}hideUserAuthGate();navigate(state.activePage||'dashboard');});"
if(-not $g.Contains("mode:'uep_readonly_gateway'")){
  if(-not $g.Contains($rememberedOld)){throw 'remembered login anchor not found'}
  $g=$g.Replace($rememberedOld,$rememberedNew)
}

$submitOld="document.getElementById('userAuthForm')?.addEventListener('submit',async event=>{event.preventDefault();const name=document.getElementById('userAuthName')?.value,email=document.getElementById('userAuthEmail')?.value;const account=findUserAccount(name,email);if(!account){authGateMessage(userAuthFailureMessage(name,email));return;}const user=accountToSession(account),remember=Boolean(document.getElementById('userAuthRemember')?.checked);state.auth.user=user;state.auth.rememberUser=remember;state.auth.rememberedUser=remember?{id:user.id,name:user.name,email:user.email}:null;state.settings.userProfile={...state.settings.userProfile,...user};state.settings.loginUserName=user.name;await save();hideUserAuthGate();navigate(state.activePage||'dashboard');});"
$submitNew="document.getElementById('userAuthForm')?.addEventListener('submit',async event=>{event.preventDefault();const name=document.getElementById('userAuthName')?.value,email=document.getElementById('userAuthEmail')?.value;authGateMessage('학교 계정과 담임 권한 확인 중…');const result=await window.schoolBoard?.uepLogin?.({name,email});if(!result?.ok){authGateMessage(result?.requestId?``${result.reason} 요청번호: ${result.requestId}``:(result?.reason||'등록된 교사 계정을 확인해 주세요.'));return;}const account={id:result.user.userId,name:result.user.name,email:result.user.email,grade:result.user.grade,classNo:result.user.homeroom,department:``${result.user.grade||''}학년부``,role:result.user.role,admin:result.user.isAdmin?'Y':'N'};const user=accountToSession(account),remember=Boolean(document.getElementById('userAuthRemember')?.checked);state.auth.user=user;state.auth.rememberUser=remember;state.auth.rememberedUser=remember?{id:user.id,name:user.name,email:user.email}:null;state.settings.userProfile={...state.settings.userProfile,...user};state.settings.loginUserName=user.name;googleConnectionStatus={ok:true,mode:'uep_readonly_gateway',account:user.email};await save();const sync=await window.schoolBoard?.previewReadonlySync?.();if(sync?.ok){const cached=await window.schoolBoard?.readReadonlyCache?.();if(cached?.ok){readonlyCache=cached.data;googleConnectionError='';}}hideUserAuthGate();navigate(state.activePage||'dashboard');});"
if(-not $g.Contains("학교 계정과 담임 권한 확인 중")){
  if(-not $g.Contains($submitOld)){throw 'login submit anchor not found'}
  $g=$g.Replace($submitOld,$submitNew)
}

$gateOld="  if(!googleConnectionStatus?.ok||!readonlyCache){`r`n    if(state?.auth?.rememberUser&&state?.auth?.user){hideUserAuthGate();return true;}"
$gateNew="  if(!googleConnectionStatus?.ok||!readonlyCache){`r`n    if(state?.auth?.rememberUser&&state?.auth?.user&&googleConnectionStatus?.ok){hideUserAuthGate();return true;}"
$g=$g.Replace($gateOld,$gateNew)
$g=$g.Replace("    renderUserAuthGate({switchUser:true});authGateMessage('먼저 PC 데이터 연결 인증을 완료해 주세요.');return false;","    renderUserAuthGate({switchUser:true});authGateMessage('이름과 이메일로 학교 계정 및 담임 권한을 확인해 주세요.');return false;")
$g=[regex]::Replace($g,'if\(!googleConnectionStatus\?\.ok\)\{(?=\s*// 인증정보가 없거나 복호화/유효성 검증에 실패한 경우에는 기존 setupCompleted 값과 무관하게)','if(!googleConnectionStatus?.ok&&!window.schoolBoard?.uepLogin){',1)
$g=$g.Replace('Google 계정 연결','UEP 학교자료 연결').Replace('Google 계정 읽기 승인','UEP 학교자료 읽기')

Set-Content $main $m -Encoding UTF8
Set-Content $preload $p -Encoding UTF8
Set-Content $gyo $g -Encoding UTF8
node --check $main;if($LASTEXITCODE-ne 0){throw 'main syntax failed'}
node --check $preload;if($LASTEXITCODE-ne 0){throw 'preload syntax failed'}
node --check $gyo;if($LASTEXITCODE-ne 0){throw 'gyomuon syntax failed'}

$checks=[ordered]@{
  'version 0.81.04'=$g.Contains('const APP_VERSION = "0.81.04";')
  'gateway marker'=$m.Contains('__UEP_READONLY_GATEWAY_08104__')
  'gateway URL'=$m.Contains('AKfycbyLEEam4L2sX653pii69TC3_84wTyfAed_UL8HRY6PBG467im1LmZJ0CIpSKSOj4r6-0w')
  'no client secret embedded'=(-not $m.Contains('UEP_GATEWAY_APP_KEY'))
  'teacher login IPC'=$m.Contains('ipcMain.handle("uep:login"')
  'read-only batch gateway'=$m.Contains('uepGatewayBatchRead')
  'no OAuth needed'=$m.Contains('mode:"uep_readonly_gateway"')
  'selection 06 preserved'=$g.Contains('for(const raw of (readonlyCache?.subjectSelections||[]))')
  'privacy preserved'=$g.Contains('privacyModeButton')
  'meal preserved'=$g.Contains('saveLunchDuty')
  'dorm outing preserved'=$g.Contains('dormOutings')
  'recordbook preserved'=$g.Contains('__UEP_RECORDBOOK_LOCAL_VALIDATOR_08102__')
  'SDGs evidence preserved'=$g.Contains('growth-sdg-evidence-card')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.04 verification failed'}

$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json
$package.version='0.81.04'
$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.81.04 readonly school gateway applied.'
