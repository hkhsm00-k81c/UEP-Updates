const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const repoRoot=process.argv[3]||'.';
const outDir=process.argv[4]||'cleanup-phase5-output';
fs.mkdirSync(outDir,{recursive:true});
const cssPath=path.join(appRoot,'resources/app/gyomuon.css');
const css=fs.readFileSync(cssPath,'utf8');

const unusedCandidates=['input-title-field','growth-guide-details','growth-sdg-legend','selection-hero','selection-subject-summary','selection-kpi-grid','selection-section','selection-error-group','selection-message-list','sdgs-page'];
const overrideSelectors=['.input-method-row','.input-method-row>b','.input-center-compact-setup label','.dashboard-report-program-row','.growth-sdg-detail article','.curriculum-filter-bar .record-class-cards'];
const textExt=new Set(['.js','.cjs','.mjs','.html','.htm','.json','.txt','.md','.yml','.yaml','.ps1','.css']);

function walk(root,skipDirs=new Set()){
  const out=[];
  if(!fs.existsSync(root))return out;
  for(const ent of fs.readdirSync(root,{withFileTypes:true})){
    if(skipDirs.has(ent.name))continue;
    const p=path.join(root,ent.name);
    if(ent.isDirectory())out.push(...walk(p,skipDirs));
    else if(textExt.has(path.extname(ent.name).toLowerCase()))out.push(p);
  }
  return out;
}
function safeRead(p){try{return fs.readFileSync(p,'utf8')}catch{return ''}}
function countAll(text,needle){if(!needle)return 0;let n=0,i=0;while((i=text.indexOf(needle,i))>=0){n++;i+=needle.length;}return n;}
const appFiles=walk(path.join(appRoot,'resources','app'),new Set(['node_modules'])).filter(p=>path.resolve(p)!==path.resolve(cssPath));
const historyFiles=walk(repoRoot,new Set(['.git','node_modules','audit-output','cleanup-output','cleanup-phase1-output','cleanup-phase2-output','cleanup-phase3-output','cleanup-phase4-output','cleanup-phase5-output']));
const runtimeBlob=appFiles.map(p=>`\n/*FILE:${p}*/\n${safeRead(p)}`).join('\n');
const historyBlob=historyFiles.map(p=>`\n/*FILE:${p}*/\n${safeRead(p)}`).join('\n');

const unused=[];
for(const name of unusedCandidates){
  const runtimeRefs=countAll(runtimeBlob,name);
  const historyRefs=countAll(historyBlob,name);
  const parts=name.split('-').filter(x=>x.length>=4);
  const componentRefs=parts.reduce((n,p)=>n+countAll(runtimeBlob,p),0);
  const classAttr=(runtimeBlob.match(new RegExp(`class(?:Name)?\\s*[=:]\\s*[\"'\\x60][^\"'\\x60]{0,500}${name}`,'g'))||[]).length;
  const selectorApi=(runtimeBlob.match(new RegExp(`(?:querySelector|matches|closest)\\s*\\([^\\n]{0,250}${name}`,'g'))||[]).length;
  const classList=(runtimeBlob.match(new RegExp(`classList\\.(?:add|remove|toggle|contains|replace)\\([^\\n]{0,250}${name}`,'g'))||[]).length;
  const classification=runtimeRefs===0&&classAttr===0&&selectorApi===0&&classList===0?'STRONG_UNUSED_RUNTIME':'KEEP_OR_REVIEW';
  unused.push({name,runtimeRefs,historyRefs,componentRefs,classAttr,selectorApi,classList,classification});
}

