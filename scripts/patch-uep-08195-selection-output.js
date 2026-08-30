const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const mFile=path.join(root,'resources','app','electron','main.cjs');
const preFile=path.join(root,'resources','app','electron','preload.cjs');
let g=fs.readFileSync(gFile,'utf8'),m=fs.readFileSync(mFile,'utf8'),pre=fs.readFileSync(preFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
A(g.includes('UEP_08195_SELECTION_NORMALIZER_START'),'08195 normalizer must be applied first');
A(!g.includes('UEP_08195_SELECTION_OUTPUT_START'),'08195 output patch already applied');

const processIdCandidates=['UEP_PROCESSING_SPREADSHEET_ID','UEP_DATA_PROCESSING_SPREADSHEET_ID','UEP_PROCESS_SPREADSHEET_ID','UEP_DATA_SPREADSHEET_ID'];
const processIdName=processIdCandidates.find(name=>new RegExp('(?:const|let|var)\\s+'+name+'\\s*=').test(m));
if(processIdName){
  const backend=String.raw`
/* UEP_08195_SELECTION_OUTPUT_BACKEND_START */
async function persistSelectionNormalization08195(payload={}){
  const errorRows=Array.isArray(payload.errorRows)?payload.errorRows:[],statusRows=Array.isArray(payload.statusRows)?payload.statusRows:[];
  const auth=await getReadonlySheetsAuth(),token=auth.token;
  await clearSheetValues(token,${processIdName},"'51_선택과목오류_정규화'!A4:V5000");
  await clearSheetValues(token,${processIdName},"'52_선택과목현황_정규화'!A4:AI5000");
  if(errorRows.length)await updateSheetValues(token,${processIdName},"'51_선택과목오류_정규화'!A4:V"+(errorRows.length+3),errorRows);
  if(statusRows.length)await updateSheetValues(token,${processIdName},"'52_선택과목현황_정규화'!A4:AI"+(statusRows.length+3),statusRows);
  return {ok:true,errorCount:errorRows.length,statusCount:statusRows.length,savedAt:new Date().toISOString()};
}
/* UEP_08195_SELECTION_OUTPUT_BACKEND_END */
`;
  const ipcAnchor='ipcMain.handle(';A(m.includes(ipcAnchor),'ipcMain anchor missing');
  m=m.replace(ipcAnchor,backend+'\n'+`ipcMain.handle("selection:persistNormalization",async(event,payload)=>{try{return await persistSelectionNormalization08195(payload)}catch(error){return {ok:false,reason:error?.message||'선택과목 정규화 저장 실패'}}});\n`+ipcAnchor);
  const exposeAt=pre.indexOf('contextBridge.exposeInMainWorld');A(exposeAt>=0,'preload expose anchor missing');const brace=pre.indexOf('{',exposeAt);A(brace>exposeAt,'preload exposed object missing');pre=pre.slice(0,brace+1)+'\n  persistSelectionNormalization: payload => ipcRenderer.invoke("selection:persistNormalization",payload),'+pre.slice(brace+1);
}else{
  console.warn('0.81.95: configured processing spreadsheet identifier not found; 51/52 persistence bridge not installed.');
}

const renderer=String.raw`
/* UEP_08195_SELECTION_OUTPUT_START */
(function(){
  if(typeof window==='undefined'||window.__UEP08195SelectionOutputInstalled)return;
  window.__UEP08195SelectionOutputInstalled=true;
  const base=window.uepSelectionDataset||uepSelectionDataset;if(typeof base!=='function')return;
  let lastSignature='',timer=null,inFlight=false;
  const clean=v=>String(v??'').trim(),now=()=>new Date().toISOString();
  const n=v=>String(v??'').normalize('NFKC').replace(/[\\s·ㆍ._*()\-]/g,'').trim();
  const studentId=e=>clean(e?.student?.id||e?.student?.studentId||e?.student?.studentNo);
  const studentNo=e=>clean(e?.student?.studentNo||e?.student?.no);
  const studentName=e=>clean(e?.student?.name||e?.student?.studentName);
  const studentStatus=e=>clean(e?.student?.status||e?.student?.schoolStatus);
  const toErrorRows=data=>{const stamp=now();return(data?.errors||[]).map((e,i)=>[
    'ERR-'+stamp.replace(/\\D/g,'').slice(0,14)+'-'+String(i+1).padStart(4,'0'),studentId(e),studentNo(e),studentName(e),studentStatus(e),2026,clean(e?.grade)||(/^[23]-/.test(clean(e?.term))?clean(e.term).charAt(0):''),clean(e?.term),clean(e?.groupId),clean(e?.subject),clean(e?.type),clean(e?.detail||e?.message),clean(e?.ruleId),clean(e?.severity||'오류'),clean(e?.prerequisite),clean(e?.relatedSubject),clean(e?.decision),clean(e?.openingThreshold||21),clean(e?.currentApplicants),clean(e?.status||'오류'),clean(e?.originalUpdatedAt),stamp
  ])};
  const toStatusRows=data=>{const stamp=now();return(data?.selectionStatusRows||[]).map(s=>{const h=s.hierarchy||{},b=s.stats?.bins||[0,0,0,0,0],t=s.track||{};return[
    clean(s.id),s.year||2026,clean(s.grade),clean(s.term),clean(s.groupId),clean(s.curriculumGroup),clean(s.subject),clean(s.cardType),Number(s.applicants||0),Number(s.sections||0),Number(t.문과||0),Number(t.이과||0),Number(t.미분류||0),Number.isFinite(s.stats?.avg)?s.stats.avg:'',Number.isFinite(s.stats?.median)?s.stats.median:'',Number(b[0]||0),Number(b[1]||0),Number(b[2]||0),Number(b[3]||0),Number(b[4]||0),Number(s.stats?.ungraded||0),clean(h.basic),Number(h.maxPool||0),Number(h.priorNormal||0),Number(h.selectable||0),Number(h.normal||0),Number(h.error||0),Number(h.unselected||0),Number(s.threshold||21),clean(s.autoDecision),clean(s.managerDecision||'자동판정'),clean(s.decisionAt),clean(s.decider),clean(readonlyCache?.syncedAt||readonlyCache?.selectionSyncedAt),stamp
  ]})};
  const signature=data=>JSON.stringify([(data?.errors||[]).map(e=>[studentId(e),e.type,e.term,n(e.subject),e.decision]),(data?.selectionStatusRows||[]).map(s=>[s.term,n(s.subject),s.applicants,s.validActual,s.managerDecision,s.hierarchy?.normal,s.hierarchy?.error])]);
  const schedule=data=>{if(!window.schoolBoard?.persistSelectionNormalization)return;const sig=signature(data);if(!sig||sig===lastSignature)return;lastSignature=sig;if(timer)clearTimeout(timer);timer=setTimeout(async()=>{if(inFlight)return;inFlight=true;try{const result=await window.schoolBoard.persistSelectionNormalization({errorRows:toErrorRows(data),statusRows:toStatusRows(data)});if(!result?.ok)console.warn('08195 selection normalization persistence failed:',result?.reason||'unknown');}catch(error){console.warn('08195 selection normalization persistence failed:',error)}finally{inFlight=false}},700)};
  const wrapped=function(){const data=base.apply(this,arguments);try{schedule(data)}catch(error){console.warn('08195 selection output schedule failed:',error)}return data};
  window.uepSelectionDataset=wrapped;try{uepSelectionDataset=wrapped}catch{}
  window.persistSelectionNormalizationNow08195=async function(){const data=base();if(!window.schoolBoard?.persistSelectionNormalization)return{ok:false,reason:'정규화 저장 브리지가 없습니다.'};return window.schoolBoard.persistSelectionNormalization({errorRows:toErrorRows(data),statusRows:toStatusRows(data)})};
})();
/* UEP_08195_SELECTION_OUTPUT_END */
`;
g+='\n'+renderer+'\n';
fs.writeFileSync(gFile,g,'utf8');fs.writeFileSync(mFile,m,'utf8');fs.writeFileSync(preFile,pre,'utf8');
console.log('patched UEP 0.81.95 selection normalization persistence: direct 51/52 writes, no Apps Script');
