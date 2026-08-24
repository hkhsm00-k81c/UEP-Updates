const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
const dataFile=path.resolve(appRoot,'resources','app','electron','google-data.cjs');
let g=fs.readFileSync(rendererFile,'utf8');
let d=fs.readFileSync(dataFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}
function replaceOnce(source,oldText,newText,label){assert(source.includes(oldText),label+' anchor not found');return source.replace(oldText,newText);}

g=g.replace(/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/,'const APP_VERSION = "0.81.54";');

// 공결 날짜는 ISO·한국식·연도 없는 월일·Google serial을 모두 동일 키로 만듭니다.
const oldComparable=`function uepComparableDate(value){
  if(value==null||value==='')return '';
  const text=String(value).trim();
  const match=text.match(/(\\d{4})[.\\-/년]\\s*(\\d{1,2})[.\\-/월]\\s*(\\d{1,2})/);
  if(match)return \`${'${match[1]}-${match[2].padStart(2,\'0\')}-${match[3].padStart(2,\'0\')}' }\`;
  const parsed=new Date(text);
  if(!Number.isNaN(parsed.getTime()))return \`${'${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,\'0\')}-${String(parsed.getDate()).padStart(2,\'0\')}' }\`;
  return text.slice(0,10);
}`;
const newComparable=`function uepComparableDate(value,basis=attendanceViewDate||dateKey(today)){
  if(value==null||value==='')return '';
  if(typeof value==='object')value=value.formattedValue||value.value||value.date||value.serial||'';
  const text=String(value).trim();
  if(/^\\d{5}(?:\\.\\d+)?$/.test(text)){
    const serial=Number(text),utc=new Date(Math.round((serial-25569)*86400000));
    if(!Number.isNaN(utc.getTime()))return \`${'${utc.getUTCFullYear()}-${String(utc.getUTCMonth()+1).padStart(2,\'0\')}-${String(utc.getUTCDate()).padStart(2,\'0\')}' }\`;
  }
  const full=text.match(/(20\\d{2})[^0-9]+(\\d{1,2})[^0-9]+(\\d{1,2})/);
  if(full)return \`${'${full[1]}-${full[2].padStart(2,\'0\')}-${full[3].padStart(2,\'0\')}' }\`;
  const compact=text.replace(/\\D/g,'');
  if(/^20\\d{6}$/.test(compact))return compact.slice(0,4)+'-'+compact.slice(4,6)+'-'+compact.slice(6,8);
  const monthDay=text.match(/(?:^|\\D)(\\d{1,2})\\s*(?:월|[.\\-/])\\s*(\\d{1,2})(?:\\s*일)?(?:\\D|$)/);
  if(monthDay){const year=String(basis||dateKey(today)).slice(0,4)||'2026';return year+'-'+monthDay[1].padStart(2,'0')+'-'+monthDay[2].padStart(2,'0');}
  const parsed=new Date(text);
  if(!Number.isNaN(parsed.getTime()))return \`${'${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,\'0\')}-${String(parsed.getDate()).padStart(2,\'0\')}' }\`;
  return text.slice(0,10);
}`;
g=replaceOnce(g,oldComparable,newComparable,'comparable date');
g=replaceOnce(g,'const selectedDay = officialRows.filter(row => uepComparableDate(row.date) === attendanceViewDate);',`const selectedDay = officialRows.filter(row => uepComparableDate(row.date||row.day||row.rawDate||row['일자']||row['출결일자'],attendanceViewDate) === attendanceViewDate);`,'official selected day');

