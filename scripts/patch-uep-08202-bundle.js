const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root) throw new Error('usage: node patch-uep-08202-bundle.js <app-root>');
const gPath=path.join(root,'resources','app','gyomuon.js');
const mPath=path.join(root,'resources','app','electron','main.cjs');
let g=fs.readFileSync(gPath,'utf8');
let m=fs.readFileSync(mPath,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const once=(src,from,to,label)=>{const n=src.split(from).length-1;must(n===1,`${label}: expected 1 occurrence, got ${n}`);return src.replace(from,to)};

const oldMerge="data.errors=mergeCross08198((data.errors||[]).filter(x=>String(x?.type||'').trim()!=='문이과 교차오류'),crossErrors08198(data));\n    data.__selectionCrossRule='term-scoped-2-1-2-2-0.82.00';\n    data.__selectionRecommendedTrackErrors='reference-only';";
const newMerge="data.errors=(data.errors||[]).map(x=>{if(String(x?.type||'').trim()!=='문이과 교차오류')return x;const detail=String(x?.detail||'').trim();return {...x,type:'진로계열 교차선택',detail:detail+(detail&&!/진로.*확인/.test(detail)?' 진로계획과 맞는 선택인지 확인이 필요합니다.':'')};});\n    data.__selectionCrossRule='51-source-only-0.82.02';\n    data.__selectionRecommendedTrackErrors='reference-only';";
g=once(g,oldMerge,newMerge,'selection 51-only');
g=g.replaceAll('문이과 교차오류','진로계열 교차선택');

// Weekday-specific supervisor headings. Keep the existing filtering and identity-only list.
must(g.includes('const sunday=outingViewDate.getDay()===0;'),'outing sunday marker missing');
g=g.replace('const sunday=outingViewDate.getDay()===0;',"const weekday=outingViewDate.getDay(),sunday=weekday===0,friday=weekday===5;");
const bodyNeedle="const body=[...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([time,list])=>'■ '+time+' '+(sunday?'입소':'이동')+'\\\n'+list.sort((a,b)=>String(outingStudentNo(a)).localeCompare(String(outingStudentNo(b)))).map(item=>outingStudentNo(item)+' '+item.name).join('\\\n')).join('\\\n\\\n');";
must(g.includes(bodyNeedle),'outing body marker missing');
g=g.replace(bodyNeedle,"const action=sunday?'입소':friday?'퇴소':'외출';\\n    const body=[...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([time,list])=>'■ '+time+' '+action+'\\\n'+list.sort((a,b)=>String(outingStudentNo(a)).localeCompare(String(outingStudentNo(b)))).map(item=>outingStudentNo(item)+' '+item.name).join('\\\n')).join('\\\n\\\n');".replace('\\n    ','\n    '));
const titleNeedle="const title=sunday?'[오늘의 1학년 학사 입소 및 늦은 입소 현황]':'[오늘의 1학년 학사 외출 및 퇴소 현황]';const empty=sunday?'금일 늦은 입소 학생 없음':'금일 학사 외출·퇴소 학생 없음';";
must(g.includes(titleNeedle),'outing title marker missing');
g=g.replace(titleNeedle,"const title=sunday?'[늦은 입소 안내]':friday?'[조기 퇴소 안내]':'[외출 안내]';const empty=sunday?'금일 늦은 입소 학생 없음':friday?'금일 조기 퇴소 학생 없음':'금일 외출 학생 없음';");

const oldRoles="const allowedRoles=new Set(['admin','grade_head','grade_manager','homeroom','subject']);";
const newRoles="const allowedRoles=new Set(['admin','grade_head','grade_manager','homeroom','subject','담임','담임교사']); /* UEP_08202_HOMEROOM_DUTY_WRITE */";
m=once(m,oldRoles,newRoles,'night duty roles');

must(g.includes("map(item=>outingStudentNo(item)+' '+item.name)"),'supervisor report minimal identity marker missing');
g+='\n/* UEP_08202_BUNDLED_FIXES: 51-only cross | outing weekday labels | supervisor privacy | homeroom night-duty */\n';
fs.writeFileSync(gPath,g,'utf8');
fs.writeFileSync(mPath,m,'utf8');
console.log('UEP 0.82.02 patch applied');
