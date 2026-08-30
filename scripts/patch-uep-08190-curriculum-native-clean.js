const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const pFile=path.join(root,'resources','app','package.json');
const iFile=path.join(root,'resources','app','index.html');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};

A(g.includes('const APP_VERSION = "0.81.88";'),'0.81.88 baseline anchor missing');
A(g.includes('function uepStudentApplicationView()'),'native student application view missing');
A(g.includes('/* UEP_08185_CURRICULUM_STABLE_CORE_START */'),'0.81.85 stable core missing');

g=g.replace('const APP_VERSION = "0.81.88";','const APP_VERSION = "0.81.90";');

const stateOld='let curriculumWorkspaceMode="students",curriculumErrorOnly=false,curriculumErrorType="all",curriculumTermFilter="2-1",curriculumSubjectKey="",curriculumRosterSort="grade",curriculumCrossClass="all",curriculumCrossType="all",curriculumCrossSort="class";';
const stateNew='let curriculumWorkspaceMode="students",curriculumErrorOnly=false,curriculumErrorType="all",curriculumErrorGradeScope="",curriculumTermFilter="2-1",curriculumSubjectKey="",curriculumRosterSort="grade",curriculumCrossClass="all",curriculumCrossType="all",curriculumCrossSort="class";';
A(g.includes(stateOld),'curriculum state anchor missing');
g=g.replace(stateOld,stateNew);

function functionRange(src,name){
  const start=src.indexOf('function '+name+'('); A(start>=0,'function missing: '+name);
  const brace=src.indexOf('{',start); let depth=0,quote=null,esc=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];
    if(quote){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===quote)quote=null;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++; else if(c==='}'&&--depth===0)return [start,i+1];
  }
  throw new Error('unterminated function '+name);
}
function replaceFunction(src,name,text){const [s,e]=functionRange(src,name);return src.slice(0,s)+text+src.slice(e);}

