const fs=require('fs'),path=require('path');
const root=process.argv[2];if(!root)throw new Error('app root required');
const gp=path.join(root,'gyomuon.js'),mp=path.join(root,'electron','main.cjs'),pp=path.join(root,'package.json'),lp=path.join(root,'package-lock.json');
let g=fs.readFileSync(gp,'utf8');
const must=(x,msg)=>{if(!x)throw new Error(msg)};
must(g.includes('0.82.78'),'expected renderer 0.82.78');

// 1) Rich university detail: v0.82.73 profile badges still referenced removed legacy arrays.
// Use the already canonical active admission rows that drive the visible admission cards.
const oldAdmissionSource="  const admissionSource=[...majorRows,...restrictedRows].map(r=>[r['전형유형'],r['전형명'],r['선발방법'],r['전형방법'],r['서류평가'],r['교과세특'],r['비고']].map(uep08273Text).join(' ')).join(' ');";
const newAdmissionSource="  const admissionSource=activeAdmissions.map(r=>[r['전형유형'],r['대전형'],r['전형명'],r['선발방식']||r['선발방법'],r['평가구조요약']||r['전형방법'],r['서류평가'],r['교과세특'],r['비고']].map(uep08273Text).join(' ')).join(' ');";
must(g.includes(oldAdmissionSource),'legacy majorRows/restrictedRows profile source not found');
g=g.replace(oldAdmissionSource,newAdmissionSource);

// 2) Login path: after a successful cache read, immediately refresh the top sync badge.
const loginOld="if(cached?.ok&&cached.data){readonlyCache=uep08123NormalizeReadonlyCache(cached.data);googleConnectionError='';}startReadonlyAutoRefresh();navigate(state.activePage||'dashboard');";
const loginNew="if(cached?.ok&&cached.data){readonlyCache=uep08123NormalizeReadonlyCache(cached.data);googleConnectionError='';updateTopSyncStatus();}startReadonlyAutoRefresh();navigate(state.activePage||'dashboard');";
must(g.includes(loginOld),'login cache success anchor not found');
g=g.replace(loginOld,loginNew);

// 3) Startup cache restore: same state source as manual refresh, so automatic successful reads update the badge too.
const startupOld='if (cached?.ok) { readonlyCache=uep08123NormalizeReadonlyCache(cached.data); googleConnectionError = ""; }\n          else if (cached) googleConnectionError = cached.reason || "학교 데이터 동기화를 확인하세요. 마지막 저장 자료는 계속 사용할 수 있습니다.";';
const startupNew='if (cached?.ok) { readonlyCache=uep08123NormalizeReadonlyCache(cached.data); googleConnectionError = ""; updateTopSyncStatus(); }\n          else if (cached) googleConnectionError = cached.reason || "학교 데이터 동기화를 확인하세요. 마지막 저장 자료는 계속 사용할 수 있습니다.";';
must(g.includes(startupOld),'startup cache success anchor not found');
g=g.replace(startupOld,startupNew);

// 4) Admission staged refresh also changes the same cache; keep status source synchronized.
const stageOld="readonlyCache=uep08123NormalizeReadonlyCache(c.data);googleConnectionError='';\n      UEP_08250_LOAD.academic='ready';";
const stageNew="readonlyCache=uep08123NormalizeReadonlyCache(c.data);googleConnectionError='';updateTopSyncStatus();\n      UEP_08250_LOAD.academic='ready';";
if(g.includes(stageOld))g=g.replace(stageOld,stageNew);

must(!/\[\.\.\.majorRows,\.\.\.restrictedRows\]/.test(g),'undefined legacy admission arrays remain');
must(g.includes('const admissionSource=activeAdmissions.map'),'canonical admission source not applied');
must(g.includes("googleConnectionError='';updateTopSyncStatus();}startReadonlyAutoRefresh()"),'login sync badge update missing');
must(g.includes('googleConnectionError = ""; updateTopSyncStatus(); }'),'startup sync badge update missing');

g=g.replaceAll('0.82.78','0.82.79');
fs.writeFileSync(gp,g,'utf8');
for(const p of [mp,pp,lp])if(fs.existsSync(p)){let x=fs.readFileSync(p,'utf8').replaceAll('0.82.78','0.82.79');fs.writeFileSync(p,x,'utf8');}
console.log('UEP 0.82.79 university detail and startup sync-status fix applied');
