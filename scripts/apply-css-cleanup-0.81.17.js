const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const cssPath=path.join(appRoot,'resources/app/gyomuon.css');
let css=fs.readFileSync(cssPath,'utf8');
const original=css;

const phase1Targets=['.input-method-row','.input-method-row>b','.input-method-row button','.input-method-row button.active','.input-center-compact-setup','.input-center-compact-setup label','.input-center-compact-setup label.grow'];
const phase2Targets=['.dashboard-report-program-row','.growth-sdg-detail article','#drawer .approval-nav-row b','#drawer .approval-nav-row span','#drawer .approval-detail section b','#drawer .approval-detail section p','.curriculum-filter-bar .record-class-cards'];
const safeMergeTargets=['.input-center-compact-setup','.input-center-compact-setup label.grow'];
const unusedClasses=['input-title-field','growth-guide-details','growth-sdg-legend','selection-hero','selection-subject-summary','selection-kpi-grid','selection-section','selection-error-group','selection-message-list','sdgs-page'];
const protectedOverrides=['.input-method-row','.input-method-row>b','.input-center-compact-setup label','.dashboard-report-program-row','.growth-sdg-detail article','.curriculum-filter-bar .record-class-cards'];

function norm(s){return s.replace(/\s+/g,' ').trim();}
function parseDecls(body){
  const clean=body.replace(/\/\*[\s\S]*?\*\//g,''); const out=[];
  for(const part of clean.split(';')){
    const i=part.indexOf(':'); if(i<0) continue;
    const prop=part.slice(0,i).trim().toLowerCase(); let raw=part.slice(i+1).trim();
    if(!prop||!raw) continue;
    const important=/!important\s*$/i.test(raw); raw=raw.replace(/\s*!important\s*$/i,'').trim();
    out.push({prop,value:raw,important});
  }
  return out;
}
function scanRules(text){
  const rules=[]; let i=0;
  while(i<text.length){
    while(i<text.length&&/\s/.test(text[i])) i++;
    if(i>=text.length) break;
    if(text.startsWith('/*',i)){const e=text.indexOf('*/',i+2);i=e<0?text.length:e+2;continue;}
    if(text[i]==='@'){
      const open=text.indexOf('{',i),semi=text.indexOf(';',i);
      if(semi>=0&&(open<0||semi<open)){i=semi+1;continue;} if(open<0) break;
      let d=1,j=open+1,q=null,comment=false;
      for(;j<text.length&&d;j++){
        if(comment){if(text[j-1]==='*'&&text[j]==='/')comment=false;continue;}
        if(!q&&text[j]==='/'&&text[j+1]==='*'){comment=true;j++;continue;}
        if(q){if(text[j]==='\\')j++;else if(text[j]===q)q=null;continue;}
        if(text[j]==='"'||text[j]==="'"){q=text[j];continue;}
        if(text[j]==='{')d++;else if(text[j]==='}')d--;
      }
      i=j;continue;
    }
    const open=text.indexOf('{',i); if(open<0) break;
    const selector=norm(text.slice(i,open)); let d=1,j=open+1,q=null,comment=false;
    for(;j<text.length&&d;j++){
      if(comment){if(text[j-1]==='*'&&text[j]==='/')comment=false;continue;}
      if(!q&&text[j]==='/'&&text[j+1]==='*'){comment=true;j++;continue;}
      if(q){if(text[j]==='\\')j++;else if(text[j]===q)q=null;continue;}
      if(text[j]==='"'||text[j]==="'"){q=text[j];continue;}
      if(text[j]==='{')d++;else if(text[j]==='}')d--;
    }
    if(selector)rules.push({selector,start:i,end:j,bodyStart:open+1,bodyEnd:j-1,body:text.slice(open+1,j-1),indent:(text.slice(text.lastIndexOf('\n',i)+1,i).match(/^\s*/)||[''])[0],decls:parseDecls(text.slice(open+1,j-1))});
    i=j;
  }
  return rules;
}
function rulesFor(text,s){const n=norm(s);return scanRules(text).filter(r=>r.selector===n);}
function effective(text,s){
  const map=new Map();
  for(const r of rulesFor(text,s)) for(const d of r.decls){
    const prev=map.get(d.prop);
    if(!prev || d.important || !prev.important) map.set(d.prop,{value:d.value,important:d.important});
  }
  return map;
}
function sameMap(a,b){if(a.size!==b.size)return false;for(const [k,v] of a){const w=b.get(k);if(!w||w.value!==v.value||w.important!==v.important)return false;}return true;}
function renderRule(selector,decls,indent=''){
  return `${indent}${selector}{\n${decls.map(d=>`${indent}  ${d.prop}: ${d.value}${d.important?' !important':''};`).join('\n')}\n${indent}}`;
}
function pruneDominated(targets){
  for(const selector of targets){
    const beforeEff=effective(css,selector); let rules=rulesFor(css,selector);
    for(let idx=0;idx<rules.length-1;idx++){
      rules=rulesFor(css,selector); if(idx>=rules.length-1)break;
      const cur=rules[idx],later=rules.slice(idx+1),remove=new Set();
      for(const d of cur.decls){
        const matches=later.flatMap(r=>r.decls.filter(x=>x.prop===d.prop));
        if(matches.length){const last=matches[matches.length-1];if(last.important||!d.important)remove.add(d.prop);}
      }
      if(!remove.size)continue;
      const kept=cur.decls.filter(d=>!remove.has(d.prop));
      const replacement=kept.length?renderRule(selector,kept,cur.indent):'';
      css=css.slice(0,cur.start)+replacement+css.slice(cur.end);
    }
    if(!sameMap(beforeEff,effective(css,selector)))throw new Error(`cascade changed while pruning ${selector}`);
  }
}

pruneDominated(phase1Targets);
pruneDominated(phase2Targets);

for(const selector of safeMergeTargets){
  let rules=rulesFor(css,selector); if(rules.length<2)throw new Error(`expected duplicate safe merge target: ${selector}`);
  const beforeEff=effective(css,selector);
  const final=rules[rules.length-1];
  const merged=[...beforeEff.entries()].map(([prop,v])=>({prop,value:v.value,important:v.important}));
  let next=css.slice(0,final.start)+renderRule(selector,merged,final.indent)+css.slice(final.end);
  rules=rulesFor(next,selector);
  for(let i=rules.length-2;i>=0;i--){next=next.slice(0,rules[i].start)+next.slice(rules[i].end);rules=rulesFor(next,selector);}
  if(!sameMap(beforeEff,effective(next,selector)))throw new Error(`cascade changed while merging ${selector}`);
  if(rulesFor(next,selector).length!==1)throw new Error(`safe merge did not collapse ${selector}`);
  css=next;
}

const textExt=new Set(['.js','.cjs','.mjs','.html','.htm','.json','.txt','.md','.yml','.yaml','.ps1']);
function walk(root){const out=[];for(const ent of fs.readdirSync(root,{withFileTypes:true})){if(ent.name==='node_modules')continue;const p=path.join(root,ent.name);if(ent.isDirectory())out.push(...walk(p));else if(textExt.has(path.extname(ent.name).toLowerCase()))out.push(p);}return out;}
const runtimeRoot=path.join(appRoot,'resources','app');
const runtimeBlob=walk(runtimeRoot).map(p=>{try{return fs.readFileSync(p,'utf8')}catch{return''}}).join('\n');
for(const name of unusedClasses)if(runtimeBlob.includes(name))throw new Error(`unused CSS candidate has runtime reference: ${name}`);
function hasClass(selector,name){const re=new RegExp('(^|[^A-Za-z0-9_-])\\.'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![A-Za-z0-9_-])');return re.test(selector);}
let rules=scanRules(css);const remove=rules.filter(r=>unusedClasses.some(n=>hasClass(r.selector,n)));
const touched=new Set();for(const r of remove)for(const n of unusedClasses)if(hasClass(r.selector,n))touched.add(n);
if(touched.size!==unusedClasses.length)throw new Error(`not every unused class mapped to CSS: ${unusedClasses.filter(x=>!touched.has(x)).join(',')}`);
for(const r of remove.sort((a,b)=>b.start-a.start))css=css.slice(0,r.start)+css.slice(r.end);
for(const n of unusedClasses)if(scanRules(css).some(r=>hasClass(r.selector,n)))throw new Error(`unused class remained: ${n}`);
for(const s of protectedOverrides)if(rulesFor(css,s).length<2)throw new Error(`protected override group changed unexpectedly: ${s}`);

fs.writeFileSync(cssPath,css,'utf8');
console.log(`UEP 0.81.17 CSS cleanup complete: ${original.length} -> ${css.length}, removed ${original.length-css.length} chars, unused rules ${remove.length}`);