const newStudentView=String.raw`function uepStudentApplicationView(){
  const data=uepSelectionDataset(),allRows=data.rows.filter(uepSelectionActiveRow08129);
  const errorsFor=r=>data.errors.filter(e=>e.student.id===r.__student.id);
  const errorTerms=e=>[...new Set([...(Array.isArray(e?.terms)?e.terms:[]),...(String(e?.term||'').match(/[23]-[12]/g)||[])].map(String))];
  const gradeErrors=(es,grade)=>(es||[]).filter(e=>errorTerms(e).some(t=>t.startsWith(grade+'-')));
  const gradeKinds=(es,grade)=>[...new Set(gradeErrors(es,grade).map(e=>String(e?.type||'오류').trim()).filter(Boolean))];
  const gradeSet=grade=>new Set((data.errors||[]).filter(e=>gradeErrors([e],grade).length).map(e=>String(e?.student?.id||'')).filter(Boolean));
  const anyGradeSet=()=>new Set((data.errors||[]).filter(e=>errorTerms(e).some(t=>/^[23]-[12]$/.test(t))).map(e=>String(e?.student?.id||'')).filter(Boolean));
  const matchesError=r=>{
    if(!curriculumErrorOnly)return true;
    const es=errorsFor(r);
    if(curriculumErrorGradeScope==='2')return gradeErrors(es,'2').length>0;
    if(curriculumErrorGradeScope==='3')return gradeErrors(es,'3').length>0;
    return es.length>0;
  };
  const rowsForClass=no=>no==='all'?allRows:allRows.filter(r=>recordStudentClass(r.__student)===String(no));
  const classButton=(no,label)=>{const rows=rowsForClass(no),count=rows.filter(matchesError).length;return '<button data-record-class="'+no+'" class="'+(String(recordClassNo)===String(no)?'active':'')+'"><b>'+label+'</b><span>'+count+'명</span></button>';};
  if(!recordClassNo)recordClassNo='all';
  const scope=rowsForClass(String(recordClassNo)),visible=scope.filter(matchesError);
  if(recordStudentId&&!visible.some(r=>r.__student.id===recordStudentId))recordStudentId='';
  const c2=gradeSet('2').size,c3=gradeSet('3').size,ca=anyGradeSet().size;
  const scopeBtn=(value,label,count)=>'<button type="button" data-error-grade-scope-08190="'+value+'" aria-pressed="'+(curriculumErrorOnly&&curriculumErrorGradeScope===value?'true':'false')+'" class="btn '+(curriculumErrorOnly&&curriculumErrorGradeScope===value?'primary':'secondary')+'">'+label+' '+count+'명</button>';
  const controls='<div class="curriculum-mode-block curriculum-unified-mode"><div class="curriculum-filter-bar class-mode"><div class="record-class-cards">'+classButton('all','전체')+Array.from({length:9},(_,i)=>classButton(String(i+1),(i+1)+'반')).join('')+'</div><button type="button" class="btn '+(curriculumErrorOnly&&curriculumErrorGradeScope==='all'?'primary':'secondary')+'" data-curriculum-error-only>'+(curriculumErrorOnly&&curriculumErrorGradeScope==='all'?'오류학생만 보는 중':'오류학생만 보기')+'</button><div class="uep-error-grade-scope-08190">'+scopeBtn('2','2학년 오류학생',c2)+scopeBtn('3','3학년 오류학생',c3)+scopeBtn('all','2·3학년 오류학생',ca)+'</div></div></div>';
  const errorCell=(es,grade)=>{const kinds=gradeKinds(es,grade);return '<span class="curriculum-grade-error-cell-08190 selection-error-summary '+(kinds.length?'has-error':'is-normal')+'">'+escapeHtml(kinds.length?kinds.join(' · '):'정상')+'</span>';};
  const list='<div class="curriculum-class-list curriculum-unified-list curriculum-grade-split-08190"><div class="curriculum-class-head"><span>학번·학생</span><span>2-1</span><span>2-2</span><span>3-1</span><span>3-2</span><span>2학년 오류종류</span><span>3학년 오류종류</span></div>'+visible.map(r=>{const es=errorsFor(r),active=recordStudentId===r.__student.id?' active':'';return '<button type="button" class="'+active+'" data-record-student="'+escapeHtml(r.__student.id)+'"><b>'+escapeHtml(r.__student.studentNo)+' '+escapeHtml(r.__student.name)+'</b>'+['2-1','2-2','3-1','3-2'].map(t=>'<span>'+uepSelectionTermSubjects(r,t).length+'과목</span>').join('')+errorCell(es,'2')+errorCell(es,'3')+'</button>';}).join('')+'</div>';
  return controls+list;
}`;
g=replaceFunction(g,'uepStudentApplicationView',newStudentView);

// Bind grade-error buttons inside the native curriculum page binder; do not add a document-level listener.
const errorOnlyOld="$('[data-curriculum-error-only]')?.addEventListener('click',()=>{curriculumErrorOnly=!curriculumErrorOnly;render('records');});";
A(g.includes(errorOnlyOld),'native error-only binder missing');
const errorOnlyNew="$('[data-curriculum-error-only]')?.addEventListener('click',()=>{curriculumErrorOnly=!curriculumErrorOnly;curriculumErrorGradeScope=curriculumErrorOnly?'all':'';recordClassNo='all';recordStudentId='';render('records');});$$('[data-error-grade-scope-08190]').forEach(b=>b.onclick=()=>{curriculumErrorOnly=true;curriculumErrorGradeScope=b.dataset.errorGradeScope08190||'all';recordClassNo='all';recordStudentId='';render('records');});";
g=g.replace(errorOnlyOld,errorOnlyNew);
const typeBinder="$('[data-curriculum-error-type]')?.addEventListener('change',e=>{curriculumErrorType=e.target.value;render('records');});";
A(g.includes(typeBinder),'native error type binder missing');
g=g.replace(typeBinder,'/* UEP_08190_REMOVE_ERROR_TYPE_BINDER */');