function parseDecls(body){
  const clean=body.replace(/\/\*[\s\S]*?\*\//g,'');const out=[];
  for(const raw of clean.split(';')){const i=raw.indexOf(':');if(i<0)continue;const prop=raw.slice(0,i).trim();const val=raw.slice(i+1).trim();if(prop&&val)out.push({prop,val});}
  return out;
}
function normSel(s){return s.replace(/\s+/g,' ').trim();}
function scanRules(text){
  const rules=[];let i=0;
  while(i<text.length){
    while(i<text.length&&/\s/.test(text[i]))i++;
    if(i>=text.length)break;
    if(text.startsWith('/*',i)){const e=text.indexOf('*/',i+2);i=e<0?text.length:e+2;continue;}
    if(text[i]==='@'){
      const open=text.indexOf('{',i),semi=text.indexOf(';',i);if(semi>=0&&(open<0||semi<open)){i=semi+1;continue;}if(open<0)break;
      let d=1,j=open+1,q=null,comment=false;for(;j<text.length&&d;j++){if(comment){if(text[j-1]==='*'&&text[j]==='/')comment=false;continue;}if(!q&&text[j]==='/'&&text[j+1]==='*'){comment=true;j++;continue;}if(q){if(text[j]==='\\')j++;else if(text[j]===q)q=null;continue;}if(text[j]==='"'||text[j]==="'"){q=text[j];continue;}if(text[j]==='{')d++;else if(text[j]==='}')d--;}
      i=j;continue;
    }
    const open=text.indexOf('{',i);if(open<0)break;const selector=normSel(text.slice(i,open));let d=1,j=open+1,q=null,comment=false;
    for(;j<text.length&&d;j++){if(comment){if(text[j-1]==='*'&&text[j]==='/')comment=false;continue;}if(!q&&text[j]==='/'&&text[j+1]==='*'){comment=true;j++;continue;}if(q){if(text[j]==='\\')j++;else if(text[j]===q)q=null;continue;}if(text[j]==='"'||text[j]==="'"){q=text[j];continue;}if(text[j]==='{')d++;else if(text[j]==='}')d--;}
    if(selector)rules.push({selector,start:i,end:j,body:text.slice(open+1,j-1),decls:parseDecls(text.slice(open+1,j-1))});i=j;
  }
  return rules;
}
const all=scanRules(css);
const override=[];
for(const raw of overrideSelectors){
  const selector=normSel(raw);const arr=all.filter(r=>r.selector===selector);
  if(arr.length<2){override.push({selector,rules:arr.length,earlierOnly:'',conflictCount:0,conflictProps:'',classification:'ALREADY_COLLAPSED_OR_MISSING'});continue;}
  const final=arr[arr.length-1];const finalProps=new Set(final.decls.map(d=>d.prop));const earlierOnly=new Set();
  for(const r of arr.slice(0,-1))for(const d of r.decls)if(!finalProps.has(d.prop))earlierOnly.add(d.prop);
  const between=all.filter(r=>r.start>arr[0].end&&r.start<final.start&&r.selector!==selector);const conflicts=[];
  for(const prop of earlierOnly){const hitters=between.filter(r=>r.decls.some(d=>d.prop===prop));if(hitters.length)conflicts.push({prop,selectors:[...new Set(hitters.map(h=>h.selector))]});}
  const classification=earlierOnly.size===0?'SAFE_COLLAPSE':(conflicts.length===0?'SAFE_MOVE_TO_FINAL':'VISUAL_REVIEW_REQUIRED');
  override.push({selector,rules:arr.length,earlierOnly:[...earlierOnly].join('|'),conflictCount:conflicts.length,conflictProps:conflicts.map(x=>x.prop+':'+x.selectors.join(' > ')).join(' || '),classification});
}
function csv(rows,fields){return [fields.join(','),...rows.map(r=>fields.map(f=>'"'+String(r[f]??'').replaceAll('"','""')+'"').join(','))].join('\n')}
fs.writeFileSync(path.join(outDir,'css-phase5-unused-runtime-trace.csv'),csv(unused,['name','runtimeRefs','historyRefs','componentRefs','classAttr','selectorApi','classList','classification']));
fs.writeFileSync(path.join(outDir,'css-phase5-override-trace.csv'),csv(override,['selector','rules','earlierOnly','conflictCount','conflictProps','classification']));
const report=['# UEP CSS CLEANUP PHASE 5 — DEEP RUNTIME TRACE','',`- runtime text files scanned: ${appFiles.length}`,`- repository/history text files scanned: ${historyFiles.length}`,'', '## Unused selector candidates'];
for(const x of unused)report.push(`- .${x.name}: runtimeRefs=${x.runtimeRefs}, historyRefs=${x.historyRefs}, componentRefs=${x.componentRefs}, classAttr=${x.classAttr}, selectorApi=${x.selectorApi}, classList=${x.classList}, ${x.classification}`);
report.push('','## Remaining override selectors');for(const x of override)report.push(`- ${x.selector}: rules=${x.rules}, earlierOnly=${x.earlierOnly||'-'}, conflicts=${x.conflictCount}, ${x.classification}`);
report.push('','## Safety','- No CSS is deleted or modified by phase5.','- Runtime references are scanned across every text-like file under app/resources/app except gyomuon.css itself.','- Repository/history references are reported separately and do not count as runtime use.','- VISUAL_REVIEW_REQUIRED selectors are not auto-merged.');
fs.writeFileSync(path.join(outDir,'CSS-CLEANUP-PHASE5-AUDIT.md'),report.join('\n'));
console.log(`CSS PHASE5 COMPLETE unusedStrong=${unused.filter(x=>x.classification==='STRONG_UNUSED_RUNTIME').length} overrideSafe=${override.filter(x=>x.classification.startsWith('SAFE_')).length}`);
