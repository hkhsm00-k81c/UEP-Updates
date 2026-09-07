const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'gyomuon.js');
const pp=path.join(root,'package.json');
const g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.64["'];/.test(g),'renderer version is not 0.82.64');
must(g.includes('UEP_08264_NIGHT_PROGRAM_CANONICAL_DEDUPE'),'release marker missing');
must(g.includes('const connectedCoverage=new Set('),'connected session coverage missing');
must(g.includes('canonicalConnected.filter(program=>!program.isCourseMaster&&program.date)'),'course master is incorrectly allowed to cover sessions');
must(g.includes('.filter(program=>program?.kind!=="after")'),'double after merge guard missing');
must(!g.includes('const programs=[...(readonlyCache?.programs||[]).map(programWithOverride),...(typeof afterSchoolProgramGroups==="function"?afterSchoolProgramGroups():[])];'),'old month double-merge remains');
must(g.includes('const connected = (readonlyCache?.programs || []).filter(program=>program?.kind!=="after");'),'student participation double-merge guard missing');
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));must(p.version==='0.82.64','package version is not 0.82.64');}

// Mirror the canonicalization rules with representative fixtures.
const cleanId=value=>String(value||'').replace(/^after-(?:course|master|session)-/,'').trim();
const courseKey=p=>cleanId(p.courseId||p.programId||p.id||'');
const slotKey=p=>String(p.slot||p.time||p.period||'').replace(/\s/g,'').trim()||'시간미등록';
const eventKey=p=>{const sid=cleanId(p.sessionId||'');if(sid)return `session|${sid}`;return ['event',courseKey(p),String(p.date||'').slice(0,10),slotKey(p),String(p.actualTitle||p.title||p.type||'').replace(/\s/g,'').trim()].join('|');};
function canonicalize(connected,derived){
  const sessionCourseKeys=new Set(connected.filter(p=>!p.isCourseMaster).map(courseKey).filter(Boolean));
  const seen=new Set(),cc=[];
  for(const p of connected){if(p.isCourseMaster&&courseKey(p)&&sessionCourseKeys.has(courseKey(p)))continue;const k=eventKey(p);if(seen.has(k))continue;seen.add(k);cc.push(p);}
  const coverage=new Set(cc.filter(p=>!p.isCourseMaster&&p.date).map(p=>`${String(p.date).slice(0,10)}|${slotKey(p)}`));
  return [...cc,...derived.filter(p=>!coverage.has(`${String(p.date||'').slice(0,10)}|${slotKey(p)}`))];
}

const afterSession={id:'after-session-A-1',sessionId:'A-1',courseId:'A',date:'2026-09-10',time:'야자1',title:'수학 방과후',kind:'after'};
const afterMaster={id:'after-master-A',courseId:'A',date:'2026-09-10',time:'야자1',title:'수학 방과후',kind:'after',isCourseMaster:true};
const afterDerived={id:'after-derived',date:'2026-09-10',time:'야자1',title:'방과후학교',kind:'after',source:'30_야자출결_정규화'};
let out=canonicalize([afterMaster,afterSession,{...afterSession}], [afterDerived]);
must(out.length===1&&out[0].sessionId==='A-1','afterschool master/session/attendance should collapse to one actual session');

const nightSession={id:'after-session-N-1',sessionId:'N-1',courseId:'N',date:'2026-07-14',time:'야자2',title:'영어 야간심화수업',kind:'after'};
const nightDerived={id:'night-derived',date:'2026-07-14',time:'야자2',title:'야간심화',kind:'after',source:'30_야자출결_정규화'};
out=canonicalize([nightSession], [nightDerived]);
must(out.length===1&&out[0].sessionId==='N-1','night-intensive actual session and attendance fallback should collapse to one event');

const parallelA={id:'after-session-P1',sessionId:'P1',courseId:'P-A',date:'2026-09-11',time:'야자1',title:'수학 A',kind:'after'};
const parallelB={id:'after-session-P2',sessionId:'P2',courseId:'P-B',date:'2026-09-11',time:'야자1',title:'영어 B',kind:'after'};
out=canonicalize([parallelA,parallelB],[]);
must(out.length===2,'legitimate parallel groups must remain distinct');

const oldOnly={id:'legacy-derived',date:'2026-06-18',time:'야자1',title:'야간심화',kind:'after',source:'30_야자출결_정규화'};
out=canonicalize([], [oldOnly]);
must(out.length===1&&out[0].id==='legacy-derived','historical fallback must remain when no actual session exists');

const nextDay={...afterSession,id:'after-session-A-2',sessionId:'A-2',date:'2026-09-12'};
out=canonicalize([afterSession,nextDay],[]);
must(out.length===2,'separate session dates must remain distinct');

console.log('UEP 0.82.64 night program dedupe regression tests passed');
