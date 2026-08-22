const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'cleanup-phase4-output';
fs.mkdirSync(outDir,{recursive:true});
const cssPath=path.join(appRoot,'resources/app/gyomuon.css');
let css=fs.readFileSync(cssPath,'utf8');

// These are the only selectors classified SAFE by the baseline-aligned phase3 audit.
const targets=[
  '.input-center-compact-setup',
  '.input-center-compact-setup label.grow'
];

function parseDecls(body){
  const out=[];
  for(const part of body.split(';')){
    const i=part.indexOf(':');
    if(i<0)continue;
    const prop=part.slice(0,i).trim();
    const value=part.slice(i+1).trim();
    if(prop&&value)out.push({prop,value});
  }
  return out;
}
function rulesFor(text,selector){
  const esc=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp('(^|\\n)(\\s*)'+esc.replace(/\\ /g,'\\s+')+'\\s*\\{([^{}]*)\\}','g');
  const arr=[];let m;
  while((m=re.exec(text)))arr.push({start:m.index+m[1].length,end:re.lastIndex,indent:m[2],body:m[3],full:m[0].slice(m[1].length)});
  return arr;
}
function effective(text,selector){const out=new Map();for(const r of rulesFor(text,selector)){for(const d of parseDecls(r.body))out.set(d.prop,d.value);}return out;}
function sameMap(a,b){if(a.size!==b.size)return false;for(const [k,v] of a)if(b.get(k)!==v)return false;return true;}

const before=css;
const report=[];
for(const selector of targets){
  let rules=rulesFor(css,selector);
  const beforeCount=rules.length;
  if(rules.length<2)throw new Error(`Expected duplicate selector from phase3 baseline, but found ${rules.length}: ${selector}`);
  const beforeEff=effective(css,selector);
  const merged=new Map();
  for(const r of rules){for(const d of parseDecls(r.body))merged.set(d.prop,d.value);}
  const final=rules[rules.length-1];
  const body='\n'+[...merged.entries()].map(([k,v])=>`${final.indent}  ${k}: ${v};`).join('\n')+'\n'+final.indent;
  let next=css.slice(0,final.start)+`${final.indent}${selector}{${body}}`+css.slice(final.end);
  rules=rulesFor(next,selector);
  for(let i=rules.length-2;i>=0;i--){
    next=next.slice(0,rules[i].start)+next.slice(rules[i].end);
    rules=rulesFor(next,selector);
  }
  const afterEff=effective(next,selector);
  if(!sameMap(beforeEff,afterEff))throw new Error(`Effective CSS changed for ${selector}`);
  if(rulesFor(next,selector).length!==1)throw new Error(`Failed to collapse ${selector} to one rule`);
  css=next;
  report.push({selector,status:'MERGED',beforeRules:beforeCount,afterRules:1,moved:merged.size});
}
fs.writeFileSync(cssPath,css,'utf8');
const md=['# UEP CSS CLEANUP PHASE 4 — BASELINE ALIGNED','',`- chars before: ${before.length}`,`- chars after: ${css.length}`,`- chars removed: ${before.length-css.length}`,'','## Safe structural merges'];
for(const r of report)md.push(`- ${r.selector}: ${r.status}, rules ${r.beforeRules} -> ${r.afterRules}, effectiveProps=${r.moved}`);
md.push('','## Safety','- Targets are limited to the two selectors classified SAFE by the baseline-aligned phase3 audit.','- Effective declaration map for every target selector is asserted identical before/after.','- Each target must collapse to exactly one rule or CI fails.','- No MANUAL_VISUAL_REVIEW selector is modified.');
fs.writeFileSync(path.join(outDir,'CSS-CLEANUP-PHASE4.md'),md.join('\n'),'utf8');
console.log(`CSS PHASE4 COMPLETE chars=${before.length}->${css.length}`);