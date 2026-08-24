const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const jsFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');
function assert(c,m){if(!c)throw new Error(m);}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((s.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
s=s.replace(versionRx,'const APP_VERSION = "0.81.38";');

const startupOld=`  const credentialTask = window.schoolBoard?.schoolReadSessionStatus
    ? withStartupTimeout(window.schoolBoard.schoolReadSessionStatus({verify:true}), 5000, null)
        .then((status) => { if (status) googleConnectionStatus = {ok:Boolean(status.authenticated),encryption:true,mode:'school_read_api',endpointReady:status.endpointReady!==false}; })
        .catch((error) => console.warn("[UEP] School Read API 세션 확인 실패", error))
    : Promise.resolve();`;

const helper=`async function ensureSchoolReadSessionForCurrentUser({verify=true}={}){
  if(!window.schoolBoard?.schoolReadSessionStatus)return {authenticated:false,reason:'School Read API 세션 기능 없음'};
  let status=null;
  try{status=await window.schoolBoard.schoolReadSessionStatus({verify});}catch(error){console.warn('[UEP] School Read API 세션 확인 실패',error);}
  if(status?.authenticated)return status;
  const saved=state?.auth?.user||state?.auth?.rememberedUser||state?.settings?.userProfile||{};
  const name=String(saved?.name||state?.settings?.loginUserName||state?.settings?.teacherName||'').trim();
  const email=String(saved?.email||'').trim();
  if(!name||!email||!window.schoolBoard?.schoolReadLogin)return status||{authenticated:false};
  const login=await window.schoolBoard.schoolReadLogin({name,email});
  if(!login?.ok)return {authenticated:false,reason:login?.message||'학교 공용 읽기 로그인 실패'};
  status=await window.schoolBoard.schoolReadSessionStatus({verify:true});
  return status||{authenticated:false};
}

  const credentialTask = window.schoolBoard?.schoolReadSessionStatus
    ? withStartupTimeout(ensureSchoolReadSessionForCurrentUser({verify:true}), 8000, null)
        .then((status) => {
          if(status) googleConnectionStatus={ok:Boolean(status.authenticated),encryption:true,mode:'school_read_api',endpointReady:status.endpointReady!==false};
          if(!status?.authenticated && status?.reason) googleConnectionError=status.reason;
        })
        .catch((error) => {googleConnectionStatus={ok:false,encryption:true,mode:'school_read_api'};googleConnectionError=error?.message||'학교 공용 읽기 연결 실패';console.warn("[UEP] School Read API 최초 연결 실패", error);})
    : Promise.resolve();`;
assert(s.includes(startupOld),'startup credential block not found');
s=s.replace(startupOld,helper);

const silentOld="  if(!googleConnectionStatus?.ok || !window.schoolBoard?.previewReadonlySync || !window.schoolBoard?.readReadonlyCache) return false;";
const silentNew=`  if(!window.schoolBoard?.previewReadonlySync || !window.schoolBoard?.readReadonlyCache)return false;
  if(!googleConnectionStatus?.ok){
    const status=await ensureSchoolReadSessionForCurrentUser({verify:true}).catch(()=>null);
    googleConnectionStatus={ok:Boolean(status?.authenticated),encryption:true,mode:'school_read_api',endpointReady:status?.endpointReady!==false};
  }
  if(!googleConnectionStatus?.ok)return false;`;
assert(s.includes(silentOld),'silent refresh guard not found');
s=s.replace(silentOld,silentNew);

const manualOld=`async function previewReadonlySync() {
  if (!googleConnectionStatus.ok || !window.schoolBoard?.previewReadonlySync)
    return toast("먼저 Google 연결 인증을 등록하세요.");`;
const manualNew=`async function previewReadonlySync() {
  if(!window.schoolBoard?.previewReadonlySync)return toast("학교 공용 데이터 연결 기능을 찾지 못했습니다.");
  if(!googleConnectionStatus?.ok){
    const status=await ensureSchoolReadSessionForCurrentUser({verify:true}).catch(()=>null);
    googleConnectionStatus={ok:Boolean(status?.authenticated),encryption:true,mode:'school_read_api',endpointReady:status?.endpointReady!==false};
  }
  if(!googleConnectionStatus?.ok)return toast("학교 공용 읽기 연결에 실패했습니다. 로그아웃 후 이름·이메일로 다시 로그인해 주세요.");`;
assert(s.includes(manualOld),'manual refresh guard not found');
s=s.replace(manualOld,manualNew);

s=s.replaceAll('서비스 계정은 Windows 보안 저장소에 보관하고 UEP 표준 구글시트는 권한에 따라 조회·제한적 양방향 수정합니다.','담임은 UEP 이름·이메일 로그인으로 학교 공용 자료를 읽으며 별도 Google 인증정보를 등록하지 않습니다.');

const must=[
 'const APP_VERSION = "0.81.38";',
 'async function ensureSchoolReadSessionForCurrentUser',
 'window.schoolBoard.schoolReadLogin({name,email})',
 '학교 공용 읽기 연결에 실패했습니다',
 "mode:'school_read_api'"
];
for(const marker of must)assert(s.includes(marker),'missing 0.81.38 marker: '+marker);
assert(!s.includes('return toast("먼저 Google 연결 인증을 등록하세요.");'),'legacy Google setup toast remains');
fs.writeFileSync(jsFile,s,'utf8');
console.log('UEP 0.81.38 homeroom school-read first-connect repair applied');
