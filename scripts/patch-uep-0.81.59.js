const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const gFile=path.resolve(appRoot,'resources','app','gyomuon.js');
const dFile=path.resolve(appRoot,'resources','app','electron','google-data.cjs');
let g=fs.readFileSync(gFile,'utf8');
let d=fs.readFileSync(dFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}

// Version
g=g.replace(/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/,'const APP_VERSION = "0.81.59";');

// 1) 0.81.58에서 화면 비교 단계에 넣었던 UTC/KST 보정은 제거합니다.
// 날짜는 School Read 수집 단계에서 한 번만 표준화합니다.
const oldUiDateBlock=`  if(/^20\\d{2}-\\d{2}-\\d{2}T/.test(text)){
    const iso=new Date(text);
    if(!Number.isNaN(iso.getTime())){
      const kst=new Date(iso.getTime()+9*60*60*1000);
      return \`${'${kst.getUTCFullYear()}'}-${'${String(kst.getUTCMonth()+1).padStart(2,\'0\')}'}-${'${String(kst.getUTCDate()).padStart(2,\'0\')}'}\`;
    }
  }
`;
assert(g.includes(oldUiDateBlock),'0.81.58 UI date workaround not found');
g=g.replace(oldUiDateBlock,'');

// School Read가 Google Sheets DATE 셀을 ISO timestamp로 직렬화하는 경우,
// generic YYYY-MM-DD regex보다 먼저 spreadsheet local date(Asia/Seoul)로 환원합니다.
const localDateAnchor=`  const text = String(value).trim();\n  const match = text.match(/(\\d{4})[.\\-/년]\\s*(\\d{1,2})[.\\-/월]\\s*(\\d{1,2})/);`;
assert(d.includes(localDateAnchor),'google-data localDate anchor not found');
const localDateFix=`  const text = String(value).trim();
  // __UEP_08159_SCHOOL_READ_DATE_CANONICAL__
  if(/^\\d{4}-\\d{2}-\\d{2}T/.test(text)){
    const instant=new Date(text);
    if(!Number.isNaN(instant.getTime())){
      const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant);
      const p=Object.fromEntries(parts.map(part=>[part.type,part.value]));
      if(p.year&&p.month&&p.day)return p.year+'-'+p.month+'-'+p.day;
    }
  }
  const match = text.match(/(\\d{4})[.\\-/년]\\s*(\\d{1,2})[.\\-/월]\\s*(\\d{1,2})/);`;
d=d.replace(localDateAnchor,localDateFix);

// 2) 예술계열 연계오류가 실제 2개 과목 카드에도 연결되도록 subjects/terms를 제공합니다.
const artOld=`errors.push({student,type:'예술계열 연계오류',term:'2-1→2-2',severity:'오류',status:'확인 필요',subject:'예술 선택',detail:\`2학년 예술 선택 계열 불일치: 1학기 ${'${first}'} → 2학기 ${'${second}'} (동일 계열 선택 필요)\`});`;
assert(g.includes(artOld),'art continuity error object not found');
const artNew=`errors.push({student,type:'예술계열 연계오류',term:'2-1→2-2',terms:['2-1','2-2'],subjects:[first==='음악'?'음악 연주와 창작':'미술 창작',second==='음악'?'음악과 미디어':'미술과 매체'],severity:'오류',status:'확인 필요',subject:'예술 선택',detail:\`2학년 예술 선택 계열 불일치: 1학기 ${'${first}'} → 2학기 ${'${second}'} (동일 계열 선택 필요)\`});`;
g=g.replace(artOld,artNew);

// 3) 학생 신호 상세: 담임 역할명이 다르게 매핑된 경우에도 실제 담임반 배정이 있으면
// 비밀번호 인증 단계로 진입할 수 있게 합니다. 역할 자체는 승격하지 않습니다.
const signalOld=`function canRevealStudentProtection(){
  const role=currentRoleId();
  return role==="admin"||role==="grade_head"||role==="grade_manager"||role==="homeroom";
}`;
assert(g.includes(signalOld),'canRevealStudentProtection anchor not found');
const signalNew=`function canRevealStudentProtection(){
  const role=currentRoleId();
  if(role==="admin"||role==="grade_head"||role==="grade_manager"||role==="homeroom")return true;
  // __UEP_08159_HOMEROOM_SENSITIVE_GATE__
  const scope=typeof currentTeacherAccessScope==='function'?currentTeacherAccessScope():null;
  return Boolean(scope?.teacher&&scope?.classNo);
}`;
g=g.replace(signalOld,signalNew);

// 4) 과목별 신청현황: PIN 설정 권한은 관리자/학년부장 그대로 유지하고,
// 실제 담임은 열람 시에만 동일 비밀번호 인증을 받을 수 있게 합니다.
const subjectUnlockOld=`async function unlockSubjectConfidential(){
  if(!subjectConfidentialAllowed()){toast('관리자·학년부장만 과목별 신청현황을 열람할 수 있습니다.');return false;}
  if(sessionStorage.getItem(UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY)==='1')return true;`;
assert(g.includes(subjectUnlockOld),'unlockSubjectConfidential anchor not found');
const subjectUnlockNew=`async function unlockSubjectConfidential(){
  // __UEP_08159_HOMEROOM_SUBJECT_GATE__
  const scope=typeof currentTeacherAccessScope==='function'?currentTeacherAccessScope():null;
  const role=String(currentRoleId?.()||'');
  const homeroomAllowed=role==='homeroom'||Boolean(scope?.teacher&&scope?.classNo);
  if(!subjectConfidentialAllowed()&&!homeroomAllowed){toast('담임·학년부장·관리자는 비밀번호 인증 후 과목별 신청현황을 열람할 수 있습니다.');return false;}
  if(sessionStorage.getItem(UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY)==='1')return true;`;
g=g.replace(subjectUnlockOld,subjectUnlockNew);

assert(g.includes('const APP_VERSION = "0.81.59";'),'version marker missing');
assert(!g.includes('iso.getTime()+9*60*60*1000'),'old UI KST workaround still present');
assert(d.includes('__UEP_08159_SCHOOL_READ_DATE_CANONICAL__'),'school-read date marker missing');
assert(g.includes("terms:['2-1','2-2']")&&g.includes("subjects:[first==='음악'"),'art subject linkage missing');
assert(g.includes('__UEP_08159_HOMEROOM_SENSITIVE_GATE__'),'signal gate marker missing');
assert(g.includes('__UEP_08159_HOMEROOM_SUBJECT_GATE__'),'subject gate marker missing');

fs.writeFileSync(gFile,g,'utf8');
fs.writeFileSync(dFile,d,'utf8');
console.log('UEP 0.81.59 four fixes applied');
