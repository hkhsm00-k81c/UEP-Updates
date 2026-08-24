const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const mainFile=path.resolve(appRoot,'resources','app','electron','main.cjs');
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let m=fs.readFileSync(mainFile,'utf8');
let g=fs.readFileSync(rendererFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.40";');

const legacyAuth=`  const account = credentials || await resolveSchoolServiceAccount();
  if (!validateServiceAccount(account)) throw new Error("저장된 Google 서비스 계정 인증정보가 올바르지 않습니다.");
  const token = await getSheetsToken(account);`;
const schoolReadAuth=`  // 0.81.40: 관리자 로컬 서비스계정과 담임 School Read API 세션을 동일 읽기 파이프라인으로 연결합니다.
  const auth = await getReadonlySheetsAuth(credentials);
  const token = auth.token;`;
assert(m.includes(legacyAuth),'fetchLiveData legacy local credential path not found');
m=m.replace(legacyAuth,schoolReadAuth);

const repairCall='  await ensureSelectedReportNormalization(token);';
const safeRepair=`  // 읽기 전용 담임 세션에서는 정규화 탭 자동복구(쓰기)를 실행하지 않습니다.
  if(auth.mode!=='school_read_api') await ensureSelectedReportNormalization(token);`;
assert(m.includes(repairCall),'selected report repair call not found');
m=m.replace(repairCall,safeRepair);

for(const marker of [
  'const auth = await getReadonlySheetsAuth(credentials);',
  "if(auth.mode!=='school_read_api') await ensureSelectedReportNormalization(token);",
  "if(String(token||'').startsWith('UEP_SCHOOL_READ:')) return schoolReadBatchRead(spreadsheetId,ranges);",
  "mode:'school_read_api'"
])assert(m.includes(marker),'missing 0.81.40 main marker: '+marker);
assert(!m.includes(legacyAuth),'legacy fetchLiveData credential path remains');
assert(g.includes('const APP_VERSION = "0.81.40";'),'renderer version update failed');

fs.writeFileSync(mainFile,m,'utf8');
fs.writeFileSync(rendererFile,g,'utf8');
console.log('UEP 0.81.40 School Read data pipeline repair applied');
