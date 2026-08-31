const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root) throw new Error('usage: node patch-uep-outing-supervisor-mail-by-type.js <app-root>');
const gPath=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gPath,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

// v0.82.02 chose the report heading from weekday only. Friday now also permits
// academy outing + dorm return, so heading/body must be driven by request type.
const oldTitle="const title=sunday?'[늦은 입소 안내]':friday?'[조기 퇴소 안내]':'[외출 안내]';const empty=sunday?'금일 늦은 입소 학생 없음':friday?'금일 조기 퇴소 학생 없음':'금일 외출 학생 없음';";
const newTitle="const hasReturnOuting=filtered.some(item=>{const c=String(item.category||item.type||item.outingType||'').trim();return c==='외출'||c==='병원외출';});const hasEarlyExit=filtered.some(item=>{const c=String(item.category||item.type||item.outingType||'').trim();return c==='퇴소';});const hasLateEntry=filtered.some(item=>{const c=String(item.category||item.type||item.outingType||'').trim();return c==='늦은입소';});const title=hasLateEntry&&!hasReturnOuting&&!hasEarlyExit?'[늦은 입소 안내]':hasEarlyExit&&!hasReturnOuting?'[조기 퇴소 안내]':'[학사 외출 안내]';const empty=sunday?'금일 늦은 입소 학생 없음':friday?'금일 학사 외출·조기 퇴소 학생 없음':'금일 외출 학생 없음';";
must(g.includes(oldTitle),'v0.82.02 outing title block missing');
g=g.replace(oldTitle,newTitle);

// Keep the already-established privacy rule: supervisor report must never expose
// reason/destination(academy). Add type labels and times only around the existing
// student identity rendering. This marker is intentionally conservative so the
// final build/validation step can inspect the exact surrounding report renderer.
must(g.includes("map(item=>outingStudentNo(item)+' '+item.name)"),'minimal supervisor identity renderer missing');
g=g.replace("map(item=>outingStudentNo(item)+' '+item.name)","map(item=>{const c=String(item.category||item.type||item.outingType||'').trim();const label=c==='퇴소'?'조기 퇴소':c==='늦은입소'?'늦은 입소':'외출 후 학사 복귀';const out=String(item.outTime||item.outingTime||'').trim();const ret=String(item.returnTime||item.expectedReturnTime||item.inTime||'').trim();const times=c==='퇴소'?(out?' · '+out+' 퇴소':''):c==='늦은입소'?(ret?' · '+ret+' 입소 예정':''):((out?' · '+out+' 외출':'')+(ret?' → '+ret+' 복귀 예정':''));return label+' | '+outingStudentNo(item)+' '+item.name+times;})");

g+='\n/* UEP_OUTING_SUPERVISOR_MAIL_BY_TYPE: type-driven heading/body; no reason or academy */\n';
fs.writeFileSync(gPath,g,'utf8');
console.log('outing supervisor mail type patch applied');
