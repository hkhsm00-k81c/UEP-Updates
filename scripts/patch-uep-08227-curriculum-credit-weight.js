const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const mp=path.join(root,'resources','app','electron','main.cjs');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
let m=fs.readFileSync(mp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
must(/const\s+APP_VERSION\s*=\s*["']0\.82\.26["'];/.test(g),'0.82.26 base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.26["'];/,'const APP_VERSION = "0.82.27";').replace(/const CURRENT='0\.82\.26';/g,"const CURRENT='0.82.27';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.27';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// Connect school curriculum DB so credit weights come from the authoritative curriculum table.
if(!m.includes("'18_학교교육과정DB'!A1:N1000")){
  const anchor="'57_내신산정DB'!A1:T500";
  must(m.includes(anchor),'main sheet range anchor not found');
  m=m.replace(anchor,anchor+", \"'18_학교교육과정DB'!A1:N1000\"");
}

// Renderer matrix mapping: keep this tolerant because existing releases use the shared matrix-object helper.
if(!g.includes('curriculumDb')){
  const mapAnchor="data.admissionGradeCalcs=uep08210MatrixObjects(matrices['57_내신산정DB']);";
  must(g.includes(mapAnchor),'renderer 57 mapping anchor not found');
  g=g.replace(mapAnchor,mapAnchor+"\n  data.curriculumDb=uep08210MatrixObjects(matrices['18_학교교육과정DB']);");
}

const oldCredit="const creditOf=row=>{const candidates=[row.credit,row.credits,row.courseCredit,row.unitCredit,row['이수학점'],row['이수단위'],row['학점']];for(const v of candidates){const n=Number(v);if(Number.isFinite(n)&&n>0)return n;}return 1;};";
must(g.includes(oldCredit),'0.82.26 creditOf anchor not found');
const newCredit=`const curriculumRows=Array.isArray(UEP_DATA?.curriculumDb)?UEP_DATA.curriculumDb:[];
  const normCourse=s=>String(s||'').replace(/\\s+/g,'').replace(/[ⅠⅡⅢ]/g,ch=>({'Ⅰ':'I','Ⅱ':'II','Ⅲ':'III'}[ch]||ch)).replace(/[*＊]/g,'');
  const creditOf=row=>{
    const course=normCourse(row.subject||row.course||row.courseName||row['과목명']);
    const grade=Number(row.grade||row['학년']||1);
    const matches=curriculumRows.filter(c=>normCourse(c['과목명'])===course&&(!Number(c['학년'])||Number(c['학년'])===grade));
    const credits=[...new Set(matches.map(c=>Number(c['이수단위'])).filter(n=>Number.isFinite(n)&&n>0))];
    if(credits.length===1)return credits[0];
    const direct=[row.credit,row.credits,row.courseCredit,row.unitCredit,row['이수학점'],row['이수단위'],row['학점']].map(Number).find(n=>Number.isFinite(n)&&n>0);
    if(direct)return direct;
    console.warn('[UEP grade weight] curriculum credit unresolved', {course,grade,row});
    return null;
  };`;
g=g.replace(oldCredit,newCredit);

// Do not silently convert missing credit to 1. Exclude unresolved rows and surface diagnostics.
g=g.replace("const weightedFive=gradeRows.map(row=>({level:Number(row.level),credit:creditOf(row)}));","const weightedFive=gradeRows.map(row=>({level:Number(row.level),credit:creditOf(row)})).filter(row=>Number.isFinite(row.credit)&&row.credit>0);");
g=g.replace("const actualCredits=actualDetails.reduce((sum,item)=>sum+creditOf(item.row||{}),0);\n  const actual9=actualCredits?actualDetails.reduce((sum,item)=>sum+(Number(item.result?.grade)*creditOf(item.row||{})),0)/actualCredits:null;","const weightedActual=actualDetails.map(item=>({item,credit:creditOf(item.row||{})})).filter(x=>Number.isFinite(x.credit)&&x.credit>0&&Number.isFinite(Number(x.item.result?.grade)));\n  const actualCredits=weightedActual.reduce((sum,x)=>sum+x.credit,0);\n  const actual9=actualCredits?weightedActual.reduce((sum,x)=>sum+(Number(x.item.result.grade)*x.credit),0)/actualCredits:null;");

g += `\n/* UEP_08227_CURRICULUM_CREDIT_WEIGHT */\n// 50_내신DB determines actual student/course records; 18_학교교육과정DB supplies 이수단위 weights.\n// Cross-semester subjects (한문/정보, 음악/미술) are matched by actual score subject, not by curriculum semester.\n`;
g += `\n/* UEP_08227_RELEASE_NOTES */\n(function(){const VERSION='0.82.27',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08227'))return;const o=document.createElement('div');o.id='uep-release-08227';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.27 수정사항</h2><ul><li>기본 5등급과 실제9등급 평균의 가중치를 18_학교교육과정DB 이수단위와 직접 연결했습니다.</li><li>학생의 실제 이수 과목은 50_내신DB를 따르고, 이수단위만 교육과정DB에서 가져옵니다.</li><li>한문/정보, 음악/미술처럼 학급군별 교차학기 과목은 실제 성적 과목명 기준으로 매칭합니다.</li><li>이수단위 매칭 실패 시 임의 1단위로 계산하지 않고 제외·진단하도록 변경했습니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;
must(g.includes('UEP_08227_CURRICULUM_CREDIT_WEIGHT'),'marker missing');
must(g.includes("data.curriculumDb=uep08210MatrixObjects(matrices['18_학교교육과정DB'])"),'curriculum mapping missing');
must(m.includes("'18_학교교육과정DB'!A1:N1000"),'curriculum range missing');
fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(mp,m,'utf8');
console.log('UEP 0.82.27 curriculum credit weighting patched');
