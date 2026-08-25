const fs=require('fs');
const g='app/resources/app/gyomuon.js',m='app/resources/app/electron/main.cjs',p='app/resources/app/electron/preload.cjs';
let gy=fs.readFileSync(g,'utf8'),main=fs.readFileSync(m,'utf8'),pre=fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const rep=(src,from,to,label)=>{must(src.includes(from),'missing '+label);must(src.indexOf(from)===src.lastIndexOf(from),'non-unique '+label);return src.replace(from,to)};
function functionBlock(src,name){let start=src.indexOf(`async function ${name}`);if(start<0)start=src.indexOf(`function ${name}`);must(start>=0,`function missing: ${name}`);const candidates=[src.indexOf('\nasync function ',start+20),src.indexOf('\nfunction ',start+20),src.indexOf('\nipcMain.handle',start+20)].filter(x=>x>start);const end=candidates.length?Math.min(...candidates):src.length;return {start,end,block:src.slice(start,end)};}
function replaceFn(src,name,fn){const hit=functionBlock(src,name),block=fn(hit.block);must(block!==hit.block,`no change in ${name}`);return src.slice(0,hit.start)+block+src.slice(hit.end);}

// Dedicated input-center source reader: refresh only the source ledger used by input-center library/review.
const inputAnchor='async function saveInputCenterRecords(payload={}){';
must(main.includes(inputAnchor),'saveInputCenterRecords anchor missing');
const inputHelper=`async function fetchInputCenterSourceData(){
  const auth=await getReadonlySheetsAuth();
  const result=await readSheetBatch(auth.token,UEP_INPUT_CENTER_SPREADSHEET_ID,["'02_자료원본'!A1:X10000"]);
  const sourceMatrix=result?.[0]?.values||[];
  const headers=(sourceMatrix[2]||[]).map(v=>String(v||'').trim());
  const externalInputs=sourceMatrix.slice(3).filter(row=>row.some(v=>String(v||'').trim())).map(row=>{
    const o=Object.fromEntries(headers.map((h,i)=>[h,row[i]??'']));
    return {id:o['입력ID'],batchId:o['배치ID'],source:o['입력경로'],type:o['자료유형'],subtype:o['세부유형'],schoolYear:o['학년도'],semester:o['학기'],studentId:o['학생ID'],studentNo:o['학번'],name:o['성명'],grade:o['학년'],className:o['반'],fileName:o['원본파일명'],storedPath:o['원본보관경로'],title:o['자료제목'],rawText:o['원본텍스트'],normalizedText:o['구조화데이터'],status:o['처리상태'],matchStatus:o['매칭상태'],programId:o['프로그램ID'],programKind:o['프로그램구분'],teacher:o['등록교사'],createdAt:o['등록일시'],note:o['비고'],storageMode:'uep'};
  });
  const inputCenterSyncedAt=new Date().toISOString();
  if(liveDataCache){liveDataCache={...liveDataCache,externalInputs,inputCenterSyncedAt};liveDataFetchedAt=Date.now();}
  return {ok:true,externalInputs,inputCenterSyncedAt};
}

`;
main=main.replace(inputAnchor,inputHelper+inputAnchor);

// Do not invalidate the whole graph after source save/classification. Return the focused source ledger.
main=replaceFn(main,'saveInputCenterRecords',block=>block.replace(
`  liveDataCache=null;liveDataFetchedAt=0;
  return {ok:true,count:newItems.length+updateItems.length,newCount:newItems.length,duplicateCount:duplicateItems.length,updateCount:updateItems.length,skippedCount:duplicateItems.length,batchId,storageMode,inputCenterSpreadsheetId:UEP_INPUT_CENTER_SPREADSHEET_ID};`,
`  let sourcePatch=null;if(storageMode==='uep')sourcePatch=await fetchInputCenterSourceData();
  return {ok:true,count:newItems.length+updateItems.length,newCount:newItems.length,duplicateCount:duplicateItems.length,updateCount:updateItems.length,skippedCount:duplicateItems.length,batchId,storageMode,inputCenterSpreadsheetId:UEP_INPUT_CENTER_SPREADSHEET_ID,externalInputs:sourcePatch?.externalInputs||null,inputCenterSyncedAt:sourcePatch?.inputCenterSyncedAt||''};`));
main=replaceFn(main,'classifyInputCenterBatch',block=>block.replace(
`    liveDataCache=null;liveDataFetchedAt=0;return {ok:true,count,batchId};`,
`    const sourcePatch=await fetchInputCenterSourceData();return {ok:true,count,batchId,externalInputs:sourcePatch.externalInputs,inputCenterSyncedAt:sourcePatch.inputCenterSyncedAt};`));

