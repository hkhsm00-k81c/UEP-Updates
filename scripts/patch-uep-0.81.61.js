const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const gFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}
function replaceOnce(oldText,newText,label){assert(g.includes(oldText),label+' anchor not found');g=g.replace(oldText,newText);}

// Version
g=g.replace(/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/,'const APP_VERSION = "0.81.61";');

// 1) 교육과정 교과군: 제2외국어·한문·정보를 국영수보다 우선 판정.
const oldGroup="function uepSubjectGroup08128(subject){const group=uepSelectionCurriculumGroup08129(subject);if(/국어|영어|수학/.test(group))return'국·영·수';if(/사회/.test(group))return'사회';if(/과학/.test(group))return'과학';if(/예술|체육/.test(group))return'음·미·체';if(/정보|제2외국어|한문|기술/.test(group))return'중국어·일본어·정보';const x=String(subject||'');if(/국어|문학|독서|수학|미적분|기하|영어/.test(x))return'국·영·수';if(/사회|세계사|윤리|지리|정치|경제/.test(x))return'사회';if(/물리|화학|생명|지구|과학/.test(x))return'과학';if(/음악|미술|체육|스포츠/.test(x))return'음·미·체';return'중국어·일본어·정보';}";
const newGroup="function uepSubjectGroup08128(subject){const group=uepSelectionCurriculumGroup08129(subject),x=String(subject||'').replace(/\\*/g,'').trim();/* __UEP_08161_CURRICULUM_GROUP_PRIORITY__ */if(/정보|제2외국어|외국어|한문/.test(group)||/^(중국어|일본어|중국어 회화|일본어 회화|심화 중국어|심화 일본어|한문|한문 고전 읽기|중국 문화|일본 문화|언어생활과 한자|인공지능 기초|정보과학|데이터 과학|소프트웨어와 생활)$/.test(x))return'일본어·중국어·한문·정보';if(/국어|영어|수학/.test(group))return'국·영·수';if(/사회/.test(group))return'사회';if(/과학/.test(group))return'과학';if(/예술|체육/.test(group))return'음·미·체';if(/국어|문학|독서|수학|미적분|기하|영어/.test(x))return'국·영·수';if(/사회|세계사|윤리|지리|정치|경제|역사/.test(x))return'사회';if(/물리|화학|생명|지구|과학|역학|전자기|세포|물질대사|유전|행성우주/.test(x))return'과학';if(/음악|미술|체육|스포츠/.test(x))return'음·미·체';return'일본어·중국어·한문·정보';}";
replaceOnce(oldGroup,newGroup,'curriculum group');
g=g.replaceAll('중국어·일본어·정보','일본어·중국어·한문·정보');

// 2) 문이과 교차오류 분석 상태와 4개 메뉴.
const oldVars='let curriculumWorkspaceMode="students",curriculumErrorOnly=false,curriculumErrorType="all",curriculumTermFilter="2-1",curriculumSubjectKey="",curriculumRosterSort="grade";';
const newVars='let curriculumWorkspaceMode="students",curriculumErrorOnly=false,curriculumErrorType="all",curriculumTermFilter="2-1",curriculumSubjectKey="",curriculumRosterSort="grade",curriculumCrossClass="all",curriculumCrossType="all",curriculumCrossSort="class";';
replaceOnce(oldVars,newVars,'curriculum vars');
const oldNav='function uepCurriculumNav(){return \'<div class="selection-analysis-tabs curriculum-final-tabs"><button data-curriculum-workspace="students" class="\'+(curriculumWorkspaceMode===\'students\'?\'active\':\'\')+\'">학생신청</button><button data-curriculum-workspace="subjects" class="\'+(curriculumWorkspaceMode===\'subjects\'?\'active\':\'\')+\'">과목별 신청현황</button></div>\';}';
const newNav='function uepCurriculumNav(){return \'<div class="selection-analysis-tabs curriculum-final-tabs"><button data-curriculum-workspace="students" class="\'+(curriculumWorkspaceMode===\'students\'?\'active\':\'\')+\'">학생신청</button><button data-curriculum-workspace="cross" class="\'+(curriculumWorkspaceMode===\'cross\'?\'active\':\'\')+\'">문이과 교차오류</button><button data-curriculum-workspace="subjects" class="\'+(curriculumWorkspaceMode===\'subjects\'?\'active\':\'\')+\'">과목별 신청현황</button></div>\';}';
replaceOnce(oldNav,newNav,'curriculum nav');

