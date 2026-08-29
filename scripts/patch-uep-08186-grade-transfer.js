const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app',gFile=path.join(root,'resources','app','gyomuon.js'),pFile=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(g.includes('const APP_VERSION = "0.81.85";'),'0.81.85 anchor missing');
A(g.includes('UEP_08185_CURRICULUM_STABLE_CORE_START'),'0.81.85 stable core missing');
A(g.includes('function uepSelectionDataset()'),'selection dataset missing');
g=g.replace('const APP_VERSION = "0.81.85";','const APP_VERSION = "0.81.86";');
const START='/* UEP_08186_GRADE_TRANSFER_START */',END='/* UEP_08186_GRADE_TRANSFER_END */';
A(!g.includes(START),'already patched');
function install08186(){
  if(typeof window==='undefined'||window.__UEP08186GradeTransferInstalled)return;
  window.__UEP08186GradeTransferInstalled=true;
  const V='0.81.86',SEEN='uep.updateNotes.lastShownVersion';
  const oldDataset=uepSelectionDataset,oldOpenSubject=uepOpenSubjectModal08128;
  function norm(v){return String(v??'').trim()}
  function sameStudentScore(row,student){
    const sid=norm(student?.id),sno=norm(student?.studentNo);
    const rid=norm(row?.studentId||row?.['학생ID']),rno=norm(row?.studentNo||row?.['학번']);
    return (!!sid&&!!rid&&sid===rid)||!!sno&&!!rno&&sno===rno;
  }
  function finalGradeRows(student){
    const rows=(readonlyCache?.scoreRecords||[]).filter(r=>sameStudentScore(r,student)&&norm(r?.scoreType||r?.['성적구분']||'내신')==='내신');
    const exact=rows.filter(r=>norm(r?.schoolYear||r?.['학년도'])==='2026'&&norm(r?.semester||r?.['학기']).replace(/[^0-9]/g,'')==='1'&&norm(r?.exam||r?.['고사구분'])==='학기말고사');
    if(exact.length)return exact;
    const sem1=rows.filter(r=>norm(r?.schoolYear||r?.['학년도'])==='2026'&&norm(r?.semester||r?.['학기']).replace(/[^0-9]/g,'')==='1');
    const finals=sem1.filter(r=>norm(r?.exam||r?.['고사구분'])==='학기말고사');
    return finals.length?finals:[];
  }
  function finalGradeAverage(student){
    const levels=finalGradeRows(student).map(r=>Number(r?.level??r?.grade??r?.['등급'])).filter(Number.isFinite);
    return levels.length?levels.reduce((a,b)=>a+b,0)/levels.length:null;
  }
  function isTransfer(row,student){
    const state=norm(row?.['학적상태']||student?.enrollmentStatus||student?.status);
    if(/전입/.test(state))return true;
    return !!norm(student?.transferDate||student?.transferInDate||student?.entryDate||student?.['전입일']||row?.['전입일']);
  }
  function sourceLabel(row,student,avg){return isTransfer(row,student)?(avg==null?'전입생 · 성적자료 없음':'전입교'):''}
  uepSelectionDataset=function(){
    const base=oldDataset.apply(this,arguments);
    const cache=new Map();
    const valueFor=student=>{
      const key=norm(student?.id||student?.studentNo);
      if(!cache.has(key))cache.set(key,finalGradeAverage(student));
      return cache.get(key);
    };
    for(const app of base?.applications||[]){
      app.avg=valueFor(app.student);
      app.gradeSource=sourceLabel(app.row,app.student,app.avg);
    }
    for(const group of base?.subjects||[]){
      for(const app of group.students||[]){
        app.avg=valueFor(app.student);
        app.gradeSource=sourceLabel(app.row,app.student,app.avg);
      }
      group.students.sort((a,b)=>(a.avg??99)-(b.avg??99)||String(a.student?.studentNo||'').localeCompare(String(b.student?.studentNo||'')));
      const graded=group.students.filter(x=>x.avg!=null).length;
      let rank=0;
      for(const app of group.students){
        if(app.avg==null){app.expectedRank=null;app.expectedGrade='-';continue}
        rank+=1;app.expectedRank=rank;app.expectedGrade=uepExpectedGrade(rank,graded);
      }
    }
    return base;
  };
  function ensureStyle(){
    if(document.getElementById('uep-style-08186'))return;
    const s=document.createElement('style');s.id='uep-style-08186';
    s.textContent='.uep-grade-source-08186{display:block;margin-top:3px;font-size:10px;font-weight:800;color:#28786d;line-height:1.15}.uep-grade-source-08186.missing{color:#b56a22}.uep-grade-header-note-08186{white-space:normal!important;line-height:1.2!important}#uepUpdateNotes08186{position:fixed;inset:0;z-index:2147483006;background:rgba(20,31,35,.38);display:flex;align-items:center;justify-content:center;padding:24px}#uepUpdateNotes08186 .d{width:min(650px,92vw);background:#fff;border-radius:22px;padding:24px;box-shadow:0 26px 70px rgba(0,0,0,.22)}#uepUpdateNotes08186 button{float:right;border:0;border-radius:12px;background:#167866;color:#fff;padding:10px 18px;font-weight:900;cursor:pointer}';
    document.head.appendChild(s);
  }
  function decorateGradeSource(key){
    try{
      const data=uepSelectionDataset(),selected=(data?.subjects||[]).find(x=>x.key===key);
      const roster=document.querySelector('.subject-roster-modal .selection-roster'),head=roster?.querySelector('.selection-roster-head');
      if(!selected||!roster||!head)return false;
      ensureStyle();
      const heads=[...head.children];
      let avgIndex=heads.findIndex(x=>/1학년\s*내신평균|1학기말\s*평균등급/.test(norm(x.textContent)));
      if(avgIndex<0)return false;
      heads[avgIndex].textContent='1학기말 평균등급';heads[avgIndex].classList.add('uep-grade-header-note-08186');
      const rows=[...(selected.students||[])].sort(curriculumRosterSort==='class'?((a,b)=>String(a.student?.studentNo||'').localeCompare(String(b.student?.studentNo||''))):((a,b)=>(a.avg??99)-(b.avg??99)||String(a.student?.studentNo||'').localeCompare(String(b.student?.studentNo||''))));
      const articles=[...roster.querySelectorAll(':scope > article')];
      articles.forEach((article,i)=>{
        article.querySelectorAll('[data-uep-grade-source-08186]').forEach(x=>x.remove());
        const app=rows[i],cell=article.children[avgIndex];if(!app||!cell)return;
        if(app.gradeSource){const small=document.createElement('small');small.dataset.uepGradeSource08186='1';small.className='uep-grade-source-08186'+(app.avg==null?' missing':'');small.textContent=app.gradeSource;cell.appendChild(small)}
      });
      roster.dataset.uepGradeSource08186=String(key)+'|'+rows.map(x=>[x.student?.studentNo,x.avg,x.gradeSource].join(':')).join(';');
      return true;
    }catch(e){console.warn('[UEP 0.81.86 grade source]',e);return false}
  }
  function refreshGradeSource(key){let n=0,last='';const tick=()=>{n++;decorateGradeSource(key);const r=document.querySelector('.subject-roster-modal .selection-roster'),sig=r?.dataset.uepGradeSource08186||'';if(sig&&sig===last&&n>5)return;last=sig;if(n<45)requestAnimationFrame(tick)};requestAnimationFrame(tick)}
  uepOpenSubjectModal08128=function(key){const out=oldOpenSubject.apply(this,arguments);refreshGradeSource(key);return out};
  function closeNote(){document.getElementById('uepUpdateNotes08186')?.remove();try{localStorage.setItem(SEEN,V);localStorage.setItem('uep.releaseNotes.seen',V)}catch{}}
  function showNote(){
    try{if(String(APP_VERSION)!==V||localStorage.getItem(SEEN)===V)return}catch{return}
    ensureStyle();document.getElementById('uepUpdateNotes08185')?.remove();
    const l=document.createElement('div');l.id='uepUpdateNotes08186';l.innerHTML='<div class="d"><h2>UEP 0.81.86 업데이트</h2><ul><li>과목별 신청현황의 내신 기준을 1차·2차·학기말 혼합평균에서 1학기 학기말 최종등급 평균으로 바로잡았습니다.</li><li>전입생은 1학기 성적이 연결되면 전입교 성적으로 표시하고, 아직 없으면 성적자료 없음으로 구분합니다.</li><li>성적자료가 없는 학생은 예상등수·예상등급 산출에서 제외합니다.</li></ul><button type="button">확인</button><div style="clear:both"></div></div>';document.body.appendChild(l);l.querySelector('button').onclick=closeNote;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(showNote,900),{once:true});else setTimeout(showNote,900);
}
g+='\n'+START+'\n('+install08186.toString()+')();\n'+END+'\n';
fs.writeFileSync(gFile,g,'utf8');
const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));A(pkg.version==='0.81.85','package anchor missing');pkg.version='0.81.86';fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');
console.log('UEP 0.81.86 grade/transfer patch applied');
