const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
must(/const\s+APP_VERSION\s*=\s*["']0\.82\.28["'];/.test(g),'0.82.28 base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.28["'];/,'const APP_VERSION = "0.82.29";').replace(/const CURRENT='0\.82\.28';/g,"const CURRENT='0.82.29';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.29';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// 1) Combined-score dashboard still used its own arithmetic scoreAverage().
const oldScoreAverage=`function scoreAverage(rows) {
  const values = rows.filter((row) => row.level !== "" && row.level !== null && row.level !== undefined).map((row) => Number(row.level)).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}`;
must(g.includes(oldScoreAverage),'scoreAverage simple-average function not found');
const newScoreAverage=`function scoreAverage(rows) {
  return uepCommonWeightedAverage(rows,row=>Number(row.level));
}`;
g=g.replace(oldScoreAverage,newScoreAverage);

// Semester cells inside the combined dashboard also had a separate arithmetic path.
const oldSemester=`const semesterCells=semesterSlots.map(slot=>{const values=semesterAverages.get(slot)||[];const average=values.length?(values.reduce((a,b)=>a+b,0)/values.length).toFixed(2):"-";return \`<span><b>\${slot}</b><em>\${average}</em></span>\`;}).join("");`;
if(g.includes(oldSemester)){
  const newSemester=`const semesterCells=semesterSlots.map(slot=>{const rowsForSlot=semesterSource.filter(row=>{const year=Number(row.schoolYear);const grade=Number.isFinite(year)?Math.max(1,Math.min(3,year-firstYear+1)):1;const sem=String(row.semester||"1").match(/[12]/)?.[0]||"1";return \`\${grade}-\${sem}\`===slot;});const weighted=uepCommonWeightedAverage(rowsForSlot,row=>Number(row.level));const average=Number.isFinite(weighted)?weighted.toFixed(2):"-";return \`<span><b>\${slot}</b><em>\${average}</em></span>\`;}).join("");`;
  g=g.replace(oldSemester,newSemester);
}

// 2) Student personal dashboard used cached live.scoreSummary, whose internalAverage is still arithmetic.
const oldSummary=`const scoreSummary=live.scoreSummary||{}, bundle=studentRecordBundle(live), attendance=studentAttendanceDetails(live);`;
must(g.includes(oldSummary),'student dashboard scoreSummary anchor not found');
const newSummary=`const cachedScoreSummary=live.scoreSummary||{};
  let weightedStudentBase=null;try{weightedStudentBase=admissionBase(live.id);}catch{}
  const scoreSummary={...cachedScoreSummary,internalAverage:weightedStudentBase?.avg5==null?cachedScoreSummary.internalAverage:Number(weightedStudentBase.avg5).toFixed(2),internalExam:weightedStudentBase?.preferred||cachedScoreSummary.internalExam};
  const bundle=studentRecordBundle(live), attendance=studentAttendanceDetails(live);`;
g=g.replace(oldSummary,newSummary);

g += `\n/* UEP_08229_REMAINING_WEIGHTED_GRADE_PATHS */\n// Combined individual score dashboard and student personal dashboard now use the same curriculum-credit weighted base average.\n`;
g += `\n/* UEP_08229_RELEASE_NOTES */\n(function(){const VERSION='0.82.29',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08229'))return;const o=document.createElement('div');o.id='uep-release-08229';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.29 수정사항</h2><ul><li>성적 → 종합성적 → 개인별 조회의 최근 내신 평균을 이수단위 가중평균으로 통일했습니다.</li><li>학생정보 개인 대시보드의 최근 내신 평균도 동일한 가중평균을 사용합니다.</li><li>성적 → 내신 개인별 조회와 내신 통계에서 이미 확인된 계산 기준과 전 화면을 일치시켰습니다.</li><li>신승민(1414) 검증 기준: 5등급제 평균 1.15.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;

must(g.includes('function scoreAverage(rows) {\n  return uepCommonWeightedAverage(rows,row=>Number(row.level));'),'combined scoreAverage not weighted');
must(g.includes('weightedStudentBase=admissionBase(live.id)'),'student dashboard weighted base missing');
must(g.includes('UEP_08229_REMAINING_WEIGHTED_GRADE_PATHS'),'marker missing');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.29 remaining weighted grade paths patched');
