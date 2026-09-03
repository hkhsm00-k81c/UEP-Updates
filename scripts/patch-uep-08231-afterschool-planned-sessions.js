const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const dp=path.join(root,'resources','app','electron','google-data.cjs');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
let d=fs.readFileSync(dp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.30["'];/.test(g),'0.82.30 renderer base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.30["'];/,'const APP_VERSION = "0.82.31";').replace(/const CURRENT='0\.82\.30';/g,"const CURRENT='0.82.31';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.31';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// 12_차시일정: 미래 예정 차시도 프로그램 캐시에 생성한다.
// 날짜 우선순위는 실제수업일 > 운영일자 > 예정일이며, sessionRows.__date가 이미 이 순서로 정규화되어 있다.
const oldSessionFilter=`      const programType=String(session["프로그램유형"]||"").trim();
      const actualDate=localDate(session["실제수업일"]||"");
      // 방과후·야간심화는 실제 수업일 엑셀에서 생성된 차시만 사용한다.
      // 기간 내 반복요일을 추정하지 않고 실제 수업일이 확정된 행만 인정한다.
      return programType==="방과후학교" && Boolean(actualDate) && session.__date===actualDate;`;
const newSessionFilter=`      const programType=String(session["프로그램유형"]||"").trim();
      const actualDate=localDate(session["실제수업일"]||"");
      const plannedDate=localDate(session["운영일자"]||session["예정일"]||"");
      const effectiveDate=actualDate||plannedDate||session.__date;
      // UEP 0.82.31: 미래 '예정' 차시도 월별 일정과 당일 대시보드에 사용한다.
      // 실제수업일이 기록되면 이를 최우선으로 쓰고, 없으면 운영일자/예정일을 사용한다.
      // 반복요일을 추정하지 않고 12_차시일정에 명시된 날짜 행만 인정한다.
      return programType==="방과후학교" && Boolean(effectiveDate) && session.__date===effectiveDate;`;
must(d.includes(oldSessionFilter),'afterschool actual-date-only filter anchor not found');
d=d.replace(oldSessionFilter,newSessionFilter);

// 미래 차시는 출석확정 여부와 무관하게 일정으로 존재한다. 취소성 상태만 제외한다.
d=d.replace('const activeSessionStatus = (status) => !/결강|휴강|취소/.test(String(status || ""));','const activeSessionStatus = (status) => !/결강|휴강|취소|폐강|일정확인필요/.test(String(status || ""));');

// 오늘의 프로그램: 강좌 마스터가 아니라 당일 실제 차시 행만 사용하고, connected/derived 중복을 제거한다.
const oldToday=`function todayProgramCollections(){   const todayKey=dateKey(today);   const connected=(readonlyCache?.programs||[]).map(programWithOverride).filter(program=>program.date===todayKey&&!isWholeSchoolCommonActivity(program));   const connectedKeys=new Set(connected.map(program=>\`${'${program.date}|${program.title}|${program.time}'}\`));   const local=(Array.isArray(state.programs)?state.programs:[]).filter(p=>p&&p.date===todayKey&&!connectedKeys.has(\`${'${p.date}|${p.title}|${p.time}'}\`)).map(p=>({...p,kind:"general",source:"이 PC 로컬"}));   const afterGroups=afterSchoolProgramGroups().filter(p=>p.date===todayKey);`;
const newToday=`function todayProgramCollections(){   const todayKey=dateKey(today);   const connected=(readonlyCache?.programs||[]).map(programWithOverride).filter(program=>program.date===todayKey&&!isWholeSchoolCommonActivity(program)&&!(program.kind==="after"&&program.isCourseMaster));   const connectedKeys=new Set(connected.map(program=>\`${'${program.date}|${program.title}|${program.time}'}\`));   const local=(Array.isArray(state.programs)?state.programs:[]).filter(p=>p&&p.date===todayKey&&!connectedKeys.has(\`${'${p.date}|${p.title}|${p.time}'}\`)).map(p=>({...p,kind:"general",source:"이 PC 로컬"}));   const afterGroups=afterSchoolProgramGroups().filter(p=>p.date===todayKey&&!p.isCourseMaster&&!connectedKeys.has(\`${'${p.date}|${p.title}|${p.time}'}\`));`;
must(g.includes(oldToday),'todayProgramCollections anchor not found');
g=g.replace(oldToday,newToday);

// 프로그램 홈의 TODAY도 그룹 강좌 날짜가 아니라 차시 행을 사용한다.
const oldHome='const todayPrograms=[...commonMonth,...selectedMonth,...afterMonth].filter(p=>p.date===todayKey&&!isWholeSchoolCommonActivity(p));';
const newHome='const todayAfterSessions=afterSessions.filter(p=>p&&p.kind==="after"&&!p.isCourseMaster&&p.date===todayKey&&!/일정확인필요|취소|휴강|폐강|결강/.test(String(p.status||p.operationStatus||"")));     const todayPrograms=[...commonMonth,...selectedMonth,...todayAfterSessions].filter(p=>p.date===todayKey&&!isWholeSchoolCommonActivity(p));';
must(g.includes(oldHome),'program hub TODAY anchor not found');
g=g.replace(oldHome,newHome);

// 안내 문구를 실제 동작과 일치시킨다.
g=g.replace('11_방과후학교의 강좌, 12_차시일정의 실제수업일·야자영향타임, 13_출석부의 학생 등록이 모두 일치한 경우에만 표시됩니다.','11_방과후학교의 강좌, 12_차시일정의 실제수업일(있으면) 또는 운영일자·예정일, 13_출석부의 학생 등록을 연결해 표시합니다.');
g=g.replace('<div><b>실제 수업일</b><span>${escapeHtml(program.date || "-")} ${escapeHtml(weekdayLabelFromKey(program.date,true))}</span></div>','<div><b>${program.status==="예정"?"예정 수업일":"실제 수업일"}</b><span>${escapeHtml(program.date || "-")} ${escapeHtml(weekdayLabelFromKey(program.date,true))}</span></div>');

// One-time changelog popup.
g += `\n/* UEP_08231_AFTER_SCHOOL_PLANNED_SESSIONS */\n(function(){const VERSION='0.82.31',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08231'))return;const o=document.createElement('div');o.id='uep-release-08231';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.31 수정사항</h2><ul><li>방과후학교의 미래 예정 차시도 월별 차시 카드에 미리 표시됩니다.</li><li>12_차시일정 날짜는 실제수업일을 우선하고, 비어 있으면 운영일자·예정일을 사용합니다.</li><li>대시보드 오늘의 프로그램에는 오늘 예정된 방과후 차시가 자동 표시됩니다.</li><li>강좌 마스터 중복 노출은 막고 취소·휴강·폐강·결강 차시는 오늘 일정에서 제외합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;

must(d.includes('UEP 0.82.31')&&d.includes('effectiveDate'),'planned-session parser patch missing');
must(g.includes('UEP_08231_AFTER_SCHOOL_PLANNED_SESSIONS'),'release marker missing');
must(g.includes('todayAfterSessions'),'program hub planned-session today bridge missing');
fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(dp,d,'utf8');
console.log('UEP 0.82.31 afterschool planned sessions patched');
