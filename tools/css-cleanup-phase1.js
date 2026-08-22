const fs=require('fs');
const path=require('path');

const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'cleanup-output';
const cssPath=path.join(appRoot,'resources/app/gyomuon.css');
fs.mkdirSync(outDir,{recursive:true});
let css=fs.readFileSync(cssPath,'utf8');
const original=css;

const targets=new Set([
  '.input-method-row',
  '.input-method-row>b',
  '.input-method-row button',
  '.input-method-row button.active',
  '.input-center-compact-setup',
  '.input-center-compact-setup label',
  '.input-center-compact-setup label.grow'
]);

function parseDecls(body){
  const out=[];
  const re=/(^|;)\s*([\w-]+)\s*:\s*([^;{}]+)\s*(?=;|$)/g;
  let m;
  while((m=re.exec(body))){
    const value=m[3].trim();
    const important=/!important\s*$/i.test(value);
    out.push({prop:m[2].trim().toLowerCase(),value,important,start:m.index+(m[1]?m[1].length:0),end:re.lastIndex});
  }
  return out;
}

function parseRootRules(text){
  const rules=[];
  let depth=0,start=-1,selectorStart=0,quote=null,esc=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(esc){esc=false;continue;}
    if(quote){if(c==='\\'){esc=true;continue;}if(c===quote)quote=null;continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='{'){
      if(depth===0){
        const sel=text.slice(selectorStart,i).trim();
        start=i;
        rules.push({selector:sel,open:i,close:-1,bodyStart:i+1,bodyEnd:-1});
      }
      depth++;
    }else if(c==='}'){
      depth--;
      if(depth===0&&rules.length){
        const r=rules[rules.length-1];
        if(r.close<0){r.close=i;r.bodyEnd=i;selectorStart=i+1;}
      }
    }
  }
  return rules.filter(r=>r.close>=0&&!r.selector.startsWith('@'));
}

function effectiveMap(text,selector){
  const rules=parseRootRules(text).filter(r=>r.selector===selector);
  const map=new Map();
  let order=0;
  for(const r of rules){
    for(const d of parseDecls(text.slice(r.bodyStart,r.bodyEnd))){
      order++;
      const prev=map.get(d.prop);
      if(!prev || d.important || !prev.important){
        if(!prev || d.important===prev.important || (d.important&&!prev.important)) map.set(d.prop,{value:d.value,important:d.important,order});
      }
    }
  }
  return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`${k}:${v.value}`).join('|');
}

const beforeEffective=new Map([...targets].map(s=>[s,effectiveMap(css,s)]));
const rules=parseRootRules(css);
const grouped=new Map();
for(const r of rules){if(targets.has(r.selector)){if(!grouped.has(r.selector))grouped.set(r.selector,[]);grouped.get(r.selector).push(r);}}

const edits=[];
const summary=[];
for(const [selector,arr] of grouped){
  let removedDecls=0;
  for(let i=0;i<arr.length-1;i++){
    const r=arr[i];
    const body=css.slice(r.bodyStart,r.bodyEnd);
    const decls=parseDecls(body);
    const laterDecls=[];
    for(let j=i+1;j<arr.length;j++) laterDecls.push(...parseDecls(css.slice(arr[j].bodyStart,arr[j].bodyEnd)));
    const remove=[];
    for(const d of decls){
      const dominating=laterDecls.some(x=>x.prop===d.prop && (x.important || !d.important));
      if(dominating) remove.push(d);
    }
    if(remove.length){
      let newBody=body;
      for(const d of remove.sort((a,b)=>b.start-a.start)){
        let a=d.start,b=d.end;
        if(newBody[b]===';') b++;
        newBody=newBody.slice(0,a)+newBody.slice(b);
      }
      if(newBody.trim()==='') edits.push({start:r.open-(r.selector.length),end:r.close+1,replacement:'',selector,kind:'EMPTY_RULE'});
      else edits.push({start:r.bodyStart,end:r.bodyEnd,replacement:newBody,selector,kind:'DECL_PRUNE'});
      removedDecls+=remove.length;
    }
  }
  summary.push({selector,rulesBefore:arr.length,removedDecls});
}

for(const e of edits.sort((a,b)=>b.start-a.start)) css=css.slice(0,e.start)+e.replacement+css.slice(e.end);

for(const selector of targets){
  const after=effectiveMap(css,selector);
  if(after!==beforeEffective.get(selector)) throw new Error(`Effective cascade changed for ${selector}`);
}

fs.writeFileSync(cssPath,css,'utf8');
const afterRules=parseRootRules(css);
for(const s of summary)s.rulesAfter=afterRules.filter(r=>r.selector===s.selector).length;
const removedChars=original.length-css.length;
const removedRules=summary.reduce((n,s)=>n+(s.rulesBefore-s.rulesAfter),0);
const removedDecls=summary.reduce((n,s)=>n+s.removedDecls,0);
const report=['# UEP CSS CLEANUP PHASE 1','',`- chars before: ${original.length}`,`- chars after: ${css.length}`,`- chars removed: ${removedChars}`,`- declarations removed as later-dominated: ${removedDecls}`,`- empty duplicate rules removed: ${removedRules}`,'','## Target results'];
for(const s of summary)report.push(`- ${s.selector}: rules ${s.rulesBefore} -> ${s.rulesAfter}; declarations pruned=${s.removedDecls}`);
report.push('','## Safety','- Only declarations dominated by a later identical selector were removed.','- Earlier-only declarations remain at their original cascade position.','- !important precedence is preserved.','- Effective declaration map for every target selector is asserted identical before/after.');
fs.writeFileSync(path.join(outDir,'CSS-CLEANUP-PHASE1.md'),report.join('\n'),'utf8');
fs.copyFileSync(cssPath,path.join(outDir,'gyomuon-css-phase1.css'));
console.log(`CSS PHASE1 COMPLETE chars=${original.length}->${css.length} decls=${removedDecls} rules=${removedRules}`);
