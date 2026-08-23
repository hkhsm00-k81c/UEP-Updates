const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const appDir=path.join(appRoot,'resources','app');
const jsFile=path.join(appDir,'gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');

if(!s.includes('const APP_VERSION = "0.81.29";')) throw new Error('0.81.29 runtime anchor missing');
s=s.replace('const APP_VERSION = "0.81.29";','const APP_VERSION = "0.81.30";');

function findFunctionRange(src,name){
  const start=src.indexOf('function '+name+'('); if(start<0)throw new Error('function missing: '+name);
  const open=src.indexOf('{',start); if(open<0)throw new Error('brace missing: '+name);
  let depth=0,quote=null,esc=false,line=false,block=false;
  for(let i=open;i<src.length;i++){
    const ch=src[i],nx=src[i+1];
    if(line){if(ch==='\n')line=false;continue;}
    if(block){if(ch==='*'&&nx==='/'){block=false;i++;}continue;}
    if(quote){if(esc){esc=false;continue;}if(ch==='\\'){esc=true;continue;}if(ch===quote)quote=null;continue;}
    if(ch==='/'&&nx==='/'){line=true;i++;continue;} if(ch==='/'&&nx==='*'){block=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;} if(ch==='{')depth++; else if(ch==='}'&&--depth===0)return[start,i+1];
  }
  throw new Error('function end missing: '+name);
}
function replaceFunction(src,name,code){const [a,b]=findFunctionRange(src,name);return src.slice(0,a)+code+src.slice(b);}

const summary=`function uepSelectionErrorSummary(errors){const types=[...new Set((errors||[]).map(e=>String(e.type||'오류')).filter(Boolean))];return types.length?types.join(' · '):'정상';}`;
s=replaceFunction(s,'uepSelectionErrorSummary',summary);

const view=`function uepStudentApplicationView(){
  const data=uepSelectionDataset(),allRows=data.rows.filter(uepSelectionActiveRow08129),types=[...new Set(data.errors.map(x=>x.type))];
  const errorsFor=r=>data.errors.filter(e=>e.student.id===r.__student.id);
  const matchesError=r=>{const es=errorsFor(r);return(!curriculumErrorOnly||es.length)&&(curriculumErrorType==='all'||es.some(e=>e.type===curriculumErrorType));};
  const rowsForClass=no=>no==='all'?allRows:allRows.filter(r=>recordStudentClass(r.__student)===String(no));
  const classButton=(no,label)=>{const rows=rowsForClass(no),errorRows=rows.filter(r=>errorsFor(r).length);const count=curriculumErrorOnly?errorRows.length:rows.length;const sub=curriculumErrorOnly?'오류 '+count+'명':count+'명';return '<button data-record-class="'+no+'" class="'+(String(recordClassNo)===String(no)?'active':'')+'"><b>'+label+'</b><span>'+sub+'</span></button>';};
  if(!recordClassNo)recordClassNo='all';
  const scope=rowsForClass(String(recordClassNo)),visible=scope.filter(matchesError);
  if(recordStudentId&&!scope.some(r=>r.__student.id===recordStudentId))recordStudentId='';
  const chosen=recordStudentId?scope.find(r=>r.__student.id===recordStudentId):null,errs=chosen?errorsFor(chosen):[];
  const controls='<div class="curriculum-mode-block curriculum-unified-mode"><div class="curriculum-filter-bar class-mode"><div class="record-class-cards">'+classButton('all','전체')+Array.from({length:9},(_,i)=>classButton(String(i+1),(i+1)+'반')).join('')+'</div><button class="btn '+(curriculumErrorOnly?'primary':'secondary')+'" data-curriculum-error-only>'+(curriculumErrorOnly?'오류학생만 보는 중':'오류학생만 보기')+'</button><label>오류유형<select data-curriculum-error-type><option value="all">전체 오류</option>'+types.map(x=>'<option value="'+escapeHtml(x)+'" '+(curriculumErrorType===x?'selected':'')+'>'+escapeHtml(x)+'</option>').join('')+'</select></label></div></div>';
  const list='<div class="curriculum-class-list curriculum-unified-list"><div class="curriculum-class-head"><span>학번·학생</span><span>2-1</span><span>2-2</span><span>3-1</span><span>3-2</span><span>오류종류</span></div>'+visible.map(r=>{const es=errorsFor(r),active=recordStudentId===r.__student.id?' active':'';return '<button class="'+active+'" data-record-student="'+escapeHtml(r.__student.id)+'"><b>'+escapeHtml(r.__student.studentNo)+' '+escapeHtml(r.__student.name)+'</b>'+['2-1','2-2','3-1','3-2'].map(t=>'<span>'+uepSelectionTermSubjects(r,t).length+'과목</span>').join('')+'<span class="selection-error-summary '+(es.length?'has-error':'is-normal')+'">'+escapeHtml(uepSelectionErrorSummary(es))+'</span></button>';}).join('')+'</div>';
  let detail='';
  if(chosen){const navRows=visible.length?visible:scope,index=Math.max(0,navRows.findIndex(r=>r.__student.id===chosen.__student.id));const picker='<div class="uep-student-picker curriculum-student-picker unified-detail-picker"><button data-uep-student-prev title="이전 학생">‹</button><button class="uep-picker-main" data-open-student-picker><small>'+(recordClassNo==='all'?'전체 학생':recordClassNo+'반 학생')+'</small><b>'+escapeHtml(chosen.__student.studentNo)+' '+escapeHtml(chosen.__student.name)+'</b></button><button data-uep-student-next title="다음 학생">›</button><div class="uep-picker-menu" hidden><input data-uep-student-search placeholder="학번·이름 검색"><div>'+navRows.map(r=>'<button data-record-student="'+escapeHtml(r.__student.id)+'">'+escapeHtml(r.__student.studentNo)+' '+escapeHtml(r.__student.name)+' · '+escapeHtml(uepSelectionErrorSummary(errorsFor(r)))+'</button>').join('')+'</div></div></div>';detail='<div class="curriculum-selected-student">'+picker+uepStudentApplicationDetail(chosen,errs)+'</div>';}
  return controls+list+detail;
}`;
s=replaceFunction(s,'uepStudentApplicationView',view);

