const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
must(/const\s+APP_VERSION\s*=\s*["']0\.82\.27["'];/.test(g),'0.82.27 base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.27["'];/,'const APP_VERSION = "0.82.28";').replace(/const CURRENT='0\.82\.27';/g,"const CURRENT='0.82.28';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.28';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

const helperAnchor='function scoreStudentInfo(studentId){';
must(g.includes(helperAnchor),'scoreStudentInfo anchor not found');
if(!g.includes('function uepCommonWeightedAverage(')){
  const helpers=`function uepCommonCourseKey(value){\n  return String(value||'').replace(/\\s+/g,'').replace(/[ⅠⅡⅢ]/g,ch=>({'Ⅰ':'I','Ⅱ':'II','Ⅲ':'III'}[ch]||ch)).replace(/[*＊]/g,'');\n}\nfunction uepCommonCreditOf(row){\n  const key=uepCommonCourseKey(row?.subject||row?.course||row?.courseName||row?.['과목명']);\n  const curriculumRows=Array.isArray(readonlyCache?.curriculumDb)?readonlyCache.curriculumDb:[];\n  const credits=[...new Set(curriculumRows.filter(c=>uepCommonCourseKey(c?.['과목명'])===key).map(c=>Number(c?.['이수단위'])).filter(n=>Number.isFinite(n)&&n>0))];\n  if(credits.length===1)return credits[0];\n  const direct=[row?.credit,row?.credits,row?.courseCredit,row?.unitCredit,row?.['이수학점'],row?.['이수단위'],row?.['학점']].map(Number).find(n=>Number.isFinite(n)&&n>0);\n  if(direct)return direct;\n  console.warn('[UEP common weighted grade] credit unresolved',{subject:row?.subject||row?.['과목명'],row});\n  return null;\n}\nfunction uepCommonWeightedAverage(items,valueFn,rowFn=(x=>x)){\n  const weighted=(items||[]).map(item=>{const value=Number(valueFn(item));const row=rowFn(item);const credit=uepCommonCreditOf(row);return {value,credit};}).filter(x=>Number.isFinite(x.value)&&Number.isFinite(x.credit)&&x.credit>0);\n  const credits=weighted.reduce((sum,x)=>sum+x.credit,0);\n  return credits?weighted.reduce((sum,x)=>sum+x.value*x.credit,0)/credits:null;\n}\n`;
  g=g.replace(helperAnchor,helpers+helperAnchor);
}

const oldSummary=`const gradeValues=averageRows.map(x=>Number(x.level)).filter(Number.isFinite);\n  const average=gradeValues.length?(gradeValues.reduce((a,b)=>a+b,0)/gradeValues.length).toFixed(2):"-";`;
const newSummary=`const gradeValues=averageRows.map(x=>Number(x.level)).filter(Number.isFinite);\n  const weightedAverage=uepCommonWeightedAverage(averageRows,x=>Number(x.level));\n  const average=Number.isFinite(weightedAverage)?weightedAverage.toFixed(2):"-";`;
must(g.includes(oldSummary),'recent/query summary simple-average anchor not found');
g=g.replace(oldSummary,newSummary);

const oldPrint=`const gradeRows=internal.filter(r=>Number.isFinite(Number(r.level)));\n  const avg=gradeRows.length?(gradeRows.reduce((s,r)=>s+Number(r.level),0)/gradeRows.length).toFixed(2):"-";`;
const newPrint=`const gradeRows=internal.filter(r=>Number.isFinite(Number(r.level)));\n  const printWeightedAverage=uepCommonWeightedAverage(gradeRows,r=>Number(r.level));\n  const avg=Number.isFinite(printWeightedAverage)?printWeightedAverage.toFixed(2):"-";`;
if(g.includes(oldPrint))g=g.replace(oldPrint,newPrint);

const oldAvg5='average5:levels5.length?levels5.reduce((sum,value)=>sum+value,0)/levels5.length:null,';
if(g.includes(oldAvg5))g=g.replace(oldAvg5,'average5:uepCommonWeightedAverage(gradeRows,row=>scoreNumeric(row.level)),');
const oldAvg9='average9:levels9.length?levels9.reduce((sum,value)=>sum+value,0)/levels9.length:null,';
if(g.includes(oldAvg9))g=g.replace(oldAvg9,'average9:uepCommonWeightedAverage(actualNine.details,item=>Number(item.result?.grade),item=>item.row||{}),');

g += `\n/* UEP_08228_COMMON_WEIGHTED_GRADE_UI */\n// All common UEP internal-grade averages now use 18_학교교육과정DB 이수단위 weighting.\n// This includes the score query summary/recent-semester card, print summary, and internal statistics averages.\n`;
g += `\n/* UEP_08228_RELEASE_NOTES */\n(function(){const VERSION='0.82.28',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08228'))return;const o=document.createElement('div');o.id='uep-release-08228';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.28 수정사항</h2><ul><li>성적 화면의 최근 학기 평균 카드가 단순평균을 사용하던 별도 계산 경로를 수정했습니다.</li><li>성적 조회 요약·출력 요약·내신 통계의 기본 평균을 모두 교육과정DB 이수단위 가중평균으로 통일했습니다.</li><li>1414 신승민 학기말 검증값은 1.15입니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;
must(g.includes('function uepCommonWeightedAverage('),'weighted helper missing');
must(g.includes('const weightedAverage=uepCommonWeightedAverage(averageRows'),'recent weighted average missing');
must(!g.includes('gradeValues.reduce((a,b)=>a+b,0)/gradeValues.length'),'recent simple average still present');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.28 common weighted grade UI patched');
