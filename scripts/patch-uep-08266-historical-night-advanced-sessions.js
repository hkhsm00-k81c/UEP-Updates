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

const programTypeLine='      const programType=String(session["프로그램유형"]||"").trim();';
const strictReturn='      return programType==="방과후학교" && Boolean(effectiveDate) && session.__date===effectiveDate;';
must(d.includes(programTypeLine),'programType line not found');
must(d.includes(strictReturn),'strict after-school return not found');

d=d.replace(programTypeLine,`${programTypeLine}\n      const parentRow=afterMasterById.get(session.__programId)||{};\n      const parentType=\`${'${'}parentRow["방과후유형"]||""} ${'${'}parentRow["운영기간구분"]||""} ${'${'}parentRow["프로그램명"]||parentRow["강좌명"]||""}\`.trim();`);
d=d.replace(strictReturn,'      const supportedAfterSession=programType==="방과후학교"||/야간심화/.test(programType)||/야간심화/.test(parentType);\n      return supportedAfterSession && Boolean(effectiveDate) && session.__date===effectiveDate;');

// One-time changelog popup.
g += `\n/* UEP_08266_HISTORICAL_NIGHT_ADVANCED_SESSIONS */\n(function(){const VERSION='0.82.66',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08266'))return;const o=document.createElement('div');o.id='uep-release-08266';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.66 수정사항</h2><ul><li>과거 야간심화수업의 12_차시일정을 정식 실제 차시로 인식하도록 수정했습니다.</li><li>강좌 마스터·야자출결 파생자료 대신 실제 차시를 우선하여 중복 표시를 제거합니다.</li><li>현재 방과후학교 일정과 야자출결 집계 기준은 변경하지 않습니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;

must(d.includes('supportedAfterSession'),'night advanced session support missing');
must(d.includes('/야간심화/.test(parentType)'),'parent night advanced recognition missing');
must(g.includes('function dashboardAfterProgramsForDay(dayKey)')&&g.includes('afterSchoolProgramGroups()'),'0.82.65 canonical weekly-night renderer path missing');
fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(dp,d,'utf8');
console.log('UEP 0.82.66 historical night advanced session loader patched');
