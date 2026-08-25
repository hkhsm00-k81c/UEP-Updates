const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const mFile=path.join(root,'resources','app','electron','main.cjs');
let g=fs.readFileSync(gFile,'utf8'),m=fs.readFileSync(mFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
A(/const\s+APP_VERSION\s*=\s*["']0\.81\.63["']\s*;/.test(g),'0.81.63 version missing');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.81\.63["']\s*;/,'const APP_VERSION = "0.81.64";');

// Curriculum confidential password: read shared hash delivered in 00_UEP설정, with local fallback for migration.
const oldHash="function subjectConfidentialPasswordHash(){return String(localStorage.getItem(UEP_SUBJECT_CONFIDENTIAL_PIN_KEY)||'');}";
A(g.includes(oldHash),'subject hash function missing');
const newHash=`function subjectConfidentialSharedHash(){\n  const rows=Array.isArray(readonlyCache?.settings)?readonlyCache.settings:[];\n  const hit=rows.find(r=>String(r?.key||r?.settingKey||r?.['설정키']||'').trim()==='SUBJECT_CONFIDENTIAL_PIN_HASH');\n  return String(hit?.value||hit?.settingValue||hit?.['설정값']||'').trim();\n}\nfunction subjectConfidentialPasswordHash(){return subjectConfidentialSharedHash()||String(localStorage.getItem(UEP_SUBJECT_CONFIDENTIAL_PIN_KEY)||'');}`;
g=g.replace(oldHash,newHash);
// Never tell homeroom teachers to configure the password themselves.
g=g.replace("toast('설정 → 사용자·보안에서 선택과목 대외비 비밀번호를 먼저 설정해 주세요.');return false;","toast(subjectConfidentialAllowed()?'설정 → 사용자·보안에서 선택과목 대외비 비밀번호를 먼저 설정해 주세요.':'관리자가 아직 선택과목 열람 비밀번호를 공용 설정하지 않았습니다.');return false;");

// Notice receipt: School Read users must never be pushed into Google/service-account approval.
const receipt="ipcMain.handle(\"notice:receiptSave\", async (_event, payload={}) => {\n  try {\n    const account=await readEncrypted(credentialPath()); if(!validateServiceAccount(account)) throw new Error(\"Google 서비스 계정 인증정보가 필요합니다.\");";
A(m.includes(receipt),'notice receipt anchor missing');
const routed=`ipcMain.handle("notice:receiptSave", async (_event, payload={}) => {\n  try {\n    const auth=await resolveGoogleReadAuth().catch(()=>null);\n    if(auth?.mode==='school_read_api'){\n      // __UEP_08164_NOTICE_RECEIPT_SCHOOL_READ__\n      const result=await schoolReadApiRequest(auth,{action:'notice-receipt-save',noticeId:String(payload.noticeId||'').trim(),teacher:String(payload.teacher||'').trim(),userId:String(payload.userId||'').trim(),confirmedAt:new Date().toISOString()}).catch(error=>({ok:false,reason:error?.message||'School Read 공지확인 저장 실패'}));\n      if(result?.ok)return result;\n      return {ok:false,reason:result?.reason||result?.message||'School Read 공지확인 저장 기능이 아직 배포되지 않았습니다.',requiresSchoolReadWrite:true};\n    }\n    const account=await readEncrypted(credentialPath()); if(!validateServiceAccount(account)) throw new Error("Google 서비스 계정 인증정보가 필요합니다.");`;
m=m.replace(receipt,routed);
fs.writeFileSync(gFile,g,'utf8');fs.writeFileSync(mFile,m,'utf8');
A(g.includes('SUBJECT_CONFIDENTIAL_PIN_HASH'),'shared subject hash missing');
A(m.includes('__UEP_08164_NOTICE_RECEIPT_SCHOOL_READ__'),'notice school-read route missing');
console.log('0.81.64 auth patch applied');
