const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const gFile=path.resolve(appRoot,'resources','app','gyomuon.js');
const mFile=path.resolve(appRoot,'resources','app','electron','main.cjs');
let g=fs.readFileSync(gFile,'utf8'),m=fs.readFileSync(mFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}
g=g.replace(/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/,'const APP_VERSION = "0.81.56";');

// 0.81.55의 공결 raw 강제 병합은 대시보드 자료형 계약을 우회하므로 제거합니다.
const raw=/\n  \{\n    const matrix=matrices\["30_공식출결기록"\]\|\|\[\];.*?data\.officialAttendance=\[\.\.\.byId\.values\(\)\];\n    \}\n  \}\n/s;
assert(raw.test(m),'0.81.55 raw attendance block not found');
m=m.replace(raw,'\n');

// 사용되지 않는 구형 공지 위젯도 연결 공지만 사용하도록 정리합니다.
const old=`const connected=Array.isArray(readonlyCache?.notices)?readonlyCache.notices:[]; const local=workBoardData("notice").filter(workItemVisibleToCurrentUser); const rawSource=[...local,...(connected.length?connected:(state.gradeNotices||[]))]; const source=rawSource.filter(item=>String(item?.title||"").trim()!=="방학식 학생 안내 확인"); const rows=source.slice(0,4);`;
const next=`const connected=Array.isArray(readonlyCache?.notices)?readonlyCache.notices:[]; const local=[]; const source=connected.filter(item=>String(item?.title||"").trim()!=="방학식 학생 안내 확인"); const rows=source.slice(0,4);`;
assert(g.includes(old),'legacy dashboard notice source not found');g=g.replace(old,next);

assert(g.includes('const APP_VERSION = "0.81.56";'),'version marker');
assert(g.includes('return connected.filter(item=>{'),'notice single source marker');
assert(g.includes('passwordInputs.forEach'),'password marker');
assert(!m.includes('official-raw-'),'raw attendance rollback failed');
fs.writeFileSync(gFile,g,'utf8');fs.writeFileSync(mFile,m,'utf8');
console.log('UEP 0.81.56 dashboard recovery applied');