const crossCode=`
// __UEP_08161_CROSS_TRACK_VIEW__
function uepCrossTrackKind08161(subject){
  const x=String(subject||'').replace(/\\*/g,'').trim();
  const social=new Set(['세계사','현대사회와 윤리','도시의 미래 탐구','경제','세계시민과 지리','사회와 문화','동아시아 역사 기행','인문학과 윤리','한국지리 탐구','정치','법과 사회','윤리와 사상','역사로 탐구하는 현대세계','여행지리','사회문제탐구','금융과 경제생활','윤리문제탐구']);
  const science=new Set(['물리학','화학','생명과학','지구과학','역학과 에너지','물질과 에너지','세포와 물질대사','지구시스템과학','전자기와 양자','화학 반응의 세계','생물의 유전','행성우주과학','과학의 역사와 문화','기후변화와 환경생태','융합과학 탐구']);
  if(social.has(x))return'social';if(science.has(x))return'science';return'';
}
function uepCrossTrackRows08161(){
  const terms=['2-1','2-2','3-1','3-2'],data=uepSelectionDataset();
  return data.rows.filter(uepSelectionActiveRow08129).map(row=>{
    const student=row.__student,byTerm={};let science=0,social=0;
    terms.forEach(term=>{const subjects=uepSelectionSubjectsInTerm08129(row,term),s=subjects.filter(x=>uepCrossTrackKind08161(x)==='science'),h=subjects.filter(x=>uepCrossTrackKind08161(x)==='social');byTerm[term]={science:s.length,social:h.length,scienceSubjects:s,socialSubjects:h};science+=s.length;social+=h.length;});
    const type=science&&social?'mixed':science?'science':social?'social':'none';
    const mixed32=byTerm['3-2'].science>0&&byTerm['3-2'].social>0;
    return{row,student,byTerm,science,social,type,mixed32,avg:uepStudentGradeAverage(student?.id)};
  }).filter(x=>x.science+x.social>0);
}
function uepCrossTrackView08161(){
  let rows=uepCrossTrackRows08161();
  if(curriculumCrossClass!=='all')rows=rows.filter(x=>String(recordStudentClass(x.student))===String(curriculumCrossClass));
  if(curriculumCrossType==='science')rows=rows.filter(x=>x.type==='science');
  else if(curriculumCrossType==='social')rows=rows.filter(x=>x.type==='social');
  else if(curriculumCrossType==='mixed')rows=rows.filter(x=>x.type==='mixed');
  else if(curriculumCrossType==='mixed32')rows=rows.filter(x=>x.mixed32);
  rows.sort(curriculumCrossSort==='grade'?((a,b)=>(a.avg??99)-(b.avg??99)||String(a.student.studentNo||'').localeCompare(String(b.student.studentNo||''))):((a,b)=>String(a.student.studentNo||'').localeCompare(String(b.student.studentNo||''))));
  const all=uepCrossTrackRows08161(),count=t=>t==='mixed32'?all.filter(x=>x.mixed32).length:all.filter(x=>x.type===t).length;
  const filters='<div class="cross-track-controls"><label>반<select data-cross-class><option value="all">전체 반</option>'+Array.from({length:9},(_,i)=>String(i+1)).map(c=>'<option value="'+c+'" '+(curriculumCrossClass===c?'selected':'')+'>'+c+'반</option>').join('')+'</select></label><label>유형<select data-cross-type><option value="all">전체</option><option value="science" '+(curriculumCrossType==='science'?'selected':'')+'>과학만</option><option value="social" '+(curriculumCrossType==='social'?'selected':'')+'>사회만</option><option value="mixed" '+(curriculumCrossType==='mixed'?'selected':'')+'>4학기 혼합</option><option value="mixed32" '+(curriculumCrossType==='mixed32'?'selected':'')+'>3-2 혼합</option></select></label><label>정렬<select data-cross-sort><option value="class" '+(curriculumCrossSort==='class'?'selected':'')+'>반·학번순</option><option value="grade" '+(curriculumCrossSort==='grade'?'selected':'')+'>1학년 내신평균순</option></select></label></div>';
  const summary='<div class="cross-track-summary"><article><small>분석대상</small><b>'+all.length+'명</b></article><article><small>과학만</small><b>'+count('science')+'명</b></article><article><small>사회만</small><b>'+count('social')+'명</b></article><article><small>4학기 혼합</small><b>'+count('mixed')+'명</b></article><article class="warn"><small>3-2 혼합</small><b>'+count('mixed32')+'명</b></article></div>';
  const cell=(x,term)=>{const t=x.byTerm[term];return '<span title="과학: '+escapeHtml(t.scienceSubjects.join(', ')||'-')+' / 사회: '+escapeHtml(t.socialSubjects.join(', ')||'-')+'"><b>과 '+t.science+'</b><em>사 '+t.social+'</em></span>';};
  const body=rows.map(x=>'<button class="cross-track-row '+(x.mixed32?'danger':x.type==='mixed'?'watch':'')+'" data-cross-student="'+escapeHtml(x.student.id)+'"><b>'+escapeHtml(x.student.studentNo||'')+' '+escapeHtml(x.student.name||'')+'</b><span>'+escapeHtml(recordStudentClass(x.student))+'반</span>'+['2-1','2-2','3-1','3-2'].map(t=>cell(x,t)).join('')+'<span><strong>과 '+x.science+' / 사 '+x.social+'</strong><em>'+(x.mixed32?'3-2 혼합':x.type==='mixed'?'4학기 혼합':x.type==='science'?'과학만':'사회만')+'</em></span><span>'+(x.avg==null?'-':Number(x.avg).toFixed(2))+'</span></button>').join('');
  return '<style>.cross-track-controls{display:flex;gap:10px;justify-content:flex-end;margin:14px 0}.cross-track-controls label{display:flex;gap:6px;align-items:center}.cross-track-summary{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:12px 0}.cross-track-summary article{padding:14px;border:1px solid #dce9e6;border-radius:14px;background:#f8fbfa}.cross-track-summary small{display:block;color:#668}.cross-track-summary b{font-size:20px}.cross-track-summary .warn{background:#fff5f1;border-color:#f2c9bd}.cross-track-table{border:1px solid #dbe7e5;border-radius:16px;overflow:hidden}.cross-track-head,.cross-track-row{display:grid;grid-template-columns:1.5fr .55fr repeat(4,1fr) 1.1fr .65fr;gap:8px;align-items:center;width:100%;padding:11px 14px;border:0;border-bottom:1px solid #edf1f0;text-align:left;background:#fff}.cross-track-head{font-weight:700;background:#f3f8f7}.cross-track-row>span{display:flex;gap:6px;align-items:center}.cross-track-row span em{font-style:normal;color:#8a5a47}.cross-track-row.watch{background:#fffdf4}.cross-track-row.danger{background:#fff3ef}.cross-track-row:hover{background:#edf9f6}.cross-track-intro{padding:16px 18px;border:1px solid #dce9e6;border-radius:16px;background:#f8fbfa}.cross-track-intro h3{margin:0 0 6px}.cross-track-intro p{margin:0;color:#667}</style><section class="cross-track-intro"><h3>문이과 교차오류</h3><p>260명 기준 선택과목 중 사회·과학 계열을 2-1부터 3-2까지 전수 비교합니다. 한 과목이라도 해당 계열 신청이 있으면 포함하며, 혼합은 상담 확인 대상으로 표시합니다.</p></section>'+summary+filters+'<div class="cross-track-table"><div class="cross-track-head"><span>학번·학생</span><span>반</span><span>2-1</span><span>2-2</span><span>3-1</span><span>3-2</span><span>4학기 누계</span><span>1학년 내신</span></div>'+body+'</div>';
}
`;
const subjectStatusAnchor="function uepSubjectStatus(group){";
assert(g.includes(subjectStatusAnchor),'subject status anchor missing');
g=g.replace(subjectStatusAnchor,crossCode+'\n'+subjectStatusAnchor);

