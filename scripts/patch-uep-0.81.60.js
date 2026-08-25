const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const gFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}

// Version
g=g.replace(/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/,'const APP_VERSION = "0.81.60";');

// 1) 공결 대시보드 날짜: +1/-1 보정이 아니라, timezone이 명시된 ISO timestamp를
// generic YYYY-MM-DD 정규식보다 먼저 '학교 달력 날짜(Asia/Seoul)'로 해석합니다.
// 평범한 YYYY-MM-DD와 야자/지각 날짜는 기존 경로를 그대로 사용합니다.
const dateAnchor=`  const text=String(value).trim();\n`;
assert(g.includes(dateAnchor),'uepComparableDate text anchor not found');
const dateFix=`  const text=String(value).trim();
  // __UEP_08160_ISO_CALENDAR_DATE__
  if(/^20\\d{2}-\\d{2}-\\d{2}T.*(?:Z|[+-]\\d{2}:?\\d{2})$/i.test(text)){
    const instant=new Date(text);
    if(!Number.isNaN(instant.getTime())){
      const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant);
      const p=Object.fromEntries(parts.map(part=>[part.type,part.value]));
      if(p.year&&p.month&&p.day)return p.year+'-'+p.month+'-'+p.day;
    }
  }
`;
g=g.replace(dateAnchor,dateFix);

// 2) 학생 보호정보 비밀번호: 설정 권한과 입력/열람 권한을 분리합니다.
// 담임은 canRevealStudentProtection()으로 열람 가능하지만 비밀번호 자체 설정은 admin/grade_head만.
const setOld=`async function setSensitivePasswordFlow(){
  if(!canRevealStudentProtection())return toast('관리자·학년부장 권한에서 설정할 수 있습니다.');`;
assert(g.includes(setOld),'sensitive password set flow anchor not found');
const setNew=`function canConfigureSensitivePassword(){
  // __UEP_08160_SENSITIVE_CONFIG_ROLE__
  const role=String(currentRoleId?.()||'');
  return role==='admin'||role==='grade_head';
}
async function setSensitivePasswordFlow(){
  if(!canConfigureSensitivePassword())return toast('관리자·학년부장만 민감정보 비밀번호를 설정·변경할 수 있습니다.');`;
g=g.replace(setOld,setNew);

// 과목별 신청현황은 기존 subjectConfidentialAllowed()가 admin/grade_head만 설정 가능하고,
// 0.81.59 unlockSubjectConfidential()에서 담임 입력/열람만 허용합니다. 이 분리를 검증합니다.
assert(g.includes("return ['admin','grade_head'].includes(role)"),'subject password configure role must remain admin/grade_head');
assert(g.includes('__UEP_08159_HOMEROOM_SUBJECT_GATE__'),'homeroom subject unlock gate missing');

// 3) 학교업무 공지: 40_공지마감은 append-only 이력형 데이터입니다.
// 같은 공지ID의 여러 행을 그대로 표시하지 않고 최신 수정 행 1건만 유효 상태로 접습니다.
const noticeOld=`function directNoticeRows({activeOnly=true}={}){
  const todayKey=dateKey(today);
  const connected=(Array.isArray(readonlyCache?.notices)?readonlyCache.notices:[]).filter(connectedNoticeVisibleToCurrentUser);
  return connected.filter(item=>{`;
assert(g.includes(noticeOld),'directNoticeRows anchor not found');
const noticeNew=`function directNoticeRows({activeOnly=true}={}){
  const todayKey=dateKey(today);
  const source=(Array.isArray(readonlyCache?.notices)?readonlyCache.notices:[]);
  // __UEP_08160_NOTICE_LATEST_REVISION__
  const revisionTime=item=>String(item?.modifiedAt||item?.updatedAt||item?.['수정일시']||item?.postDate||item?.date||'');
  const byId=new Map();
  source.forEach((item,index)=>{
    const id=String(item?.id||item?.noticeId||item?.['공지ID']||'').trim()||('__row_'+index);
    const prev=byId.get(id);
    if(!prev||revisionTime(item)>=revisionTime(prev))byId.set(id,item);
  });
  const connected=[...byId.values()].filter(connectedNoticeVisibleToCurrentUser);
  return connected.filter(item=>{`;
g=g.replace(noticeOld,noticeNew);

// 4) 0.81.59의 담임 열람 게이트는 유지: 설정권한을 넓히지 않습니다.
assert(g.includes('__UEP_08159_HOMEROOM_SENSITIVE_GATE__'),'homeroom sensitive reveal gate missing');
assert(g.includes('if(!(await unlockSensitiveInfo()))return;'),'sensitive password unlock flow missing');

for(const marker of [
  'const APP_VERSION = "0.81.60";',
  '__UEP_08160_ISO_CALENDAR_DATE__',
  '__UEP_08160_SENSITIVE_CONFIG_ROLE__',
  '__UEP_08160_NOTICE_LATEST_REVISION__'
])assert(g.includes(marker),'missing 0.81.60 marker: '+marker);

fs.writeFileSync(gFile,g,'utf8');
console.log('UEP 0.81.60 dashboard date, password-role split, notice revision normalization applied');
