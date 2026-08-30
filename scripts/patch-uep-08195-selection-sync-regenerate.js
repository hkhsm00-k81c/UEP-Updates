const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
A(g.includes('UEP_08195_SELECTION_NORMALIZER_START'),'08195 normalizer missing');
A(g.includes('UEP_08195_SELECTION_OUTPUT_START'),'08195 output persistence missing');
A(!g.includes('UEP_08195_SELECTION_SYNC_REGENERATE_START'),'sync regenerate patch already applied');

// 1) A successful full readonly sync is the authoritative trigger for rebuilding 51/52.
const refreshStart=g.indexOf('async function refreshReadonlyCacheSilently(');
A(refreshStart>=0,'refreshReadonlyCacheSilently missing');
const cacheAnchor='readonlyCache=uep08123NormalizeReadonlyCache(cached.data);';
const cacheAt=g.indexOf(cacheAnchor,refreshStart);
A(cacheAt>=0 && cacheAt-refreshStart<12000,'readonly cache assignment anchor missing near refreshReadonlyCacheSilently');
const injected=cacheAnchor+String.raw`
    /* UEP_08195_SELECTION_SYNC_REGENERATE_START */
    try{
      if(typeof window.persistSelectionNormalizationNow08195==='function'){
        const persisted=await window.persistSelectionNormalizationNow08195();
        window.__uep08195SelectionPersistLastResult=persisted;
        if(!persisted?.ok)console.warn('[UEP 0.81.95] 51/52 regeneration failed after readonly sync:',persisted?.reason||'unknown');
      }
    }catch(selectionPersistError){
      window.__uep08195SelectionPersistLastResult={ok:false,reason:selectionPersistError?.message||String(selectionPersistError)};
      console.warn('[UEP 0.81.95] 51/52 regeneration threw after readonly sync:',selectionPersistError);
    }
    /* UEP_08195_SELECTION_SYNC_REGENERATE_END */`;
g=g.slice(0,cacheAt)+injected+g.slice(cacheAt+cacheAnchor.length);

// 2) Opening a selection-analysis workspace asks for one fresh full sync (throttled),
//    so 06 -> normalizer -> 51/52 -> UI happens before the workspace is shown.
const oldBind="$$('[data-curriculum-workspace]').forEach(b=>b.onclick=async()=>{/* __UEP_08163_CURRICULUM_BINDINGS__ */const next=b.dataset.curriculumWorkspace;if((next==='subjects'||next==='cross')&&!(await unlockSubjectConfidential()))return;curriculumWorkspaceMode=next;render('records');});";
A(g.includes(oldBind),'curriculum workspace binder anchor missing');
const newBind="$$('[data-curriculum-workspace]').forEach(b=>b.onclick=async()=>{/* __UEP_08163_CURRICULUM_BINDINGS__ */const next=b.dataset.curriculumWorkspace;if((next==='subjects'||next==='cross')&&!(await unlockSubjectConfidential()))return;try{const now=Date.now(),last=Number(window.__uep08195SelectionFullSyncAt||0);if(now-last>60000&&typeof refreshReadonlyCacheSilently==='function'){window.__uep08195SelectionFullSyncAt=now;await refreshReadonlyCacheSilently({force:true,rerender:false});}}catch(e){console.warn('[UEP 0.81.95] selection workspace refresh failed:',e)}curriculumWorkspaceMode=next;render('records');});";
g=g.replace(oldBind,newBind);

// 3) Expose a diagnostic helper. Full sync remains the source trigger; this helper only invokes that same path.
g+='\n/* UEP_08195_SELECTION_SYNC_REGENERATE_DIAG */\nwindow.uepRefreshAndRegenerateSelections08195=async function(){const ok=await refreshReadonlyCacheSilently({force:true,rerender:false});if(!ok)return{ok:false,reason:googleConnectionError||\'선택과목 원본 동기화 실패\'};const result=window.__uep08195SelectionPersistLastResult||{ok:true};render(\'records\');return result};\n';

fs.writeFileSync(gFile,g,'utf8');
console.log('patched UEP 0.81.95: full sync now regenerates 51/52 and selection workspace refreshes latest 06');
