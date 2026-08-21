// __UEP_CURRICULUM_SDGS_INTEGRATION_08105__
selectionAnalysisMode="history";

function uepSelectionDataset(){
  const rows=uepActiveSelectionRows(),dorm=uepDormStudentIds(),applications=[];
  rows.forEach(row=>{
    const student=row.__student,avg=uepStudentGradeAverage(student.id);
    ["2-1","2-2","3-1","3-2"].forEach(term=>uepSelectionTermSubjects(row,term).forEach(subject=>applications.push({term,subject,row,student,avg,dorm:dorm.has(String(student.id||student.studentNo||""))||dorm.has(String(student.studentNo||""))})));
  });
  const subjects=new Map();
  applications.forEach(app=>{const key=`${app.term}|${app.subject}`;if(!subjects.has(key))subjects.set(key,{key,term:app.term,subject:app.subject,students:[]});subjects.get(key).students.push(app);});
  subjects.forEach(group=>{group.students.sort((a,b)=>(a.avg??99)-(b.avg??99)||String(a.student.studentNo).localeCompare(String(b.student.studentNo)));const graded=group.students.filter(x=>x.avg!=null).length;group.students.forEach((x,i)=>{x.expectedRank=x.avg==null?null:i+1;x.expectedGrade=x.avg==null?"-":uepExpectedGrade(i+1,graded);});group.sectionCount=Math.max(1,Math.ceil(group.students.length/30));});
  const errors=rows.flatMap(row=>uepSelectionErrors08105(row).map(error=>({row,student:row.__student,...error})));
  return {rows,applications,subjects:[...subjects.values()].sort((a,b)=>a.term.localeCompare(b.term)||b.students.length-a.students.length||a.subject.localeCompare(b.subject,"ko")),errors};
}
function uepSelectionErrors08105(row){
  const errors=uepSelectionErrors(row),terms=["2-1","2-2","3-1","3-2"];
  const seen=new Map();
  terms.forEach(term=>{
    const subjects=uepSelectionTermSubjects(row,term);
    if(!subjects.length&&!errors.some(x=>x.type==="신청 누락"&&x.term===term))errors.push({type:"신청 누락",term,detail:"해당 학기 선택과목이 비어 있습니다."});
    subjects.forEach(subject=>{const normalized=subject.replace(/\s+/g,"");if(!seen.has(normalized))seen.set(normalized,[]);seen.get(normalized).push(term);});
  });
  seen.forEach((subjectTerms,subject)=>{if(subjectTerms.length>1)errors.push({type:"학기간 동일과목 중복",term:subjectTerms.join(" · "),detail:`${subject} 과목이 여러 학기에 중복 신청되었습니다.`});});
  return errors;
}
function uepCurriculumTabs(){
  return `<div class="selection-analysis-tabs curriculum-analysis-tabs"><button data-selection-analysis-mode="history" class="${selectionAnalysisMode==="history"?"active":""}">반별·학생별 신청이력</button><button data-selection-analysis-mode="errors" class="${selectionAnalysisMode==="errors"?"active":""}">오류 검증</button><button data-selection-analysis-mode="subjects" class="${selectionAnalysisMode==="subjects"?"active":""}">과목별 인원·명단</button><button data-selection-analysis-mode="messages" class="${selectionAnalysisMode==="messages"?"active":""}">보완 문자메시지</button></div>`;
}
const __uepSelectionView08104=selectionView;
const __uepRecordsView08104=recordsView;
recordsView=function(){
  const base=__uepRecordsView08104();
  if(recordMode==="curriculum"){
    if(selectionAnalysisMode==="history")return base.replace('<div class="record-query-bar">',uepCurriculumTabs()+'<div class="record-query-bar">');
    const mainTabs=(base.match(/<div class="record-main-tabs">[\s\S]*?<\/div>/)||[""])[0];
    let analysis=__uepSelectionView08104();
    analysis=analysis.replace(/<div class="selection-analysis-tabs">[\s\S]*?<\/div>/,uepCurriculumTabs());
    return `<div class="module-page records-v0601">${mainTabs}${analysis}</div>`;
  }
  if(recordMode==="sdgs")return base.replace('<div class="record-student-toolbar personal-only">',uepSdgsSupplementPanel()+'<div class="record-student-toolbar personal-only">');
  return base;
};
function uepSdgsSupplementPanel(){
  const student=(readonlyCache?.students||[]).find(s=>String(s.id)===String(recordStudentId));
  if(!student)return "";
  const bundle=studentRecordBundle(student),reports=bundle.reports||[],activities=bundle.activities||[],programs=bundle.programs||[];
  const questions=[];
  if(!reports.length)questions.push("참여 활동에서 새롭게 알게 된 사실과 생각이 달라진 지점을 구체적으로 적어 주세요.");
  if(!activities.length)questions.push("교실·동아리·봉사활동에서 발견한 사회·공동체·환경 문제는 무엇인가요?");
  if(!programs.length)questions.push("관심 진로와 연결하여 다음에 더 탐구하고 싶은 문제와 실천 계획을 적어 주세요.");
  if(!questions.length)questions.push("기존 근거 중 가장 의미 있는 활동을 골라 문제 발견 → 탐구 → 변화 → 후속 실천의 순서로 보완해 주세요.");
  const text=`[SDGs 근거 보완 안내] ${student.studentNo||""} ${student.name||""}\n`+questions.map((x,i)=>`${i+1}. ${x}`).join("\n");
  return `<section class="sdgs-supplement-panel"><header><div><small>EVIDENCE SUPPLEMENT</small><h3>SDGs 근거 보완</h3><p>현재 연결된 활동 ${activities.length}건 · 프로그램 ${programs.length}건 · 보고서 ${reports.length}건을 기준으로 보완 질문을 제안합니다.</p></div><button class="btn primary" data-copy-sdgs-supplement>보완 질문 복사</button></header><ul>${questions.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul><textarea id="sdgsSupplementText" readonly>${escapeHtml(text)}</textarea></section>`;
}
function bindSelectionAnalysis(){
  $$('[data-selection-analysis-mode]').forEach(button=>button.onclick=()=>{selectionAnalysisMode=button.dataset.selectionAnalysisMode||"history";render("records");});
  $$('[data-selection-subject]').forEach(button=>button.onclick=()=>{selectionSubjectFilter=button.dataset.selectionSubject||"";selectionAnalysisMode="subjects";render("records");});
  const select=$('#selectionSubjectSelect');if(select)select.onchange=()=>{selectionSubjectFilter=select.value;render("records");};
  $$('[data-copy-selection-sms]').forEach(button=>button.onclick=async()=>{const data=uepSelectionDataset(),student=data.rows.map(x=>x.__student).find(x=>String(x.id)===String(button.dataset.copySelectionSms));if(!student)return;const text=uepSelectionSms(student,data.errors.filter(x=>x.student.id===student.id));try{await navigator.clipboard.writeText(text);toast('보완 문자메시지를 복사했습니다.');}catch{toast('문자 복사에 실패했습니다.');}});
  $('[data-copy-sdgs-supplement]')?.addEventListener('click',async()=>{const text=$('#sdgsSupplementText')?.value||'';try{await navigator.clipboard.writeText(text);toast('SDGs 근거 보완 질문을 복사했습니다.');}catch{toast('보완 질문 복사에 실패했습니다.');}});
}
