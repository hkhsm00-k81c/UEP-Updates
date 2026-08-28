const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const pFile=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(/const\s+APP_VERSION\s*=\s*["']0\.81\.80["']\s*;/.test(g),'0.81.80 UI version anchor missing');
for(const marker of ['function uepOpenSubjectModal08128','function uepSelectionDataset','function uepSelectionErrors08129','data-curriculum-error-type','uep.releaseNotes.seen'])A(g.includes(marker),'required baseline marker missing: '+marker);
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.81\.80["']\s*;/,'const APP_VERSION = "0.81.81";');
const START='/* UEP_08181_SELECTION_ROSTER_ERROR_NOTICE_START */';
const END='/* UEP_08181_SELECTION_ROSTER_ERROR_NOTICE_END */';
A(!g.includes(START),'0.81.81 patch already present');
const moduleCode=String.raw`

${START}
(function(){
  if(typeof window==='undefined'||window.__UEP08181SelectionRosterErrorNoticeInstalled)return;
  window.__UEP08181SelectionRosterErrorNoticeInstalled=true;

  const UPDATE_VERSION='0.81.81';
  const UPDATE_SEEN_KEY='uep.updateNotes.lastShownVersion';
  let curriculumGradeErrorScope08181='all';

  function ensureStyle08181(){
    if(document.getElementById('uep-style-08181'))return;
    const style=document.createElement('style');style.id='uep-style-08181';style.textContent=\`
      .roster-seven-columns-08181 .selection-roster-head,.roster-seven-columns-08181 article{grid-template-columns:minmax(135px,1.45fr) minmax(150px,1.65fr) minmax(54px,.55fr) minmax(62px,.65fr) minmax(92px,.9fr) minmax(58px,.62fr) minmax(62px,.66fr)!important;gap:8px!important}
      .roster-cross-science-08181{font-size:12px;line-height:1.35;color:#235c53;white-space:normal;word-break:keep-all}
      .uep-error-grade-scope-08181{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-left:auto}
      .uep-error-grade-scope-08181 button{border:1px solid #cfe1de;background:#fff;color:#4d6664;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer}
      .uep-error-grade-scope-08181 button.active{border-color:#63bbaa;background:#e9f7f3;color:#176d5d;box-shadow:0 0 0 1px rgba(73,171,151,.08) inset}
      #uepUpdateNotes08181{position:fixed;inset:0;z-index:2147483000;background:rgba(20,31,35,.38);display:flex;align-items:center;justify-content:center;padding:24px}
      #uepUpdateNotes08181 .dialog{width:min(560px,92vw);background:#fff;border-radius:22px;box-shadow:0 26px 70px rgba(0,0,0,.22);overflow:hidden}
      #uepUpdateNotes08181 header{padding:22px 24px 16px;background:#eff9f6;border-bottom:1px solid #dcece8}
      #uepUpdateNotes08181 header small{color:#18806c;font-weight:900;letter-spacing:.04em}#uepUpdateNotes08181 header h2{margin:5px 0 0;font-size:23px;color:#17312d}
      #uepUpdateNotes08181 .body{padding:20px 24px;color:#344a47}#uepUpdateNotes08181 .body ul{margin:0;padding-left:21px;line-height:1.75}
      #uepUpdateNotes08181 footer{padding:0 24px 22px;display:flex;justify-content:flex-end}#uepUpdateNotes08181 footer button{border:0;border-radius:12px;background:#167866;color:#fff;padding:10px 18px;font-weight:900;cursor:pointer}
    \`;document.head.appendChild(style);
  }

  function studentKey08181(s){return String(s?.id||s?.studentNo||'').trim();}
  function sameStudent08181(a,b){const ak=studentKey08181(a),bk=studentKey08181(b);if(ak&&bk&&ak===bk)return true;return String(a?.studentNo||'')&&String(a?.studentNo||'')===String(b?.studentNo||'');}
  function isScienceSubject08181(subject){try{return typeof uepSubjectGroup08128==='function'&&uepSubjectGroup08128(subject)==='과학';}catch{return /물리|화학|생명|지구|과학|역학|전자기|양자|세포|물질대사|유전|우주|기후/.test(String(subject||''));}}
  function crossScienceChoices08181(data,student,targetTerm){
    if(!data||!student||!targetTerm)return[];
    const out=[];
    for(const group of (data.subjects||[])){
      if(String(group.term)!==String(targetTerm)||!isScienceSubject08181(group.subject))continue;
      const hit=(group.students||[]).find(x=>sameStudent08181(x?.student,student));
      if(!hit)continue;
      out.push({subject:String(group.subject||''),grade:hit.expectedGrade==null?'-':String(hit.expectedGrade)});
    }
    return out.sort((a,b)=>a.subject.localeCompare(b.subject,'ko'));
  }
  function formatCrossScience08181(data,student,targetTerm,privacy){
    if(privacy)return '＊＊＊＊ (＊)';
    const list=crossScienceChoices08181(data,student,targetTerm);
    return list.length?list.map(x=>escapeHtml(x.subject)+' ('+escapeHtml(x.grade)+')').join(' · '):'-';
  }

  const __uepOpenSubjectModal08181=uepOpenSubjectModal08128;
  uepOpenSubjectModal08128=function(key){
    const data=uepSelectionDataset(),selected=(data.subjects||[]).find(x=>x.key===key);
    __uepOpenSubjectModal08181.apply(this,arguments);
    try{
      if(!selected||!['2-2','3-1'].includes(String(selected.term))||!isScienceSubject08181(selected.subject))return;
      const panel=document.querySelector('.subject-roster-modal');if(!panel)return;
      ensureStyle08181();
      const targetTerm=String(selected.term)==='2-2'?'3-1':'2-2';
      const roster=panel.querySelector('.selection-roster');if(!roster||roster.classList.contains('roster-seven-columns-08181'))return;
      roster.classList.add('roster-seven-columns-08181');
      const head=roster.querySelector('.selection-roster-head');if(head){const cell=document.createElement('span');cell.textContent=targetTerm+' 과학선택';head.insertBefore(cell,head.children[1]||null);}
      const rows=[...selected.students].sort(curriculumRosterSort==='class'?((a,b)=>String(a.student.studentNo).localeCompare(String(b.student.studentNo))):((a,b)=>(a.avg??99)-(b.avg??99)||String(a.student.studentNo).localeCompare(String(b.student.studentNo))));
      const privacy=privacyModeEnabled();
      [...roster.querySelectorAll(':scope > article')].forEach((article,i)=>{const span=document.createElement('span');span.className='roster-cross-science-08181';span.innerHTML=formatCrossScience08181(data,rows[i]?.student,targetTerm,privacy);article.insertBefore(span,article.children[1]||null);});
      if(panel)panel.style.cssText+=';width:min(900px,58vw);max-width:900px';
    }catch(error){console.warn('[UEP 0.81.81 roster cross-term]',error);}
  };

  function errorTerms08181(e){
    const direct=Array.isArray(e?.terms)?e.terms:[];
    const parsed=(String(e?.term||'').match(/[23]-[12]/g)||[]);
    const terms=[...new Set([...direct,...parsed].map(String))];
    return terms.length?terms:['2-1','2-2','3-1','3-2'];
  }
  function errorInScope08181(e,scope){if(scope==='all')return true;return errorTerms08181(e).some(t=>t.startsWith(scope+'-'));}
  function errorStudentCounts08181(data){
    const count=scope=>new Set((data.errors||[]).filter(e=>errorInScope08181(e,scope)).map(e=>studentKey08181(e.student)).filter(Boolean)).size;
    return {two:count('2'),three:count('3'),all:count('all')};
  }

  const __uepSelectionDataset08181=uepSelectionDataset;
  uepSelectionDataset=function(){
    const base=__uepSelectionDataset08181.apply(this,arguments);
    try{
      if(curriculumWorkspaceMode!=='students'||curriculumGradeErrorScope08181==='all')return base;
      return {...base,errors:(base.errors||[]).filter(e=>errorInScope08181(e,curriculumGradeErrorScope08181))};
    }catch{return base;}
  };

  function installErrorScopeControls08181(){
    try{
      if(state?.activePage!=='records'||recordMode!=='curriculum'||curriculumWorkspaceMode!=='students')return;
      const select=document.querySelector('[data-curriculum-error-type]');if(!select)return;
      ensureStyle08181();
      curriculumErrorType='all';
      const old=select.closest('label')||select;
      const parent=old.parentElement;if(!parent)return;
      const data=__uepSelectionDataset08181(),counts=errorStudentCounts08181(data);
      const box=document.createElement('div');box.className='uep-error-grade-scope-08181';box.setAttribute('aria-label','오류학생 보기');
      const defs=[['2','2학년 오류학생',counts.two],['3','3학년 오류학생',counts.three],['all','2·3학년 오류학생',counts.all]];
      defs.forEach(([scope,label,count])=>{const b=document.createElement('button');b.type='button';b.dataset.errorGradeScope08181=scope;b.className=curriculumGradeErrorScope08181===scope?'active':'';b.textContent=label+' '+count+'명';box.appendChild(b);});
      parent.replaceChild(box,old);
    }catch(error){console.warn('[UEP 0.81.81 error scope controls]',error);}
  }
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-error-grade-scope-08181]');if(!b)return;e.preventDefault();curriculumGradeErrorScope08181=b.dataset.errorGradeScope08181||'all';curriculumErrorType='all';curriculumErrorOnly=true;render('records');});
  const __uepRender08181=render;
  render=function(){const out=__uepRender08181.apply(this,arguments);requestAnimationFrame(()=>setTimeout(installErrorScopeControls08181,0));return out;};

  function closeUpdateNotes08181(){const layer=document.getElementById('uepUpdateNotes08181');if(layer)layer.remove();try{localStorage.setItem(UPDATE_SEEN_KEY,UPDATE_VERSION);localStorage.setItem('uep.releaseNotes.seen',UPDATE_VERSION);}catch{}}
  function showUpdateNotes08181(){
    try{if(String(APP_VERSION)!==UPDATE_VERSION||localStorage.getItem(UPDATE_SEEN_KEY)===UPDATE_VERSION||document.getElementById('uepUpdateNotes08181'))return;}catch{return;}
    ensureStyle08181();const layer=document.createElement('div');layer.id='uepUpdateNotes08181';layer.innerHTML=\`<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="uepUpdateTitle08181"><header><small>UEP UPDATE</small><h2 id="uepUpdateTitle08181">UEP 0.81.81 업데이트</h2></header><div class="body"><ul><li>2-2·3-1 과학 신청명단에서 교차학기 과학 선택과 예상등급을 함께 확인할 수 있습니다.</li><li>오류학생 보기를 2학년·3학년·2·3학년 전체 오류학생 기준으로 단순화했습니다.</li><li>업데이트 완료 후 첫 실행에서 업데이트 내역이 한 번 표시되도록 복구했습니다.</li></ul></div><footer><button type="button" data-update-notes-confirm-08181>확인</button></footer></div>\`;document.body.appendChild(layer);layer.querySelector('[data-update-notes-confirm-08181]')?.addEventListener('click',closeUpdateNotes08181);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(showUpdateNotes08181,900),{once:true});else setTimeout(showUpdateNotes08181,900);
  setTimeout(installErrorScopeControls08181,300);
})();
${END}
`;
g+=moduleCode;
fs.writeFileSync(gFile,g,'utf8');
const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));A(pkg.version==='0.81.80','0.81.80 package version anchor missing');pkg.version='0.81.81';fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');
console.log('UEP 0.81.81 selection roster/error scope/update notice patch applied');
