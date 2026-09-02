const fs=require('fs');
const path=require('path');

const root=process.argv[2];
if(!root)throw new Error('usage: node patch-uep-08212-native-dashboard.js <app-root>');
const app=path.join(root,'resources','app');
const gPath=path.join(app,'gyomuon.js');
const cssPath=path.join(app,'gyomuon.css');
const pkgPath=path.join(app,'package.json');
let g=fs.readFileSync(gPath,'utf8');
let css=fs.readFileSync(cssPath,'utf8');
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));

const must=(v,m)=>{if(!v)throw new Error(m)};
must(g.includes('const APP_VERSION = "0.82.11";'),'0.82.11 version missing');
g=g.replace('const APP_VERSION = "0.82.11";','const APP_VERSION = "0.82.12";');
pkg.version='0.82.12';

function removeMarked(text,start,end){
  const a=text.indexOf(start),b=text.indexOf(end);
  if(a<0)return text;
  if(b<a)throw new Error(`broken marker ${start}`);
  return text.slice(0,a)+text.slice(b+end.length);
}
g=removeMarked(g,'/* UEP_08210_DASHBOARD_INTEGRATION_START */','/* UEP_08210_DASHBOARD_INTEGRATION_END */');
g=removeMarked(g,'/* UEP_08211_ADMISSIONS_COUNSELING_START */','/* UEP_08211_ADMISSIONS_COUNSELING_END */');
css=removeMarked(css,'/* UEP_08210_DASHBOARD_INTEGRATION_CSS */','/* UEP_08211_ADMISSIONS_COUNSELING_CSS */');
const css08211=css.indexOf('/* UEP_08211_ADMISSIONS_COUNSELING_CSS */');
if(css08211>=0)css=css.slice(0,css08211);

function replaceFunction(source,name,replacement){
  const start=source.indexOf(`function ${name}(`);
  if(start<0)throw new Error(`function not found: ${name}`);
  const brace=source.indexOf('{',start);
  let depth=0,quote='',escaped=false,templateDepth=0;
  for(let i=brace;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(quote){
      if(escaped){escaped=false;continue;}
      if(ch==='\\'){escaped=true;continue;}
      if(quote==='`'&&ch==='$'&&next==='{'){templateDepth++;i++;continue;}
      if(quote==='`'&&ch==='}'&&templateDepth){templateDepth--;continue;}
      if(ch===quote&&!templateDepth)quote='';
      continue;
    }
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='/'&&next==='/'){i=source.indexOf('\n',i);if(i<0)break;continue;}
    if(ch==='/'&&next==='*'){i=source.indexOf('*/',i+2)+1;continue;}
    if(ch==='{')depth++;
    if(ch==='}'&&--depth===0)return source.slice(0,start)+replacement+source.slice(i+1);
  }
  throw new Error(`unclosed function: ${name}`);
}