// Fast entry: when the top curriculum tab is clicked, render the lightweight plan workspace first.
const recordModeNative="recordMode=button.dataset.recordMode||'activities';render('records');";
A(g.includes(recordModeNative),'native record-mode binder anchor missing');
g=g.replace(recordModeNative,"recordMode=button.dataset.recordMode||'activities';if(recordMode==='curriculum')curriculumWorkspaceMode='plan';render('records');");
const recordModeGlobal="recordMode=mode;\n    render('records');";
if(g.includes(recordModeGlobal))g=g.replace(recordModeGlobal,"recordMode=mode;\n    if(mode==='curriculum')curriculumWorkspaceMode='plan';\n    render('records');");

// Disable only the 0.81.85 DOM-after-render error filter shim; preserve its science roster enhancements.
const coreStart=g.indexOf('/* UEP_08185_CURRICULUM_STABLE_CORE_START */'),coreEnd=g.indexOf('/* UEP_08185_CURRICULUM_STABLE_CORE_END */',coreStart);
A(coreStart>=0&&coreEnd>coreStart,'0.81.85 core range missing');
let core=g.slice(coreStart,coreEnd);
const legacyListenerStart="document.addEventListener('click',e=>{const b=e.target.closest?.('[data-error-grade-scope-08185]');";
const ls=core.indexOf(legacyListenerStart);
if(ls>=0){const le=core.indexOf('},true);',ls);A(le>ls,'legacy 08185 listener end missing');core=core.slice(0,ls)+'/* UEP_08190_DISABLE_08185_ERROR_CLICK_SHIM */'+core.slice(le+'},true);'.length);}
const renderShim="render=function(){const out=originalRender.apply(this,arguments);requestAnimationFrame(()=>{installScopeControls();applyScopeToRenderedRows()});return out};";
A(core.includes(renderShim),'08185 render shim missing');core=core.replace(renderShim,'/* UEP_08190_DISABLE_08185_RENDER_SHIM */');
const startupShim="setTimeout(()=>{installScopeControls();applyScopeToRenderedRows()},400)";
A(core.includes(startupShim),'08185 startup shim missing');core=core.replace(startupShim,'/* UEP_08190_DISABLE_08185_STARTUP_SHIM */');
g=g.slice(0,coreStart)+core+g.slice(coreEnd);

// Disable known obsolete startup release-note launchers only.
g=g.replace('setTimeout(releaseNotes,1200);','/* UEP_08190_DISABLE_08173_RELEASE_POPUP */');
const r74="if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>uepOpenReleaseNotes08174(false),1400));else setTimeout(()=>uepOpenReleaseNotes08174(false),1400);";
const r77="if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>uepOpenReleaseNotes08177(false),1400));else setTimeout(()=>uepOpenReleaseNotes08177(false),1400);";
A(g.includes(r74),'08174 popup launcher missing');A(g.includes(r77),'08177 popup launcher missing');
g=g.replace(r74,'/* UEP_08190_DISABLE_08174_RELEASE_POPUP */');
g=g.replace(r77,'/* UEP_08190_DISABLE_08177_RELEASE_POPUP */');

fs.writeFileSync(gFile,g,'utf8');
const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));pkg.version='0.81.90';fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');

let html=fs.readFileSync(iFile,'utf8');
const css=`<style id="uep-08190-curriculum-error-style">\n.curriculum-class-list.curriculum-grade-split-08190 .curriculum-class-head,.curriculum-class-list.curriculum-grade-split-08190>button{grid-template-columns:minmax(180px,1.35fr) repeat(4,minmax(64px,.52fr)) minmax(160px,1fr) minmax(160px,1fr)!important;}\n.uep-error-grade-scope-08190{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.uep-error-grade-scope-08190 .btn{white-space:nowrap}.uep-error-grade-scope-08190 .btn.primary{box-shadow:0 4px 12px rgba(43,132,114,.16)}\n.curriculum-grade-error-cell-08190{white-space:normal!important;line-height:1.35;}\n</style>`;
A(!html.includes('uep-08190-curriculum-error-style'),'08190 css already present');
A(html.includes('</head>'),'index head missing');
html=html.replace('</head>',css+'\n</head>');fs.writeFileSync(iFile,html,'utf8');

console.log('patched UEP 0.81.90: native curriculum filters, split error kinds, fast entry, no legacy startup popups');
