const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'cleanup-phase2-output';
fs.mkdirSync(outDir,{recursive:true});
const cssPath=path.join(appRoot,'resources/app/gyomuon.css');
let css=fs.readFileSync(cssPath,'utf8');

const targets=[
  '.dashboard-report-program-row',
  '.growth-sdg-detail article',
  '#drawer .approval-nav-row b',
  '#drawer .approval-nav-row span',
  '#drawer .approval-detail section b',
  '#drawer .approval-detail section p',
  '.curriculum-filter-bar .record-class-cards'
];

function parseDecls(body){
  const out=[];
  for(const part of body.split(';')){
    const i=part.indexOf(':');
    if(i<0) continue;
    const prop=part.slice(0,i).trim();
    const raw=part.slice(i+1).trim();
    if(!prop||!raw) continue;
    const important=/\s*!important\s*$/i.test(raw);
    const value=raw.replace(/\s*!important\s*$/i,'').trim();
    out.push({prop,value,important,raw:raw+(important&&!/!important/i.test(raw)?' !important':'')});
  }
  return out;
}
function parseRules(text){
  const rules=[];
  const re=/([^{}]+)\{([^{}]*)\}/g; let m;
  while((m=re.exec(text))){
    const selector=m[1].trim(); if(selector.startsWith('@')) continue;
    rules.push({selector,body:m[2],start:m.index,end:re.lastIndex,decls:parseDecls(m[2])});
  }
  return rules;
}
function effective(text,selector){
  const map=new Map();
  for(const r of parseRules(text).filter(r=>r.selector===selector)){
    for(const d of r.decls){
      const prev=map.get(d.prop);
      if(!prev || d.important || !prev.important) map.set(d.prop,{value:d.value,important:d.important});
    }
  }
  return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
}
const before=css;
const beforeEff=Object.fromEntries(targets.map(s=>[s,JSON.stringify(effective(before,s))]));
const report=[];
let removedDecls=0, removedRules=0;

for(const selector of targets){
  let rules=parseRules(css).filter(r=>r.selector===selector);
  if(rules.length<2){report.push({selector,beforeRules:rules.length,afterRules:rules.length,pruned:0});continue;}
  let pruned=0;
  // Process from earliest to latest. A declaration can be removed from an earlier rule only when a later same-selector
  // declaration with equal or stronger importance guarantees the final cascade value for that property.
  for(let idx=0; idx<rules.length-1; idx++){
    rules=parseRules(css).filter(r=>r.selector===selector);
    if(idx>=rules.length-1) break;
    const current=rules[idx];
    const later=rules.slice(idx+1);
    const removable=new Set();
    for(const d of current.decls){
      const laterDecls=later.flatMap(r=>r.decls.filter(x=>x.prop===d.prop));
      if(!laterDecls.length) continue;
      const last=laterDecls[laterDecls.length-1];
      if(last.important || !d.important) removable.add(d.prop);
    }
    if(!removable.size) continue;
    const kept=current.decls.filter(d=>!removable.has(d.prop));
    pruned += current.decls.length-kept.length;
    removedDecls += current.decls.length-kept.length;
    let replacement='';
    if(kept.length){
      const body='\n'+kept.map(d=>`  ${d.prop}: ${d.value}${d.important?' !important':''};`).join('\n')+'\n';
      replacement=`${selector}{${body}}`;
    } else {
      removedRules++;
    }
    css=css.slice(0,current.start)+replacement+css.slice(current.end);
  }
  report.push({selector,beforeRules:parseRules(before).filter(r=>r.selector===selector).length,afterRules:parseRules(css).filter(r=>r.selector===selector).length,pruned});
}

for(const s of targets){
  const afterEff=JSON.stringify(effective(css,s));
  if(afterEff!==beforeEff[s]) throw new Error(`Effective cascade changed for ${s}`);
}
fs.writeFileSync(cssPath,css,'utf8');
const md=['# UEP CSS CLEANUP PHASE 2','',`- chars before: ${before.length}`,`- chars after: ${css.length}`,`- chars removed: ${before.length-css.length}`,`- declarations removed as later-dominated: ${removedDecls}`,`- empty duplicate rules removed: ${removedRules}`,'','## Target results',...report.map(r=>`- ${r.selector}: rules ${r.beforeRules} -> ${r.afterRules}; declarations pruned=${r.pruned}`),'','## Safety','- Only earlier declarations dominated by a later identical selector were removed.','- Earlier-only declarations stay at their original cascade position.','- !important precedence is preserved.','- Effective declaration map for every target selector is asserted identical before/after.'];
fs.writeFileSync(path.join(outDir,'CSS-CLEANUP-PHASE2.md'),md.join('\n'),'utf8');
console.log(`CSS PHASE2 COMPLETE charsRemoved=${before.length-css.length} decls=${removedDecls} rules=${removedRules}`);