function embeddedSnippet(start,end){
  const source=fs.readFileSync(__filename,'utf8'),match=source.match(new RegExp(`${start}\\r?\\n([\\s\\S]*?)\\r?\\n${end}`));
  if(!match)throw new Error(`embedded snippet missing: ${start}`);
  return match[1];
}
const nativeAdmission=embeddedSnippet('/\\* NATIVE_08212_START','NATIVE_08212_END \\*/');
/* NATIVE_08212_START
function dashboardAdmissionRows(...keys){
  for(const key of keys){const rows=readonlyCache?.[key];if(Array.isArray(rows))return rows;}
  return [];
}
function dashboardAdmissionEnabled(row){return String(row?.['사용여부']??row?.use??'Y').toUpperCase()!=='N';}
function dashboardAdmissionOrder(row){return Number(row?.['노출순서']??row?.order??9999)||9999;}
function dashboardAdmissionNormalizeUniversity(value){return String(value||'').replace(/대학교/g,'대').replace(/\s|\(.*?\)/g,'');}
function dashboardAdmissionTodayIndex(length){if(!length)return 0;const d=new Date(),s=new Date(d.getFullYear(),0,0);return Math.floor((d-s)/86400000)%length;}
function dashboardAdmissionUniversities(){return dashboardAdmissionRows('universityAdmissions','56_대학입시마스터').filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));}
function dashboardAdmissionTodayUniversity(){const rows=dashboardAdmissionUniversities();return rows[dashboardAdmissionTodayIndex(rows.length)]||null;}
function openDashboardAdmissionDialog(title,body){
  document.querySelector('.dashboard-admission-layer')?.remove();
  const layer=document.createElement('div');layer.className='dashboard-admission-layer counsel-reason-layer';
  layer.innerHTML='<div class="dashboard-admission-dialog"><header><div><small>UEP 대입상담 · 교육용 참고</small><h2>'+escapeHtml(title)+'</h2></div><button type="button" data-admission-close>×</button></header><div class="dashboard-admission-body">'+body+'</div></div>';
  document.body.appendChild(layer);const close=()=>layer.remove();layer.querySelector('[data-admission-close]').onclick=close;layer.onclick=e=>{if(e.target===layer)close();};
}
function openDashboardAdmissionBasics(){
  const rows=dashboardAdmissionRows('admissionBasics','52_대입기초').filter(dashboardAdmissionEnabled);
  const detail=q=>rows.find(row=>String(row['주제']||'').includes(q));
  openDashboardAdmissionDialog('대입 기초',`<div class="admission-learning-flow"><section><h3>대입은 수시와 정시로 나뉩니다</h3><div class="admission-two-column"><article><b>수시</b><p>학생부교과 · 학생부종합 · 논술 · 실기·실적으로 선발합니다.</p><small>보통 3학년 1학기까지의 학생부를 활용하지만, 반영 학기와 방식은 대학별로 다르므로 시행계획·모집요강을 확인합니다.</small></article><article><b>정시</b><p>수능 성적이 중심입니다.</p><small>대학마다 국어·수학·영어·탐구 반영비율, 가산점, 학생부·면접 병행 여부가 다릅니다.</small></article></div></section><section><h3>수시에서 꼭 이해할 것</h3><div class="admission-explain-grid"><article><b>언제 지원하나</b><p>3학년 9월 수시 원서접수 후 대학별 평가가 이어집니다.</p></article><article><b>수능최저란</b><p>수시 합격을 위해 충족해야 하는 수능 영역별 최소 기준입니다. 전형에 따라 없을 수도 있습니다.</p></article><article><b>내신 몇 학기인가</b><p>대체로 3학년 1학기까지를 보지만 대학·전형별 반영학기와 교과가 다릅니다.</p></article></div></section><section><h3>현재 1학년의 준비</h3><p>${escapeHtml(detail('선택과목')?.['상세설명']||'희망 계열과 연결되는 선택과목을 설계하고, 내신의 추이·모의고사 학업역량·수업과 탐구의 깊이를 함께 쌓습니다.')}</p><div class="admission-chip-row"><span>내신 기본기</span><span>계열 맞춤 선택과목</span><span>모의고사 점검</span><span>수업·탐구 기록</span></div></section><p class="admission-reference-note">2028 시행계획 기준 교육용 참고 · 2029 최종 모집요강 재확인</p></div>`);
}
function dashboardAdmissionMethod(row){
  const text=[row['선발방식'],row['핵심평가'],row['주요평가자료'],row['한줄요약']].filter(Boolean).join(' ');
  if(row['선발방식'])return String(row['선발방식']);
  const out=[];if(/교과|내신/.test(text))out.push('내신');if(/수능최저|최저/.test(text))out.push('수능최저');if(/서류|학생부/.test(text))out.push('서류');if(/면접/.test(text))out.push('면접');if(/논술/.test(text))out.unshift('논술');if(/수능/.test(text)&&/정시|수능/.test(String(row['전형유형']||'')))return '수능100 또는 영역별 반영';return [...new Set(out)].join(' + ')||'대학별 방식 확인';
}
function dashboardAdmissionStructureRows(){return dashboardAdmissionRows('admissionStructures','57_대학별전형구조DB','universityAdmissionStructures');}
function openDashboardAdmissionUniversityByName(name){const row=dashboardAdmissionUniversities().find(x=>dashboardAdmissionNormalizeUniversity(x['대학명'])===dashboardAdmissionNormalizeUniversity(name));openDashboardUniversityDetail(row||{'대학명':name});}
function openDashboardAdmissionTypes(){
  const types=dashboardAdmissionRows('admissionTypes','53_전형이해').filter(dashboardAdmissionEnabled),structures=dashboardAdmissionStructureRows();
  const groups=[['학생부교과',['내신 중심','내신 + 수능최저','내신 + 서류','내신 + 면접','내신 + 수능최저 + 서류/면접']],['학생부종합',['서류100','서류 + 면접','단계별','수능최저 유/무']],['논술',['논술 중심','교과 병행','수능최저 유/무']],['정시',['수능100','학생부 병행','영역별 반영 차이']]];
  const universityButtons=(group,method)=>{
    const rows=structures.filter(r=>String(r['전형유형']||'').includes(group.replace('정시','수능'))&&dashboardAdmissionMethod(r).replace(/\s/g,'').includes(method.replace(/\s|유\/무/g,'')));
    return rows.length?`<div class="admission-university-buttons">${[...new Set(rows.map(r=>r['대학명']).filter(Boolean))].map(name=>`<button data-admission-university="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}</div>`:'<small>대학별 전형구조DB 연결·확충 중</small>';
  };
  const html=groups.map(([group,methods])=>`<section><h3>${group}</h3>${methods.map(method=>{const row=types.find(r=>String(r['전형유형']||'').includes(group.replace('정시','수능'))&&dashboardAdmissionMethod(r).replace(/\s/g,'').includes(method.replace(/\s|유\/무/g,'')));return `<article><b>${method}</b><p>${escapeHtml(row?.['한줄요약']||row?.['핵심평가']||'대학별 실제 전형명과 반영요소를 비교합니다.')}</p>${universityButtons(group,method)}</article>`;}).join('')}</section>`).join('');
  openDashboardAdmissionDialog('전형 이해 · 대학별 선발방식 비교',`<div class="admission-type-hub">${html}</div><p class="admission-reference-note">2028 시행계획 기준 교육용 참고 · 2029 최종 모집요강 재확인</p>`);
  document.querySelectorAll('[data-admission-university]').forEach(button=>button.onclick=()=>openDashboardAdmissionUniversityByName(button.dataset.admissionUniversity));
}
function openDashboardUniversityDetail(university=dashboardAdmissionTodayUniversity()){
  if(!university)return openDashboardAdmissionDialog('오늘의 대학','<p>56_대학입시마스터 자료를 읽지 못했습니다.</p>');
  const name=university['대학명']||'오늘의 대학',norm=dashboardAdmissionNormalizeUniversity(name);
  const structures=dashboardAdmissionStructureRows().filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);
  const minimums=dashboardAdmissionRows('admissionMinimums','54_수능최저DB').filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);
  const results=dashboardAdmissionRows('admissionResults','55_대학입결DB').filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);
  const admissions=structures.length?structures:minimums;
  openDashboardAdmissionDialog(name,`<div class="admission-university-detail"><section><h3>주요 전형과 선발방식</h3>${admissions.length?admissions.slice(0,18).map(r=>`<article><b>${escapeHtml(r['전형유형']||'전형')} · ${escapeHtml(r['전형명']||'전형명 확인')}</b><p>${escapeHtml(r['선발방식']||dashboardAdmissionMethod(r))}</p><small>수능최저 ${escapeHtml(r['수능최저']||r['수능최저원문']||(String(r['배지사용여부']).toUpperCase()==='N'?'참고/검증중':'미적용 또는 확인 필요'))}</small></article>`).join(''):'<p>대학별 전형구조 자료를 연결 중입니다.</p>'}</section><section><h3>교과·학종·정시 핵심</h3><p>${escapeHtml(university['수시핵심']||'수시 전형별 평가요소를 확인합니다.')}</p><p>${escapeHtml(university['정시핵심']||'정시 영역별 반영비율과 가산점을 확인합니다.')}</p><p><b>과목선택 참고</b> ${escapeHtml(university['과목선택/교과포인트']||'-')}</p></section><section><h3>운호고 실제 입결</h3>${results.length?results.slice(0,12).map(r=>`<article><b>${escapeHtml(r['모집단위']||'모집단위')}</b><p>${escapeHtml(r['전형명(대)']||r['전형명']||'')}</p><small>합격 ${escapeHtml(r['합격자수']||'-')}명 · 최저내신 ${escapeHtml(r['최저내신등급']||'-')}</small></article>`).join(''):'<p>현재 연결된 운호고 실제 입결이 없습니다.</p>'}</section><section><h3>담임 상담 포인트</h3><p>${escapeHtml(university['담임상담체크']||university['카드한줄']||'학생의 내신·선택과목·모의고사·수업 탐구를 대학 전형 구조와 함께 확인합니다.')}</p></section><p class="admission-reference-note">${escapeHtml(university['기준학년도']||'2028')} 기준 · ${escapeHtml(university['자료상태']||'교육용 참고')} · 2029 최종 모집요강 재확인</p></div>`);
}
NATIVE_08212_END */
const insertAt=g.indexOf('function dashboardStudentStatusCompactMarkup()');
must(insertAt>=0,'dashboard status renderer missing');
g=g.slice(0,insertAt)+nativeAdmission+g.slice(insertAt);