const modal=`function uepOpenSubjectModal08128(key){const data=uepSelectionDataset(),selected=data.subjects.find(x=>x.key===key);if(!selected)return;const rows=[...selected.students].sort(curriculumRosterSort==='class'?((a,b)=>String(a.student.studentNo).localeCompare(String(b.student.studentNo))):((a,b)=>(a.avg??99)-(b.avg??99)||String(a.student.studentNo).localeCompare(String(b.student.studentNo))));const privacy=privacyModeEnabled(),layer=document.createElement('div');layer.className='modal-backdrop subject-roster-modal-backdrop';layer.innerHTML='<div class="modal subject-roster-modal"><button class="modal-close" data-subject-modal-close>×</button><header><small>'+escapeHtml(selected.term)+'</small><h2>'+escapeHtml(selected.subject)+'</h2><p>신청 '+selected.students.length+'명 · 예상 '+selected.sectionCount+'분반</p><div class="roster-sort"><button data-roster-sort="grade" class="'+(curriculumRosterSort==='grade'?'active':'')+'">예상성적순</button><button data-roster-sort="class" class="'+(curriculumRosterSort==='class'?'active':'')+'">반·번호순</button></div></header><div class="selection-roster roster-six-columns '+(privacy?'masked':'')+'"><div class="selection-roster-head"><span>학번·성명</span><span>현재반</span><span>학사여부</span><span>1학년 내신평균</span><span>예상등수</span><span>예상등급</span></div>'+rows.map(x=>'<article><b>'+(privacy?'**** ＊＊＊':escapeHtml(x.student.studentNo)+' '+escapeHtml(x.student.name))+'</b><span>'+escapeHtml(recordStudentClass(x.student))+'반</span><span>'+(x.dorm?'학사':'-')+'</span><span>'+(privacy?'＊.＊＊':x.avg==null?'-':x.avg.toFixed(2))+'</span><span>'+(privacy?'＊위':x.expectedRank?x.expectedRank+'위':'-')+'</span><span>'+(privacy?'＊등급':x.expectedGrade==='-'?'-':x.expectedGrade+'등급')+'</span></article>').join('')+'</div></div>';document.body.appendChild(layer);layer.querySelector('[data-subject-modal-close]').onclick=()=>layer.remove();layer.onclick=e=>{if(e.target===layer)layer.remove();};layer.querySelectorAll('[data-roster-sort]').forEach(b=>b.onclick=()=>{curriculumRosterSort=b.dataset.rosterSort;layer.remove();uepOpenSubjectModal08128(key);});}`;
s=replaceFunction(s,'uepOpenSubjectModal08128',modal);

