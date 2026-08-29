const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const pFile=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(g.includes('const APP_VERSION = "0.81.88";'),'0.81.88 anchor missing');
A(g.includes('UEP_08188_SUBJECT_CARD_PERFORMANCE_START'),'0.81.88 performance patch missing');
A(g.includes('function uepStudentApplicationView()'),'student application view missing');
g=g.replace('const APP_VERSION = "0.81.88";','const APP_VERSION = "0.81.89";');
// The old 0.81.73 release-note popup compares against a shared seen key and can reappear forever on newer versions.
g=g.replace('setTimeout(releaseNotes,1200);','/* UEP_08189_DISABLE_LEGACY_RELEASE_NOTES */');
// Disable the 0.81.85 DOM-after-render filter shim. 0.81.89 filters the data before HTML is rendered.
g=g.replace("render=function(){const out=originalRender.apply(this,arguments);requestAnimationFrame(()=>{installScopeControls();applyScopeToRenderedRows()});return out};","render=function(){return originalRender.apply(this,arguments);};");
g=g.replace("setTimeout(()=>{installScopeControls();applyScopeToRenderedRows()},400)","/* UEP_08189_NATIVE_ERROR_FILTER */");
const START='/* UEP_08189_CURRICULUM_FAST_ERROR_FILTER_START */';
A(!g.includes(START),'already patched');
const patch=String.raw`
/* UEP_08189_CURRICULUM_FAST_ERROR_FILTER_START */
(function install08189(){
  if(typeof window==='undefined'||window.__UEP08189CurriculumFastErrorInstalled)return;
  window.__UEP08189CurriculumFastErrorInstalled=true;
  let errorScope='all';
  const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const termsOf=e=>[...new Set([...(Array.isArray(e?.terms)?e.terms:[]),...(String(e?.term||'').match(/[23]-[12]/g)||[])].map(String))];
  const inScope=(e,s)=>s==='all'||termsOf(e).some(t=>t.startsWith(s+'-'));
  const studentKey=x=>String(x?.student?.id||x?.id||x?.studentNo||'').trim();
  function groupedErrors(data){
    const m=new Map();
    for(const e of data?.errors||[]){const k=studentKey(e);if(!k)continue;if(!m.has(k))m.set(k,[]);m.get(k).push(e);}
    return m;
  }
  function scopedStudentSet(data,s){
    const out=new Set();
    for(const e of data?.errors||[])if(inScope(e,s)){const k=studentKey(e);if(k)out.add(k);}
    return out;
  }
  uepStudentApplicationView=function(){
    const data=uepSelectionDataset(),allRows=data.rows.filter(uepSelectionActiveRow08129),byStudent=groupedErrors(data),types=[...new Set((data.errors||[]).map(x=>x.type).filter(Boolean))];
    const errorsFor=r=>byStudent.get(String(r?.__student?.id||''))||[];
    const allowed=errorScope==='all'?scopedStudentSet(data,'all'):scopedStudentSet(data,errorScope);
    const matchesError=r=>{
      const es=errorsFor(r),scopeOk=errorScope==='all'||allowed.has(String(r.__student.id));
      const onlyOk=!curriculumErrorOnly||es.length>0;
      const typeOk=curriculumErrorType==='all'||es.some(e=>e.type===curriculumErrorType);
      return scopeOk&&onlyOk&&typeOk;
    };
    const rowsForClass=no=>no==='all'?allRows:allRows.filter(r=>recordStudentClass(r.__student)===String(no));
    if(!recordClassNo)recordClassNo='all';
    const scopeRows=rowsForClass(String(recordClassNo)),visible=scopeRows.filter(matchesError);
    if(recordStudentId&&!visible.some(r=>r.__student.id===recordStudentId))recordStudentId='';
    const classButton=(no,label)=>{const rows=rowsForClass(no),count=rows.filter(matchesError).length;return '<button data-record-class="'+no+'" class="'+(String(recordClassNo)===String(no)?'active':'')+'"><b>'+label+'</b><span>'+count+'명</span></button>';};
    const c2=scopedStudentSet(data,'2').size,c3=scopedStudentSet(data,'3').size,ca=scopedStudentSet(data,'all').size;
    const scopeBtn=(s,label,n)=>'<button type="button" data-error-grade-scope-08189="'+s+'" class="btn '+(errorScope===s?'primary':'secondary')+'">'+label+' '+n+'명</button>';
    const controls='<div class="curriculum-mode-block curriculum-unified-mode"><div class="curriculum-filter-bar class-mode"><div class="record-class-cards">'+classButton('all','전체')+Array.from({length:9},(_,i)=>classButton(String(i+1),(i+1)+'반')).join('')+'</div><button class="btn '+(curriculumErrorOnly?'primary':'secondary')+'" data-curriculum-error-only>'+(curriculumErrorOnly?'오류학생만 보는 중':'오류학생만 보기')+'</button><div class="uep-error-grade-scope-08189">'+scopeBtn('2','2학년 오류학생',c2)+scopeBtn('3','3학년 오류학생',c3)+scopeBtn('all','2·3학년 오류학생',ca)+'</div><label>오류유형<select data-curriculum-error-type><option value="all">전체 오류</option>'+types.map(x=>'<option value="'+esc(x)+'" '+(curriculumErrorType===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label></div></div>';
    const list='<div class="curriculum-class-list curriculum-unified-list"><div class="curriculum-class-head"><span>학번·학생</span><span>2-1</span><span>2-2</span><span>3-1</span><span>3-2</span><span>오류종류</span></div>'+visible.map(r=>{const es=errorsFor(r),active=recordStudentId===r.__student.id?' active':'';return '<button class="'+active+'" data-record-student="'+esc(r.__student.id)+'"><b>'+esc(r.__student.studentNo)+' '+esc(r.__student.name)+'</b>'+['2-1','2-2','3-1','3-2'].map(t=>'<span>'+uepSelectionTermSubjects(r,t).length+'과목</span>').join('')+'<span class="selection-error-summary '+(es.length?'has-error':'is-normal')+'">'+esc(uepSelectionErrorSummary(es))+'</span></button>';}).join('')+'</div>';
    return controls+list;
  };
  const css=document.createElement('style');css.id='uep-style-08189';css.textContent='.uep-error-grade-scope-08189{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.uep-error-grade-scope-08189 .btn{white-space:nowrap}';document.head.appendChild(css);
  document.addEventListener('click',e=>{
    const scope=e.target.closest?.('[data-error-grade-scope-08189]');
    if(scope){e.preventDefault();e.stopImmediatePropagation();errorScope=scope.dataset.errorGradeScope08189||'all';curriculumErrorOnly=true;curriculumErrorType='all';recordClassNo='all';recordStudentId='';render('records');return;}
    const curriculum=e.target.closest?.('[data-record-mode="curriculum"]');
    if(curriculum){curriculumWorkspaceMode='plan';curriculumErrorOnly=false;errorScope='all';recordStudentId='';}
    const workspace=e.target.closest?.('[data-curriculum-workspace]');
    if(workspace&&workspace.dataset.curriculumWorkspace!=='students')errorScope='all';
  },true);
  // Remove any legacy update-note overlay that survived startup timing.
  const killNotes=()=>{document.querySelectorAll('[id^="uepUpdateNotes"]').forEach(x=>x.remove());};
  killNotes();setTimeout(killNotes,1400);setTimeout(killNotes,2600);
})();
/* UEP_08189_CURRICULUM_FAST_ERROR_FILTER_END */
`;
g+='\n'+patch+'\n';
fs.writeFileSync(gFile,g,'utf8');
const p=JSON.parse(fs.readFileSync(pFile,'utf8'));p.version='0.81.89';fs.writeFileSync(pFile,JSON.stringify(p,null,2)+'\n','utf8');
console.log('patched UEP 0.81.89 curriculum fast entry + native error filter + no legacy popup');