const nativeCompact=embeddedSnippet('/\\* NATIVE_COMPACT_START','NATIVE_COMPACT_END \\*/');
/* NATIVE_COMPACT_START
function dashboardStudentStatusCompactMarkup(){
  const todayKey=dateKey(today),yesterday=new Date(today);yesterday.setDate(today.getDate()-1);const yesterdayKey=dateKey(yesterday);
  const official=filterRowsForDashboardStatus(officialAttendanceRowsForDate08162(todayKey));
  const late=filterRowsForDashboardStatus((readonlyCache?.lateAttendance||[]).filter(row=>uepComparableDate(row.date||row.day)===todayKey));
  const night=filterRowsForDashboardStatus((readonlyCache?.nightAttendance||readonlyCache?.attendance||[]).filter(row=>String(row.date||row.day||'').slice(0,10)===yesterdayKey&&nightRecordIsAttendance(row)));
  const currentStudents=filterRowsForDashboardStatus(readonlyCache?.students||[]),u=dashboardAdmissionTodayUniversity();
  const cards=[['status','late','공결/지각',`공결 ${new Set(official.map(attendanceStudentKey)).size} · 지각 ${new Set(late.map(attendanceStudentKey)).size}`],['status','night','야자출결',`${new Set(night.map(attendanceStudentKey)).size}/${currentStudents.length||259}`],['admission','basics','대입 기초','수시·정시와 고1 준비'],['admission','types','전형 이해','대학별 선발방식 비교'],['admission','university','오늘의 대학',u?.['대학명']||'대학 정보']];
  return `<div class="uep-student-status-compact uep-dashboard-five-cards">${cards.map(([type,key,label,value])=>`<button class="${type==='admission'?'dashboard-admission-card':''}" ${type==='status'?`data-dashboard-student-status="${key}"`:`data-dashboard-admission="${key}"`}><span>${label}</span><b>${escapeHtml(value)}</b></button>`).join('')}</div>`;
}
NATIVE_COMPACT_END */
g=replaceFunction(g,'dashboardStudentStatusCompactMarkup',nativeCompact);

