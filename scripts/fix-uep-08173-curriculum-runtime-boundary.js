const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(g.includes('UEP_08173_CURRICULUM_WORKSPACE_START'),'08173 module missing');
A(g.includes('__uepCurriculumWorkspace08173'),'workspace entry missing');

// Replace subjectName structurally. Do not depend on the following function name or whitespace.
const subjectRe=/function\s+subjectName\s*\(\s*card\s*\)\s*\{[\s\S]*?\}\s*(?=function\s+[A-Za-z_$][\w$]*\s*\()/;
A(subjectRe.test(g),'subjectName function missing');
const safe=String.raw`function subjectName(card){
    if(!card)return '';
    const lines=String(card.innerText||card.textContent||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
    const ignored=/^(\d+-\d+|신청\s*\d+명|예상\s*\d+분반|안정|폐강대상|개설 유지|폐강 확정|자동판정)$/;
    return lines.find(x=>x&&!ignored.test(x)&&x.length<=80)||'';
  }
  `;
g=g.replace(subjectRe,safe);

// Add a fail-open wrapper after the curriculum module instead of matching its exact function body.
const END='/* UEP_08173_CURRICULUM_WORKSPACE_END */';
const WRAP='/* UEP_08173_CURRICULUM_BOUNDARY_WRAPPER */';
if(!g.includes(WRAP)){
  const p=g.indexOf(END);
  A(p>=0,'curriculum module end marker missing');
  const wrapper=String.raw`
${WRAP}
try{
  const __uepCurriculumWorkspace08173Original=window.__uepCurriculumWorkspace08173;
  window.__uepCurriculumWorkspace08173=(...args)=>{
    try{return __uepCurriculumWorkspace08173Original?.(...args);}
    catch(e){console.warn('[UEP 0.81.73] curriculum enhancement skipped',e);}
  };
}catch(e){console.warn('[UEP 0.81.73] curriculum boundary skipped',e);}
`;
  g=g.slice(0,p)+wrapper+g.slice(p);
}

fs.writeFileSync(gFile,g,'utf8');
const out=fs.readFileSync(gFile,'utf8');
for(const m of ['UEP_08173_CURRICULUM_BOUNDARY_WRAPPER','curriculum enhancement skipped','function subjectName(card){',"if(!card)return ''"])A(out.includes(m),'runtime boundary marker missing: '+m);
console.log('UEP 0.81.73 curriculum runtime boundary applied');
