const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
A(g.includes('UEP_08195_SELECTION_NORMALIZER_START'),'08195 normalizer missing');
A(g.includes('UEP_08195_SELECTION_OUTPUT_START'),'08195 output missing');
A(!g.includes('UEP_08195_SELECTION_PERSIST_DIAGNOSTIC_START'),'diagnostic already installed');
const diagnostic=String.raw`
/* UEP_08195_SELECTION_PERSIST_DIAGNOSTIC_START */
(function(){
  if(typeof window==='undefined'||window.__UEP08195SelectionPersistDiagnosticInstalled)return;
  window.__UEP08195SelectionPersistDiagnosticInstalled=true;
  const clean=v=>String(v??'').trim();
  const snapshot=()=>{
    let data=null,error=null;
    try{data=typeof window.uepSelectionDataset==='function'?window.uepSelectionDataset():null}catch(e){error=e}
    return {
      at:new Date().toISOString(),
      datasetOk:!!data,
      datasetError:error?.message||'',
      sourceRows:Array.isArray(data?.rows)?data.rows.length:null,
      applicationRows:Array.isArray(data?.applications)?data.applications.length:null,
      errorRows:Array.isArray(data?.errors)?data.errors.length:null,
      statusRows:Array.isArray(data?.selectionStatusRows)?data.selectionStatusRows.length:null,
      bridgeOk:typeof window.schoolBoard?.persistSelectionNormalization==='function',
      forcePersistOk:typeof window.persistSelectionNormalizationNow08195==='function',
      normalizerVersion:clean(data?.__selectionNormalizerVersion),
      errorSource:clean(data?.__selectionErrorSource)
    };
  };
  window.runSelectionPersistenceDiagnostic08195=async function(){
    const before=snapshot();
    let persistResult=null,persistError='';
    try{
      if(typeof window.persistSelectionNormalizationNow08195!=='function')throw new Error('persistSelectionNormalizationNow08195 함수가 없습니다.');
      persistResult=await window.persistSelectionNormalizationNow08195();
    }catch(e){persistError=e?.message||String(e)}
    const result={...before,persistResult,persistError,finishedAt:new Date().toISOString()};
    window.__UEP08195SelectionPersistenceDiagnostic=result;
    try{localStorage.setItem('uep.08195.selectionPersistDiagnostic',JSON.stringify(result))}catch{}
    console.log('[08195-selection-persist-diagnostic]',result);
    if(typeof toast==='function'){
      if(persistResult?.ok)toast('선택과목 51/52 저장 진단 성공: 오류 '+(persistResult.errorCount??'?')+'건 / 현황 '+(persistResult.statusCount??'?')+'건');
      else toast('선택과목 51/52 저장 진단 실패: '+(persistResult?.reason||persistError||'원인 미확인'));
    }
    return result;
  };
  const boot=()=>setTimeout(()=>window.runSelectionPersistenceDiagnostic08195(),3500);
  if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();
/* UEP_08195_SELECTION_PERSIST_DIAGNOSTIC_END */
`;
g+='\n'+diagnostic+'\n';
fs.writeFileSync(gFile,g,'utf8');
console.log('installed UEP 0.81.95 selection persistence diagnostic and forced one-shot save');