// 우측 패널만 사용하고 목록 하단의 구형 학생 상세는 렌더링하지 않습니다.
const detailRx=/  let detail='';\n  if\(chosen\)\{.*?\n  return controls\+list\+detail;/s;
assert(detailRx.test(g),'curriculum bottom detail block not found');
g=g.replace(detailRx,"  return controls+list;");

// 학생 보고서 연결은 학생키 일치 후 프로그램ID를 최우선, 이름을 보조키로 사용합니다.
const oldResolver=`  const semester=unifiedProgramSemester(program);
  const semesterPool=studentPool.filter(report=>{
    const rSemester=String(report.semester||"").trim();
    return !(semester&&rSemester&&semester!==rSemester);
  });
  if(!semesterPool.length)return null;

  const pid=unifiedProgramId(program?.programId||program?.activityId||program?.id||"");
  if(pid){
    const exact=semesterPool.find(report=>unifiedProgramId(report.programId||report.activityId||report.sourceProgramId||report.linkedProgramId||"")===pid);
    if(exact)return exact;
  }

  const pnames=[program?.actualTitle,program?.title,program?.programName].map(recordProgramMatchName).filter(Boolean);
  const exactName=semesterPool.find(report=>{
    const rnames=[report.reportGroup,report.programName,report.programTitle,report.activityTitle,report.title].map(recordProgramMatchName).filter(Boolean);
    return pnames.some(name=>rnames.includes(name));
  });
  if(exactName)return exactName;`;
const newResolver=`  const semester=unifiedProgramSemester(program);
  const semesterPool=studentPool.filter(report=>{
    const rSemester=String(report.semester||"").trim();
    return !(semester&&rSemester&&semester!==rSemester);
  });
  const preferredPool=semesterPool.length?semesterPool:studentPool;
  const newest=items=>items.slice().sort((a,b)=>String(b.finalSubmittedAt||b.submittedAt||b.date||'').localeCompare(String(a.finalSubmittedAt||a.submittedAt||a.date||'')))[0]||null;

  const pid=unifiedProgramId(program?.programId||program?.activityId||program?.id||"");
  if(pid){
    const exact=studentPool.filter(report=>unifiedProgramId(report.programId||report.activityId||report.sourceProgramId||report.linkedProgramId||"")===pid);
    if(exact.length)return newest(exact);
  }

  const pnames=[program?.recordTitle,program?.actualTitle,program?.title,program?.programName].map(recordProgramMatchName).filter(Boolean);
  const nameMatches=pool=>pool.filter(report=>{
    const rnames=[report.reportGroup,report.programName,report.programTitle,report.activityTitle,report.title].map(recordProgramMatchName).filter(Boolean);
    return pnames.some(name=>rnames.includes(name));
  });
  const preferredNames=nameMatches(preferredPool);
  if(preferredNames.length)return newest(preferredNames);
  const fallbackNames=nameMatches(studentPool);
  if(fallbackNames.length)return newest(fallbackNames);`;
g=replaceOnce(g,oldResolver,newResolver,'student report resolver');

// 과목×시험×등급을 한 표에서 보는 전체 시험 비교 화면입니다.
const compareFunction=`
function mockAllExamComparisonMarkup(classNo){
  const rows=scoreStatisticsRows("mock","",classNo);
  const exams=[...new Set(rows.map(row=>row.exam).filter(Boolean))].sort((a,b)=>scoreExamOrder(a)-scoreExamOrder(b)||String(a).localeCompare(String(b),'ko'));
  const preferred=['국어','수학','영어','한국사','통합사회','통합과학'];
  const subjects=[...new Set(rows.map(row=>row.subject).filter(Boolean))].sort((a,b)=>{const ai=preferred.indexOf(a),bi=preferred.indexOf(b);return(ai<0?99:ai)-(bi<0?99:bi)||String(a).localeCompare(String(b),'ko');});
  if(!rows.length)return '<div class="query-empty"><b>모의고사 자료가 없습니다.</b></div>';
  const head='<div class="score-grade-head"><span>과목·시험</span>'+Array.from({length:9},(_,i)=>'<span>'+(i+1)+'등급</span>').join('')+'<span>1~2</span><span>1~4</span></div>';
  const body=subjects.map(subject=>'<section class="mock-compare-subject"><h4>'+escapeHtml(subject)+'</h4>'+exams.map(exam=>{const scope=rows.filter(row=>row.subject===subject&&row.exam===exam),counts=Array.from({length:9},(_,i)=>scope.filter(row=>Number(row.level)===i+1).length),values=[...counts,counts[0]+counts[1],counts.slice(0,4).reduce((a,b)=>a+b,0)];return '<div class="score-grade-row mock-compare-row"><b>'+escapeHtml(exam)+'</b>'+values.slice(0,9).map((v,i)=>'<span><small>'+(i+1)+'등급</small><strong>'+v+'</strong></span>').join('')+'<em><small>1~2등급</small><strong>'+values[9]+'</strong></em><em><small>1~4등급</small><strong>'+values[10]+'</strong></em></div>';}).join('')+'</section>').join('');
  return '<section class="score-stat-section"><div class="score-stat-title"><div><h3>전체 모의고사 과목별 등급 비교</h3><p>왼쪽은 과목, 과목 안의 행은 3월·6월·9월·11월 시험이며 위쪽 등급별 인원을 동시에 비교합니다.</p></div><span>'+exams.length+'회</span></div>'+head+body+'</section>';
}

function mockTrendOverviewMarkup(rows,exams,subjects){
  const grades=Array.from({length:9},(_,i)=>i+1),categories=[...grades.map(x=>x+'등급'),'1~2','1~4'];
  const values=(subject,exam)=>{const basic=grades.map(grade=>rows.filter(row=>row.subject===subject&&row.exam===exam&&Number(row.level)===grade).length);return[...basic,basic[0]+basic[1],basic.slice(0,4).reduce((a,b)=>a+b,0)];};
  const matrix=new Map(subjects.flatMap(subject=>exams.map(exam=>[subject+'|'+exam,values(subject,exam)])));
  const max=Math.max(1,...[...matrix.values()].flat()),chartMax=Math.max(max+4,Math.ceil(max*1.12)),W=1180,H=410,left=52,right=18,top=42,bottom=86,plotW=W-left-right,plotH=H-top-bottom,groupW=plotW/categories.length;
  const colors=['#0b8a78','#2f80ed','#f2994a','#9b51e0','#eb5757','#219653'],pairCount=Math.max(1,subjects.length*exams.length),gap=1,barW=Math.max(2,Math.min(8,(groupW-10-gap*(pairCount-1))/pairCount)),y=v=>top+plotH-(v/chartMax)*plotH;
  const grid=Array.from({length:5},(_,i)=>{const value=Math.round(chartMax*(4-i)/4),yy=top+plotH*i/4;return '<line x1="'+left+'" y1="'+yy+'" x2="'+(W-right)+'" y2="'+yy+'" stroke="#dfe9ec"/><text x="'+(left-8)+'" y="'+(yy+4)+'" text-anchor="end" font-size="11" fill="#718690">'+value+'</text>';}).join('');
  const bars=categories.map((category,ci)=>{const used=barW*pairCount+gap*(pairCount-1),start=left+ci*groupW+(groupW-used)/2;let n=0,markup='';subjects.forEach((subject,si)=>exams.forEach((exam,ei)=>{const v=matrix.get(subject+'|'+exam)[ci],x=start+n*(barW+gap),yy=y(v),opacity=Math.max(.32,1-ei*.18);markup+='<rect x="'+x+'" y="'+yy+'" width="'+barW+'" height="'+(top+plotH-yy)+'" rx="1.5" fill="'+colors[si%colors.length]+'" opacity="'+opacity+'"><title>'+escapeHtml(subject)+' · '+escapeHtml(exam)+' · '+category+' '+v+'명</title></rect>';n++;}));return markup+'<text x="'+(left+ci*groupW+groupW/2)+'" y="'+(H-42)+'" text-anchor="middle" font-size="11" font-weight="700" fill="#315667">'+category+'</text>';}).join('');
  const subjectLegend=subjects.map((s,i)=>'<span style="display:inline-flex;align-items:center;gap:5px"><i style="width:11px;height:11px;border-radius:2px;background:'+colors[i%colors.length]+'"></i>'+escapeHtml(s)+'</span>').join('');
  const examLegend=exams.map((e,i)=>'<span>'+escapeHtml(e)+(i===0?' 진하게':'')+'</span>').join(' · ');
  return '<section class="score-stat-section"><div class="score-stat-title"><div><h3>전 과목 시험별 등급 인원 통합 비교</h3><p>등급마다 과목별·시험별 막대를 쌓지 않고 각각 나란히 표시합니다.</p></div><span>'+subjects.length+'과목 · '+exams.length+'회</span></div><div style="padding:16px;overflow-x:auto"><div style="display:flex;flex-wrap:wrap;gap:14px;margin-bottom:6px;font-weight:700">'+subjectLegend+'</div><small>'+examLegend+'</small><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;min-width:1050px">'+grid+bars+'</svg></div></section>';
}
`;
assert(g.includes('function mockTrendStatisticsMarkup(classNo){'),'trend function anchor not found');
g=g.replace('function mockTrendStatisticsMarkup(classNo){',compareFunction+'function mockTrendStatisticsMarkup(classNo){');
g=replaceOnce(g,"  return visibleSubjects.map(renderSubject).join('')||'<div class=\"query-empty\"><b>표시할 과목 자료가 없습니다.</b></div>';",`  const detail=visibleSubjects.map(renderSubject).join('')||'<div class="query-empty"><b>표시할 과목 자료가 없습니다.</b></div>';
  return (subject==='__all__'?mockTrendOverviewMarkup(rows,exams,subjects):'')+detail;`,'trend overview return');

// 통계 탭에 전체 시험 비교를 추가하고 시험 선택기는 해당 화면에서 제거합니다.
g=replaceOnce(g,'const isTrend=scoreStatisticsType==="mocktrend", wanted=scoreStatisticsType==="internal"?"내신":"모의고사";',`const isTrend=scoreStatisticsType==="mocktrend",isCompare=scoreStatisticsType==="mockcompare", wanted=scoreStatisticsType==="internal"?"내신":"모의고사";`,'statistics mode');
g=replaceOnce(g,'const selector=isTrend?`<label>과목<select id="scoreStatisticsTrendSubject">',`const selector=isTrend?\`<label>과목<select id="scoreStatisticsTrendSubject">`,'selector start');
g=replaceOnce(g,'</select></label>`:`<label>시험<select id="scoreStatisticsExam">${exams.map(exam=>`<option ${exam===scoreStatisticsExam?"selected":""}>${escapeHtml(exam)}</option>`).join("")}</select></label>`;',`</select></label>\`:isCompare?'':\`<label>시험<select id="scoreStatisticsExam">${'${exams.map(exam=>`<option ${exam===scoreStatisticsExam?"selected":""}>${escapeHtml(exam)}</option>`).join("")}'} </select></label>\`;`.replace('} </select>','}</select>'),'selector compare');
g=replaceOnce(g,'const result=isTrend?mockTrendStatisticsMarkup(scoreStatisticsClass):(scoreStatisticsType==="mock"?mockStatisticsMarkup(scoreStatisticsExam,scoreStatisticsClass):internalStatisticsMarkup(scoreStatisticsExam,scoreStatisticsClass));',`const result=isTrend?mockTrendStatisticsMarkup(scoreStatisticsClass):isCompare?mockAllExamComparisonMarkup(scoreStatisticsClass):(scoreStatisticsType==="mock"?mockStatisticsMarkup(scoreStatisticsExam,scoreStatisticsClass):internalStatisticsMarkup(scoreStatisticsExam,scoreStatisticsClass));`,'statistics result');
g=replaceOnce(g,'const label=isTrend?"시험별 추이":scoreStatisticsType==="mock"?"모의고사 통계":"내신 통계";',`const label=isTrend?"시험별 추이":isCompare?"전체 시험 비교":scoreStatisticsType==="mock"?"모의고사 통계":"내신 통계";`,'statistics label');
g=replaceOnce(g,'<button data-score-stat-type="mocktrend" class="${isTrend?"active":""}">시험별 추이</button>','<button data-score-stat-type="mockcompare" class="${isCompare?"active":""}">전체 시험 비교</button><button data-score-stat-type="mocktrend" class="${isTrend?"active":""}">시험별 추이</button>','statistics compare tab');

// data parser에서도 숫자형·한국식·연도 없는 날짜를 2026 ISO 키로 보존합니다.
const oldLocalEnd=`  return text;
}

function localTime(value) {`;
const newLocalEnd=`  const compact=text.replace(/\\D/g,'');
  if(/^20\\d{6}$/.test(compact))return compact.slice(0,4)+'-'+compact.slice(4,6)+'-'+compact.slice(6,8);
  const monthDay=text.match(/(?:^|\\D)(\\d{1,2})\\s*(?:월|[.\\-/])\\s*(\\d{1,2})(?:\\s*일)?(?:\\D|$)/);
  if(monthDay)return '2026-'+monthDay[1].padStart(2,'0')+'-'+monthDay[2].padStart(2,'0');
  return text;
}

function localTime(value) {`;
d=replaceOnce(d,oldLocalEnd,newLocalEnd,'google data localDate');

for(const marker of ['const APP_VERSION = "0.81.54";','function mockAllExamComparisonMarkup(','function mockTrendOverviewMarkup(','return controls+list;','preferredPool=semesterPool.length?semesterPool:studentPool','monthDay=text.match'])assert(g.includes(marker)||d.includes(marker),'marker missing: '+marker);
fs.writeFileSync(rendererFile,g,'utf8');
fs.writeFileSync(dataFile,d,'utf8');
console.log('UEP 0.81.54 bundled attendance, curriculum, report and score statistics repair applied');