const oldFinal="function uepCurriculumFinalView(){return '<div class=\"module-page records-v0601 curriculum-final-page\">'+uepMainRecordTabs()+uepCurriculumNav()+(curriculumWorkspaceMode==='students'?uepStudentApplicationView():uepSubjectApplicationView())+'</div>';}";
const newFinal="function uepCurriculumFinalView(){const workspace=curriculumWorkspaceMode==='students'?uepStudentApplicationView():curriculumWorkspaceMode==='cross'?uepCrossTrackView08161():uepSubjectApplicationView();return '<div class=\"module-page records-v0601 curriculum-final-page\">'+uepMainRecordTabs()+uepCurriculumNav()+workspace+'</div>';}";
replaceOnce(oldFinal,newFinal,'curriculum final');

const oldBind="$$('[data-curriculum-workspace]').forEach(b=>b.onclick=async()=>{const next=b.dataset.curriculumWorkspace;if(next==='subjects'&&!(await unlockSubjectConfidential()))return;curriculumWorkspaceMode=next;render('records');});";
const newBind="$$('[data-curriculum-workspace]').forEach(b=>b.onclick=async()=>{const next=b.dataset.curriculumWorkspace;if((next==='subjects'||next==='cross')&&!(await unlockSubjectConfidential()))return;curriculumWorkspaceMode=next;render('records');});";
replaceOnce(oldBind,newBind,'workspace password gate');
const bindAnchor="  $('[data-curriculum-error-type]')?.addEventListener('change',e=>{curriculumErrorType=e.target.value;render('records');});";
assert(g.includes(bindAnchor),'bind anchor missing');
g=g.replace(bindAnchor,bindAnchor+"\n  $('[data-cross-class]')?.addEventListener('change',e=>{curriculumCrossClass=e.target.value;render('records');});\n  $('[data-cross-type]')?.addEventListener('change',e=>{curriculumCrossType=e.target.value;render('records');});\n  $('[data-cross-sort]')?.addEventListener('change',e=>{curriculumCrossSort=e.target.value;render('records');});\n  $$('[data-cross-student]').forEach(b=>b.onclick=()=>openCurriculumStudentSidePanel(b.dataset.crossStudent));");

