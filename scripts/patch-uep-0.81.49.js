const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(rendererFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.49";');

const stateAnchor='let scoreStatisticsType = "mock";';
assert(g.includes(stateAnchor)&&!g.includes('let scoreStatisticsTrendSubject'),'trend state anchor mismatch');
g=g.replace(stateAnchor,stateAnchor+'\nlet scoreStatisticsTrendSubject = "";');

// 보안은 임시 capture 가로채기가 아니라 본래 탭 클릭 처리에서 수행합니다.
const coreHandler=`$$('[data-curriculum-workspace]').forEach(b=>b.onclick=()=>{curriculumWorkspaceMode=b.dataset.curriculumWorkspace;render('records');});`;
const secureHandler=`$$('[data-curriculum-workspace]').forEach(b=>b.onclick=async()=>{const next=b.dataset.curriculumWorkspace;if(next==='subjects'&&!(await unlockSubjectConfidential()))return;curriculumWorkspaceMode=next;render('records');});`;
const coreCount=g.split(coreHandler).length-1;
assert(coreCount>=2,'core curriculum handlers not found');
g=g.split(coreHandler).join(secureHandler);

const legacyStart=g.indexOf(`   subject.addEventListener('click',async e=>{`);
const legacyEnd=g.indexOf(`},true);`,legacyStart);
assert(legacyStart>=0&&legacyEnd>legacyStart,'legacy subject capture gate bounds not found');
g=g.slice(0,legacyStart)+`   // 0.81.49: 인증과 전환은 본래 data-curriculum-workspace 핸들러가 담당합니다.\n`+g.slice(legacyEnd+9);

const trendFunction=`
function mockTrendStatisticsMarkup(classNo){
  const rows=scoreStatisticsRows("mock","",classNo);
  const exams=[...new Set(rows.map(row=>row.exam).filter(Boolean))].sort((a,b)=>scoreExamOrder(a)-scoreExamOrder(b)||String(a).localeCompare(String(b),"ko"));
  const preferred=["국어","수학","영어","한국사"];
  const subjects=[...new Set(rows.map(row=>row.subject).filter(Boolean))].sort((a,b)=>{const ai=preferred.indexOf(a),bi=preferred.indexOf(b);return (ai<0?99:ai)-(bi<0?99:bi)||String(a).localeCompare(String(b),"ko");});
  if(!scoreStatisticsTrendSubject||!subjects.includes(scoreStatisticsTrendSubject))scoreStatisticsTrendSubject=subjects[0]||"";
  const subject=scoreStatisticsTrendSubject;
  if(exams.length<2)return '<div class="query-empty"><b>비교할 모의고사가 부족합니다.</b><span>서로 다른 시험 자료가 2회 이상 연결되면 추이를 표시합니다.</span></div>';
  const series=Array.from({length:9},(_,grade)=>exams.map(exam=>rows.filter(row=>row.exam===exam&&row.subject===subject&&Number(row.level)===grade+1).length));
  const max=Math.max(1,...series.flat()),W=900,H=300,left=48,right=22,top=24,bottom=48,plotW=W-left-right,plotH=H-top-bottom;
  const colors=['#0b8a78','#2f80ed','#7b61ff','#f2994a','#eb5757','#9b51e0','#219653','#f2c94c','#6b7b83'];
  const x=i=>left+(exams.length===1?plotW/2:i*plotW/(exams.length-1)), y=v=>top+plotH-(v/max)*plotH;
  const grid=Array.from({length:5},(_,i)=>{const value=Math.round(max*(4-i)/4);const yy=top+plotH*i/4;return '<line x1="'+left+'" y1="'+yy+'" x2="'+(W-right)+'" y2="'+yy+'" stroke="#dfe9ec"/><text x="'+(left-10)+'" y="'+(yy+4)+'" text-anchor="end" font-size="11" fill="#718690">'+value+'</text>';}).join('');
  const lines=series.map((values,grade)=>'<polyline fill="none" stroke="'+colors[grade]+'" stroke-width="'+(grade<4?3:2)+'" points="'+values.map((v,i)=>x(i)+','+y(v)).join(' ')+'"/>'+values.map((v,i)=>'<circle cx="'+x(i)+'" cy="'+y(v)+'" r="3.5" fill="'+colors[grade]+'"><title>'+(grade+1)+'등급 '+exams[i]+' '+v+'명</title></circle>').join('')).join('');
  const labels=exams.map((exam,i)=>'<text x="'+x(i)+'" y="'+(H-18)+'" text-anchor="middle" font-size="12" font-weight="700" fill="#315667">'+escapeHtml(exam)+'</text>').join('');
  const tableHead='<div style="display:grid;grid-template-columns:130px repeat('+exams.length+',minmax(90px,1fr));background:#28566f;color:white;font-weight:800"><span style="padding:11px">등급</span>'+exams.map(e=>'<span style="padding:11px;text-align:center">'+escapeHtml(e)+'</span>').join('')+'</div>';
  const tableRows=series.map((values,grade)=>'<div style="display:grid;grid-template-columns:130px repeat('+exams.length+',minmax(90px,1fr));border-top:1px solid #e2ebee"><b style="padding:11px;color:'+colors[grade]+'">'+(grade+1)+'등급</b>'+values.map(v=>'<span style="padding:11px;text-align:center">'+v+'명</span>').join('')+'</div>').join('');
  const cumulative=[['1~2등급',series[0].map((v,i)=>v+series[1][i])],['1~4등급',series[0].map((v,i)=>v+series[1][i]+series[2][i]+series[3][i])]];
  const cumulativeRows=cumulative.map(([label,values])=>'<div style="display:grid;grid-template-columns:130px repeat('+exams.length+',minmax(90px,1fr));border-top:1px solid #cfe4dc;background:#f0faf6"><b style="padding:11px">'+label+'</b>'+values.map(v=>'<strong style="padding:11px;text-align:center">'+v+'명</strong>').join('')+'</div>').join('');
  return '<section class="score-stat-section"><div class="score-stat-title"><div><h3>'+escapeHtml(subject)+' 등급별 인원 변화</h3><p>연결된 모든 모의고사를 시간순으로 비교합니다. 선 위에 마우스를 올리면 정확한 인원이 표시됩니다.</p></div><span>'+exams.length+'회</span></div><div style="padding:16px;overflow-x:auto"><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;min-width:760px">'+grid+lines+labels+'</svg><div style="display:flex;flex-wrap:wrap;gap:10px;margin:4px 0 16px">'+series.map((_,i)=>'<span style="color:'+colors[i]+';font-weight:800">● '+(i+1)+'등급</span>').join('')+'</div><div style="min-width:650px">'+tableHead+tableRows+cumulativeRows+'</div></div></section>';
}
`;
const trendAnchor='function internalNineGradeCut(percentile){';
assert(g.includes(trendAnchor)&&!g.includes('function mockTrendStatisticsMarkup('),'trend function anchor mismatch');
g=g.replace(trendAnchor,trendFunction+'\n'+trendAnchor);

const viewStart=g.indexOf('function scoreStatisticsView(){'),viewEnd=g.indexOf('\nfunction openStudentCombinedScore(',viewStart);
assert(viewStart>=0&&viewEnd>viewStart,'score statistics view bounds not found');
const newView=`function scoreStatisticsView(){
  const rows=readonlyCache?.scoreRecords||[];
  const isTrend=scoreStatisticsType==="mocktrend", wanted=scoreStatisticsType==="internal"?"내신":"모의고사";
  const exams=[...new Set(rows.filter(row=>row.scoreType===wanted).map(row=>row.exam).filter(Boolean))].sort((a,b)=>scoreExamOrder(a)-scoreExamOrder(b)||String(a).localeCompare(String(b),"ko"));
  const subjects=[...new Set(rows.filter(row=>row.scoreType==="모의고사").map(row=>row.subject).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"ko"));
  if(!scoreStatisticsExam||!exams.includes(scoreStatisticsExam))scoreStatisticsExam=exams.at(-1)||"";
  if(!scoreStatisticsTrendSubject||!subjects.includes(scoreStatisticsTrendSubject))scoreStatisticsTrendSubject=subjects[0]||"";
  const selector=isTrend?\`<label>과목<select id="scoreStatisticsTrendSubject">\${subjects.map(subject=>\`<option \${subject===scoreStatisticsTrendSubject?"selected":""}>\${escapeHtml(subject)}</option>\`).join("")}</select></label>\`:\`<label>시험<select id="scoreStatisticsExam">\${exams.map(exam=>\`<option \${exam===scoreStatisticsExam?"selected":""}>\${escapeHtml(exam)}</option>\`).join("")}</select></label>\`;
  const result=isTrend?mockTrendStatisticsMarkup(scoreStatisticsClass):(scoreStatisticsType==="mock"?mockStatisticsMarkup(scoreStatisticsExam,scoreStatisticsClass):internalStatisticsMarkup(scoreStatisticsExam,scoreStatisticsClass));
  const label=isTrend?"시험별 추이":scoreStatisticsType==="mock"?"모의고사 통계":"내신 통계";
  return \`<div class="score-statistics-shell"><div class="score-stat-controls"><div class="score-stat-type"><button data-score-stat-type="mock" class="\${scoreStatisticsType==="mock"?"active":""}">모의고사 통계</button><button data-score-stat-type="mocktrend" class="\${isTrend?"active":""}">시험별 추이</button><button data-score-stat-type="internal" class="\${scoreStatisticsType==="internal"?"active":""}">내신 통계</button></div>\${selector}<label>범위<select id="scoreStatisticsClass"><option value="all">1학년 전체</option>\${availableClasses().map(no=>\`<option value="\${no}" \${scoreStatisticsClass===no?"selected":""}>\${no}반</option>\`).join("")}</select></label><button class="btn primary" data-score-stat-run>통계 조회</button></div><div class="score-stat-guide"><b>\${label}</b><span>기존 시험별 분포·랭킹은 유지하며, 추이 화면은 모든 모의고사를 시간순으로 비교합니다.</span></div><div id="scoreStatisticsResult">\${result}</div></div>\`;
}`;
g=g.slice(0,viewStart)+newView+g.slice(viewEnd);

const runOld=`$('[data-score-stat-run]')?.addEventListener("click",()=>{scoreStatisticsExam=$("#scoreStatisticsExam")?.value||"";scoreStatisticsClass=$("#scoreStatisticsClass")?.value||"all";render("scores");});`;
const runNew=`$('[data-score-stat-run]')?.addEventListener("click",()=>{scoreStatisticsExam=$("#scoreStatisticsExam")?.value||scoreStatisticsExam;scoreStatisticsTrendSubject=$("#scoreStatisticsTrendSubject")?.value||scoreStatisticsTrendSubject;scoreStatisticsClass=$("#scoreStatisticsClass")?.value||"all";render("scores");});`;
assert(g.includes(runOld),'score statistics run handler not found');
g=g.replace(runOld,runNew);

for(const marker of [
 'const APP_VERSION = "0.81.49";',
 'function mockTrendStatisticsMarkup(classNo)',
 'data-score-stat-type="mocktrend"',
 'scoreStatisticsTrendSubject=$("#scoreStatisticsTrendSubject")',
 "if(next==='subjects'&&!(await unlockSubjectConfidential()))return;",
 '0.81.49: 인증과 전환은 본래'
])assert(g.includes(marker),'0.81.49 marker missing: '+marker);

fs.writeFileSync(rendererFile,g,'utf8');
console.log('UEP 0.81.49 core subject security and mock trend applied');
