const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
A(g.includes('UEP_08195_SELECTION_NORMALIZER_START'),'08195 normalizer missing');
A(g.includes('UEP_08195_SELECTION_OUTPUT_START'),'08195 output persistence missing');
A(!g.includes('UEP_08195_SELECTION_SAFE_SYNC_START'),'safe sync already applied');

// IMPORTANT: do not replace or wrap curriculum workspace click bindings.
// The previous sync experiment touched [data-curriculum-workspace] handlers and caused
// 학생신청/문이과 교차오류/과목별 신청현황 buttons to stop responding.
const originalBinder="$$('[data-curriculum-workspace]').forEach(b=>b.onclick=async()=>{/* __UEP_08163_CURRICULUM_BINDINGS__ */const next=b.dataset.curriculumWorkspace;if((next==='subjects'||next==='cross')&&!(await unlockSubjectConfidential()))return;curriculumWorkspaceMode=next;render('records');});";
A(g.includes(originalBinder),'0.81.94 curriculum workspace binding changed before safe-sync patch');

const fnStart=g.indexOf('async function refreshReadonlyCacheSilently(');
A(fnStart>=0,'refreshReadonlyCacheSilently missing');
const cacheAnchor='readonlyCache=uep08123NormalizeReadonlyCache(cached.data);';
const anchorPos=g.indexOf(cacheAnchor,fnStart);
A(anchorPos>=0,'readonly cache assignment anchor missing');
const insertPos=anchorPos+cacheAnchor.length;
const hook=String.raw`
    /* UEP_08195_SELECTION_SAFE_SYNC_START */
    // The cache is already fresh here. Persist 51/52 in the background, but never
    // intercept navigation or block render. UI keeps the original 0.81.94 handlers.
    if(typeof window.persistSelectionNormalizationNow08195==='function'){
      Promise.resolve().then(async()=>{
        try{
          const result=await window.persistSelectionNormalizationNow08195();
          window.__uep08195SelectionPersistLastResult=result;
          if(!result?.ok)console.warn('[UEP 0.81.95] selection 51/52 persistence failed:',result?.reason||'unknown');
        }catch(error){
          window.__uep08195SelectionPersistLastResult={ok:false,reason:error?.message||String(error)};
          console.warn('[UEP 0.81.95] selection 51/52 persistence threw:',error);
        }
      });
    }
    /* UEP_08195_SELECTION_SAFE_SYNC_END */`;
g=g.slice(0,insertPos)+hook+g.slice(insertPos);

// Verify the original UI binder is still byte-for-byte present after patching.
A(g.includes(originalBinder),'safe-sync patch altered curriculum workspace binding');
fs.writeFileSync(gFile,g,'utf8');
console.log('patched UEP 0.81.95 safe sync: readonly refresh persists 51/52 without changing curriculum UI bindings');
