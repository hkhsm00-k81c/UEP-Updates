const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'gyomuon.js');
const pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.64["'];/.test(g),'0.82.64 renderer base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.64["'];/,'const APP_VERSION = "0.82.65";').replace(/const CURRENT='0\.82\.64';/g,"const CURRENT='0.82.65';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.65';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// UEP 0.82.65: 대시보드 야간시간표도 canonical 실제 차시 경로를 사용한다.
// 0.82.64까지는 readonlyCache.programs를 직접 읽어 강좌 마스터(시작일)와 실제 차시가
// 같은 월/화 시작일에 함께 카드로 렌더링될 수 있었다.
const oldFn=`function dashboardAfterProgramsForDay(dayKey){
  return (readonlyCache?.programs||[]).map(programWithOverride).filter(program=>{
    const text=\`${'${program.kind||""} ${program.programType||""} ${program.afterType||""} ${program.type||""} ${program.title||""}'}\`;
    const isAfter=/방과후|야간심화|심화수업/.test(text)||String(program.kind||"").toLowerCase()==="after";
    const pday=String(program.date||program.sessionDate||program.operationDate||"").slice(0,10);
    return isAfter&&programHasNightStudyImpact(program)&&pday===dayKey&&!/취소|휴강|결강/.test(String(program.status||program.operationState||""));
  });
}`;
const newFn=`function dashboardAfterProgramsForDay(dayKey){
  // 일정 표시는 강좌 마스터가 아니라 실제 차시만 사용한다.
  // afterSchoolProgramGroups()가 12_차시일정/실제 일정과 과거 출결 fallback을 단일화한다.
  const canonical=typeof afterSchoolProgramGroups==="function"?afterSchoolProgramGroups():[];
  const seen=new Set();
  return canonical.filter(program=>{
    if(!program||program.kind!=="after"||program.isCourseMaster) return false;
    const pday=String(program.date||program.sessionDate||program.operationDate||"").slice(0,10);
    if(pday!==dayKey||!programHasNightStudyImpact(program)||/취소|휴강|결강|폐강|미운영/.test(String(program.status||program.operationState||program.sessionStatus||""))) return false;
    const session=String(program.sessionId||"").trim();
    const course=String(program.courseId||program.programId||program.id||"").replace(/^after-(?:course|master|session)-/,"").trim();
    const slot=typeof dashboardProgramNightSlot==="function"?dashboardProgramNightSlot(program):String(program.time||"");
    const title=String(program.actualTitle||program.title||program.type||"").replace(/\\s/g,"").trim();
    const key=session?\`session|\${session}\`:[course,pday,slot,title].join("|");
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}`;
must(g.includes(oldFn),'dashboardAfterProgramsForDay 0.82.64 block not found');
g=g.replace(oldFn,newFn);

// One-time changelog popup.
g += `\n/* UEP_08265_DASHBOARD_NIGHT_ACTUAL_SESSIONS */\n(function(){const VERSION='0.82.65',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08265'))return;const o=document.createElement('div');o.id='uep-release-08265';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.65 수정사항</h2><ul><li>대시보드 야간시간표에서 방과후·야간심화 강좌 마스터가 실제 차시와 함께 중복 표시되던 문제를 수정했습니다.</li><li>주간 야간시간표도 실제 차시 일정만 표시하도록 프로그램 일정 원본을 통일했습니다.</li><li>자습 인원과 야자출결 집계 기준은 그대로 유지합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY)==='shown';localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;

must(g.includes('UEP_08265_DASHBOARD_NIGHT_ACTUAL_SESSIONS'),'0.82.65 marker missing');
must(g.includes('const canonical=typeof afterSchoolProgramGroups==="function"?afterSchoolProgramGroups():[];'),'canonical dashboard source missing');
must(!g.includes(oldFn),'old dashboard direct-cache function remains');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.65 dashboard night actual sessions patched');
