const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'gyomuon.js');
const dp=path.join(root,'electron','google-data.cjs');
const pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
let d=fs.readFileSync(dp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.65["'];/.test(g),'0.82.65 renderer base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.65["'];/,'const APP_VERSION = "0.82.66";').replace(/const CURRENT='0\.82\.65';/g,"const CURRENT='0.82.66';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.66';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

const old=`      const programType=String(session["프로그램유형"]||"").trim();
      const actualDate=localDate(session["실제수업일"]||"");
      const plannedDate=localDate(session["운영일자"]||session["예정일"]||"");
      const effectiveDate=actualDate||plannedDate||session.__date;
      // UEP 0.82.31: 미래 '예정' 차시도 월별 일정과 당일 대시보드에 사용한다.
      // 실제수업일이 기록되면 이를 최우선으로 쓰고, 없으면 운영일자/예정일을 사용한다.
      // 반복요일을 추정하지 않고 12_차시일정에 명시된 날짜 행만 인정한다.
      return programType==="방과후학교" && Boolean(effectiveDate) && session.__date===effectiveDate;`;
const neu=`      const programType=String(session["프로그램유형"]||"").trim();
      const parentRow=afterMasterById.get(session.__programId)||{};
      const parentType=\`${'${'}parentRow["방과후유형"]||""} ${'${'}parentRow["운영기간구분"]||""} ${'${'}parentRow["프로그램명"]||parentRow["강좌명"]||""}\`.trim();
      const actualDate=localDate(session["실제수업일"]||"");
      const plannedDate=localDate(session["운영일자"]||session["예정일"]||"");
      const effectiveDate=actualDate||plannedDate||session.__date;
      // 실제 차시의 유형 표기가 비어 있거나 '야간심화'인 과거 자료도 부모 강좌 유형을 확인해 정식 차시로 인정한다.
      // 12_차시일정에 명시된 날짜만 사용하며 반복요일 추정은 하지 않는다.
      const supportedAfterSession=programType==="방과후학교"||/야간심화/.test(programType)||/야간심화/.test(parentType);
      return supportedAfterSession && Boolean(effectiveDate) && session.__date===effectiveDate;`;
must(d.includes(old),'strict after-school session filter anchor not found');
d=d.replace(old,neu);

// One-time changelog popup.
g += `\n/* UEP_08266_HISTORICAL_NIGHT_ADVANCED_SESSIONS */\n(function(){const VERSION='0.82.66',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08266'))return;const o=document.createElement('div');o.id='uep-release-08266';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.66 수정사항</h2><ul><li>과거 야간심화수업의 12_차시일정을 정식 실제 차시로 인식하도록 수정했습니다.</li><li>강좌 마스터·야자출결 파생자료 대신 실제 차시를 우선하여 중복 표시를 제거합니다.</li><li>현재 방과후학교 일정과 야자출결 집계 기준은 변경하지 않습니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;

must(d.includes('supportedAfterSession'),'night advanced session support missing');
must(d.includes('/야간심화/.test(parentType)'),'parent night advanced recognition missing');
must(g.includes('function dashboardAfterProgramsForDay(dayKey)')&&g.includes('afterSchoolProgramGroups()'),'0.82.65 canonical weekly-night renderer path missing');
fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(dp,d,'utf8');
console.log('UEP 0.82.66 historical night advanced session loader patched');
