const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app',gFile=path.join(root,'resources','app','gyomuon.js'),pFile=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gFile,'utf8');const A=(c,m)=>{if(!c)throw new Error(m)};
A(g.includes('const APP_VERSION = "0.81.83";'),'0.81.83 UI anchor missing');
for(const [s,e] of [
 ['UEP_08181_SELECTION_ROSTER_ERROR_NOTICE_START','UEP_08181_SELECTION_ROSTER_ERROR_NOTICE_END'],
 ['UEP_08182_CURRICULUM_ROSTER_ERROR_UI_START','UEP_08182_CURRICULUM_ROSTER_ERROR_UI_END'],
 ['UEP_08183_CURRICULUM_UI_STABILITY_START','UEP_08183_CURRICULUM_UI_STABILITY_END']
]){
 const re=new RegExp('/\\* '+s+' \\*/[\\s\\S]*?/\\* '+e+' \\*/\\s*','g');
 g=g.replace(re,'');
}
A(!g.includes('UEP_08181_SELECTION_ROSTER_ERROR_NOTICE_START'),'0.81.81 runtime patch removal failed');
A(!g.includes('UEP_08182_CURRICULUM_ROSTER_ERROR_UI_START'),'0.81.82 runtime patch removal failed');
A(!g.includes('UEP_08183_CURRICULUM_UI_STABILITY_START'),'0.81.83 runtime patch removal failed');
g=g.replace('const APP_VERSION = "0.81.83";','const APP_VERSION = "0.81.84";');
const START='/* UEP_08184_CURRICULUM_CONSOLIDATION_START */',END='/* UEP_08184_CURRICULUM_CONSOLIDATION_END */';
A(!g.includes(START),'already patched');
function install08184(){
 if(typeof window==='undefined'||window.__UEP08184CurriculumInstalled)return;window.__UEP08184CurriculumInstalled=true;
 const V='0.81.84',SEEN='uep.updateNotes.lastShownVersion';let gradeScope='all';
 const originalDataset=uepSelectionDataset,originalOpenSubject=uepOpenSubjectModal08128;
 const studentKey=s=>String(s?.studentNo||s?.id||'').trim();
 const sameStudent=(a,b)=>{const ak=studentKey(a),bk=studentKey(b);return !!ak&&ak===bk};
 const science=x=>{try{return uepSubjectGroup08128(x)==='과학'}catch{return /물리|화학|생명|지구|과학|역학|전자기|양자|세포|물질대사|유전|우주|기후/.test(String(x||''))}};
 const errorTerms=e=>[...new Set([...(Array.isArray(e?.terms)?e.terms:[]),...(String(e?.term||'').match(/[23]-[12]/g)||[])].map(String))];
 const errorInScope=(e,s)=>s==='all'||errorTerms(e).some(t=>t.startsWith(s+'-'));
 function fullDataset(){try{return originalDataset()}catch{return {subjects:[],errors:[]}}}
 function ensureStyle(){if(document.getElementById('uep-style-08184'))return;const s=document.createElement('style');s.id='uep-style-08184';s.textContent=`
 .subject-roster-modal.uep-wide-08184{width:min(1580px,calc(100vw - 300px))!important;max-width:none!important;overflow-x:auto!important}
 .selection-roster.uep-roster-08184{min-width:1480px!important}
 .selection-roster.uep-roster-08184 .selection-roster-head,.selection-roster.uep-roster-08184 article{grid-template-columns:minmax(145px,1.1fr) minmax(285px,2.25fr) minmax(420px,3.25fr) 64px 72px 112px 72px 78px!important;gap:10px!important;align-items:center}
 .uep-science-choice-08184{font-size:12px;line-height:1.3;color:#235c53;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;word-break:keep-all!important}
 .uep-error-grade-scope-08184{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-left:auto}
 .uep-error-grade-scope-08184 button{border:1px solid #cfe1de;background:#fff;color:#4d6664;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer}
 .uep-error-grade-scope-08184 button.active{border-color:#63bbaa;background:#e9f7f3;color:#176d5d;box-shadow:0 0 0 1px rgba(73,171,151,.08) inset}
 .uep-grade-errors-08184{font-size:12px;line-height:1.4}.uep-grade-errors-08184 .ok{color:#3c7a6c;font-weight:700}.uep-grade-errors-08184 .bad{color:#d14d3d;font-weight:800}
 #uepUpdateNotes08184{position:fixed;inset:0;z-index:2147483004;background:rgba(20,31,35,.38);display:flex;align-items:center;justify-content:center;padding:24px}#uepUpdateNotes08184 .d{width:min(620px,92vw);background:#fff;border-radius:22px;padding:24px;box-shadow:0 26px 70px rgba(0,0,0,.22)}#uepUpdateNotes08184 button{float:right;border:0;border-radius:12px;background:#167866;color:#fff;padding:10px 18px;font-weight:900;cursor:pointer}`;document.head.appendChild(s)}
 function scienceChoices(data,student,term,exclude=''){const out=[];for(const group of data?.subjects||[]){if(String(group.term)!==String(term)||!science(group.subject)||String(group.subject)===String(exclude))continue;const hit=(group.students||[]).find(x=>sameStudent(x?.student,student));if(hit)out.push({subject:String(group.subject||''),grade:hit.expectedGrade==null?'-':String(hit.expectedGrade)})}return out.sort((a,b)=>a.subject.localeCompare(b.subject,'ko'))}
 function formatScience(data,student,term,exclude,privacy){if(privacy)return '＊＊＊＊ (＊)';const list=scienceChoices(data,student,term,exclude);return list.length?list.map(x=>escapeHtml(x.subject)+' ('+escapeHtml(x.grade)+')').join(' · '):'-'}
 function decorateRoster(selected){try{
   if(!selected||!['2-2','3-1'].includes(String(selected.term))||!science(selected.subject))return false;
   const panel=document.querySelector('.subject-roster-modal'),roster=panel?.querySelector('.selection-roster');if(!panel||!roster)return false;
   const mark=String(selected.key||selected.term+'|'+selected.subject);if(roster.dataset.uep08184===mark)return true;
   ensureStyle();panel.classList.add('uep-wide-08184');roster.classList.add('uep-roster-08184');
   const head=roster.querySelector('.selection-roster-head'),articles=[...roster.querySelectorAll(':scope > article')];if(!head||!articles.length)return false;
   head.querySelectorAll('[data-uep-science-extra]').forEach(x=>x.remove());articles.forEach(a=>a.querySelectorAll('[data-uep-science-extra]').forEach(x=>x.remove()));
   const data=fullDataset(),target=String(selected.term)==='2-2'?'3-1':'2-2',privacy=privacyModeEnabled();
   const sameH=document.createElement('span');sameH.dataset.uepScienceExtra='same';sameH.textContent=selected.term+' 다른 과학선택';
   const crossH=document.createElement('span');crossH.dataset.uepScienceExtra='cross';crossH.textContent=target+' 과학선택';
   head.insertBefore(crossH,head.children[1]||null);head.insertBefore(sameH,head.children[1]||null);
   const rows=[...selected.students].sort(curriculumRosterSort==='class'?((a,b)=>String(a.student.studentNo).localeCompare(String(b.student.studentNo))):((a,b)=>(a.avg??99)-(b.avg??99)||String(a.student.studentNo).localeCompare(String(b.student.studentNo))));
   articles.forEach((article,i)=>{const st=rows[i]?.student;if(!st)return;const same=document.createElement('span');same.dataset.uepScienceExtra='same';same.className='uep-science-choice-08184';same.innerHTML=formatScience(data,st,selected.term,selected.subject,privacy);const cross=document.createElement('span');cross.dataset.uepScienceExtra='cross';cross.className='uep-science-choice-08184';cross.innerHTML=formatScience(data,st,target,'',privacy);article.insertBefore(cross,article.children[1]||null);article.insertBefore(same,article.children[1]||null)});
   roster.dataset.uep08184=mark;return true;
 }catch(e){console.warn('[UEP 0.81.84 roster]',e);return false}}
 function decorateWhenReady(selected){if(decorateRoster(selected))return;const observer=new MutationObserver(()=>{if(decorateRoster(selected))observer.disconnect()});observer.observe(document.body,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),1200)}
 uepOpenSubjectModal08128=function(key){const data=fullDataset(),selected=(data.subjects||[]).find(x=>x.key===key);const out=originalOpenSubject.apply(this,arguments);if(selected)decorateWhenReady(selected);return out};
 uepSelectionDataset=function(){const base=originalDataset.apply(this,arguments);try{if(state?.activePage!=='records'||recordMode!=='curriculum'||curriculumWorkspaceMode!=='students'||gradeScope==='all')return base;return {...base,errors:(base.errors||[]).filter(e=>errorInScope(e,gradeScope))}}catch{return base}};
 function gradeTypes(student,grade){const key=studentKey(student),out=[];for(const e of fullDataset().errors||[]){if(studentKey(e?.student)!==key)continue;if(errorTerms(e).some(t=>t.startsWith(grade+'-')))out.push(String(e.type||'오류'))}return [...new Set(out)]}
 function gradeSummary(student){const a=gradeTypes(student,2),b=gradeTypes(student,3),f=(g,x)=>'<div class="'+(x.length?'bad':'ok')+'">'+g+'학년 '+(x.length?x.map(escapeHtml).join(' · '):'정상')+'</div>';return '<div class="uep-grade-errors-08184">'+f(2,a)+f(3,b)+'</div>'}
 function decorateErrorRows(){try{if(state?.activePage!=='records'||recordMode!=='curriculum'||curriculumWorkspaceMode!=='students')return;const header=[...document.querySelectorAll('div,span,th')].find(x=>String(x.textContent||'').trim()==='오류종류');if(!header)return;const root=header.parentElement?.parentElement;if(!root)return;const all=fullDataset().errors||[];for(const row of root.children){const m=String(row.textContent||'').match(/(\d{4})\s+\S+/);if(!m)continue;const st=(all.find(e=>String(e?.student?.studentNo||'')===m[1])||{}).student;if(!st)continue;const cell=row.lastElementChild;if(cell)cell.innerHTML=gradeSummary(st)}}catch(e){console.warn('[UEP 0.81.84 error summary]',e)}}
 function scopeCounts(){const errors=fullDataset().errors||[],count=s=>new Set(errors.filter(e=>errorInScope(e,s)).map(e=>studentKey(e.student)).filter(Boolean)).size;return {two:count('2'),three:count('3'),all:count('all')}}
 function installScopeControls(){try{if(state?.activePage!=='records'||recordMode!=='curriculum'||curriculumWorkspaceMode!=='students')return;ensureStyle();let box=document.querySelector('.uep-error-grade-scope-08184');if(!box){const select=document.querySelector('[data-curriculum-error-type]'),old=select?.closest('label')||select,parent=old?.parentElement;if(!old||!parent)return;box=document.createElement('div');box.className='uep-error-grade-scope-08184';parent.replaceChild(box,old)}const c=scopeCounts();box.innerHTML='';[['2','2학년 오류학생',c.two],['3','3학년 오류학생',c.three],['all','2·3학년 오류학생',c.all]].forEach(([s,label,n])=>{const b=document.createElement('button');b.type='button';b.dataset.errorGradeScope08184=s;b.className=gradeScope===s?'active':'';b.textContent=label+' '+n+'명';box.appendChild(b)});decorateErrorRows()}catch(e){console.warn('[UEP 0.81.84 scope controls]',e)}}
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-error-grade-scope-08184]');if(!b)return;e.preventDefault();e.stopPropagation();gradeScope=b.dataset.errorGradeScope08184||'all';curriculumErrorType='all';curriculumErrorOnly=true;render('records')},true);
 const originalRender=render;render=function(){const out=originalRender.apply(this,arguments);requestAnimationFrame(()=>installScopeControls());return out};
 function closeNote(){document.getElementById('uepUpdateNotes08184')?.remove();try{localStorage.setItem(SEEN,V);localStorage.setItem('uep.releaseNotes.seen',V)}catch{}}
 function showNote(){try{if(String(APP_VERSION)!==V||localStorage.getItem(SEEN)===V)return}catch{return}ensureStyle();const l=document.createElement('div');l.id='uepUpdateNotes08184';l.innerHTML='<div class="d"><h2>UEP 0.81.84 업데이트</h2><ul><li>선택과목 학생신청 목록과 학년별 오류학생 조회 구조를 하나의 렌더링 흐름으로 통합했습니다.</li><li>2-2·3-1 과학 신청명단의 동일학기·교차학기 과학선택 표시를 단일 구조로 재구성했습니다.</li><li>이전 0.81.81~0.81.83의 중첩 UI 보완 코드는 제거했습니다.</li></ul><button type="button">확인</button><div style="clear:both"></div></div>';document.body.appendChild(l);l.querySelector('button').onclick=closeNote}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(showNote,900),{once:true});else setTimeout(showNote,900);setTimeout(installScopeControls,400)
}
g+='\n'+START+'\n('+install08184.toString()+')();\n'+END+'\n';fs.writeFileSync(gFile,g,'utf8');const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));A(pkg.version==='0.81.83','package anchor missing');pkg.version='0.81.84';fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');console.log('UEP 0.81.84 consolidated curriculum patch applied');
