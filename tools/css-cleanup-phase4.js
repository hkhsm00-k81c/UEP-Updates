const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'cleanup-phase4-output';
const phase3Csv=process.argv[4]||path.join(outDir,'phase3','css-phase3-merge-safety.csv');
fs.mkdirSync(outDir,{recursive:true});
const cssPath=path.join(appRoot,'resources/app/gyomuon.css');
let css=fs.readFileSync(cssPath,'utf8');

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
  const h=rows[0];return rows.slice(1).map(a=>Object.fromEntries(h.map((k,i)=>[k,a[i]??''])));
}
function parseDecls(body){
  const out=[];
  for(const part of body.split(';')){
    const i=part.indexOf(':');if(i<0)continue;
    const prop=part.slice(0,i).trim();const value=part.slice(i+1).trim();
    if(prop&&value)out.push({prop,value});
  }
  return out;
}
function rulesFor(text,selector){
  const esc=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp('(^|\\n)(\\s*)'+esc.replace(/\\ /g,'\\s+')+'\\s*\\{([^{}]*)\\}','g');
  const arr=[];let m;
  while((m=re.exec(text)))arr.push({start:m.index+m[1].length,end:re.lastIndex,indent:m[2],body:m[3]});
  return arr;
}
function effective(text,selector){const out=new Map();for(const r of rulesFor(text,selector)){for(const d of parseDecls(r.body))out.set(d.prop,d.value);}return out;}
function sameMap(a,b){if(a.size!==b.size)return false;for(const [k,v] of a)if(b.get(k)!==v)return false;return true;}

if(!fs.existsSync(phase3Csv))throw new Error(`Phase3 CSV not found: ${phase3Csv}`);
const phase3=parseCsv(fs.readFileSync(phase3Csv,'utf8'));
const safe=phase3.filter(r=>r.classification==='SAFE_MOVE_TO_FINAL'||r.classification==='SAFE_COLLAPSE');
if(!safe.length)throw new Error('Phase3 produced no safe merge candidates');
const targets=safe.map(r=>r.selector);

const before=css;
const report=[];
for(const selector of targets){
  let rules=rulesFor(css,selector);
  const expected=Number(phase3.find(r=>r.selector===selector)?.rules||0);
  if(rules.length!==expected)throw new Error(`Live phase3/phase4 mismatch for ${selector}: phase3=${expected}, phase4=${rules.length}`);
  if(rules.length<2)throw new Error(`Safe candidate is not duplicate at merge time: ${selector}`);
  const beforeEff=effective(css,selector);
  const merged=new Map();
  for(const r of rules)for(const d of parseDecls(r.body))merged.set(d.prop,d.value);
  const final=rules[rules.length-1];
  const body='\n'+[...merged.entries()].map(([k,v])=>`${final.indent}  ${k}: ${v};`).join('\n')+'\n'+final.indent;
  let next=css.slice(0,final.start)+`${final.indent}${selector}{${body}}`+css.slice(final.end);
  rules=rulesFor(next,selector);
  for(let i=rules.length-2;i>=0;i--){next=next.slice(0,rules[i].start)+next.slice(rules[i].end);rules=rulesFor(next,selector);}
  const afterEff=effective(next,selector);
  if(!sameMap(beforeEff,afterEff))throw new Error(`Effective CSS changed for ${selector}`);
  if(rulesFor(next,selector).length!==1)throw new Error(`Selector did not collapse to one rule: ${selector}`);
  css=next;
  report.push({selector,status:'MERGED',beforeRules:expected,afterRules:1,effectiveProps:merged.size});
}
fs.writeFileSync(cssPath,css,'utf8');
const md=['# UEP CSS CLEANUP PHASE 4 — LIVE CHAIN','',`- live phase3 safe candidates: ${targets.length}`,`- chars before: ${before.length}`,`- chars after: ${css.length}`,`- chars removed: ${before.length-css.length}`,'','## Safe structural merges'];
for(const r of report)md.push(`- ${r.selector}: ${r.status}, rules ${r.beforeRules} -> ${r.afterRules}, effectiveProps=${r.effectiveProps}`);
md.push('','## Safety','- Targets are read only from the phase3 result generated in the same workflow run.','- Stored historical baseline files and hard-coded selector lists are not used.','- Effective declaration maps are asserted identical before/after.','- MANUAL_VISUAL_REVIEW selectors are never modified.');
fs.writeFileSync(path.join(outDir,'CSS-CLEANUP-PHASE4.md'),md.join('\n'),'utf8');
console.log(`CSS PHASE4 COMPLETE safe=${targets.length} chars=${before.length}->${css.length}`);