const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'cleanup-output';
fs.mkdirSync(outDir,{recursive:true});
const cssPath=path.join(appRoot,'resources/app/gyomuon.css');
const jsPath=path.join(appRoot,'resources/app/gyomuon.js');
const htmlPath=path.join(appRoot,'resources/app/index.html');
const css=fs.readFileSync(cssPath,'utf8');
const js=fs.existsSync(jsPath)?fs.readFileSync(jsPath,'utf8'):'';
const html=fs.existsSync(htmlPath)?fs.readFileSync(htmlPath,'utf8'):'';
const runtime=js+'\n'+html;
function normDecl(s){return s.replace(/\/\*[\s\S]*?\*\//g,'').split(';').map(x=>x.trim()).filter(Boolean).sort().join(';')}
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function lineAt(i){return 1+(css.slice(0,i).match(/\n/g)||[]).length}
const rules=[];
let i=0,media=[];
while(i<css.length){
  while(i<css.length&&/\s/.test(css[i]))i++;
  if(i>=css.length)break;
  if(css.startsWith('/*',i)){const e=css.indexOf('*/',i+2);i=e<0?css.length:e+2;continue;}
  if(css[i]==='@'){
    const open=css.indexOf('{',i); const semi=css.indexOf(';',i);
    if(semi>=0&&(open<0||semi<open)){i=semi+1;continue;}
    if(open<0)break;
    const head=css.slice(i,open).trim();
    let d=1,j=open+1,q=null,comment=false;
    for(;j<css.length&&d;j++){
      if(comment){if(css[j-1]==='*'&&css[j]==='/')comment=false;continue;}
      if(!q&&css[j]==='/'&&css[j+1]==='*'){comment=true;j++;continue;}
      if(q){if(css[j]==='\\')j++;else if(css[j]===q)q=null;continue;}
      if(css[j]==='"'||css[j]==="'"){q=css[j];continue;}
      if(css[j]==='{')d++; else if(css[j]==='}')d--;
    }
    const body=css.slice(open+1,j-1);
    if(/^@media|^@supports|^@container/.test(head)){
      // recursively parse simple nested rules by temporarily scanning body
      const offset=open+1; let k=0;
      while(k<body.length){
        while(k<body.length&&/\s/.test(body[k]))k++;
        if(k>=body.length)break;
        if(body.startsWith('/*',k)){const e=body.indexOf('*/',k+2);k=e<0?body.length:e+2;continue;}
        const o=body.indexOf('{',k); if(o<0)break;
        const sel=body.slice(k,o).trim(); let dd=1,l=o+1,qq=null;
        for(;l<body.length&&dd;l++){
          if(qq){if(body[l]==='\\')l++;else if(body[l]===qq)qq=null;continue;}
          if(body[l]==='"'||body[l]==="'"){qq=body[l];continue;}
          if(body[l]==='{')dd++; else if(body[l]==='}')dd--;
        }
        if(sel&&!sel.startsWith('@'))rules.push({selector:sel,decl:body.slice(o+1,l-1),context:head,line:lineAt(offset+k)});
        k=l;
      }
    }
    i=j;continue;
  }
  const open=css.indexOf('{',i); if(open<0)break;
  const selector=css.slice(i,open).trim(); let d=1,j=open+1,q=null;
  for(;j<css.length&&d;j++){
    if(q){if(css[j]==='\\')j++;else if(css[j]===q)q=null;continue;}
    if(css[j]==='"'||css[j]==="'"){q=css[j];continue;}
    if(css[j]==='{')d++; else if(css[j]==='}')d--;
  }
  if(selector)rules.push({selector,decl:css.slice(open+1,j-1),context:'root',line:lineAt(i)});
  i=j;
}
const groups=new Map();
for(const r of rules){const key=r.context+'||'+r.selector.replace(/\s+/g,' ').trim();if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}
const dup=[];
for(const [key,arr] of groups){if(arr.length<2)continue;const normalized=arr.map(x=>normDecl(x.decl));const identical=new Set(normalized).size===1;dup.push({selector:arr[0].selector,context:arr[0].context,count:arr.length,classification:identical?'EXACT_DUPLICATE':'OVERRIDE_CONFLICT',lines:arr.map(x=>x.line).join('|')})}
const tokenMap=new Map();
for(const r of rules){for(const m of r.selector.matchAll(/([.#])([A-Za-z_][\w-]*)/g)){const kind=m[1]==='.'?'class':'id',name=m[2],key=kind+':'+name;if(!tokenMap.has(key))tokenMap.set(key,{kind,name,cssRefs:0});tokenMap.get(key).cssRefs++;}}
const unused=[];
for(const t of tokenMap.values()){
  const p=t.kind==='class'?new RegExp('(?:class(?:Name)?\\s*[=:]\\s*[`"\\\'][^`"\\\']*|classList\\.(?:add|remove|toggle|contains)\\s*\\([^)]*)\\b'+esc(t.name)+'\\b','g'):new RegExp('(?:id\\s*[=:]\\s*[`"\\\']|getElementById\\s*\\(\\s*[`"\\\'])'+esc(t.name)+'\\b','g');
  const direct=(runtime.match(new RegExp('\\b'+esc(t.name)+'\\b','g'))||[]).length;
  const structured=(runtime.match(p)||[]).length;
  if(direct===0)unused.push({...t,directRefs:direct,structuredRefs:structured,classification:'UNUSED_SELECTOR_CANDIDATE'});
}
const stats={cssChars:css.length,ruleCount:rules.length,duplicateGroups:dup.length,exactDuplicates:dup.filter(x=>x.classification==='EXACT_DUPLICATE').length,overrideConflicts:dup.filter(x=>x.classification==='OVERRIDE_CONFLICT').length,unusedSelectorCandidates:unused.length};
function csv(rows,fields){return [fields.join(','),...rows.map(r=>fields.map(f=>'"'+String(r[f]??'').replaceAll('"','""')+'"').join(','))].join('\n')}
fs.writeFileSync(path.join(outDir,'css-duplicate-groups.csv'),csv(dup,['selector','context','count','classification','lines']),'utf8');
fs.writeFileSync(path.join(outDir,'css-unused-selector-candidates.csv'),csv(unused,['kind','name','cssRefs','directRefs','structuredRefs','classification']),'utf8');
const report=['# UEP CSS CLEANUP AUDIT','',`- CSS chars: ${stats.cssChars}`,`- parsed rule blocks: ${stats.ruleCount}`,`- duplicate selector groups: ${stats.duplicateGroups}`,`- EXACT_DUPLICATE: ${stats.exactDuplicates}`,`- OVERRIDE_CONFLICT: ${stats.overrideConflicts}`,`- UNUSED_SELECTOR_CANDIDATE: ${stats.unusedSelectorCandidates}`,'','## Exact duplicates'];
for(const x of dup.filter(x=>x.classification==='EXACT_DUPLICATE'))report.push(`- ${x.selector} [${x.context}] x${x.count} lines=${x.lines}`);
report.push('','## Override conflicts — merge manually');for(const x of dup.filter(x=>x.classification==='OVERRIDE_CONFLICT'))report.push(`- ${x.selector} [${x.context}] x${x.count} lines=${x.lines}`);
report.push('','## Unused selector candidates');for(const x of unused.slice(0,300))report.push(`- ${x.kind} ${x.name} cssRefs=${x.cssRefs}`);
report.push('','## Safety','- This audit performs no CSS deletion.','- EXACT_DUPLICATE can be considered for consolidation only after visual smoke tests.','- OVERRIDE_CONFLICT must preserve final cascade behavior and media-query context.','- UNUSED_SELECTOR_CANDIDATE means no literal runtime reference was found; dynamic class construction must be checked before removal.');
fs.writeFileSync(path.join(outDir,'CSS-CLEANUP-AUDIT.md'),report.join('\n'),'utf8');
console.log('CSS AUDIT COMPLETE '+JSON.stringify(stats));