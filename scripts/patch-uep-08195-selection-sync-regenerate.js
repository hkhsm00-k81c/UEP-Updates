const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
A(g.includes('UEP_08195_SELECTION_NORMALIZER_START'),'08195 normalizer missing');
A(g.includes('UEP_08195_SELECTION_OUTPUT_START'),'08195 output persistence missing');
A(!g.includes('UEP_08195_SELECTION_SYNC_REGENERATE_START'),'sync regenerate patch already applied');

function functionRange(src,name){
  const start=src.indexOf('async function '+name+'(')>=0?src.indexOf('async function '+name+'('):src.indexOf('function '+name+'(');
  A(start>=0,'function missing: '+name);
  const brace=src.indexOf('{',start);let depth=0,quote=null,esc=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];
    if(quote){if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(c===quote)quote=null;continue}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue}
    if(c==='{')depth++;else if(c==='}'&&--depth===0)return[start,i+1];
  }
  throw new Error('unterminated function '+name);
}

// 1) A successful full readonly sync is the authoritative trigger for rebuilding 51/52.
const [rs,re]=functionRange(g,'refreshReadonlyCacheSilently');
let rf=g.slice(rs,re);
const cacheAnchor="readonlyCache=uep08123NormalizeReadonlyCache(cached.data);";
A(rf.includes(cacheAnchor),'readonly cache assignment anchor missing');
rf=rf.replace(cacheAnchor,cacheAnchor+String.raw`
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
    /* UEP_08195_SELECTION_SYNC_REGENERATE_END */`);
g=g.slice(0,rs)+rf+g.slice(re);

// 2) Opening a selection-analysis workspace asks for one fresh full sync (throttled),
//    so 06 -> normalizer -> 51/52 -> UI happens before the workspace is shown.
const oldBind="$$('[data-curriculum-workspace]').forEach(b=>b.onclick=async()=>{/* __UEP_08163_CURRICULUM_BINDINGS__ */const next=b.dataset.curriculumWorkspace;if((next==='subjects'||next==='cross')&&!(await unlockSubjectConfidential()))return;curriculumWorkspaceMode=next;render('records');});";
A(g.includes(oldBind),'curriculum workspace binder anchor missing');
const newBind="$$('[data-curriculum-workspace]').forEach(b=>b.onclick=async()=>{/* __UEP_08163_CURRICULUM_BINDINGS__ */const next=b.dataset.curriculumWorkspace;if((next==='subjects'||next==='cross')&&!(await unlockSubjectConfidential()))return;try{const now=Date.now(),last=Number(window.__uep08195SelectionFullSyncAt||0);if(now-last>60000&&typeof refreshReadonlyCacheSilently==='function'){window.__uep08195SelectionFullSyncAt=now;await refreshReadonlyCacheSilently({force:true,rerender:false});}}catch(e){console.warn('[UEP 0.81.95] selection workspace refresh failed:',e)}curriculumWorkspaceMode=next;render('records');});";
g=g.replace(oldBind,newBind);

// 3) Expose a one-click/manual diagnostic helper without making manual execution authoritative.
g+='\n/* UEP_08195_SELECTION_SYNC_REGENERATE_DIAG */\nwindow.uepRefreshAndRegenerateSelections08195=async function(){const ok=await refreshReadonlyCacheSilently({force:true,rerender:false});if(!ok)return{ok:false,reason:googleConnectionError||\'선택과목 원본 동기화 실패\'};const result=window.__uep08195SelectionPersistLastResult||{ok:true};render(\'records\');return result};\n';

fs.writeFileSync(gFile,g,'utf8');
console.log('patched UEP 0.81.95: full sync now regenerates 51/52 and selection workspace refreshes latest 06');
