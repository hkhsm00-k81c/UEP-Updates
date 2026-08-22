const fs=require('fs');
const path=require('path');

const appRoot=process.argv[2]||'app';
const auditDir=process.argv[3]||'audit-output/js-rendering-0.81.17';
const outDir=process.argv[4]||'js-classification-output';
fs.mkdirSync(outDir,{recursive:true});

const targets=[
  path.join(appRoot,'resources/app/gyomuon.js'),
  path.join(appRoot,'resources/app/electron/main.cjs'),
  path.join(appRoot,'resources/app/electron/google-data.cjs')
].filter(fs.existsSync);
const files=targets.map(p=>({path:p,file:path.basename(p),text:fs.readFileSync(p,'utf8')}));
const allText=files.map(x=>x.text).join('\n');

function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function count(re,s){return (s.match(re)||[]).length;}
function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function writeCsv(name,rows,cols){const lines=[cols.join(',')];for(const r of rows)lines.push(cols.map(c=>csvEscape(r[c])).join(','));fs.writeFileSync(path.join(outDir,name),lines.join('\n'),'utf8');}
function parseCsv(file){const text=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(q){if(c==='"'&&n==='"'){cell+='"';i++;}else if(c==='"')q=false;else cell+=c;}else{if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell='';}else if(c!=='\r')cell+=c;}}if(cell.length||row.length){row.push(cell);rows.push(row);}const head=rows.shift()||[];return rows.filter(r=>r.some(x=>x!=='')).map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]??''])));}

const dupRows=parseCsv(path.join(auditDir,'duplicate-functions.csv'));
const unusedRows=parseCsv(path.join(auditDir,'potential-unused-functions.csv'));
const hotspotRows=parseCsv(path.join(auditDir,'render-hotspots.csv'));

const genericLocal=new Set(['close','add','matches','run','find','finish','label','match','opt','push','q','render','rows','esc']);

function evidence(name){
  const e={identifierRefs:count(new RegExp(`\\b${esc(name)}\\b`,'g'),allText),windowRefs:0,globalRefs:0,htmlHandlerRefs:0,stringRefs:0,exportRefs:0,ipcRefs:0};
  e.windowRefs=count(new RegExp(`\\bwindow\\.${esc(name)}\\b`,'g'),allText);
  e.globalRefs=count(new RegExp(`\\bglobalThis\\.${esc(name)}\\b`,'g'),allText);
  e.htmlHandlerRefs=count(new RegExp(`on(?:click|change|input|submit|keydown|keyup|load)\\s*=\\s*['\"][^'\"]*\\b${esc(name)}\\s*\\(`,'gi'),allText);
  e.stringRefs=['"'+name+'"',"'"+name+"'",'`'+name+'`'].reduce((s,n)=>s+(allText.split(n).length-1),0);
  e.exportRefs=count(new RegExp(`(?:module\\.exports|exports|window|globalThis)[^\\n]{0,80}\\b${esc(name)}\\b`,'g'),allText);
  e.ipcRefs=count(new RegExp(`(?:ipcRenderer|ipcMain)[^\\n]{0,120}\\b${esc(name)}\\b`,'g'),allText);
  return e;
}

const duplicateClassification=[];
for(const r of dupRows){
  const name=r.name;const e=evidence(name);let classification='NEEDS_RUNTIME_TRACE';let reason='duplicate name requires scope/body review';
  if(genericLocal.has(name)){classification='KEEP_REQUIRED';reason='generic local callback/helper name; repeated name alone is not duplication';}
  else if(e.windowRefs||e.globalRefs||e.htmlHandlerRefs||e.exportRefs||e.ipcRefs){classification='NEEDS_RUNTIME_TRACE';reason='feature-level duplicate has dynamic/global/export evidence';}
  else {classification='CONSOLIDATE_CANDIDATE';reason='feature-level duplicate with no dynamic/global evidence in static scan';}
  duplicateClassification.push({name,count:r.count,locations:r.locations,classification,reason,...e});
}

const unusedClassification=[];
for(const r of unusedRows){
  const name=r.name;const e=evidence(name);let classification='SAFE_DELETE_CANDIDATE';let reason='single definition with no static call/global/string/handler evidence';
  if(e.windowRefs||e.globalRefs||e.htmlHandlerRefs||e.exportRefs||e.ipcRefs){classification='KEEP_REQUIRED';reason='dynamic/global/export/HTML/IPC evidence found';}
  else if(e.stringRefs>0){classification='NEEDS_RUNTIME_TRACE';reason='string reference may indicate dynamic dispatch';}
  else if(/^(open|bind|send|prepare|retry|uep|dashboard|student|record|inputCenter|school|career|dorm|program)/.test(name)){classification='NEEDS_RUNTIME_TRACE';reason='feature entry/helper naming warrants runtime confirmation before deletion';}
  unusedClassification.push({name,locations:r.locations,classification,reason,...e});
}

