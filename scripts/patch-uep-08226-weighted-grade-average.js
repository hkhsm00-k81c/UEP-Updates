const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
must(/const\s+APP_VERSION\s*=\s*["']0\.82\.25["'];/.test(g),'0.82.25 base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.25["'];/,'const APP_VERSION = "0.82.26";');
g=g.replace(/const CURRENT='0\.82\.25';/g,"const CURRENT='0.82.26';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.26';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// UEP common internal-grade indicators: credit-weighted average.
// University-specific conversions remain separate in 57_내신산정DB.
const oldBase=`function admissionBase(studentId, mockExam = "6월모의고사") {
  const scores=uepRowsForStudent(uepStudentPerfIndex().scoreByStudent,String(studentId));
  const internal=scores.filter(x=>x.scoreType==="내신");
  const preferred=["학기말고사","2차고사","1차고사"].find(exam=>internal.some(x=>x.exam===exam));
  const currentInternal=preferred?internal.filter(x=>x.exam===preferred):internal;
  const gradeRows=currentInternal.filter(x=>{const level=Number(x.level);return Number.isFinite(level)&&level>=1&&level<=5;});
  const numericFive=gradeRows.map(x=>Number(x.level));
  const avg5=numericFive.length?numericFive.reduce((sum,x)=>sum+x,0)/numericFive.length:null;
  const actual=actualNineAverage(gradeRows);
  const mock=scores.filter(x=>x.scoreType==="모의고사"&&x.exam===mockExam);
  return {preferred,currentInternal,avg5,actual9:actual.average,actualDetails:actual.details,mock};
}`;
must(g.includes(oldBase),'admissionBase exact anchor not found');
const newBase=`function admissionBase(studentId, mockExam = "6월모의고사") {
  const scores=uepRowsForStudent(uepStudentPerfIndex().scoreByStudent,String(studentId));
  const internal=scores.filter(x=>x.scoreType==="내신");
  const preferred=["학기말고사","2차고사","1차고사"].find(exam=>internal.some(x=>x.exam===exam));
  const currentInternal=preferred?internal.filter(x=>x.exam===preferred):internal;
  const gradeRows=currentInternal.filter(x=>{const level=Number(x.level);return Number.isFinite(level)&&level>=1&&level<=5;});
  const creditOf=row=>{const candidates=[row.credit,row.credits,row.courseCredit,row.unitCredit,row['이수학점'],row['이수단위'],row['학점']];for(const v of candidates){const n=Number(v);if(Number.isFinite(n)&&n>0)return n;}return 1;};
  const weightedFive=gradeRows.map(row=>({level:Number(row.level),credit:creditOf(row)}));
  const fiveCredits=weightedFive.reduce((sum,row)=>sum+row.credit,0);
  const avg5=fiveCredits?weightedFive.reduce((sum,row)=>sum+(row.level*row.credit),0)/fiveCredits:null;
  const actual=actualNineAverage(gradeRows);
  const actualDetails=actual.details||[];
  const actualCredits=actualDetails.reduce((sum,item)=>sum+creditOf(item.row||{}),0);
  const actual9=actualCredits?actualDetails.reduce((sum,item)=>sum+(Number(item.result?.grade)*creditOf(item.row||{})),0)/actualCredits:null;
  const mock=scores.filter(x=>x.scoreType==="모의고사"&&x.exam===mockExam);
  return {preferred,currentInternal,avg5,actual9,actualDetails,mock};
}`;
g=g.replace(oldBase,newBase);

g += `\n/* UEP_08226_WEIGHTED_GRADE_AVERAGE */\n// UEP common grade indicators use course-credit weighted averages. University-specific grade conversion remains separate.\n`;

g += `\n/* UEP_08226_RELEASE_NOTES */\n(function(){const VERSION='0.82.26',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08226'))return;const o=document.createElement('div');o.id='uep-release-08226';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.26 수정사항</h2><ul><li>UEP 기본 5등급 평균을 과목 단순평균에서 이수학점 가중평균으로 변경했습니다.</li><li>석차·수강자수로 산출하는 실제 9등급 평균도 이수학점 가중평균으로 변경했습니다.</li><li>대학별 내신 환산은 UEP 기본 평균과 분리하여 57_내신산정DB의 대학별 공식 산식을 사용합니다.</li><li>기존 입시·상담·학생발굴·내신보호 화면은 같은 가중평균 값을 공통 사용합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;
must(g.includes('UEP_08226_WEIGHTED_GRADE_AVERAGE'),'weighted marker missing');
must(g.includes('row.level*row.credit'),'weighted five formula missing');
must(g.includes('item.result?.grade)*creditOf'),'weighted nine formula missing');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.26 weighted grade averages patched');
