const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(g.includes('UEP_08194_SELECTION_ERROR_SOURCE_START'),'sheet-first 51 source marker missing');
A(g.includes('UEP_08200_TERM_SCOPED_CROSS_ERRORS'),'0.82.00 cross-error marker missing');
A(g.includes('async function refreshReadonlyCacheSilently'),'readonly refresh function missing');
A(!g.includes('UEP_PENDING_51_LIVE_SOURCE_OF_TRUTH'),'pending 51 live-source patch already present');

const block=String.raw`
/* UEP_PENDING_51_LIVE_SOURCE_OF_TRUTH_START */
(function installSelection51LiveRefresh(){
  if(typeof window==='undefined'||window.__UEPSelection51LiveRefreshInstalled)return;
  window.__UEPSelection51LiveRefreshInstalled=true;

  // 51 is generated outside UEP by Apps Script. The generic readonly cache may stay
  // valid for up to an hour, so selection screens must not trust its age.
  let inFlight=null;
  let lastStartedAt=0;
  const MIN_INTERVAL_MS=15000;

  const isSelectionWorkspace=()=>{
    try{
      if(String(state?.activePage||'')!=='records')return false;
      const mode=String(typeof curriculumWorkspaceMode!=='undefined'?curriculumWorkspaceMode:'');
      return mode==='students'||mode==='cross'||mode==='subjects';
    }catch{return false;}
  };

  async function refreshSelection51FromSheet(){
    if(inFlight)return inFlight;
    const now=Date.now();
    if(now-lastStartedAt<MIN_INTERVAL_MS)return false;
    lastStartedAt=now;
    inFlight=(async()=>{
      try{
        // Full readonly sync is intentional here: 51 lives in the data-processing
        // spreadsheet and is not part of the lightweight operational-range sync.
        // This guarantees readonlyCache.selectionErrorRows is rebuilt from current 51.
        const ok=await refreshReadonlyCacheSilently({force:true,rerender:false});
        if(ok&&isSelectionWorkspace())render('records');
        return !!ok;
      }catch(error){
        console.warn('[UEP] 51 selection-error live refresh failed',error);
        return false;
      }
    })();
    try{return await inFlight;}finally{inFlight=null;}
  }

  const base=window.uepSelectionDataset||uepSelectionDataset;
  if(typeof base==='function'){
    const wrapped=function(){
      if(isSelectionWorkspace())queueMicrotask(()=>refreshSelection51FromSheet());
      return base.apply(this,arguments);
    };
    window.uepSelectionDataset=wrapped;
    try{uepSelectionDataset=wrapped}catch{}
  }

  // Exposed only for diagnostics/manual refresh from devtools; no sheet writes occur.
  window.__UEPRefreshSelection51=refreshSelection51FromSheet;
})();
/* UEP_PENDING_51_LIVE_SOURCE_OF_TRUTH_END */
`;
fs.writeFileSync(gFile,g+'\n'+block+'\n','utf8');
console.log('pending patch applied: 51 selection errors are refreshed from the current sheet on selection workspace access');
