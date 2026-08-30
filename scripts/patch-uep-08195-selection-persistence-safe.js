const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const mFile=path.join(root,'resources','app','electron','main.cjs');
const preFile=path.join(root,'resources','app','electron','preload.cjs');
let g=fs.readFileSync(gFile,'utf8'),m=fs.readFileSync(mFile,'utf8'),pre=fs.readFileSync(preFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
A(g.includes('UEP_08195_SELECTION_NORMALIZER_START'),'normalizer missing');
A(g.includes('UEP_08195_SELECTION_OUTPUT_START'),'selection output missing');
A(m.includes('UEP_PROCESSING_SPREADSHEET_ID'),'processing spreadsheet id missing');
A(typeof m==='string'&&m.includes('updateSheetValues'),'updateSheetValues missing');
A(m.includes('clearSheetValues'),'clearSheetValues missing');
A(m.includes('readSheetBatch'),'readSheetBatch missing');

const start='/* UEP_08195_SELECTION_OUTPUT_BACKEND_START */';
const end='/* UEP_08195_SELECTION_OUTPUT_BACKEND_END */';
const a=m.indexOf(start),b=m.indexOf(end,a+start.length);
A(a>=0&&b>a,'selection persistence backend missing');
const backend=String.raw`/* UEP_08195_SELECTION_OUTPUT_BACKEND_START */
async function getSelectionWriteAuth08195(){
 const fn=(typeof getWritableSheetsAuth==='function')?getWritableSheetsAuth:
          (typeof getSheetsAuth==='function')?getSheetsAuth:
          (typeof getGoogleSheetsAuth==='function')?getGoogleSheetsAuth:
          getReadonlySheetsAuth;
 const auth=await fn();
 if(!auth||!auth.token)throw new Error('Google Sheets 인증 토큰을 가져오지 못했습니다.');
 return auth;
}
async function persistSelectionNormalization08195(payload={}){
 const errorRows=Array.isArray(payload.errorRows)?payload.errorRows:[];
 const statusRows=Array.isArray(payload.statusRows)?payload.statusRows:[];
 if(errorRows.some(r=>!Array.isArray(r)||r.length!==22))throw new Error('51 출력 행의 열 수가 22가 아닙니다.');
 if(statusRows.some(r=>!Array.isArray(r)||r.length!==35))throw new Error('52 출력 행의 열 수가 35가 아닙니다.');
 const auth=await getSelectionWriteAuth08195(),token=auth.token;
 const id=UEP_PROCESSING_SPREADSHEET_ID;
 await clearSheetValues(token,id,"'51_선택과목오류_정규화'!A4:V5000");
 await clearSheetValues(token,id,"'52_선택과목현황_정규화'!A4:AI5000");
 if(errorRows.length)await updateSheetValues(token,id,"'51_선택과목오류_정규화'!A4:V"+(errorRows.length+3),errorRows);
 if(statusRows.length)await updateSheetValues(token,id,"'52_선택과목현황_정규화'!A4:AI"+(statusRows.length+3),statusRows);
 const er="'51_선택과목오류_정규화'!A4:A"+Math.max(4,errorRows.length+3);
 const sr="'52_선택과목현황_정규화'!A4:A"+Math.max(4,statusRows.length+3);
 const chk=await readSheetBatch(token,id,[er,sr]);
 const eVals=chk?.[0]?.values||[],sVals=chk?.[1]?.values||[];
 const eCount=eVals.filter(r=>String(r?.[0]??'').trim()).length;
 const sCount=sVals.filter(r=>String(r?.[0]??'').trim()).length;
 if(eCount!==errorRows.length)throw new Error('51 저장 검증 실패: expected '+errorRows.length+', actual '+eCount);
 if(sCount!==statusRows.length)throw new Error('52 저장 검증 실패: expected '+statusRows.length+', actual '+sCount);
 if(errorRows.length&&String(eVals?.[0]?.[0]??'')!==String(errorRows[0]?.[0]??''))throw new Error('51 첫 행 ID 검증 실패');
 if(statusRows.length&&String(sVals?.[0]?.[0]??'')!==String(statusRows[0]?.[0]??''))throw new Error('52 첫 행 ID 검증 실패');
 const savedAt=new Date().toISOString();
 console.log('[08195] selection normalization persisted and verified', {errorCount:eCount,statusCount:sCount,savedAt});
 return {ok:true,errorCount:eCount,statusCount:sCount,verified:true,savedAt};
}
/* UEP_08195_SELECTION_OUTPUT_BACKEND_END */`;
m=m.slice(0,a)+backend+m.slice(b+end.length);

if(!g.includes('UEP_08195_SELECTION_PERSISTENCE_BOOTSTRAP_START')){
 const bootstrap=String.raw`
/* UEP_08195_SELECTION_PERSISTENCE_BOOTSTRAP_START */
(function(){
 if(typeof window==='undefined'||window.__UEP08195SelectionPersistenceBootstrap)return;
 window.__UEP08195SelectionPersistenceBootstrap=true;
 let running=false,lastRun=0;
 async function run(reason){
  if(running||typeof window.persistSelectionNormalizationNow08195!=='function')return;
  const now=Date.now();if(reason!=='startup'&&now-lastRun<1500)return;
  running=true;
  try{
   const r=await window.persistSelectionNormalizationNow08195();
   if(r?.ok){lastRun=Date.now();console.log('[08195] 51/52 persistence verified',reason,r)}
   else console.warn('[08195] 51/52 persistence failed',reason,r?.reason||r);
  }catch(e){console.warn('[08195] 51/52 persistence exception',reason,e)}
  finally{running=false}
 }
 const boot=()=>setTimeout(()=>run('startup'),2200);
 if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
 window.persistSelectionNormalizationVerified08195=()=>run('manual');
})();
/* UEP_08195_SELECTION_PERSISTENCE_BOOTSTRAP_END */`;
 g+='\n'+bootstrap+'\n';
}

A(pre.includes('persistSelectionNormalization:'),'preload persistence bridge missing');
A(m.includes('selection:persistNormalization'),'main persistence IPC missing');
A(g.includes('persistSelectionNormalizationNow08195'),'renderer persist function missing');
fs.writeFileSync(gFile,g,'utf8');
fs.writeFileSync(mFile,m,'utf8');
fs.writeFileSync(preFile,pre,'utf8');
console.log('patched UEP 0.81.95 safe 51/52 persistence with runtime readback verification');
