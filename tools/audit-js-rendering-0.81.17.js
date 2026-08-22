const fs=require('fs');
const path=require('path');

const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'js-audit-output';
fs.mkdirSync(outDir,{recursive:true});

const targets=[
  path.join(appRoot,'resources/app/gyomuon.js'),
  path.join(appRoot,'resources/app/electron/main.cjs'),
  path.join(appRoot,'resources/app/electron/google-data.cjs')
].filter(fs.existsSync);

function count(re,s){return (s.match(re)||[]).length;}
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function csv(v){const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function writeCsv(name,rows,cols){const lines=[cols.join(',')];for(const r of rows)lines.push(cols.map(c=>csv(r[c])).join(','));fs.writeFileSync(path.join(outDir,name),lines.join('\n'),'utf8');}

const files=targets.map(p=>({path:p,text:fs.readFileSync(p,'utf8')}));
const allText=files.map(f=>f.text).join('\n');

// Named function declarations and simple assigned function/arrow forms.
const defs=[];
for(const f of files){
  const patterns=[
    {kind:'function',re:/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g},
    {kind:'assigned-fn',re:/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\b/g},
    {kind:'arrow',re:/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g},
    {kind:'window-fn',re:/\bwindow\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\b/g}
  ];
  for(const ptn of patterns){let m;while((m=ptn.re.exec(f.text)))defs.push({name:m[1],kind:ptn.kind,file:path.basename(f.path),index:m.index});}
}
const byName=new Map();for(const d of defs){if(!byName.has(d.name))byName.set(d.name,[]);byName.get(d.name).push(d);}
const duplicates=[...byName.entries()].filter(([,v])=>v.length>1).map(([name,v])=>({name,count:v.length,locations:v.map(x=>`${x.file}:${x.index}`).join(' | '),kinds:[...new Set(v.map(x=>x.kind))].join('|')})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));

const unused=[];
for(const [name,v] of byName){
  const refs=count(new RegExp(`\\b${esc(name)}\\b`,'g'),allText);
  const stringRefs=['"'+name+'"',"'"+name+"'",'`'+name+'`'].reduce((sum,needle)=>sum+(allText.split(needle).length-1),0);
  if(refs<=v.length && stringRefs===0)unused.push({name,definitions:v.length,identifierRefs:refs,stringRefs,locations:v.map(x=>`${x.file}:${x.index}`).join(' | ')});
}
unused.sort((a,b)=>a.identifierRefs-b.identifierRefs||a.name.localeCompare(b.name));

