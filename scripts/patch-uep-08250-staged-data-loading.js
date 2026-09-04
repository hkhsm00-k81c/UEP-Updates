const fs=require('fs');
const path=require('path');
const root=process.argv[2];if(!root)throw new Error('app root required');
const g=path.join(root,'gyomuon.js'),p=path.join(root,'electron','preload.cjs'),m=path.join(root,'electron','main.cjs'),pkg=path.join(root,'package.json');
let s=fs.readFileSync(g,'utf8'), pre=fs.readFileSync(p,'utf8'), main=fs.readFileSync(m,'utf8');
function rep(src,a,b,label){if(!src.includes(a))throw new Error(label+' anchor not found');return src.replace(a,b)}
// login: cache-first entry; full refresh runs in background instead of blocking UEP start.
const old="hideUserAuthGate();const synced=await window.schoolBoard?.previewReadonlySync?.();if(synced?.ok){const cached=await window.schoolBoard?.readReadonlyCache?.();if(cached?.ok){readonlyCache=uep08123NormalizeReadonlyCache(cached.data);googleConnectionError='';}}else if(synced){googleConnectionError=synced.reason||'학교 데이터 동기화에 실패했습니다.';}startReadonlyAutoRefresh();navigate(state.activePage||'dashboard');";
const neu="hideUserAuthGate();const cached=await window.schoolBoard?.readReadonlyCache?.();if(cached?.ok&&cached.data){readonlyCache=uep08123NormalizeReadonlyCache(cached.data);googleConnectionError='';}startReadonlyAutoRefresh();navigate(state.activePage||'dashboard');setTimeout(()=>uep08250StartBackgroundStages(),80);";
s=rep(s,old,neu,'login sync');
// add stage controller before login handler.
const anchor="document.getElementById('userAuthForm')?.addEventListener('submit'";
const code=`/* UEP_08250_STAGED_DATA_LOADING */\nconst UEP_08250_LOAD={core:'ready',academic:'waiting',admission:'waiting',running:false};\nfunction uep08250Emit(){try{window.dispatchEvent(new CustomEvent('uep:data-stage',{detail:{...UEP_08250_LOAD}}));}catch{}}\nasync function uep08250RefreshStage(stage){\n  if(UEP_08250_LOAD[stage]==='loading')return; UEP_08250_LOAD[stage]='loading';uep08250Emit();\n  try{const r=await window.schoolBoard?.previewReadonlySync?.();if(r?.ok){const c=await window.schoolBoard?.readReadonlyCache?.();if(c?.ok&&c.data){readonlyCache=uep08123NormalizeReadonlyCache(c.data);googleConnectionError='';}}else if(r)googleConnectionError=r.reason||'';UEP_08250_LOAD[stage]='ready';}\n  catch(e){UEP_08250_LOAD[stage]='error';googleConnectionError=e?.message||String(e);}uep08250Emit();\n}\nasync function uep08250StartBackgroundStages(){if(UEP_08250_LOAD.running)return;UEP_08250_LOAD.running=true;uep08250Emit();try{await uep08250RefreshStage('academic');await new Promise(r=>setTimeout(r,250));await uep08250RefreshStage('admission');}finally{UEP_08250_LOAD.running=false;uep08250Emit();}}\nasync function uep08250PrioritizeAdmission(){if(UEP_08250_LOAD.admission==='ready')return true;await uep08250RefreshStage('admission');return UEP_08250_LOAD.admission==='ready';}\n`;
s=rep(s,anchor,code+anchor,'stage controller');
// admission actions prioritize the final stage if background has not completed yet.
s=s.replace("function openDashboardMajorUniversitySearch(){","async function openDashboardMajorUniversitySearch(){if(UEP_08250_LOAD.admission!=='ready')await uep08250PrioritizeAdmission();");
s=s.replace("function openDashboardUniversityDetail(university){","async function openDashboardUniversityDetail(university){if(UEP_08250_LOAD.admission!=='ready')await uep08250PrioritizeAdmission();");
// release notes/version.
s=s.replace(/const APP_VERSION\s*=\s*['\"]0\.82\.49['\"]/,'const APP_VERSION="0.82.50"');
s=s.replace(/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/,`const UEP_08221_RELEASE_NOTES=[\n  '로그인 후 저장된 핵심자료로 UEP에 먼저 진입',\n  '성적·선택과목 등 2차 자료를 백그라운드에서 연결',\n  '대학·입시 자료는 3차로 분리해 마지막에 연결',\n  '대학 기능을 먼저 누르면 3차 연결을 즉시 우선 처리'\n];`);
fs.writeFileSync(g,s);
let j=JSON.parse(fs.readFileSync(pkg,'utf8'));j.version='0.82.50';fs.writeFileSync(pkg,JSON.stringify(j,null,2));
console.log('patched 0.82.50 staged loading');