// Bridge for an explicit focused refresh/fallback.
const ipcAnchor='ipcMain.handle("inputCenter:selectFiles", async (event) => selectInputCenterFiles(event));';
must(main.includes(ipcAnchor),'input IPC anchor missing');
main=main.replace(ipcAnchor,`ipcMain.handle("inputCenter:refreshSource", async () => {try{return await fetchInputCenterSourceData();}catch(error){return {ok:false,reason:error?.message||'입력센터 원본 갱신 실패'};}});\n`+ipcAnchor);
const preAnchor='selectInputFiles: () => ipcRenderer.invoke("inputCenter:selectFiles"),';
must(pre.includes(preAnchor),'preload input anchor missing');
pre=pre.replace(preAnchor,preAnchor+'\n  refreshInputCenterSource: () => ipcRenderer.invoke("inputCenter:refreshSource"),');

// Renderer focused merge helper.
const rendererAnchor='function inputCenterAllHistory(){';
must(gy.includes(rendererAnchor),'input center renderer anchor missing');
const rendererHelper=`async function refreshInputCenterSourceSilently(){
  if(!window.schoolBoard?.refreshInputCenterSource)return false;
  try{const result=await window.schoolBoard.refreshInputCenterSource();if(!result?.ok)return false;readonlyCache={...(readonlyCache||{}),externalInputs:result.externalInputs||[],inputCenterSyncedAt:result.inputCenterSyncedAt||new Date().toISOString()};return true;}catch{return false;}
}
`;
gy=gy.replace(rendererAnchor,rendererHelper+rendererAnchor);

// Source save: server already returns fresh source rows; local mode needs no network at all.
const saveRefresh=`  inputCenterDrafts=[]; await refreshReadonlyCacheSilently({force:true,rerender:false}); if(inputCenterConfig.storageMode==='uep'){inputCenterConfig.tab='library';inputCenterConfig.batchFilter=batchId;inputCenterConfig.historyMode='active';} render('inputs');`;
const saveFocused=`  inputCenterDrafts=[]; if(inputCenterConfig.storageMode==='uep'){if(Array.isArray(result?.externalInputs))readonlyCache={...(readonlyCache||{}),externalInputs:result.externalInputs,inputCenterSyncedAt:result.inputCenterSyncedAt||new Date().toISOString()};else await refreshInputCenterSourceSilently();inputCenterConfig.tab='library';inputCenterConfig.batchFilter=batchId;inputCenterConfig.historyMode='active';} render('inputs');`;
gy=rep(gy,saveRefresh,saveFocused,'input save full refresh');

const classifyOld=`const result=await window.schoolBoard?.classifyInputBatch?.({batchId:activeBatchId,nature,programId,programKind:program.kind||'',programName:program.actualTitle||program.title||'',programSemester:program.semester||program.term||''});if(!result?.ok)return toast(result?.reason||'검수·분류 저장에 실패했습니다.');await refreshReadonlyCacheSilently({force:true,rerender:false});inputCenterConfig.tab='review';`;
const classifyNew=`const result=await window.schoolBoard?.classifyInputBatch?.({batchId:activeBatchId,nature,programId,programKind:program.kind||'',programName:program.actualTitle||program.title||'',programSemester:program.semester||program.term||''});if(!result?.ok)return toast(result?.reason||'검수·분류 저장에 실패했습니다.');if(Array.isArray(result?.externalInputs))readonlyCache={...(readonlyCache||{}),externalInputs:result.externalInputs,inputCenterSyncedAt:result.inputCenterSyncedAt||new Date().toISOString()};else await refreshInputCenterSourceSilently();inputCenterConfig.tab='review';`;
gy=rep(gy,classifyOld,classifyNew,'input classify full refresh');

// Contact save: update one student field locally, no whole-graph fetch.
main=replaceFn(main,'saveStudentContact',block=>block.replace(
`  liveDataCache=null; liveDataFetchedAt=0;
  const data=await fetchLiveData({force:true});
  return {ok:true,data};`,
`  if(liveDataCache?.students){liveDataCache={...liveDataCache,students:liveDataCache.students.map(student=>String(student.id||'')===studentId?{...student,[field]:value}:student)};liveDataFetchedAt=Date.now();}
  return {ok:true,contactPatch:{studentId,field,value}};`));
const contactOld=`    readonlyCache=result.data||readonlyCache;
    toast(\`${'${label}'}를 UEP 기본정보 연결시트에 저장했습니다.\`);`;
const contactNew=`    if(result?.contactPatch){const patch=result.contactPatch;readonlyCache={...(readonlyCache||{}),students:(readonlyCache?.students||[]).map(row=>String(row.id||'')===String(patch.studentId||'')?{...row,[patch.field]:patch.value}:row)};}
    toast(\`${'${label}'}를 UEP 기본정보 연결시트에 저장했습니다.\`);`;
gy=rep(gy,contactOld,contactNew,'renderer contact full cache replacement');

fs.writeFileSync(g,gy,'utf8');fs.writeFileSync(m,main,'utf8');fs.writeFileSync(p,pre,'utf8');
console.log('UEP 0.81.72 input-center/contact refactor applied');