// 3) 과거 3-tab 보강 코드를 4-tab + 비밀번호 게이트와 충돌하지 않게 정리.
replaceOnce("row.style.display='grid';row.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';row.style.gap='10px';","row.style.display='grid';row.style.gridTemplateColumns='repeat(4,minmax(0,1fr))';row.style.gap='10px';",'legacy tab grid');
replaceOnce("[planBtn,student,subject].forEach(b=>{b.style.width='100%';b.style.margin='0';});\n   if(!privileged()){subject.disabled=true;subject.setAttribute('aria-disabled','true');subject.title='관리자·학년부장 전용 대외비';subject.style.opacity='.48';subject.style.cursor='not-allowed';subject.textContent='🔒 과목별 신청현황';}","const cross=row.querySelector('[data-curriculum-workspace=\"cross\"]');[planBtn,student,cross,subject].filter(Boolean).forEach(b=>{b.style.width='100%';b.style.margin='0';b.disabled=false;b.removeAttribute('aria-disabled');b.style.opacity='';b.style.cursor='';});/* __UEP_08161_PASSWORD_GATE_NOT_ROLE_DISABLE__ */",'legacy role disable');
g=g.replaceAll('setActive([planBtn,student,subject]','setActive([planBtn,student,cross,subject].filter(Boolean)');

// 4) 공결 대시보드는 정상 출결 메뉴와 같은 비교함수를 직접 호출하되, 다른 야자/지각/공통 날짜 로직은 건드리지 않음.
// upstream 수집 경로는 별도 진단 후 필요한 경우 이 스크립트에서 추가 패치됩니다.
const dashOld="const official=(readonlyCache?.officialAttendance||[]).filter(r=>uepComparableDate(r.date||r.day)===basisDate).map(r=>({...r,dashboardStatusType:dashboardOfficialAttendanceLabel(r,'공결')}));";
const dashNew="const official=(readonlyCache?.officialAttendance||[]).filter(r=>{/* __UEP_08161_DASHBOARD_OFFICIAL_DATE_SCOPE__ */return uepComparableDate(r.date||r.day||r.rawDate||r['일자']||r['출결일자'],basisDate)===basisDate;}).map(r=>({...r,dashboardStatusType:dashboardOfficialAttendanceLabel(r,'공결')}));";
replaceOnce(dashOld,dashNew,'dashboard official date scope');

for(const marker of ['const APP_VERSION = "0.81.61";','__UEP_08161_CURRICULUM_GROUP_PRIORITY__','__UEP_08161_CROSS_TRACK_VIEW__','__UEP_08161_PASSWORD_GATE_NOT_ROLE_DISABLE__','__UEP_08161_DASHBOARD_OFFICIAL_DATE_SCOPE__'])assert(g.includes(marker),'missing marker '+marker);
assert(g.includes("(next==='subjects'||next==='cross')&&!(await unlockSubjectConfidential())"),'cross password gate missing');
assert(!g.includes("subject.title='관리자·학년부장 전용 대외비'"),'legacy subject role disable remains');
fs.writeFileSync(gFile,g,'utf8');
console.log('UEP 0.81.61 curriculum grouping, cross-track analysis, password gate, dashboard official scope applied');