// Existing arrow handler used only the selected class and therefore became empty for the '전체' scope.
const oldNav=`const classRows=uepActiveSelectionRows().filter(r=>recordStudentClass(r.__student)===String(recordClassNo));const idx=classRows.findIndex(r=>r.__student.id===recordStudentId);$('[data-uep-student-prev]')?.addEventListener('click',()=>{if(classRows.length){recordStudentId=classRows[(idx-1+classRows.length)%classRows.length].__student.id;render('records');}});$('[data-uep-student-next]')?.addEventListener('click',()=>{if(classRows.length){recordStudentId=classRows[(idx+1)%classRows.length].__student.id;render('records');}});`;
const newNav=`const navData=uepSelectionDataset(),navAll=navData.rows.filter(uepSelectionActiveRow08129),navScope=String(recordClassNo)==='all'?navAll:navAll.filter(r=>recordStudentClass(r.__student)===String(recordClassNo)),navRows=navScope.filter(r=>{const es=navData.errors.filter(e=>e.student.id===r.__student.id);return(!curriculumErrorOnly||es.length)&&(curriculumErrorType==='all'||es.some(e=>e.type===curriculumErrorType));}),classRows=navRows.length?navRows:navScope,idx=classRows.findIndex(r=>r.__student.id===recordStudentId);$('[data-uep-student-prev]')?.addEventListener('click',()=>{if(classRows.length){const p=idx<0?0:(idx-1+classRows.length)%classRows.length;recordStudentId=classRows[p].__student.id;render('records');}});$('[data-uep-student-next]')?.addEventListener('click',()=>{if(classRows.length){const n=idx<0?0:(idx+1)%classRows.length;recordStudentId=classRows[n].__student.id;render('records');}});`;
let navCount=0;while(s.includes(oldNav)){s=s.replace(oldNav,newNav);navCount++;}
if(navCount<1)throw new Error('student arrow handler anchor not found');

// Clicking a student no longer switches a separate query mode; the list and detail coexist.
s=s.replaceAll("recordStudentId=b.dataset.recordStudent;recordQueryMode='student';render('records');","recordStudentId=b.dataset.recordStudent;render('records');");
s=s.replaceAll("recordStudentId=button.dataset.recordStudent;recordQueryMode='student';render('records');","recordStudentId=button.dataset.recordStudent;render('records');");

// Mark class cards as error-count cards when error-only is active; styling stays in the existing design system.
const cssFile=fs.existsSync(path.join(appDir,'gyomuon.css'))?path.join(appDir,'gyomuon.css'):path.join(appDir,'style.css');
let c=fs.readFileSync(cssFile,'utf8');
c+='\n/* UEP 0.81.30 unified elective counseling navigation */\n.curriculum-unified-list [data-record-student].active{outline:2px solid rgba(20,139,118,.35);background:rgba(20,139,118,.06)}\n.selection-error-summary.has-error{color:#b84632;font-weight:700}.selection-error-summary.is-normal{color:#16866f}.unified-detail-picker{margin:18px 0 10px}.subject-card-grid [data-curriculum-subject]{cursor:pointer}\n';

fs.writeFileSync(jsFile,s,'utf8');fs.writeFileSync(cssFile,c,'utf8');
console.log('UEP 0.81.30 unified selection counseling UI patch applied; nav handlers=',navCount);
