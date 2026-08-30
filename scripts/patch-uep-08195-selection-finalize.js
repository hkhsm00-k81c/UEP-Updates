const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const mFile=path.join(root,'resources','app','electron','main.cjs');
const preFile=path.join(root,'resources','app','electron','preload.cjs');
let g=fs.readFileSync(gFile,'utf8'),m=fs.readFileSync(mFile,'utf8'),pre=fs.readFileSync(preFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
A(g.includes('UEP_08195_SELECTION_NORMALIZER_START'),'08195 normalizer missing');
A(g.includes('UEP_08195_SELECTION_OUTPUT_START'),'08195 output patch missing');
A(m.includes('UEP_RULES_SPREADSHEET_ID'),'rules spreadsheet identifier missing');
A(m.includes('UEP_PROCESSING_SPREADSHEET_ID'),'processing spreadsheet identifier missing');

// 0.81.73 localStorage was only a temporary UI store. 0.81.95 makes 41 the sole authority.
const oldDecision=`function decisions(){try{return JSON.parse(localStorage.getItem(DECISION_KEY)||'{}')||{}}catch{return{}}}\n  function saveDecision(k,v){const d=decisions();if(v)d[k]=v;else delete d[k];localStorage.setItem(DECISION_KEY,JSON.stringify(d));}`;
const newDecision=`function decisions(){const out={};try{for(const r of (readonlyCache?.selectionRules||[])){if(String(r?.['규칙유형']||'').trim()!=='관리자결정')continue;const term=String(r?.['학기']||'').trim(),subject=String(r?.['대상과목']||'').trim(),d=String(r?.['관리자결정']||'').trim();if(!term||!subject)continue;out[term+'::'+subject]=d==='폐강확정'?'closed':d==='개설유지'?'keep':''}}catch{}return out}\n  async function saveDecision(k,v){const p=String(k||'').split('::'),term=p.shift()||'',subject=p.join('::'),decision=v==='closed'?'폐강확정':v==='keep'?'개설유지':'자동판정';if(typeof window.saveSelectionCourseDecision08195==='function')return window.saveSelectionCourseDecision08195(term,subject,decision);return {ok:false,reason:'41 관리자결정 저장함수가 없습니다.'}}`;
A(g.includes(oldDecision),'legacy localStorage decision functions changed');
g=g.replace(oldDecision,newDecision);
g=g.replace("saveDecision(key,sel.value);applyCourseStatus(sel,sel.value,count)","Promise.resolve(saveDecision(key,sel.value)).then(r=>{if(r?.ok!==false)applyCourseStatus(sel,sel.value,count);else if(typeof toast==='function')toast(r?.reason||'개설결정 저장 실패')})");
// Remove the literal legacy storage key so it cannot become authoritative again.
g=g.replace("const DECISION_KEY='uep.curriculum.courseDecision.v1';","const DECISION_KEY='UEP_08195_DISABLED_LOCAL_DECISION_STORE';");

if(!m.includes('UEP_08195_SELECTION_DECISION_BACKEND_START')){
const backend=String.raw`
/* UEP_08195_SELECTION_DECISION_BACKEND_START */
async function saveSelectionCourseDecision08195(payload={}){
 const term=String(payload.term||'').trim(),subject=String(payload.subject||'').trim(),decision=String(payload.decision||'').trim(),writer=String(payload.writer||'').trim();
 if(!/^[23]-[12]$/.test(term)||!subject)throw new Error('학기/과목 정보가 없습니다.');
 if(!['자동판정','개설유지','폐강확정'].includes(decision))throw new Error('관리자결정 값이 올바르지 않습니다.');
 const auth=await getReadonlySheetsAuth(),token=auth.token;
 const matrix=(await readSheetBatch(token,UEP_RULES_SPREADSHEET_ID,["'41_선택과목규칙'!A1:Z1000"]))?.[0]?.values||[];
 const headers=(matrix[2]||[]).map(v=>String(v||'').trim()),idx=Object.fromEntries(headers.map((h,i)=>[h,i]));
 for(const h of ['규칙ID','규칙유형','입학연도','대상학년','학기','활성','대상과목','관리자결정','결정일시','결정자'])if(idx[h]==null)throw new Error('41_선택과목규칙 헤더 누락: '+h);
 const n=v=>String(v??'').normalize('NFKC').replace(/[\\s·ㆍ._*()\-]/g,'').trim();let pos=-1;
 for(let i=3;i<matrix.length;i++){const r=matrix[i]||[];if(String(r[idx['규칙유형']]||'').trim()==='관리자결정'&&String(r[idx['학기']]||'').trim()===term&&n(r[idx['대상과목']])===n(subject)){pos=i;break}}
 const now=new Date().toISOString();
 if(pos<0){const row=new Array(headers.length).fill('');row[idx['규칙ID']]='DEC-'+Date.now();row[idx['규칙유형']]='관리자결정';row[idx['입학연도']]=new Date().getFullYear();row[idx['대상학년']]=term[0];row[idx['학기']]=term;row[idx['활성']]='Y';row[idx['대상과목']]=subject;row[idx['관리자결정']]=decision;row[idx['결정일시']]=now;row[idx['결정자']]=writer;if(idx['오류메시지']!=null)row[idx['오류메시지']]=decision==='폐강확정'?'폐강 확정 과목입니다. 다른 과목으로 변경이 필요합니다.':'';await appendSheetValues(token,UEP_RULES_SPREADSHEET_ID,"'41_선택과목규칙'!A:Z",[row])}
 else{const rowNo=pos+1;await updateSheetValues(token,UEP_RULES_SPREADSHEET_ID,"'41_선택과목규칙'!W"+rowNo+":Y"+rowNo,[[decision,now,writer]])}
 const fresh=(await readSheetBatch(token,UEP_RULES_SPREADSHEET_ID,["'41_선택과목규칙'!A1:Z1000"]))?.[0]?.values||[],hh=(fresh[2]||[]).map(v=>String(v||'').trim());const selectionRules=fresh.slice(3).filter(r=>r.some(v=>String(v||'').trim())).map(r=>Object.fromEntries(hh.map((h,i)=>[h,r[i]??''])));if(liveDataCache)liveDataCache={...liveDataCache,selectionRules};return {ok:true,selectionRules,term,subject,decision,decidedAt:now,decider:writer}
}
/* UEP_08195_SELECTION_DECISION_BACKEND_END */
`;
 m=m.replace('app.whenReady().then(async () => {',backend+'\napp.whenReady().then(async () => {');
 m=m.replace('await migrateStableUserData();','await migrateStableUserData();\n  ipcMain.handle("selection:saveCourseDecision",async(_event,payload)=>{try{return await saveSelectionCourseDecision08195(payload)}catch(error){return {ok:false,reason:error?.message||"선택과목 결정 저장 실패"}}});');
}
if(!m.includes('UEP_08195_SELECTION_OUTPUT_BACKEND_START')){
const output=String.raw`
/* UEP_08195_SELECTION_OUTPUT_BACKEND_START */
async function persistSelectionNormalization08195(payload={}){
 const errorRows=Array.isArray(payload.errorRows)?payload.errorRows:[],statusRows=Array.isArray(payload.statusRows)?payload.statusRows:[];
 const auth=await getReadonlySheetsAuth(),token=auth.token;
 // Calculate first in renderer; only after complete arrays arrive do we replace data rows.
 await clearSheetValues(token,UEP_PROCESSING_SPREADSHEET_ID,"'51_선택과목오류_정규화'!A4:V5000");
 await clearSheetValues(token,UEP_PROCESSING_SPREADSHEET_ID,"'52_선택과목현황_정규화'!A4:AI5000");
 if(errorRows.length)await updateSheetValues(token,UEP_PROCESSING_SPREADSHEET_ID,"'51_선택과목오류_정규화'!A4:V"+(errorRows.length+3),errorRows);
 if(statusRows.length)await updateSheetValues(token,UEP_PROCESSING_SPREADSHEET_ID,"'52_선택과목현황_정규화'!A4:AI"+(statusRows.length+3),statusRows);
 return {ok:true,errorCount:errorRows.length,statusCount:statusRows.length,savedAt:new Date().toISOString()}
}
/* UEP_08195_SELECTION_OUTPUT_BACKEND_END */
`;
 m=m.replace('app.whenReady().then(async () => {',output+'\napp.whenReady().then(async () => {');
 m=m.replace('await migrateStableUserData();','await migrateStableUserData();\n  ipcMain.handle("selection:persistNormalization",async(_event,payload)=>{try{return await persistSelectionNormalization08195(payload)}catch(error){return {ok:false,reason:error?.message||"선택과목 정규화 저장 실패"}}});');
}
const expose='contextBridge.exposeInMainWorld("schoolBoard", {';A(pre.includes(expose),'preload schoolBoard anchor missing');
if(!pre.includes('saveSelectionCourseDecision:'))pre=pre.replace(expose,expose+'\n  saveSelectionCourseDecision: payload => ipcRenderer.invoke("selection:saveCourseDecision",payload),');
if(!pre.includes('persistSelectionNormalization:'))pre=pre.replace(expose,expose+'\n  persistSelectionNormalization: payload => ipcRenderer.invoke("selection:persistNormalization",payload),');

fs.writeFileSync(gFile,g,'utf8');fs.writeFileSync(mFile,m,'utf8');fs.writeFileSync(preFile,pre,'utf8');
console.log('finalized UEP 0.81.95: 41 authority + direct 51/52 persistence + no localStorage decision authority');
