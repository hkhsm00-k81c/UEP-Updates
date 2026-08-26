const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(g.includes('UEP_08173_CURRICULUM_WORKSPACE_START'),'08173 module missing');

// Do not allow enhancement failures to break the original curriculum render.
// This patch is intentionally idempotent: runtime.js may preserve an already-hardened entry.
const old="  window.__uepCurriculumWorkspace08173=()=>{if(!isCurriculumPage())return;ensureStyle();decorateTopButtons();enhanceCourseCards();enhanceRosterPanel();renderDataStamp();releaseNotes();};";
const neu="  window.__uepCurriculumWorkspace08173=()=>{if(!isCurriculumPage())return;try{ensureStyle();decorateTopButtons();}catch(e){console.warn('[UEP 0.81.73] curriculum chrome skipped',e);}try{enhanceCourseCards();}catch(e){console.warn('[UEP 0.81.73] course enhancement skipped',e);}try{enhanceRosterPanel();}catch(e){console.warn('[UEP 0.81.73] roster enhancement skipped',e);}try{renderDataStamp();}catch(e){console.warn('[UEP 0.81.73] data stamp skipped',e);}try{releaseNotes();}catch(e){console.warn('[UEP 0.81.73] release notes skipped',e);}};";
if(g.includes(old))g=g.replace(old,neu);
else A(g.includes(neu),'workspace entry anchor missing');

// subjectName must be DOM-only. Never dereference curriculum dataset objects while decorating cards.
const s=g.indexOf('  function subjectName(card)');
const e=g.indexOf('\n  function currentTerm()',s);
A(s>=0&&e>s,'subjectName block anchors missing');
const safe=String.raw`  function subjectName(card){
    if(!card)return '';
    const lines=String(card.innerText||card.textContent||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
    const ignored=/^(\d+-\d+|신청\s*\d+명|예상\s*\d+분반|안정|폐강대상|개설 유지|폐강 확정|자동판정)$/;
    return lines.find(x=>x&&!ignored.test(x)&&x.length<=80)||'';
  }
`;
g=g.slice(0,s)+safe+g.slice(e);

fs.writeFileSync(gFile,g,'utf8');
const out=fs.readFileSync(gFile,'utf8');
for(const m of ["course enhancement skipped","roster enhancement skipped","function subjectName(card){","if(!card)return ''"])A(out.includes(m),'runtime boundary marker missing: '+m);
console.log('UEP 0.81.73 curriculum runtime boundary applied');
