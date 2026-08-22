const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
function findFunction(src,name){
  const re=new RegExp('function\\s+'+name+'\\s*\\(','g'); const m=re.exec(src); if(!m)return null;
  const open=src.indexOf('{',m.index); let d=1,q=null,comment=null;
  for(let i=open+1;i<src.length;i++){
    const c=src[i],n=src[i+1];
    if(comment==='line'){if(c==='\n')comment=null;continue;}
    if(comment==='block'){if(c==='*'&&n==='/'){comment=null;i++;}continue;}
    if(q){if(c==='\\'){i++;continue;}if(c===q)q=null;continue;}
    if(c==='/'&&n==='/'){comment='line';i++;continue;}
    if(c==='/'&&n==='*'){comment='block';i++;continue;}
    if(c==='"'||c==="'"||c==='`'){q=c;continue;}
    if(c==='{')d++; else if(c==='}'&&--d===0)return src.slice(m.index,i+1);
  }
  return null;
}
const body=findFunction(text,'bindInputCenter'); if(!body)throw new Error('bindInputCenter not found');
const lines=body.split(/\r?\n/);
const rows=[];
for(let i=0;i<lines.length;i++){
  const line=lines[i].trim(); if(!/addEventListener\s*\(/.test(line))continue;
  let selector=''; let event=''; let kind='review';
  let m=line.match(/\$\((['"])(#[^'"]+)\1\).*?addEventListener\s*\(\s*(['"])([^'"]+)\3/);
  if(m){selector=m[2];event=m[4];kind='id-candidate';}
  if(!m){m=line.match(/getElementById\s*\(\s*(['"])([^'"]+)\1\).*?addEventListener\s*\(\s*(['"])([^'"]+)\3/);if(m){selector='#'+m[2];event=m[4];kind='id-candidate';}}
  if(/querySelectorAll|forEach|\[data-/.test(line))kind='dynamic-keep';
  if(/dataset\.bound|uepBindOnce/.test(line))kind='already-guarded';
  rows.push({line:i+1,selector,event,kind,source:line});
}
const groups={}; for(const r of rows){const k=(r.selector||r.source.split('=>')[0])+'::'+r.event;groups[k]=(groups[k]||0)+1;}
const dup=Object.entries(groups).filter(([,n])=>n>1).map(([key,count])=>({key,count}));
const summary={total:rows.length,idCandidates:rows.filter(r=>r.kind==='id-candidate').length,dynamicKeep:rows.filter(r=>r.kind==='dynamic-keep').length,alreadyGuarded:rows.filter(r=>r.kind==='already-guarded').length,review:rows.filter(r=>r.kind==='review').length,duplicateGroups:dup.length};
fs.mkdirSync('performance-phase2-output',{recursive:true});
fs.writeFileSync('performance-phase2-output/inputcenter-classification.json',JSON.stringify({summary,rows,duplicates:dup},null,2));
let md='# bindInputCenter performance classification\n\n'+Object.entries(summary).map(([k,v])=>`- ${k}: ${v}`).join('\n')+'\n\n## ID candidates\n';
for(const r of rows.filter(r=>r.kind==='id-candidate'))md+=`- L${r.line} ${r.event} ${r.selector}\n`;
md+='\n## Duplicate groups\n'; for(const d of dup)md+=`- ${d.count}x ${d.key}\n`;
fs.writeFileSync('performance-phase2-output/INPUTCENTER-CLASSIFICATION.md',md);
console.log(JSON.stringify(summary,null,2));