const nativeOperations=embeddedSnippet('/\\* NATIVE_OPERATIONS_START','NATIVE_OPERATIONS_END \\*/');
/* NATIVE_OPERATIONS_START
function todayOperationsMarkup(){
  const direct=directNoticeRows().filter(item=>currentUserCanManageNotices()||!currentNoticeReceipt(item)?.dismissed).slice(0,5);
  const automatic=dashboardDeadlineItems().filter(item=>autoNoticeGovernanceStatus(item.source,item.id)==='approved');
  const checklist=dashboardPersonalChecklist();
  const notices=[...direct,...automatic];
  const noticeBody=notices.length?notices.map(item=>item.source?`<button class="work-mini-item deadline" data-auto-deadline-source="${escapeHtml(item.source)}" data-auto-deadline-id="${escapeHtml(String(item.id||''))}"><span><b>${escapeHtml(item.title||'자동 마감공지')}</b><small>${escapeHtml(item.due||'')}</small></span><em>${deadlineBadge(item)}</em></button>`:`<button class="work-mini-item notice" data-work-notice-detail="${escapeHtml(item.id||'')}" data-work-notice-source="connected"><span><b>${escapeHtml(item.title||'학년공지')}</b><small>${escapeHtml(item.author||item.department||'1학년부')}</small></span><em>열기</em></button>`).join(''):'<div class="work-mini-empty">현재 게시 중인 학년공지가 없습니다.</div>';
  const reportRows=dashboardReportStatusRows().filter(row=>row.submitted===false),reportGroups=dashboardStatusStudentGroups(reportRows,{report:true});
  const classCount=classNo=>reportGroups.filter(row=>dashboardStatusClassNo(row)===String(classNo)).length;
  const own=dashboardOwnClassNo(),isHomeroom=currentRoleId()==='homeroom'&&own;
  const reportBody=isHomeroom?`<div class="dashboard-report-own-class">${reportGroups.filter(row=>dashboardStatusClassNo(row)===String(own)).map(row=>`<button data-dashboard-missing-student="${escapeHtml(row.key)}"><b>${escapeHtml(row.studentNo||'')} ${escapeHtml(row.name||'')}</b><small>${dashboardReportGroupState(row).submitted}/${dashboardReportGroupState(row).total}</small></button>`).join('')||'<div class="work-mini-empty">현재 미제출 학생이 없습니다.</div>'}</div>`:`<div class="dashboard-report-class-grid">${Array.from({length:9},(_,i)=>i+1).map(no=>`<button data-dashboard-missing-class="${no}"><b>${no}반</b><span>미제출 ${classCount(no)}명</span></button>`).join('')}</div>`;
  const checklistBody=checklist.length?checklist.map(item=>`<button class="work-mini-item checklist" data-work-edit="checklist" data-work-id="${escapeHtml(item.id||'')}"><span><b>${escapeHtml(item.title||'개인 업무')}</b><small>${escapeHtml(item.date||'기한 없음')}</small></span><em>미완료</em></button>`).join(''):'<div class="work-mini-empty">미완료 체크리스트가 없습니다.</div>';
  return `<article class="card task-card operations-card operations-card-v08212 widget-configurable" ${widgetAttrs('operations')}><div class="card-head"><div><span class="card-icon ci-blue">✓</span><strong>학년업무 · 학생점검</strong></div><div class="operation-head-tools"><button class="text-button notice-add-button" data-notice-add>＋ 공지</button><button class="text-button" data-page="work">내 체크리스트 ${checklist.length}</button></div></div><div class="work-three-grid"><section><header><b>학년공지</b><button data-page="work">전체</button></header><div class="work-panel-scroll">${noticeBody}</div></section><section><header><b>학생상담/점검</b><button data-student-counsel-route>전체</button></header>${dashboardCounselMarkup()}</section><section><header><b>보고서 미제출 현황</b><button data-dashboard-student-status="report">전체</button></header>${reportBody}</section></div><details class="dashboard-checklist-preserved"><summary>내 체크리스트 ${checklist.length}건</summary>${checklistBody}</details></article>`;
}
NATIVE_OPERATIONS_END */
g=replaceFunction(g,'todayOperationsMarkup',nativeOperations);

