const fs=require('fs'),path=require('path');
const root=process.argv[2];if(!root)throw new Error('app root required');
const g=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const gd=fs.readFileSync(path.join(root,'electron','google-data.cjs'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const must=(x,msg)=>{if(!x)throw new Error(msg)};

must(pkg.version==='0.82.79','package version mismatch');
must(g.includes('0.82.79'),'renderer version mismatch');

// Today University rich renderer must use the canonical active admission rows only.
must(g.includes('function openDashboardUniversityDetailRich'),'0.82.78 rich renderer/error boundary lost');
must(g.includes('async function openDashboardTodayUniversity'),'named Today University route lost');
must(g.includes("if(key==='university')return openDashboardTodayUniversity();"),'dashboard Today University native route lost');
must(g.includes('const admissionSource=activeAdmissions.map'),'canonical admission source missing');
must(!g.includes('[...majorRows,...restrictedRows]'),'removed legacy arrays still referenced');
must(g.includes('const activeAdmissions=admissions.filter(uep08258AdmissionActive)'), 'active admission set missing');

// Startup/login cache success must update the same top status used by manual refresh.
must(g.includes("if(cached?.ok&&cached.data){readonlyCache=uep08123NormalizeReadonlyCache(cached.data);googleConnectionError='';updateTopSyncStatus();}startReadonlyAutoRefresh();"),'login success does not refresh badge');
must(g.includes('if (cached?.ok) { readonlyCache=uep08123NormalizeReadonlyCache(cached.data); googleConnectionError = ""; updateTopSyncStatus(); }'),'startup cache success does not refresh badge');
must(g.includes('if (readonlyCache?.students?.length && neisData?.ok && !neisData.offline)'),'top sync status source changed unexpectedly');

// Protect the attendance fixes already verified in production.
must(g.includes("range: \"'30_야자출결_정규화'!A1:U70000\""),'bounded night attendance range lost');
must(g.includes("'11_방과후학교'" )&&g.includes("'12_차시일정'")&&g.includes("'13_출석부'"),'after-school canonical chain lost');
must(g.includes('8교시')&&g.includes('오후자습'),'8교시 afternoon-study mapping lost');

// The new patch itself must not add a DOM-observer workaround marker.
must(!g.includes('UEP_08279_MUTATION_OBSERVER'),'08279 DOM observer workaround introduced');
console.log('UEP 0.82.79 regression PASS');