// Per-file rendering/event/data-access pressure metrics.
const metrics=[];
for(const f of files){
  const t=f.text;
  metrics.push({
    file:path.basename(f.path),chars:t.length,lines:t.split(/\r?\n/).length,
    functions:defs.filter(d=>d.file===path.basename(f.path)).length,
    innerHTML:count(/\.innerHTML\s*=/g,t),outerHTML:count(/\.outerHTML\s*=/g,t),insertAdjacentHTML:count(/\.insertAdjacentHTML\s*\(/g,t),replaceChildren:count(/\.replaceChildren\s*\(/g,t),
    querySelector:count(/\.querySelector\s*\(/g,t),querySelectorAll:count(/\.querySelectorAll\s*\(/g,t),getElementById:count(/\bgetElementById\s*\(/g,t),
    addEventListener:count(/\.addEventListener\s*\(/g,t),removeEventListener:count(/\.removeEventListener\s*\(/g,t),mutationObserver:count(/\bnew\s+MutationObserver\s*\(/g,t),setInterval:count(/\bsetInterval\s*\(/g,t),setTimeout:count(/\bsetTimeout\s*\(/g,t),
    fetchCalls:count(/\bfetch\s*\(/g,t),ipcInvoke:count(/\bipcRenderer\.invoke\s*\(/g,t)+count(/\bipcMain\.handle\s*\(/g,t),googleCalls:count(/\b(?:google|sheet|drive|calendar)[A-Za-z0-9_$]*\s*\(/gi,t)
  });
}

// Approximate function bodies for hotspot ranking (declaration functions only).
function findBodyEnd(text,start){const open=text.indexOf('{',start);if(open<0)return -1;let d=1,q=null,comment=null;for(let i=open+1;i<text.length;i++){const c=text[i],n=text[i+1];if(comment==='line'){if(c==='\n')comment=null;continue;}if(comment==='block'){if(c==='*'&&n==='/'){comment=null;i++;}continue;}if(q){if(c==='\\'){i++;continue;}if(c===q)q=null;continue;}if(c==='/'&&n==='/'){comment='line';i++;continue;}if(c==='/'&&n==='*'){comment='block';i++;continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='{')d++;else if(c==='}'&&--d===0)return i;}return -1;}
const hotspots=[];
for(const f of files){
  const re=/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g;let m;
  while((m=re.exec(f.text))){const end=findBodyEnd(f.text,m.index);if(end<0)continue;const body=f.text.slice(m.index,end+1);const domWrites=count(/\.innerHTML\s*=|\.outerHTML\s*=|\.insertAdjacentHTML\s*\(|\.replaceChildren\s*\(/g,body);const domReads=count(/\.querySelector\s*\(|\.querySelectorAll\s*\(|\bgetElementById\s*\(/g,body);const events=count(/\.addEventListener\s*\(/g,body);const observers=count(/\bnew\s+MutationObserver\s*\(/g,body);const timers=count(/\bsetInterval\s*\(|\bsetTimeout\s*\(/g,body);const dataCalls=count(/\bfetch\s*\(|\bipcRenderer\.invoke\s*\(|\buep[A-Za-z0-9_$]*(?:Load|Read|Fetch|Get|Query|Sync)[A-Za-z0-9_$]*\s*\(/g,body);const score=domWrites*5+domReads*2+events*3+observers*8+timers*2+dataCalls*4;if(score>=12)hotspots.push({name:m[1],file:path.basename(f.path),chars:body.length,domWrites,domReads,events,observers,timers,dataCalls,score});}
}
hotspots.sort((a,b)=>b.score-a.score||b.chars-a.chars);

const eventPatterns=[];
for(const f of files){
  const re=/([A-Za-z0-9_$.()\[\]'"-]+)\.addEventListener\s*\(\s*(['"])([^'"]+)\2/g;let m;const map=new Map();
  while((m=re.exec(f.text))){const key=`${m[1]} :: ${m[3]}`;map.set(key,(map.get(key)||0)+1);}
  for(const [key,n] of map)if(n>1)eventPatterns.push({file:path.basename(f.path),pattern:key,count:n});
}
eventPatterns.sort((a,b)=>b.count-a.count);

writeCsv('duplicate-functions.csv',duplicates,['name','count','kinds','locations']);
writeCsv('potential-unused-functions.csv',unused,['name','definitions','identifierRefs','stringRefs','locations']);
writeCsv('render-hotspots.csv',hotspots,['name','file','chars','domWrites','domReads','events','observers','timers','dataCalls','score']);
writeCsv('repeated-event-patterns.csv',eventPatterns,['file','pattern','count']);
writeCsv('file-metrics.csv',metrics,Object.keys(metrics[0]||{file:''}));

const summary={generatedAt:new Date().toISOString(),targets:targets.map(p=>path.relative(appRoot,p)),totals:{files:files.length,chars:files.reduce((s,f)=>s+f.text.length,0),functionDefinitions:defs.length,duplicateFunctionNames:duplicates.length,potentialUnusedFunctions:unused.length,renderHotspots:hotspots.length,repeatedEventPatterns:eventPatterns.length,mutationObservers:metrics.reduce((s,m)=>s+m.mutationObserver,0),eventListeners:metrics.reduce((s,m)=>s+m.addEventListener,0),domWrites:metrics.reduce((s,m)=>s+m.innerHTML+m.outerHTML+m.insertAdjacentHTML+m.replaceChildren,0)}};
fs.writeFileSync(path.join(outDir,'summary.json'),JSON.stringify(summary,null,2),'utf8');
const md=[
'# UEP 0.81.17 JS / Rendering Audit','',
'> Static audit only. No runtime source file is modified. Potential-unused findings are candidates, not deletion approval.','',
`- analyzed files: ${summary.totals.files}`,
`- analyzed JS chars: ${summary.totals.chars.toLocaleString()}`,
`- named function definitions: ${summary.totals.functionDefinitions}`,
`- duplicate function names: ${summary.totals.duplicateFunctionNames}`,
`- potential unused functions: ${summary.totals.potentialUnusedFunctions}`,
`- render/data hotspots: ${summary.totals.renderHotspots}`,
`- repeated event-listener patterns: ${summary.totals.repeatedEventPatterns}`,
`- MutationObserver creations: ${summary.totals.mutationObservers}`,
`- addEventListener calls: ${summary.totals.eventListeners}`,
`- DOM write operations: ${summary.totals.domWrites}`,'',
'## Top render/data hotspots','',
'| function | file | score | DOM writes | DOM reads | events | observers | timers | data calls |','|---|---|---:|---:|---:|---:|---:|---:|---:|',
...hotspots.slice(0,25).map(x=>`| ${x.name} | ${x.file} | ${x.score} | ${x.domWrites} | ${x.domReads} | ${x.events} | ${x.observers} | ${x.timers} | ${x.dataCalls} |`),'',
'## Duplicate function names','',
...(duplicates.length?duplicates.slice(0,40).map(x=>`- **${x.name}** × ${x.count} — ${x.locations}`):['- none detected']),'',
'## Next gate','',
'1. Cross-check potential-unused functions for dynamic invocation / window exports.','2. Trace top render hotspots for repeated DOM rebuilds and repeated data reads.','3. Only after smoke verification, create a separate cleanup candidate branch.'
];
fs.writeFileSync(path.join(outDir,'JS-RENDER-AUDIT.md'),md.join('\n'),'utf8');
console.log(JSON.stringify(summary,null,2));