const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const appDir=path.join(appRoot,'resources','app');
const jsFile=path.join(appDir,'gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');

// Version normalization.
const versionRx=/const\s+APP_VERSION\s*=\s*['\"][^'\"]+['\"]\s*;/g;
if(!(s.match(versionRx)||[]).length) throw new Error('APP_VERSION declaration missing');
s=s.replace(versionRx,'const APP_VERSION = "0.81.32";');

// Remove any previous 0.81.32 repair block before appending a single canonical block.
const start='/* UEP_08132_INTERACTION_REPAIR_START */';
const end='/* UEP_08132_INTERACTION_REPAIR_END */';
const blockRx=new RegExp(start.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[\\s\\S]*?'+end.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g');
s=s.replace(blockRx,'');

const repair=`
${start}
(function(){
  if(typeof document==='undefined') return;
  if(window.__UEP08132InteractionRepair) return;
  window.__UEP08132InteractionRepair=true;

  function renderRecordsSafe(){
    if(typeof render==='function') render('records');
  }

  function visibleStudentIds(){
    const rows=[...document.querySelectorAll('[data-record-student]')]
      .filter(el=>el.offsetParent!==null)
      .map(el=>String(el.dataset.recordStudent||'').trim())
      .filter(Boolean);
    return [...new Set(rows)];
  }

  document.addEventListener('click',function(ev){
    const subject=ev.target&&ev.target.closest?ev.target.closest('[data-curriculum-subject]'):null;
    if(subject){
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const key=String(subject.dataset.curriculumSubject||'').trim();
      if(key){
        try{ curriculumSubjectKey=key; }catch(_e){}
        if(typeof uepOpenSubjectModal08128==='function'){
          uepOpenSubjectModal08128(key);
          return;
        }
      }
    }

    const row=ev.target&&ev.target.closest?ev.target.closest('[data-record-student]'):null;
    if(row){
      const id=String(row.dataset.recordStudent||'').trim();
      if(id){
        ev.preventDefault();
        ev.stopImmediatePropagation();
        try{ recordStudentId=id; }catch(_e){}
        renderRecordsSafe();
        return;
      }
    }

    const prev=ev.target&&ev.target.closest?ev.target.closest('[data-uep-student-prev]'):null;
    const next=ev.target&&ev.target.closest?ev.target.closest('[data-uep-student-next]'):null;
    if(prev||next){
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const ids=visibleStudentIds();
      if(!ids.length) return;
      let cur='';
      try{ cur=String(recordStudentId||'').trim(); }catch(_e){}
      let i=ids.indexOf(cur);
      if(i<0) i=0;
      i=prev?Math.max(0,i-1):Math.min(ids.length-1,i+1);
      try{ recordStudentId=ids[i]; }catch(_e){}
      renderRecordsSafe();
    }
  },true);

  // Dashboard safeguard: do not leave a holiday-time mode visibly selected on an ordinary weekday.
  // This only normalizes the selector when both labels exist; it does not remove holiday support.
  function normalizeHolidayMode(){
    const nodes=[...document.querySelectorAll('button,[role="button"],.chip,.pill,.seg-btn')];
    const holiday=nodes.find(el=>/공휴\s*시간|공휴일/.test((el.textContent||'').trim()));
    const regular=nodes.find(el=>/정규\s*시간/.test((el.textContent||'').trim()));
    if(!holiday||!regular) return;
    const now=new Date();
    const day=now.getDay();
    if(day===0||day===6) return;
    const hs=getComputedStyle(holiday);
    const rs=getComputedStyle(regular);
    const holidayLooksActive=holiday.getAttribute('aria-pressed')==='true'||holiday.classList.contains('active')||holiday.classList.contains('selected')||hs.backgroundColor!==rs.backgroundColor;
    if(holidayLooksActive && typeof regular.click==='function') regular.click();
  }
  setTimeout(normalizeHolidayMode,300);
  setTimeout(normalizeHolidayMode,1200);
})();
${end}
`;

s+='\n'+repair+'\n';
fs.writeFileSync(jsFile,s,'utf8');

const written=fs.readFileSync(jsFile,'utf8');
const required=[
  'const APP_VERSION = "0.81.32";',
  'UEP_08132_INTERACTION_REPAIR_START',
  "closest('[data-curriculum-subject]')",
  'uepOpenSubjectModal08128(key)',
  "closest('[data-record-student]')",
  "closest('[data-uep-student-prev]')",
  "closest('[data-uep-student-next]')",
  'visibleStudentIds()',
  'normalizeHolidayMode()'
];
for(const marker of required) if(!written.includes(marker)) throw new Error('0.81.32 marker missing: '+marker);
console.log('UEP 0.81.32 runtime interaction repair applied.');
