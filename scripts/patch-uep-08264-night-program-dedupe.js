const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'gyomuon.js');
const pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.63["'];/.test(g),'0.82.63 renderer base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.63["'];/,'const APP_VERSION = "0.82.64";').replace(/const CURRENT='0\.82\.63';/g,"const CURRENT='0.82.64';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.64';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// UEP 0.82.64: 야간 프로그램 일정의 단일 원본화.
// 실제 프로그램/차시(readonlyCache.programs)를 우선하고, 30_야자출결_정규화 파생 일정은
// 해당 날짜·타임에 실제 차시가 없을 때만 fallback으로 사용한다.
const start=g.indexOf('function afterSchoolProgramGroups() {');
const end=g.indexOf('function groupedAfterSchoolCourses(items) {',start);
must(start>=0&&end>start,'afterSchoolProgramGroups block not found');
const newAfterSchoolProgramGroups=`function afterSchoolProgramGroups() {
  const connected = (readonlyCache?.programs || []).map(programWithOverride).filter((program) => program.kind === "after").map((program) => ({...program, reportRequired:false}));
  const rows = (readonlyCache?.afterSchoolAttendance || []).slice();
  const groups = new Map();
  rows.forEach((row) => {
    const type = String(row.type || "방과후 프로그램").trim() || "방과후 프로그램";
    const time = String(row.time || row.period || "").trim();
    const key = [row.date || "", type, time].join("|");
    if (!groups.has(key)) groups.set(key, { key, id: \`after-\${encodeURIComponent(key)}\`, date: row.date || "", title: type, actualTitle: type, recordTitle: type, time: time || "시간 미등록", place: row.detail || "운영정보 확인", teacher: "", records: [], kind: "after", reportRequired: false, affectsAttendance: /오후자습/.test(type), source:"30_야자출결_정규화" });
    groups.get(key).records.push(row);
  });
  const derived = [...groups.values()].map((program) => {
    const seen = new Set();
    program.students = program.records.filter((row) => {
      const key = attendanceStudentKey(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    program.attendedCount = program.students.filter(nightRecordIsAttendance).length;
    return program;
  });

  const cleanId=value=>String(value||"").replace(/^after-(?:course|master|session)-/,"").trim();
  const courseKey=program=>cleanId(program?.courseId||program?.programId||program?.id||"");
  const slotKey=program=>{
    const named=typeof nightSlotName==="function"?nightSlotName(program):"";
    if(["오후자습","야자1","야자2"].includes(named)) return named;
    return String(program?.time||program?.period||"").replace(/\\s/g,"").trim()||"시간미등록";
  };
  const eventKey=program=>{
    const sid=cleanId(program?.sessionId||"");
    if(sid) return \`session|\${sid}\`;
    const course=courseKey(program);
    const date=String(program?.date||"").slice(0,10);
    const slot=slotKey(program);
    const title=String(program?.actualTitle||program?.title||program?.type||"").replace(/\\s/g,"").trim();
    return ["event",course,date,slot,title].join("|");
  };

  // 강좌 마스터와 실제 차시가 함께 들어온 경우 차시가 일정의 원본이다.
  const sessionCourseKeys=new Set(connected.filter(program=>!program.isCourseMaster).map(courseKey).filter(Boolean));
  const canonicalConnected=[];
  const seenConnected=new Set();
  connected.forEach(program=>{
    if(program.isCourseMaster&&courseKey(program)&&sessionCourseKeys.has(courseKey(program))) return;
    const key=eventKey(program);
    if(seenConnected.has(key)) return;
    seenConnected.add(key);
    canonicalConnected.push(program);
  });

  // 실제 차시가 존재하는 날짜·타임에서는 출결 정규화 행으로 두 번째 일정 카드를 만들지 않는다.
  const connectedCoverage=new Set(canonicalConnected.filter(program=>!program.isCourseMaster&&program.date).map(program=>\`\${String(program.date).slice(0,10)}|\${slotKey(program)}\`));
  const canonicalDerived=derived.filter(program=>!connectedCoverage.has(\`\${String(program.date||"").slice(0,10)}|\${slotKey(program)}\`));

  return [...canonicalConnected, ...canonicalDerived].sort((a,b) => String(b.date).localeCompare(String(a.date)) || String(a.title).localeCompare(String(b.title)));
}
`;
g=g.slice(0,start)+newAfterSchoolProgramGroups+g.slice(end);

// 야자출결 월간 판정: after 일정은 canonical afterSchoolProgramGroups 한 경로만 통과시킨다.
const oldMonth='const programs=[...(readonlyCache?.programs||[]).map(programWithOverride),...(typeof afterSchoolProgramGroups==="function"?afterSchoolProgramGroups():[])];';
const newMonth='const programs=[...(readonlyCache?.programs||[]).map(programWithOverride).filter(program=>program?.kind!=="after"),...(typeof afterSchoolProgramGroups==="function"?afterSchoolProgramGroups():[])];';
must(g.includes(oldMonth),'night month programs merge anchor not found');
g=g.replace(oldMonth,newMonth);

// 학생별 야간 참여 판정도 동일하게 after 일정의 이중 합류를 제거한다.
const oldParticipation='const connected = readonlyCache?.programs || [];\n  const derived = typeof afterSchoolProgramGroups === "function" ? afterSchoolProgramGroups() : [];';
const newParticipation='const connected = (readonlyCache?.programs || []).filter(program=>program?.kind!=="after");\n  const derived = typeof afterSchoolProgramGroups === "function" ? afterSchoolProgramGroups() : [];';
must(g.includes(oldParticipation),'programParticipationFor merge anchor not found');
g=g.replace(oldParticipation,newParticipation);

// One-time changelog popup.
g += `\n/* UEP_08264_NIGHT_PROGRAM_CANONICAL_DEDUPE */\n(function(){const VERSION='0.82.64',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08264'))return;const o=document.createElement('div');o.id='uep-release-08264';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.64 수정사항</h2><ul><li>방과후학교와 야간심화수업이 같은 날짜·시간에 두 번 표시되던 일정 중복을 수정했습니다.</li><li>실제 차시 일정을 우선하고 야자출결 정규화 자료는 일정이 없는 과거 기록의 보조 자료로만 사용합니다.</li><li>야자출결 연계와 학생별 참여 판정은 기존 기준을 유지합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;

must(g.includes('UEP_08264_NIGHT_PROGRAM_CANONICAL_DEDUPE'),'0.82.64 marker missing');
must(g.includes('connectedCoverage'),'canonical connected coverage missing');
must(!g.includes(oldMonth),'old double after merge still present');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.64 canonical night program dedupe patched');
