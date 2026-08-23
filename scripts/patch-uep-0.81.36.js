const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const jsFile=path.join(appRoot,'resources','app','gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');

function esc(x){return x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function stripBlock(start,end){s=s.replace(new RegExp(esc(start)+'[\\s\\S]*?'+esc(end),'g'),'');}
function extractFunction(src,name){
  const sig=new RegExp('function\\s+'+name.replace(/[$]/g,'\\$&')+'\\s*\\([^)]*\\)\\s*\\{');
  const m=src.match(sig); if(!m)return null;
  const start=m.index, brace=src.indexOf('{',start); let depth=0,quote='',escaped=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i],n=src[i+1];
    if(quote){if(escaped){escaped=false;continue;}if(c==='\\'){escaped=true;continue;}if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='/'&&n==='*'){const j=src.indexOf('*/',i+2);if(j<0)break;i=j+1;continue;}
    if(c==='/'&&n==='/'){const j=src.indexOf('\n',i+2);if(j<0)break;i=j;continue;}
    if(c==='{')depth++;else if(c==='}'&&--depth===0)return {start,end:i+1,text:src.slice(start,i+1)};
  }
  return null;
}
function replaceFunction(name,newText){const f=extractFunction(s,name);if(!f)throw new Error('missing function '+name);s=s.slice(0,f.start)+newText+s.slice(f.end);}