const performanceClassification=[];
for(const r of hotspotRows){
  const score=Number(r.score||0),events=Number(r.events||0),writes=Number(r.domWrites||0),reads=Number(r.domReads||0),data=Number(r.dataCalls||0),observers=Number(r.observers||0),timers=Number(r.timers||0);
  let classification='KEEP_REQUIRED',reason='hotspot score alone does not prove runtime cost';
  if(/^bind/.test(r.name)&&events>=8){classification='PERFORMANCE_CANDIDATE';reason='binding function registers many listeners; inspect repeated invocation/idempotence';}
  else if(observers>0||timers>=5){classification='PERFORMANCE_CANDIDATE';reason='observer/timer pressure warrants lifecycle review';}
  else if(writes>=3&&(reads>=8||data>0)){classification='PERFORMANCE_CANDIDATE';reason='repeated DOM rebuild/read pattern warrants render caching/diff review';}
  performanceClassification.push({...r,classification,reason});
}

writeCsv('duplicate-classification.csv',duplicateClassification,['name','count','locations','classification','reason','identifierRefs','windowRefs','globalRefs','htmlHandlerRefs','stringRefs','exportRefs','ipcRefs']);
writeCsv('unused-classification.csv',unusedClassification,['name','locations','classification','reason','identifierRefs','windowRefs','globalRefs','htmlHandlerRefs','stringRefs','exportRefs','ipcRefs']);
writeCsv('performance-classification.csv',performanceClassification,['name','file','score','domWrites','domReads','events','observers','timers','dataCalls','classification','reason']);

function tally(rows,key='classification'){return rows.reduce((m,r)=>(m[r[key]]=(m[r[key]]||0)+1,m),{});}
const summary={generatedAt:new Date().toISOString(),duplicates:tally(duplicateClassification),unused:tally(unusedClassification),performance:tally(performanceClassification)};
fs.writeFileSync(path.join(outDir,'classification-summary.json'),JSON.stringify(summary,null,2),'utf8');

const topPerf=performanceClassification.filter(x=>x.classification==='PERFORMANCE_CANDIDATE').slice(0,20);
const md=[
'# UEP 0.81.17 JS Cleanup Classification','',
'> Audit/classification only. No production runtime source is modified. SAFE_DELETE_CANDIDATE still requires candidate-build smoke verification before deletion.','',
'## Classification totals','',
`- duplicate KEEP_REQUIRED: ${summary.duplicates.KEEP_REQUIRED||0}`,
`- duplicate CONSOLIDATE_CANDIDATE: ${summary.duplicates.CONSOLIDATE_CANDIDATE||0}`,
`- duplicate NEEDS_RUNTIME_TRACE: ${summary.duplicates.NEEDS_RUNTIME_TRACE||0}`,
`- unused KEEP_REQUIRED: ${summary.unused.KEEP_REQUIRED||0}`,
`- unused SAFE_DELETE_CANDIDATE: ${summary.unused.SAFE_DELETE_CANDIDATE||0}`,
`- unused NEEDS_RUNTIME_TRACE: ${summary.unused.NEEDS_RUNTIME_TRACE||0}`,
`- performance candidates: ${summary.performance.PERFORMANCE_CANDIDATE||0}`,'',
'## Duplicate consolidation candidates','',
...duplicateClassification.filter(x=>x.classification==='CONSOLIDATE_CANDIDATE').map(x=>`- **${x.name}** — ${x.locations}`),'',
'## Static safe-delete candidates','',
...unusedClassification.filter(x=>x.classification==='SAFE_DELETE_CANDIDATE').map(x=>`- **${x.name}** — ${x.locations}`),'',
'## Performance candidates','',
...topPerf.map(x=>`- **${x.name}** (${x.file}) score ${x.score}: ${x.reason}`),'',
'## Next gate','',
'1. Compare duplicate candidate bodies and call sites before consolidation.','2. Build a non-deploy cleanup candidate containing only static safe-delete candidates.','3. Run syntax + critical-screen anchors + smoke checks.','4. Trace bindPage/bindInputCenter invocation frequency before any event-binding rewrite.'
];
fs.writeFileSync(path.join(outDir,'JS-CLEANUP-CLASSIFICATION.md'),md.join('\n'),'utf8');
console.log(JSON.stringify(summary,null,2));