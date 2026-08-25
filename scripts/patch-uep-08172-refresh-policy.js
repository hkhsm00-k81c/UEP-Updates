const fs=require('fs');
const g='app/resources/app/gyomuon.js';
const m='app/resources/app/electron/main.cjs';
let gy=fs.readFileSync(g,'utf8');
let main=fs.readFileSync(m,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const rep=(src,from,to,label)=>{must(src.includes(from),'missing '+label);must(src.indexOf(from)===src.lastIndexOf(from),'non-unique '+label);return src.replace(from,to)};

// Keep full-sync age separate from operational-sync age.
gy=rep(gy,
`      if(result.patch&&typeof result.patch==='object')readonlyCache={...(readonlyCache||{}),...result.patch,syncedAt:result.syncedAt||new Date().toISOString()};`,
`      if(result.patch&&typeof result.patch==='object')readonlyCache={...(readonlyCache||{}),...result.patch,operationalSyncedAt:result.operationalSyncedAt||result.syncedAt||new Date().toISOString()};`,
'operational renderer timestamp');

main=rep(main,
`  const syncedAt=new Date().toISOString();liveDataCache={...liveDataCache,...patch,syncedAt};liveDataFetchedAt=Date.now();
  return {ok:true,syncedAt,patch};`,
`  const operationalSyncedAt=new Date().toISOString();liveDataCache={...liveDataCache,...patch,operationalSyncedAt};liveDataFetchedAt=Date.now();
  return {ok:true,operationalSyncedAt,syncedAt:operationalSyncedAt,patch};`,
'operational main timestamp');

// Startup: local cache first. Fresh cache -> operational-only. Missing/stale cache -> delayed full sync with per-PC jitter.
const oldStartup=`  if(googleConnectionStatus?.ok){
    setTimeout(async()=>{
      const ok=await refreshReadonlyCacheSilently({force:true,rerender:true});
      if(ok){
        updateTopSyncStatus();
        if(currentRoleId()==='admin') migrateAdminProgramOverridesToSheetOnce().catch(()=>{});
      }
    },900);
  }`;
const newStartup=`  if(googleConnectionStatus?.ok){
    const fullSyncedAt=readonlyCache?.syncedAt?new Date(readonlyCache.syncedAt).getTime():0;
    const fullAge=fullSyncedAt?Date.now()-fullSyncedAt:Number.POSITIVE_INFINITY;
    const needsFull=!readonlyCache||!fullSyncedAt||fullAge>=READONLY_FULL_REFRESH_MAX_AGE_MS;
    const jitter=needsFull?(2000+Math.floor(Math.random()*10000)):(500+Math.floor(Math.random()*2500));
    setTimeout(async()=>{
      const ok=needsFull
        ? await refreshReadonlyCacheSilently({force:true,rerender:true})
        : await refreshOperationalCacheSilently({rerender:true});
      if(ok){
        updateTopSyncStatus();
        if(currentRoleId()==='admin') migrateAdminProgramOverridesToSheetOnce().catch(()=>{});
      }
    },jitter);
  }`;
gy=rep(gy,oldStartup,newStartup,'startup full refresh block');

// Constants/cycle counter: full graph hourly, operational every 10 min.
gy=rep(gy,
`const READONLY_AUTO_REFRESH_MS = 10 * 60 * 1000;`,
`const READONLY_AUTO_REFRESH_MS = 10 * 60 * 1000;
const READONLY_FULL_REFRESH_MAX_AGE_MS = 60 * 60 * 1000;
let readonlyAutoRefreshCycle = 0;`,
'auto refresh constants');

const oldTimer=`  readonlyAutoRefreshTimer=setInterval(()=>{
    if(document.hidden) return;
    refreshOperationalCacheSilently({rerender:true});
  },READONLY_AUTO_REFRESH_MS);`;
const newTimer=`  readonlyAutoRefreshTimer=setInterval(()=>{
    if(document.hidden) return;
    readonlyAutoRefreshCycle+=1;
    const fullSyncedAt=readonlyCache?.syncedAt?new Date(readonlyCache.syncedAt).getTime():0;
    const fullAge=fullSyncedAt?Date.now()-fullSyncedAt:Number.POSITIVE_INFINITY;
    const needsFull=!fullSyncedAt||fullAge>=READONLY_FULL_REFRESH_MAX_AGE_MS||readonlyAutoRefreshCycle%6===0;
    if(needsFull){
      const jitter=Math.floor(Math.random()*45000);
      setTimeout(()=>{if(!document.hidden)refreshReadonlyCacheSilently({force:true,rerender:true});},jitter);
      return;
    }
    refreshOperationalCacheSilently({rerender:true});
  },READONLY_AUTO_REFRESH_MS);`;
gy=rep(gy,oldTimer,newTimer,'auto refresh timer');

// Remembered-login should not independently force the full graph. Operational helper falls back to full if there is no cache.
const remembered=`refreshReadonlyCacheSilently({force:true,rerender:false}).catch(()=>{});navigate(state.activePage||'dashboard');`;
must(gy.includes(remembered),'remembered login refresh call missing');
gy=gy.replace(remembered,`refreshOperationalCacheSilently({rerender:false}).catch(()=>{});navigate(state.activePage||'dashboard');`);

// Retire the 5-second auth badge polling repair. Keep a canonical local-state renderer hook instead.
const badgeRe=/\(function installSchoolReadAuthBadgeSync\(\)\{[\s\S]*?\}\)\(\);/;
must(badgeRe.test(gy),'legacy auth badge poller not found');
const badgeCore=`function syncSchoolReadAuthBadgeFromState(){
  try{
    const authenticated=Boolean(googleConnectionStatus?.ok);
    const nodes=[...document.querySelectorAll('[data-uep-school-read-auth-badge], .uep-school-read-auth-badge')];
    for(const node of nodes){
      node.dataset.uepSchoolReadAuthBadge='1';
      node.textContent=authenticated?'연결됨':'인증 필요';
      node.title=authenticated?'UEP School Read API 인증 정상':'UEP 로그인이 필요합니다.';
    }
  }catch(error){console.warn('[UEP] School Read auth badge state render failed',error);}
}
`;
gy=gy.replace(badgeRe,badgeCore);

// If legacy markup has no explicit badge selector, canonical top sync state already handles connection status.
// Call lightweight badge updater after each canonical render without IPC or a polling timer.
const renderAnchor=`    bindPage(page);
    updateStudentSignalIndicator();`;
must(gy.includes(renderAnchor),'render bind anchor missing');
gy=gy.replace(renderAnchor,`    bindPage(page);
    queueMicrotask(()=>syncSchoolReadAuthBadgeFromState());
    updateStudentSignalIndicator();`);

fs.writeFileSync(g,gy,'utf8');
fs.writeFileSync(m,main,'utf8');
console.log('UEP 0.81.72 refresh policy refactor applied');