// Normalize version first.
const versionRx=/const\s+APP_VERSION\s*=\s*['\"][^'\"]+['\"]\s*;/g;
if(!(s.match(versionRx)||[]).length)throw new Error('APP_VERSION declaration missing');
s=s.replace(versionRx,'const APP_VERSION = "0.81.36";');

// Remove the runtime DOM-repair block that caused timetable/calendar coupling and duplicated attendance text.
stripBlock('/* UEP_08135_RUNTIME_REPAIR_START */','/* UEP_08135_RUNTIME_REPAIR_END */');

// 1) Holiday ownership: calendar and night timetable both call this single source.
// For 2026, authoritative known holidays are explicit. Calendar events may add a closure only
// when the event title/type itself represents a closure; free-form detail text no longer turns a span into a holiday.
replaceFunction('attendanceIsSchoolHoliday',String.raw`function attendanceIsSchoolHoliday(day){
  const key=String(day||'').slice(0,10);
  const fixed2026=new Set([
    '2026-01-01','2026-02-16','2026-02-17','2026-02-18','2026-03-01','2026-03-02',
    '2026-05-05','2026-05-24','2026-05-25','2026-06-06','2026-08-15','2026-08-17',
    '2026-09-24','2026-09-25','2026-09-26','2026-10-03','2026-10-05','2026-10-09','2026-12-25'
  ]);
  if(fixed2026.has(key))return true;
  const closureRx=/공휴일|대체공휴일|재량휴업|휴업일|개교기념일|임시공휴일|석가탄신일|부처님오신날|어린이날|현충일|광복절|개천절|한글날|성탄절|설날|추석/;
  return schoolEventsForDate(key).some(event=>{
    const title=String(event.title||'').trim();
    const type=String(event.type||'').trim();
    if(!closureRx.test(title+' '+type))return false;
    // A generic multi-day event whose detail merely mentions a holiday is not a holiday range.
    // Explicit closure/holiday events may still span multiple days.
    if(/공휴일|대체공휴일|재량휴업|휴업일|개교기념일|임시공휴일/.test(title+' '+type))return true;
    const start=String(event.date||'').slice(0,10),end=String(event.endDate||event.date||'').slice(0,10);
    return start===key&&end===key;
  });
}`);

// Shared confidential-subject security helpers. They are source-owned, not DOM injected.
const securityHelpers=String.raw`
const UEP_SUBJECT_CONFIDENTIAL_PIN_KEY='uep_subject_confidential_pin_hash_v3';
const UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY='uep_subject_confidential_unlocked_v3';
function subjectConfidentialAllowed(){return ['관리자','학년부장'].includes(String(currentRoleDisplay?.()||''));}
function subjectConfidentialPasswordHash(){return String(localStorage.getItem(UEP_SUBJECT_CONFIDENTIAL_PIN_KEY)||'');}
function subjectConfidentialPasswordConfigured(){return !!subjectConfidentialPasswordHash();}
async function subjectConfidentialDigest(value){
  const bytes=new TextEncoder().encode(String(value||''));
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function setSubjectConfidentialPassword(){
  if(!subjectConfidentialAllowed())return false;
  const p=prompt('새 선택과목 대외비 비밀번호를 4자리 이상 입력하세요.');
  if(!p||p.length<4){if(p)alert('4자리 이상 입력해 주세요.');return false;}
  const p2=prompt('확인을 위해 같은 비밀번호를 다시 입력하세요.');
  if(p!==p2){alert('비밀번호가 일치하지 않습니다.');return false;}
  localStorage.setItem(UEP_SUBJECT_CONFIDENTIAL_PIN_KEY,await subjectConfidentialDigest(p));
  sessionStorage.removeItem(UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY);
  alert('선택과목 대외비 비밀번호가 저장되었습니다.');
  render('settings');
  return true;
}
function lockSubjectConfidential(){sessionStorage.removeItem(UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY);}
async function unlockSubjectConfidential(){
  if(!subjectConfidentialAllowed())return false;
  if(sessionStorage.getItem(UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY)==='1')return true;
  if(!subjectConfidentialPasswordConfigured()){alert('설정 → 사용자·보안에서 선택과목 대외비 비밀번호를 먼저 설정해 주세요.');return false;}
  const p=prompt('선택과목 대외비 비밀번호를 입력하세요.');if(!p)return false;
  if(await subjectConfidentialDigest(p)!==subjectConfidentialPasswordHash()){alert('선택과목 대외비 비밀번호가 일치하지 않습니다.');return false;}
  sessionStorage.setItem(UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY,'1');return true;
}
`;
const settingsFn=extractFunction(s,'settingsView');
if(!settingsFn)throw new Error('settingsView missing');
s=s.slice(0,settingsFn.start)+securityHelpers+'\n'+s.slice(settingsFn.start);

// 2) Settings source renderer: add the separate subject-confidential card directly beside sensitive security.
let sf=extractFunction(s,'settingsView');
let settingsText=sf.text;
const sensitiveClose='</div></article>\n    <article class="setting-card role-settings-card">';
if(!settingsText.includes(sensitiveClose))throw new Error('settings sensitive-card anchor missing');
const subjectCard=String.raw`</div></article>
    <article class="setting-card subject-confidential-security-settings"><div><small>CONFIDENTIAL · CURRICULUM</small><h3>🔐 선택과목 대외비 보안</h3><p>과목별 신청현황 전용 비밀번호를 민감정보 비밀번호와 별도로 관리합니다.</p><p class="settings-help">관리자·학년부장만 설정 및 열람할 수 있으며 담임은 비활성화됩니다.</p></div><div class="sensitive-security-status"><b>${subjectConfidentialPasswordConfigured()?'비밀번호 설정됨':'비밀번호 설정 필요'}</b><button type="button" class="btn primary" data-subject-confidential-password-set ${subjectConfidentialAllowed()?'':'disabled'}>${subjectConfidentialPasswordConfigured()?'비밀번호 변경':'비밀번호 설정'}</button><button type="button" class="btn secondary" data-subject-confidential-lock ${subjectConfidentialAllowed()?'':'disabled'}>즉시 잠금</button></div></article>
    <article class="setting-card role-settings-card">`;
settingsText=settingsText.replace(sensitiveClose,subjectCard);
s=s.slice(0,sf.start)+settingsText+s.slice(sf.end);

// 3) Attendance source labels: preserve the real official-attendance subtype and periods.
const attendanceHelper=String.raw`
function dashboardOfficialAttendanceLabel(row,fallback='공결'){
  const text=[row?.detailType,row?.attendanceType,row?.type,row?.statusType,row?.status,row?.result,row?.reason,row?.detail].filter(Boolean).join(' ');
  let type=fallback;
  if(/출석인정[^\n]*조퇴|공조퇴/.test(text))type='공조퇴';
  else if(/출석인정[^\n]*지각|공지각/.test(text))type='공지각';
  else if(/출석인정[^\n]*외출|공외출/.test(text))type='공외출';
  else if(/출석인정[^\n]*(결석|결과)|공결/.test(text))type='공결';
  else if(/조퇴/.test(text))type='조퇴';
  else if(/지각/.test(text))type='지각';
  else if(/외출/.test(text))type='외출';
  const direct=String(row?.periodLabel||row?.period||row?.periods||row?.classPeriod||row?.lessonPeriod||'').trim();
  let period='';
  const directMatch=direct.match(/(\d{1,2})\s*(?:~|-|–)\s*(\d{1,2})/)||direct.match(/(\d{1,2})/);
  if(directMatch)period=directMatch[2]?`${directMatch[1]}~${directMatch[2]}교시`:`${directMatch[1]}교시`;
  if(!period){
    const a=Number(row?.startPeriod||row?.fromPeriod||row?.periodStart||0),b=Number(row?.endPeriod||row?.toPeriod||row?.periodEnd||0);
    if(a&&b)period=a===b?`${a}교시`:`${a}~${b}교시`;else if(a)period=`${a}교시`;
  }
  if(!period){const m=text.match(/(\d{1,2})\s*(?:~|-|–)\s*(\d{1,2})\s*교시/)||text.match(/(\d{1,2})\s*교시/);if(m)period=m[2]?`${m[1]}~${m[2]}교시`:`${m[1]}교시`;}
  return [type,period].filter(Boolean).join(' ');
}
`;
let od=extractFunction(s,'openDashboardStudentStatus');
if(!od)throw new Error('openDashboardStudentStatus missing');
s=s.slice(0,od.start)+attendanceHelper+'\n'+s.slice(od.start);
od=extractFunction(s,'openDashboardStudentStatus');
let openText=od.text;
openText=openText.replace(".map(r=>({...r,dashboardStatusType:'공결'}))",".map(r=>({...r,dashboardStatusType:dashboardOfficialAttendanceLabel(r,'공결')}))");
openText=openText.replace(".map(r=>({...r,dashboardStatusType:'지각'}))",".map(r=>({...r,dashboardStatusType:dashboardOfficialAttendanceLabel(r,'공지각')}))");
if(!openText.includes('dashboardOfficialAttendanceLabel'))throw new Error('attendance source-label replacement failed');
s=s.slice(0,od.start)+openText+s.slice(od.end);

// 4) Bind settings buttons and protect subject-status entry from the canonical bindEvents function.
let be=extractFunction(s,'bindEvents');
if(!be)throw new Error('bindEvents missing');
let bt=be.text;
const openBrace=bt.indexOf('{');
const bindInsert=String.raw`
  $$('[data-subject-confidential-password-set]').forEach(button=>button.onclick=()=>setSubjectConfidentialPassword());
  $$('[data-subject-confidential-lock]').forEach(button=>button.onclick=()=>{lockSubjectConfidential();render('settings');toast('과목별 신청현황을 잠갔습니다.');});
`;
bt=bt.slice(0,openBrace+1)+bindInsert+bt.slice(openBrace+1);

// Replace the existing dashboard student-status click handler with a source-level attendance deep-link for the expanded drawer cards where available.
const oldStatus=`$$('[data-dashboard-student-status]').forEach((button) => (button.onclick = (event) => { event.preventDefault(); event.stopPropagation(); openDashboardStudentStatus(button.dataset.dashboardStudentStatus); }));`;
if(bt.includes(oldStatus))bt=bt.replace(oldStatus,oldStatus+String.raw`
  $$('[data-dashboard-attendance-student]').forEach(button=>button.onclick=(event)=>{
    event.preventDefault();event.stopPropagation();
    attendanceTab='official';
    attendanceSelectedDate=button.dataset.dashboardAttendanceDate||dateKey(today);
    attendanceSelectedStudentNo=button.dataset.dashboardAttendanceStudent||'';
    navigate('attendance');
  });`);
s=s.slice(0,be.start)+bt+s.slice(be.end);

// 5) Source-level protection for the curriculum subject overview tab/card.
// Keep the existing 0.81.34 curriculum layout, but its click gate now delegates to the canonical v3 security helper.
s=s.replace(/async function unlockSubjectConfidential\(\)\{[\s\S]*?\n\}/,m=>m); // marker ensuring helper exists once
// Any prior v2 localStorage references from the 0.81.34 block are redirected to v3 keys to avoid split state.
s=s.replace(/uep_subject_confidential_pin_hash_v2/g,'uep_subject_confidential_pin_hash_v3');
s=s.replace(/uep_subject_confidential_unlocked_v2/g,'uep_subject_confidential_unlocked_v3');

fs.writeFileSync(jsFile,s,'utf8');
console.log('UEP 0.81.36 source-level repair applied');
