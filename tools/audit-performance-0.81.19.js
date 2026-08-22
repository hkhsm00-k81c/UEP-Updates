const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
const targets=['bindPage','bindInputCenter','openStudentDrawer'];
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function findFunction(text,name){
  const re=new RegExp('function\\s+'+esc(name)+'\\s*\\(','g');
  const m=re.exec(text); if(!m)return null;
  const open=text.indexOf('{',m.index); if(open<0)return null;
  let d=1,q=null,comment=null;
  for(let i=open+1;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(comment==='line'){if(c==='\n')comment=null;continue;}
    if(comment==='block'){if(c==='*'&&n==='/'){comment=null;i++;}continue;}
    if(q){if(c==='\\'){i++;continue;}if(c===q)q=null;continue;}
    if(c==='/'&&n==='/'){comment='line';i++;continue;}
    if(c==='/'&&n==='*'){comment='block';i++;continue;}
    if(c==='"'||c==="'"||c==='`'){q=c;continue;}
    if(c==='{')d++; else if(c==='}'&&--d===0)return text.slice(m.index,i+1);
  }
  return null;
}
function count(re,s){return (s.match(re)||[]).length;}
function linesContaining(s,re){return s.split(/\r?\n/).filter(x=>re.test(x)).map(x=>x.trim()).slice(0,250);}
const out=[];
for(const name of targets){
  const body=findFunction(text,name);
  if(!body){out.push({name,missing:true});continue;}
  const add=linesContaining(body,/addEventListener\s*\(/);
  const on=linesContaining(body,/\.(onclick|onchange|oninput|onsubmit|onkeydown|onkeyup)\s*=/);
  const qs=linesContaining(body,/querySelector(All)?\s*\(/);
  const byId=linesContaining(body,/getElementById\s*\(/);
  const metrics={
    name,chars:body.length,
    addEventListener:add.length,
    directHandlers:on.length,
    querySelector:count(/querySelector\s*\(/g,body),
    querySelectorAll:count(/querySelectorAll\s*\(/g,body),
    getElementById:byId.length,
    innerHTML:count(/\.innerHTML\s*=/g,body),
    textContent:count(/\.textContent\s*=/g,body),
    setTimeout:count(/setTimeout\s*\(/g,body),
    requestAnimationFrame:count(/requestAnimationFrame\s*\(/g,body),
    mapFilterReduce:count(/\.(map|filter|reduce|find|some|every)\s*\(/g,body),
    jsonOps:count(/JSON\.(parse|stringify)\s*\(/g,body),
    addEventLines:add,
    directHandlerLines:on,
    queryLines:[...qs,...byId].slice(0,250)
  };
  out.push(metrics);
}
fs.mkdirSync('performance-audit-output',{recursive:true});
fs.writeFileSync('performance-audit-output/performance-bindings.json',JSON.stringify(out,null,2));
let md='# UEP 0.81.19 Performance Binding Audit\n\n';
for(const r of out){
  if(r.missing){md+=`## ${r.name}\nMissing\n\n`;continue;}
  md+=`## ${r.name}\n- chars: ${r.chars}\n- addEventListener: ${r.addEventListener}\n- direct handlers: ${r.directHandlers}\n- querySelector: ${r.querySelector}\n- querySelectorAll: ${r.querySelectorAll}\n- getElementById: ${r.getElementById}\n- innerHTML writes: ${r.innerHTML}\n- collection ops: ${r.mapFilterReduce}\n- JSON ops: ${r.jsonOps}\n\n### Event binding lines\n`;
  for(const l of [...r.addEventLines,...r.directHandlerLines]) md+=`- \`${l.replace(/`/g,'\\`')}\`\n`;
  md+='\n';
}
fs.writeFileSync('performance-audit-output/PERFORMANCE-BINDING-AUDIT.md',md);
console.log(JSON.stringify(out.map(({addEventLines,directHandlerLines,queryLines,...x})=>x),null,2));
