const fs=require('fs'),path=require('path');
const root=process.argv[2];if(!root)throw new Error('app root required');
const gp=path.join(root,'gyomuon.js'),mp=path.join(root,'electron','main.cjs'),pp=path.join(root,'package.json'),lp=path.join(root,'package-lock.json');
let g=fs.readFileSync(gp,'utf8'),m=fs.readFileSync(mp,'utf8');
const must=(x,msg)=>{if(!x)throw new Error(msg)};

must(g.includes('0.82.74'),'expected renderer 0.82.74');
const badLine="  $('[data-dashboard-admission]').forEach(button=>button.onclick=async event=>";
const goodLine="  $$('[data-dashboard-admission]').forEach(button=>button.onclick=async event=>";
must(g.includes(badLine),'expected 0.82.74 dashboard admission selector regression missing');
must(!g.includes(goodLine),'correct dashboard admission selector already present');

g=g.replace(badLine,goodLine);
g=g.replaceAll('0.82.74','0.82.75');
if(m.includes('0.82.74'))m=m.replaceAll('0.82.74','0.82.75');
for(const p of [pp,lp])if(fs.existsSync(p)){let x=fs.readFileSync(p,'utf8').replaceAll('0.82.74','0.82.75');fs.writeFileSync(p,x,'utf8');}

must(!g.includes(badLine),'single-element dashboard admission selector still present');
must(g.includes(goodLine),'multi-element dashboard admission selector not applied');
fs.writeFileSync(gp,g,'utf8');fs.writeFileSync(mp,m,'utf8');
console.log('UEP 0.82.75 dashboard admission selector hotfix applied');
