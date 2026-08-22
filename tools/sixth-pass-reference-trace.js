const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'audit-output';
function parseCsv(text){
  const rows=[];let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(q&&text[i+1]==='"'){cur+='"';i++;}else q=!q;}
    else if(c===','&&!q){row.push(cur);cur='';}
    else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cur);cur='';if(row.some(x=>x!==''))rows.push(row);row=[];}
    else cur+=c;
  }
  if(cur||row.length){row.push(cur);rows.push(row)}
  if(!rows.length)return [];
  const h=rows[0];return rows.slice(1).map(a=>Object.fromEntries(h.map((x,i)=>[x,a[i]??''])));
}
function csv(rows,fields){return [fields.join(','),...rows.map(r=>fields.map(f=>'"'+String(r[f]??'').replaceAll('"','""')+'"').join(','))].join('\n')}
function read(p){return fs.existsSync(p)?fs.readFileSync(p,'utf8'):''}
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function toks(s){return new Set([...s.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)].map(m=>m[1]).filter(x=>x.length>2&&!['function','return','const','let','var','true','false','null','undefined','String','Number','Array','Object','Math','Date'].includes(x)))}
function jaccard(a,b){let inter=0;for(const x of a)if(b.has(x))inter++;const union=new Set([...a,...b]).size;return union?inter/union:0}
function findBody(src,name){
  const re=new RegExp('(?:^|\\n)\\s*(?:async\\s+)?function\\s+'+esc(name)+'\\s*\\([^)]*\\)\\s*\\{|(?:^|\\n)\\s*'+esc(name)+'\\s*=\\s*(?:async\\s*)?function\\s*\\([^)]*\\)\\s*\\{','g');
  let m,last=null;while((m=re.exec(src)))last=m;if(!last)return '';
  const brace=src.indexOf('{',last.index);let d=0,q=null,e=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];if(e){e=false;continue}if(q){if(c==='\\'){e=true;continue}if(c===q)q=null;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0)return src.slice(last.index+(last[0][0]==='\n'?1:0),i+1);
  }
  return '';
}
const g=read(path.join(appRoot,'resources/app/gyomuon.js'));
const main=read(path.join(appRoot,'resources/app/electron/main.cjs'));
const data=read(path.join(appRoot,'resources/app/electron/google-data.cjs'));
const preload=read(path.join(appRoot,'resources/app/electron/preload.cjs'));
const index=read(path.join(appRoot,'resources/app/index.html'));
const css=read(path.join(appRoot,'resources/app/gyomuon.css'));
const runtime=[g,main,data,preload,index,css].join('\n');
const review=parseCsv(read(path.join(outDir,'fourth-pass-dead-review.csv')));
if(review.length!==59)throw new Error(`Expected 59 fourth-pass candidates, got ${review.length}`);

// Build historical-only reference index from scripts and patches, not active runtime.
const histFiles=[];
for(const root of ['scripts','patches']){
  if(!fs.existsSync(root))continue;
  const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ps1|js|jsfrag|css|json)$/i.test(e.name))histFiles.push(p)}};walk(root);
}
const historical=histFiles.map(p=>({p,t:read(p)}));

// Current declared functions and bodies, for replacement similarity suggestions.
const names=[...g.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]);
const unique=[...new Set(names)];
const current=[];
for(const n of unique){const b=findBody(g,n);if(!b)continue;const refs=(g.match(new RegExp('\\b'+esc(n)+'\\b','g'))||[]).length;current.push({name:n,body:b,tokens:toks(b),refs})}

const rows=[];
for(const r of review){
  const n=r.name; const body=findBody(g,n); const bt=toks(body);
  const runtimeRefs=(runtime.match(new RegExp('\\b'+esc(n)+'\\b','g'))||[]).length;
  const stringRefs=(runtime.match(new RegExp('[\\x27\\x22]'+esc(n)+'[\\x27\\x22]','g'))||[]).length;
  const windowRefs=(runtime.match(new RegExp('window\\.'+esc(n)+'\\b','g'))||[]).length;
  const histHits=historical.filter(x=>new RegExp('\\b'+esc(n)+'\\b').test(x.t)).map(x=>x.p);
  let best={name:'',score:0,refs:0};
  for(const c of current){if(c.name===n||c.refs<=1)continue;const s=jaccard(bt,c.tokens);if(s>best.score)best={name:c.name,score:s,refs:c.refs};}
  let classification='MANUAL_REVIEW';
  if(runtimeRefs<=1&&stringRefs===0&&windowRefs===0){
    if(best.score>=0.45)classification='UNREACHABLE_WITH_REPLACEMENT_CANDIDATE';
    else if(histHits.length>0)classification='UNREACHABLE_HISTORICAL_ONLY';
    else classification='UNREACHABLE_NO_HISTORY';
  } else classification='KEEP_ACTIVE_REFERENCE';
  rows.push({name:n,line:r.line,fourthClass:r.classification,runtimeRefs,stringRefs,windowRefs,historicalFiles:histHits.length,historicalSample:histHits.slice(-4).join(' | '),replacement:best.name,replacementScore:best.score.toFixed(3),replacementRefs:best.refs,classification});
}
fs.writeFileSync(path.join(outDir,'sixth-pass-reference-trace.csv'),csv(rows,['name','line','fourthClass','runtimeRefs','stringRefs','windowRefs','historicalFiles','historicalSample','replacement','replacementScore','replacementRefs','classification']),'utf8');
const counts=Object.fromEntries([...new Set(rows.map(r=>r.classification))].map(k=>[k,rows.filter(r=>r.classification===k).length]));
const report=['# UEP CODEBASE AUDIT — SIXTH PASS REFERENCE TRACE','',`- candidates traced: ${rows.length}`];
for(const [k,v] of Object.entries(counts).sort())report.push(`- ${k}: ${v}`);
report.push('','## Unreachable candidates with possible replacement');
for(const r of rows.filter(x=>x.classification==='UNREACHABLE_WITH_REPLACEMENT_CANDIDATE').sort((a,b)=>Number(b.replacementScore)-Number(a.replacementScore)))report.push(`- ${r.name} @${r.line} -> ${r.replacement} score=${r.replacementScore} refs=${r.replacementRefs}; history=${r.historicalFiles}`);
report.push('','## Unreachable historical-only');
for(const r of rows.filter(x=>x.classification==='UNREACHABLE_HISTORICAL_ONLY'))report.push(`- ${r.name} @${r.line}; historical files=${r.historicalFiles}; ${r.historicalSample}`);
report.push('','## Unreachable with no historical reference');
for(const r of rows.filter(x=>x.classification==='UNREACHABLE_NO_HISTORY'))report.push(`- ${r.name} @${r.line}`);
report.push('','## Active/dynamic references requiring KEEP');
for(const r of rows.filter(x=>x.classification==='KEEP_ACTIVE_REFERENCE'))report.push(`- ${r.name} @${r.line} runtime=${r.runtimeRefs} string=${r.stringRefs} window=${r.windowRefs}`);
report.push('','## Safety rule','- No code is deleted in this pass.','- Historical-only means the name exists in scripts/patches but not in active runtime call paths detected by this audit.','- Replacement similarity is advisory only; it does not authorize deletion.','- Any deletion still requires route smoke tests and a flattened canonical runtime first.');
fs.writeFileSync(path.join(outDir,'SIXTH-PASS-REFERENCE-TRACE.md'),report.join('\n'),'utf8');
if(rows.length!==59)throw new Error('Incomplete sixth-pass coverage');
console.log('SIXTH PASS COMPLETE '+JSON.stringify(counts));