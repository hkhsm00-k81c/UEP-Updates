const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const jsFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');
function assert(c,m){if(!c)throw new Error(m);}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((s.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
s=s.replace(versionRx,'const APP_VERSION = "0.81.39";');

const diagAnchor="let googleConnectionError = \"\";";
const diagState=`let googleConnectionError = "";
let uepSchoolReadDiagnostics = [];
function uepDiagSafe(value,depth=0){
  if(depth>6)return '[DEPTH_LIMIT]';
  if(value==null||typeof value==='number'||typeof value==='boolean')return value;
  if(typeof value==='string')return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi,'[EMAIL_REDACTED]').slice(0,4000);
  if(Array.isArray(value))return value.slice(0,30).map(v=>uepDiagSafe(v,depth+1));
  if(typeof value==='object'){
    const out={};
    for(const [k,v] of Object.entries(value)){
      if(/token|secret|password|authorization|cookie|credential|private|email|name/i.test(k)){out[k]='[REDACTED]';continue;}
      out[k]=uepDiagSafe(v,depth+1);
    }
    return out;
  }
  return String(value);
}
function uepDiagRecord(stage,value){
  uepSchoolReadDiagnostics.push({at:new Date().toISOString(),stage,value:uepDiagSafe(value)});
  if(uepSchoolReadDiagnostics.length>80)uepSchoolReadDiagnostics.shift();
}
async function downloadSchoolReadDiagnostics(){
  let verified=null;
  try{verified=await window.schoolBoard?.schoolReadSessionStatus?.({verify:true});uepDiagRecord('export.sessionVerify',verified);}
  catch(error){uepDiagRecord('export.sessionVerify.throw',{name:error?.name,message:error?.message,stack:error?.stack});}
  const report={
    schema:'uep-school-read-diagnostic-v1',
    appVersion:APP_VERSION,
    exportedAt:new Date().toISOString(),
    platform:navigator.platform,
    online:navigator.onLine,
    schoolReadBridge:{
      sessionStatus:Boolean(window.schoolBoard?.schoolReadSessionStatus),
      login:Boolean(window.schoolBoard?.schoolReadLogin),
      preview:Boolean(window.schoolBoard?.previewReadonlySync),
      readCache:Boolean(window.schoolBoard?.readReadonlyCache)
    },
    googleConnectionStatus:uepDiagSafe(googleConnectionStatus),
    googleConnectionError:uepDiagSafe(googleConnectionError),
    cacheSummary:{
      syncedAt:readonlyCache?.syncedAt||null,
      students:readonlyCache?.students?.length||0,
      dormStudents:readonlyCache?.dormStudents?.length||0
    },
    verifiedSession:uepDiagSafe(verified),
    events:uepSchoolReadDiagnostics
  };
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='UEP-school-read-diagnostic-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  toast('진단 JSON 파일을 저장했습니다. 이 파일을 채팅에 올려 주세요.');
}`;
assert(s.includes(diagAnchor),'diagnostic state anchor not found');
s=s.replace(diagAnchor,diagState);

const helperStart="async function ensureSchoolReadSessionForCurrentUser({verify=true}={}){";
const helperEnd="\n}\n\n  const credentialTask";
const hs=s.indexOf(helperStart), he=s.indexOf(helperEnd,hs);
assert(hs>=0&&he>hs,'0.81.38 session helper not found');
const helper=`async function ensureSchoolReadSessionForCurrentUser({verify=true}={}){
  uepDiagRecord('session.ensure.start',{verify,online:navigator.onLine});
  if(!window.schoolBoard?.schoolReadSessionStatus){
    const missing={authenticated:false,reason:'School Read API 세션 기능 없음'};
    uepDiagRecord('session.bridge.missing',missing);return missing;
  }
  let status=null;
  try{status=await window.schoolBoard.schoolReadSessionStatus({verify});uepDiagRecord('session.status.before',status);}
  catch(error){uepDiagRecord('session.status.before.throw',{name:error?.name,message:error?.message,stack:error?.stack});}
  if(status?.authenticated)return status;
  const saved=state?.auth?.user||state?.auth?.rememberedUser||state?.settings?.userProfile||{};
  const name=String(saved?.name||state?.settings?.loginUserName||state?.settings?.teacherName||'').trim();
  const email=String(saved?.email||'').trim();
  uepDiagRecord('session.identity.available',{hasName:Boolean(name),hasEmail:Boolean(email),source:state?.auth?.user?'auth.user':state?.auth?.rememberedUser?'auth.rememberedUser':'settings.userProfile'});
  if(!name||!email||!window.schoolBoard?.schoolReadLogin){
    const missing={authenticated:false,reason:!name||!email?'저장된 담임 이름·이메일 없음':'School Read 로그인 기능 없음'};
    uepDiagRecord('session.login.skipped',missing);return status||missing;
  }
  let login=null;
  try{login=await window.schoolBoard.schoolReadLogin({name,email});uepDiagRecord('session.login.result',login);}
  catch(error){uepDiagRecord('session.login.throw',{name:error?.name,message:error?.message,stack:error?.stack});return {authenticated:false,reason:error?.message||'학교 공용 읽기 로그인 예외'};}
  if(!login?.ok)return {authenticated:false,reason:login?.message||login?.reason||'학교 공용 읽기 로그인 실패'};
  try{status=await window.schoolBoard.schoolReadSessionStatus({verify:true});uepDiagRecord('session.status.after',status);}
  catch(error){uepDiagRecord('session.status.after.throw',{name:error?.name,message:error?.message,stack:error?.stack});return {authenticated:false,reason:error?.message||'로그인 후 세션 검증 예외'};}
  return status||{authenticated:false};
}`;
s=s.slice(0,hs)+helper+s.slice(he+2);

const previewCall="  const result = await window.schoolBoard.previewReadonlySync();";
const previewDiag=`  let result=null;
  try{result=await window.schoolBoard.previewReadonlySync();uepDiagRecord('sync.preview.result',result);}
  catch(error){
    uepDiagRecord('sync.preview.throw',{name:error?.name,message:error?.message,stack:error?.stack});
    result={ok:false,reason:error?.message||'학교 공용 자료 조회 예외'};
  }`;
assert(s.includes(previewCall),'preview call not found');
s=s.replace(previewCall,previewDiag);

const buttonRow='<button class="btn secondary" data-sync-settings>연결 설정</button><button class="btn primary" data-sync-google-retry>구글 새로고침</button><button class="btn primary" data-sync-neis-retry>NEIS 새로고침</button>';
const diagButtonRow='<button class="btn secondary" data-sync-settings>연결 설정</button><button class="btn primary" data-sync-google-retry>구글 새로고침</button><button class="btn primary" data-sync-neis-retry>NEIS 새로고침</button><button class="btn secondary" data-sync-diagnostics>진단 JSON 저장</button>';
assert(s.includes(buttonRow),'sync drawer button row not found');
s=s.replace(buttonRow,diagButtonRow);

const bindAnchor=`  const neisRetry = $("[data-sync-neis-retry]");
  if (neisRetry) neisRetry.onclick = async () => { closeDrawer(); await loadNeisDashboard(true); };`;
const bindDiag=`  const neisRetry = $("[data-sync-neis-retry]");
  if (neisRetry) neisRetry.onclick = async () => { closeDrawer(); await loadNeisDashboard(true); };
  const diagnosticsButton = $("[data-sync-diagnostics]");
  if (diagnosticsButton) diagnosticsButton.onclick = async () => { await downloadSchoolReadDiagnostics(); };`;
assert(s.includes(bindAnchor),'sync drawer binding anchor not found');
s=s.replace(bindAnchor,bindDiag);

for(const marker of ['const APP_VERSION = "0.81.39";','function uepDiagRecord','downloadSchoolReadDiagnostics','data-sync-diagnostics',"'session.login.result'","'sync.preview.result'"]){
  assert(s.includes(marker),'missing diagnostic marker: '+marker);
}
fs.writeFileSync(jsFile,s,'utf8');
console.log('UEP 0.81.39 school-read diagnostic export applied');
