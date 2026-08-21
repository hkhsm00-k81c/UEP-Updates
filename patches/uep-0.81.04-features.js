
// __UEP_SELECTION_SDGS_RECORDCHECK_PAGES_08104__
let selectionAnalysisMode="overview";
let selectionSubjectFilter="";

function uepActiveSelectionRows(){
  const students=readonlyCache?.students||[];
  const byId=new Map(students.map(s=>[String(s.id||""),s]));
  const byNo=new Map(students.map(s=>[String(s.studentNo||""),s]));
  return (readonlyCache?.selectionStudentRows||[]).map(row=>{
    const student=byId.get(String(row["학생ID"]||""))||byNo.get(String(row["학번"]||""))||null;
    const status=String(student?.status||row["학적상태"]||"").trim();
    return {...row,__student:student,__status:status};
  }).filter(row=>row.__student&&!/전출|자퇴|퇴학|제적/.test(row.__status));
}
function uepDormStudentIds(){
  return new Set((readonlyCache?.dormStudents||[]).filter(x=>!/퇴사/.test(String(x.status||""))).map(x=>String(x.studentId||x.studentNo||"")));
}
function uepSelectionTermSubjects(row,term){
  const keys=Object.keys(row).filter(key=>key.startsWith(term+" ")&&/선택\d+|정보·외국어|예술/.test(key));
  return keys.map(key=>String(row[key]||"").trim()).filter(Boolean);
}
function uepStudentGradeAverage(studentId){
  const rows=(readonlyCache?.scoreRecords||[]).filter(x=>String(x.studentId||"")===String(studentId||"")&&x.scoreType==="내신"&&Number.isFinite(Number(x.level)));
  if(!rows.length)return null;
  return rows.reduce((sum,x)=>sum+Number(x.level),0)/rows.length;
}
function uepExpectedGrade(rank,total){
  if(!total||!rank)return "-";
  const rate=rank/total;
  return rate<=.10?"1":rate<=.34?"2":rate<=.66?"3":rate<=.90?"4":"5";
}
function uepSelectionErrors(row){
  const errors=[];
  const terms=["2-1","2-2"];
  const science=/(물리|화학|생명과학|지구과학|역학|에너지|전자기|양자|세포|물질대사|유전|지구시스템|융합과학)/;
  const social=/(세계사|동아시아|사회와 문화|사회문화|윤리|지리|정치|법과 사회|경제|인문학|사회문제)/;
  terms.forEach(term=>{const subjects=uepSelectionTermSubjects(row,term);if(subjects.some(x=>science.test(x))&&subjects.some(x=>social.test(x)))errors.push({type:"문·이과 교차지원",term,detail:subjects.join(" · ")});});
  const first=uepSelectionTermSubjects(row,"2-1"),second=uepSelectionTermSubjects(row,"2-2");
  const hierarchy=[
    [/(역학과 에너지|전자기와 양자)/,/물리학/ ,"물리"],
    [/(물질과 에너지|화학 반응의 세계)/,/화학/ ,"화학"],
    [/(세포와 물질대사|생물의 유전)/,/생명과학/ ,"생명과학"],
    [/지구시스템과학/,/지구과학/ ,"지구과학"]
  ];
  hierarchy.forEach(([advanced,basic,label])=>{if(second.some(x=>advanced.test(x))&&!first.some(x=>basic.test(x)))errors.push({type:"과학과목 위계오류",term:"2-1 → 2-2",detail:`${label} 선이수 과목 확인 필요`});});
  const lang1=String(row["2-1 정보·외국어"]||""),lang2=String(row["2-2 정보·외국어"]||"");
  const l1=/중국/.test(lang1)?"중국어":/일본/.test(lang1)?"일본어":"";
  const l2=/중국/.test(lang2)?"중국어":/일본/.test(lang2)?"일본어":"";
  if((l1||l2)&&l1!==l2)errors.push({type:"제2외국어 연계오류",term:"2-1 → 2-2",detail:`${lang1||"미신청"} → ${lang2||"미신청"}`});
  const art1=String(row["2-1 예술"]||""),art2=String(row["2-2 예술"]||"");
  const a1=/음악/.test(art1)?"음악":/미술/.test(art1)?"미술":"";
  const a2=/음악/.test(art2)?"음악":/미술/.test(art2)?"미술":"";
  if((a1||a2)&&a1!==a2)errors.push({type:"예술과목 연계오류",term:"2-1 → 2-2",detail:`${art1||"미신청"} → ${art2||"미신청"}`});
  if(!first.length||!second.length)errors.push({type:"신청 누락",term:!first.length?"2-1":"2-2",detail:"해당 학기 선택과목이 비어 있습니다."});
  return errors;
}
function uepSelectionDataset(){
  const rows=uepActiveSelectionRows(),dorm=uepDormStudentIds(),applications=[];
  rows.forEach(row=>{
    const student=row.__student,avg=uepStudentGradeAverage(student.id);
    ["2-1","2-2"].forEach(term=>uepSelectionTermSubjects(row,term).forEach(subject=>applications.push({term,subject,row,student,avg,dorm:dorm.has(String(student.id||student.studentNo||""))||dorm.has(String(student.studentNo||""))})));
  });
  const subjects=new Map();
  applications.forEach(app=>{const key=`${app.term}|${app.subject}`;if(!subjects.has(key))subjects.set(key,{key,term:app.term,subject:app.subject,students:[]});subjects.get(key).students.push(app);});
  subjects.forEach(group=>{group.students.sort((a,b)=>(a.avg??99)-(b.avg??99)||String(a.student.studentNo).localeCompare(String(b.student.studentNo)));group.students.forEach((x,i)=>{x.expectedRank=x.avg==null?null:i+1;x.expectedGrade=x.avg==null?"-":uepExpectedGrade(i+1,group.students.filter(s=>s.avg!=null).length);});group.sectionCount=Math.max(1,Math.ceil(group.students.length/30));});
  const errors=rows.flatMap(row=>uepSelectionErrors(row).map(error=>({row,student:row.__student,...error})));
  return {rows,applications,subjects:[...subjects.values()].sort((a,b)=>a.term.localeCompare(b.term)||b.students.length-a.students.length||a.subject.localeCompare(b.subject,"ko")),errors};
}
function uepSelectionSms(student,errors){
  const lines=errors.map((x,i)=>`${i+1}. ${x.type}: ${x.detail}`).join("\n");
  return `[운호고 선택과목 보완 안내]\n${student.name} 학생의 2학년 선택과목 신청에서 확인이 필요한 내용이 있습니다.\n${lines}\n신청 내용을 확인한 뒤 담당 선생님의 안내에 따라 수정해 주세요.`;
}
function selectionView(){
  const data=uepSelectionDataset(),modes=[["overview","신청 현황"],["errors","오류 검증"],["subjects","과목별 인원·명단"],["messages","보완 문자메시지"]];
  const tabs=`<div class="selection-analysis-tabs">${modes.map(([id,label])=>`<button data-selection-analysis-mode="${id}" class="${selectionAnalysisMode===id?"active":""}">${label}</button>`).join("")}</div>`;
  const errorStudents=new Set(data.errors.map(x=>x.student.id)).size;
  let body="";
  if(selectionAnalysisMode==="overview"){
    body=`<section class="selection-hero"><div><small>06A · LIVE APPLICATION</small><h2>2학년 선택과목 신청 분석</h2><p>전출·자퇴를 제외한 현재 재적 학생을 기준으로 신청과 연계 오류를 확인합니다.</p></div><div><span><b>${data.rows.length}</b>재적 학생</span><span><b>${data.subjects.length}</b>학기·과목</span><span><b>${errorStudents}</b>오류 학생</span></div></section><div class="selection-kpi-grid">${data.subjects.slice(0,12).map(x=>`<button data-selection-subject="${escapeHtml(x.key)}"><small>${x.term}</small><b>${escapeHtml(x.subject)}</b><span>${x.students.length}명 · 예상 ${x.sectionCount}분반</span></button>`).join("")}</div>`;
  }else if(selectionAnalysisMode==="errors"){
    const groups=[...new Set(data.errors.map(x=>x.type))];
    body=`<section class="selection-section"><header><div><small>VALIDATION</small><h3>선택과목 오류 검증</h3></div><span>${data.errors.length}건 · ${errorStudents}명</span></header>${groups.map(type=>`<div class="selection-error-group"><h4>${escapeHtml(type)} <span>${data.errors.filter(x=>x.type===type).length}건</span></h4>${data.errors.filter(x=>x.type===type).map(x=>`<article><b>${escapeHtml(x.student.studentNo)} ${escapeHtml(x.student.name)}</b><span>${escapeHtml(x.term)}</span><p>${escapeHtml(x.detail)}</p></article>`).join("")}</div>`).join("")||'<div class="query-empty"><b>확인된 오류가 없습니다.</b></div>'}</section>`;
  }else if(selectionAnalysisMode==="subjects"){
    const selected=data.subjects.find(x=>x.key===selectionSubjectFilter)||data.subjects[0];selectionSubjectFilter=selected?.key||"";
    const options=data.subjects.map(x=>`<option value="${escapeHtml(x.key)}" ${x.key===selectionSubjectFilter?"selected":""}>${x.term} · ${escapeHtml(x.subject)} (${x.students.length}명)</option>`).join("");
    body=`<section class="selection-section"><header><div><small>SUBJECT ROSTER · ESTIMATE</small><h3>과목별 신청인원·명단·예상등수</h3></div><label>과목 선택<select id="selectionSubjectSelect">${options}</select></label></header>${selected?`<div class="selection-subject-summary"><span><small>신청인원</small><b>${selected.students.length}명</b></span><span><small>예상분반</small><b>${selected.sectionCount}개</b></span><span><small>분반당 평균</small><b>${Math.ceil(selected.students.length/selected.sectionCount)}명</b></span></div><div class="selection-roster"><div class="selection-roster-head"><span>학번·성명</span><span>구분</span><span>1학년 내신평균</span><span>예상등수</span><span>예상등급</span></div>${selected.students.map(x=>`<article><b>${escapeHtml(x.student.studentNo)} ${escapeHtml(x.student.name)}</b><span>${x.dorm?'<i class="dorm-badge">학사</i>':'-'}</span><span>${x.avg==null?'성적 없음':x.avg.toFixed(2)}</span><span>${x.expectedRank?`${x.expectedRank}위`:'-'}</span><span>${x.expectedGrade==='-'?'-':`${x.expectedGrade}등급`}</span></article>`).join("")}</div><p class="selection-estimate-note">예상등수·등급은 해당 과목 신청자 중 1학년 내신 등급 평균을 기준으로 한 상담용 추정치입니다.</p>`:'<div class="query-empty"><b>선택과목 자료가 없습니다.</b></div>'}</section>`;
  }else{
    const students=[...new Map(data.errors.map(x=>[x.student.id,x.student])).values()];
    body=`<section class="selection-section"><header><div><small>STUDENT SMS</small><h3>오류 학생 보완 문자메시지</h3></div><span>${students.length}명</span></header><div class="selection-message-list">${students.map(student=>{const errors=data.errors.filter(x=>x.student.id===student.id),sms=uepSelectionSms(student,errors);return `<article><header><b>${escapeHtml(student.studentNo)} ${escapeHtml(student.name)}</b><span>${errors.length}건</span></header><textarea readonly>${escapeHtml(sms)}</textarea><button class="btn primary" data-copy-selection-sms="${escapeHtml(student.id)}">문자 복사</button></article>`;}).join("")||'<div class="query-empty"><b>문자를 보낼 오류 학생이 없습니다.</b></div>'}</div></section>`;
  }
  return `<div class="module-page selection-analysis-page">${tabs}${body}</div>`;
}
function sdgsView(){
  recordMode="sdgs";recordQueryMode="student";
  const view=recordsView();
  return `<div class="standalone-feature-head"><small>SDGs EVIDENCE</small><h2>SDGs 근거지도·근거보완</h2><p>학생별 실제 활동·보고서 근거를 확인하고, 부족한 근거는 다음 상담과 탐구활동으로 보완합니다.</p></div>${view}`;
}
function recordcheckView(){
  return `<div class="module-page recordcheck-page"><div class="standalone-feature-head"><small>NEIS LOCAL CHECK</small><h2>세특 오류검증</h2><p>나이스 교과 세특 엑셀을 현재 PC에서만 읽어 금지표현·기재요령·반복문장·수식·영문표현을 검사합니다.</p></div><div id="standaloneRecordcheckMount"></div></div>`;
}
function bindSelectionAnalysis(){
  $$('[data-selection-analysis-mode]').forEach(button=>button.onclick=()=>{selectionAnalysisMode=button.dataset.selectionAnalysisMode||"overview";render("selection");});
  $$('[data-selection-subject]').forEach(button=>button.onclick=()=>{selectionSubjectFilter=button.dataset.selectionSubject||"";selectionAnalysisMode="subjects";render("selection");});
  const select=$('#selectionSubjectSelect');if(select)select.onchange=()=>{selectionSubjectFilter=select.value;render("selection");};
  $$('[data-copy-selection-sms]').forEach(button=>button.onclick=async()=>{const data=uepSelectionDataset(),student=data.rows.map(x=>x.__student).find(x=>String(x.id)===String(button.dataset.copySelectionSms));if(!student)return;const text=uepSelectionSms(student,data.errors.filter(x=>x.student.id===student.id));try{await navigator.clipboard.writeText(text);toast('보완 문자메시지를 복사했습니다.');}catch{toast('문자 복사에 실패했습니다.');}});
}

