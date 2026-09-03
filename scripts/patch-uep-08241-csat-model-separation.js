const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const app=path.join(root,'resources','app');
const gp=path.join(app,'gyomuon.js');
const mp=path.join(app,'electron','main.cjs');
const pp=path.join(app,'package.json');
let g=fs.readFileSync(gp,'utf8');
let m=fs.readFileSync(mp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.40["'];/.test(g),'0.82.40 base not found');
must(m.includes("data.admissionMinimums=uep08210MatrixObjects(matrices['54_수능최저DB']);"),'raw overwrite root cause not found');
must(m.includes("data['54_수능최저DB']=data.admissionMinimums;"),'54 raw alias root cause not found');
const dashboardNeedle="dashboardAdmissionRows('admissionMinimums','54_수능최저DB')";
const dashboardCount=g.split(dashboardNeedle).length-1;
must(dashboardCount>0,'dashboard raw minimum calls not found');

// Version bump only after exact structural root cause is verified.
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.40["'];/,()=> 'const APP_VERSION = "0.82.41";')
   .replace(/const CURRENT='0\.82\.40';/g,()=>"const CURRENT='0.82.41';");
if(fs.existsSync(pp)){
  const p=JSON.parse(fs.readFileSync(pp,'utf8'));
  p.version='0.82.41';
  fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');
}

// Keep parseGoogleSheetData()'s canonical normalized admissionMinimums intact.
// The newer admissions dashboard receives the Korean-header live rows through a distinct raw model.
m=m.replace(
  "data.admissionMinimums=uep08210MatrixObjects(matrices['54_수능최저DB']);",
  "data.admissionMinimumRows=uep08210MatrixObjects(matrices['54_수능최저DB']);"
).replace(
  "data['54_수능최저DB']=data.admissionMinimums;",
  "data['54_수능최저DB']=data.admissionMinimumRows;"
);

// Dashboard university detail must explicitly consume the raw Korean-header model.
// Core CSAT-minimum calculation continues to consume readonlyCache.admissionMinimums (normalized model).
g=g.split(dashboardNeedle).join("dashboardAdmissionRows('admissionMinimumRows','54_수능최저DB')");

// Release notes only; no runtime wrapper or post-render repair.
g += `\n/* UEP_08241_RELEASE_NOTES */\n(function(){const VERSION='0.82.41',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08241'))return;const o=document.createElement('div');o.id='uep-release-08241';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.41 수정사항</h2><ul><li>수능최저 계산용 정규화 데이터와 대학 상세용 원본 데이터를 서로 다른 모델로 분리했습니다.</li><li>3·6·9월 모의고사 수능최저 판정이 54_수능최저DB의 정규화 필드를 다시 사용합니다.</li><li>오늘의 대학 상세는 기존처럼 54번 DB의 원본 세부정보를 그대로 사용합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900);})();\n`;

must(!m.includes("data.admissionMinimums=uep08210MatrixObjects(matrices['54_수능최저DB']);"),'raw overwrite still present');
must(m.includes("data.admissionMinimumRows=uep08210MatrixObjects(matrices['54_수능최저DB']);"),'separate raw model missing');
must(m.includes("data['54_수능최저DB']=data.admissionMinimumRows;"),'raw sheet alias missing');
must(!g.includes(dashboardNeedle),'dashboard still asks canonical normalized model as raw');
must((g.split("dashboardAdmissionRows('admissionMinimumRows','54_수능최저DB')").length-1)===dashboardCount,'dashboard raw call count changed unexpectedly');
must(g.includes('readonlyCache?.admissionMinimums'),'core normalized minimum consumer missing');

fs.writeFileSync(mp,m,'utf8');
fs.writeFileSync(gp,g,'utf8');
console.log(`UEP 0.82.41 CSAT model separation patched; dashboard raw calls=${dashboardCount}`);
