const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'cleanup-phase6-output';
const phase5Csv=process.argv[4]||path.join(outDir,'phase5','css-phase5-unused-trace.csv');
fs.mkdirSync(outDir,{recursive:true});
const cssPath=path.join(appRoot,'resources/app/gyomuon.css');
let css=fs.readFileSync(cssPath,'utf8');
const before=css;

function parseCsv(text){const rows=[];let row=[],cur='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(q&&text[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(cur);cur='';}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cur);cur='';if(row.some(x=>x!==''))rows.push(row);row=[];}else cur+=c;}if(cur||row.length){row.push(cur);rows.push(row)}if(!rows.length)return[];const h=rows[0];return rows.slice(1).map(a=>Object.fromEntries(h.map((k,i)=>[k,a[i]??''])));}
function normalizeSelector(s){return s.replace(/\s+/g,' ').trim();}
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
    const open=text.indexOf('{',i);if(open<0)break;const selector=text.slice(i,open).trim();let d=1,j=open+1,q=null,comment=false;
    for(;j<text.length&&d;j++){if(comment){if(text[j-1]==='*'&&text[j]==='/')comment=false;continue;}if(!q&&text[j]==='/'&&text[j+1]==='*'){comment=true;j++;continue;}if(q){if(text[j]==='\\')j++;else if(text[j]===q)q=null;continue;}if(text[j]==='"'||text[j]==="'"){q=text[j];continue;}if(text[j]==='{')d++;else if(text[j]==='}')d--;}
    if(selector)rules.push({selector:normalizeSelector(selector),start:i,end:j});i=j;
  }
  return rules;
}
function hasClass(selector,name){const re=new RegExp('(^|[^A-Za-z0-9_-])\\.'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![A-Za-z0-9_-])');return re.test(selector);}
if(!fs.existsSync(phase5Csv))throw new Error(`Phase5 CSV not found: ${phase5Csv}`);
const phase5=parseCsv(fs.readFileSync(phase5Csv,'utf8'));
const targets=phase5.filter(r=>r.classification==='STRONG_UNUSED_RUNTIME'&&Number(r.runtimeRefs||0)===0).map(r=>r.name);
if(targets.length!==10)throw new Error(`Expected 10 strong unused runtime classes, got ${targets.length}`);
const protectedSelectors=['.input-method-row','.input-method-row>b','.input-center-compact-setup label','.dashboard-report-program-row','.growth-sdg-detail article','.curriculum-filter-bar .record-class-cards'];
for(const s of protectedSelectors)if(!scanRules(css).some(r=>r.selector===s))throw new Error(`Protected override selector missing before cleanup: ${s}`);
const rules=scanRules(css);const remove=rules.filter(r=>targets.some(n=>hasClass(r.selector,n)));
if(!remove.length)throw new Error('No CSS rules matched strong-unused classes');
const touched=new Set();for(const r of remove)for(const n of targets)if(hasClass(r.selector,n))touched.add(n);
if(touched.size!==targets.length)throw new Error(`Not every unused class mapped to a CSS rule: ${[...targets].filter(x=>!touched.has(x)).join(',')}`);
for(const r of remove.sort((a,b)=>b.start-a.start))css=css.slice(0,r.start)+css.slice(r.end);
for(const n of targets)if(scanRules(css).some(r=>hasClass(r.selector,n)))throw new Error(`Unused class still present after cleanup: ${n}`);
for(const s of protectedSelectors)if(!scanRules(css).some(r=>r.selector===s))throw new Error(`Protected override selector removed: ${s}`);
fs.writeFileSync(cssPath,css,'utf8');
const md=['# UEP CSS CLEANUP PHASE 6 — STRONG UNUSED RUNTIME','',`- strong unused classes removed: ${targets.length}`,`- rule blocks removed: ${remove.length}`,`- chars before: ${before.length}`,`- chars after: ${css.length}`,`- chars removed: ${before.length-css.length}`,'','## Removed classes',...targets.map(x=>`- .${x}`),'','## Safety','- Only classes classified STRONG_UNUSED_RUNTIME with runtimeRefs=0 by live phase5 are eligible.','- All six VISUAL_REVIEW_REQUIRED override selectors are protected and must remain.','- Every target class must disappear from CSS after cleanup.'];
fs.writeFileSync(path.join(outDir,'CSS-CLEANUP-PHASE6.md'),md.join('\n'),'utf8');
console.log(`CSS PHASE6 COMPLETE classes=${targets.length} rules=${remove.length} chars=${before.length}->${css.length}`);
