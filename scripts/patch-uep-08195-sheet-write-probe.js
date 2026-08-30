const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const mFile=path.join(root,'resources','app','electron','main.cjs');
const preFile=path.join(root,'resources','app','electron','preload.cjs');
const gFile=path.join(root,'resources','app','gyomuon.js');
let m=fs.readFileSync(mFile,'utf8'),pre=fs.readFileSync(preFile,'utf8'),g=fs.readFileSync(gFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
A(m.includes('UEP_PROCESSING_SPREADSHEET_ID'),'processing spreadsheet id missing');
A(m.includes('updateSheetValues'),'updateSheetValues missing');
A(m.includes('clearSheetValues'),'clearSheetValues missing');
A(m.includes('readSheetBatch'),'readSheetBatch missing');

if(!m.includes('UEP_08195_SHEET_WRITE_PROBE_START')){
 const backend=String.raw`
/* UEP_08195_SHEET_WRITE_PROBE_START */
async function runSelectionSheetWriteProbe08195(){
 const auth=(typeof getWritableSheetsAuth==='function')?await getWritableSheetsAuth():
            (typeof getSheetsAuth==='function')?await getSheetsAuth():
            (typeof getGoogleSheetsAuth==='function')?await getGoogleSheetsAuth():await getReadonlySheetsAuth();
 if(!auth?.token)throw new Error('Sheets auth token missing');
 const token=auth.token,id=UEP_PROCESSING_SPREADSHEET_ID,range="'52_선택과목현황_정규화'!A4";
 const marker='UEP_WRITE_TEST_'+Date.now();
 await updateSheetValues(token,id,range,[[marker]]);
 const chk=(await readSheetBatch(token,id,[range]))?.[0]?.values||[];
 const actual=String(chk?.[0]?.[0]??'');
 if(actual!==marker)throw new Error('52 A4 readback mismatch: '+actual);
 await clearSheetValues(token,id,range);
 const cleared=(await readSheetBatch(token,id,[range]))?.[0]?.values||[];
 if(String(cleared?.[0]?.[0]??'').trim())throw new Error('52 A4 cleanup failed');
 return {ok:true,marker,writeVerified:true,cleanupVerified:true,checkedAt:new Date().toISOString()};
}
/* UEP_08195_SHEET_WRITE_PROBE_END */
`;
 m=m.replace('app.whenReady().then(async () => {',backend+'\napp.whenReady().then(async () => {');
 m=m.replace('await migrateStableUserData();','await migrateStableUserData();\n  ipcMain.handle("selection:sheetWriteProbe08195",async()=>{try{return await runSelectionSheetWriteProbe08195()}catch(error){return {ok:false,reason:error?.message||String(error)}}});');
}
const expose='contextBridge.exposeInMainWorld("schoolBoard", {';
A(pre.includes(expose),'preload schoolBoard anchor missing');
if(!pre.includes('sheetWriteProbe08195:'))pre=pre.replace(expose,expose+'\n  sheetWriteProbe08195: () => ipcRenderer.invoke("selection:sheetWriteProbe08195"),');
if(!g.includes('UEP_08195_SHEET_WRITE_PROBE_RENDERER_START')){
 g+=String.raw`
/* UEP_08195_SHEET_WRITE_PROBE_RENDERER_START */
(function(){
 if(typeof window==='undefined'||window.__UEP08195SheetWriteProbeInstalled)return;
 window.__UEP08195SheetWriteProbeInstalled=true;
 window.runSelectionSheetWriteProbe08195=async()=>{
   try{
     const r=await window.schoolBoard?.sheetWriteProbe08195?.();
     console.log('[08195-probe] 52 A4 write/read/clear',r);
     window.__UEP08195SheetWriteProbeResult=r;
     return r;
   }catch(e){const r={ok:false,reason:e?.message||String(e)};window.__UEP08195SheetWriteProbeResult=r;console.error('[08195-probe]',r);return r;}
 };
 const boot=()=>setTimeout(()=>window.runSelectionSheetWriteProbe08195(),2500);
 if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();
/* UEP_08195_SHEET_WRITE_PROBE_RENDERER_END */
`;
}
fs.writeFileSync(mFile,m,'utf8');fs.writeFileSync(preFile,pre,'utf8');fs.writeFileSync(gFile,g,'utf8');
console.log('installed isolated 52 A4 Sheets write/read/clear probe');