const bindAnchor="  $$('[data-dashboard-student-status]').forEach((button) => (button.onclick = (event) => { event.preventDefault(); event.stopPropagation(); openDashboardStudentStatus(button.dataset.dashboardStudentStatus); }));";
must(g.includes(bindAnchor),'dashboard binding anchor missing');
g=g.replace(bindAnchor,bindAnchor+String.raw`
  $$('[data-dashboard-admission]').forEach(button=>button.onclick=event=>{event.preventDefault();event.stopPropagation();({basics:openDashboardAdmissionBasics,types:openDashboardAdmissionTypes,university:()=>openDashboardUniversityDetail()}[button.dataset.dashboardAdmission])?.();});
  $$('[data-dashboard-missing-class]').forEach(button=>button.onclick=()=>{openDashboardStudentStatus('report');requestAnimationFrame(()=>$('#drawerBody [data-dashboard-class-card="'+button.dataset.dashboardMissingClass+'"]')?.click());});
  $$('[data-dashboard-missing-student]').forEach(button=>button.onclick=()=>{openDashboardStudentStatus('report');requestAnimationFrame(()=>$('#drawerBody [data-dashboard-board-student="'+button.dataset.dashboardMissingStudent+'"]')?.click());});`);

css+=String.raw`
/* UEP_08212_NATIVE_DASHBOARD_CSS */
.uep-duty-badges{grid-template-columns:minmax(0,1fr)!important;min-width:0!important;overflow:hidden!important}.uep-student-status-compact.uep-dashboard-five-cards{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:6px!important;width:100%!important;min-width:0!important;overflow:hidden!important}.uep-dashboard-five-cards>button{min-width:0!important;width:100%!important;height:42px!important;padding:5px 7px!important;display:grid!important;align-content:center!important;border:1px solid #e2eae7!important;border-radius:10px!important;background:#f8fbfa!important;overflow:hidden!important}.uep-dashboard-five-cards>button span,.uep-dashboard-five-cards>button b{display:block!important;max-width:100%!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.uep-dashboard-five-cards>button span{font-size:9px!important;color:#687b75!important}.uep-dashboard-five-cards>button b{font-size:10px!important;color:#294e43!important}.uep-dashboard-five-cards .dashboard-admission-card{background:#f4f7ff!important;border-color:#dfe5f5!important}.operations-card-v08212{min-width:0;overflow:hidden}.work-three-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;padding:0 12px 10px}.work-three-grid>section{min-width:0;border:1px solid #e2e9e6;border-radius:12px;background:#fff;overflow:hidden}.work-three-grid>section>header{display:flex;justify-content:space-between;align-items:center;padding:8px 9px;border-bottom:1px solid #e6ece9}.work-three-grid>section>header b{font-size:11px}.work-three-grid>section>header button{border:0;background:transparent;color:#2f7d6c;font-size:9px;font-weight:800;cursor:pointer}.work-panel-scroll{max-height:160px;overflow:auto;padding:7px}.work-three-grid .dashboard-counsel-class-grid,.dashboard-report-class-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:7px}.work-three-grid .dashboard-counsel-class-card,.dashboard-report-class-grid button{min-width:0;min-height:38px;padding:5px;border:1px solid #e2e9e6;border-radius:8px;background:#f9fbfa;text-align:left;cursor:pointer}.work-three-grid .dashboard-counsel-class-card b,.work-three-grid .dashboard-counsel-class-card span,.work-three-grid .dashboard-counsel-class-card small,.dashboard-report-class-grid b,.dashboard-report-class-grid span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.work-three-grid .dashboard-counsel-class-card b,.dashboard-report-class-grid b{font-size:10px}.work-three-grid .dashboard-counsel-class-card span,.work-three-grid .dashboard-counsel-class-card small,.dashboard-report-class-grid span{font-size:8px;color:#71817c}.dashboard-report-own-class{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:7px}.dashboard-report-own-class button{min-width:0;border:1px solid #e2e9e6;border-radius:8px;background:#fff;padding:7px;text-align:left}.dashboard-report-own-class b,.dashboard-report-own-class small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dashboard-checklist-preserved{margin:0 12px 10px;border-top:1px solid #e4ebe8;padding-top:6px}.dashboard-checklist-preserved summary{font-size:9px;font-weight:850;color:#647872;cursor:pointer}.dashboard-checklist-preserved .work-mini-item{margin-top:5px}.dashboard-admission-layer{z-index:2147483020}.dashboard-admission-dialog{width:min(1080px,94vw);max-height:88vh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 28px 80px rgba(0,0,0,.24)}.dashboard-admission-dialog>header{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #e3ebe8;background:#fff}.dashboard-admission-dialog h2{margin:3px 0 0}.dashboard-admission-dialog header button{width:36px;height:36px;border:0;border-radius:50%;font-size:22px}.dashboard-admission-body{padding:18px 22px}.admission-two-column,.admission-explain-grid,.admission-type-hub,.admission-university-detail{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.admission-learning-flow>section,.admission-type-hub>section,.admission-university-detail>section{border:1px solid #e1e9e6;border-radius:14px;padding:14px;margin-bottom:12px}.admission-learning-flow>section:first-child,.admission-university-detail>section:first-child{grid-column:1/-1}.admission-learning-flow article,.admission-type-hub article,.admission-university-detail article{border:1px solid #e4eae8;border-radius:11px;padding:11px;margin:7px 0}.admission-learning-flow p,.admission-type-hub p,.admission-university-detail p{line-height:1.55}.admission-chip-row,.admission-university-buttons{display:flex;flex-wrap:wrap;gap:6px}.admission-chip-row span,.admission-university-buttons button{border:1px solid #cfddd8;border-radius:999px;background:#f7fbfa;padding:6px 9px;font-size:10px}.admission-reference-note{grid-column:1/-1;color:#778781;font-size:10px}@media(max-width:1100px){.uep-dashboard-five-cards{gap:4px!important}.work-three-grid{gap:6px}.admission-type-hub,.admission-university-detail{grid-template-columns:1fr}}
`;

fs.writeFileSync(gPath,g);
fs.writeFileSync(cssPath,css);
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP 0.82.12 native dashboard patch applied');
