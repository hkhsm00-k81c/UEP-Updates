const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root) throw new Error('usage: node patch-uep-08207-version.js <app-root>');
const gPath=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gPath,'utf8');
if(!g.includes('const APP_VERSION = "0.82.06";')) throw new Error('APP_VERSION 0.82.06 marker missing');
g=g.replace('const APP_VERSION = "0.82.06";','const APP_VERSION = "0.82.07";');
for(const p of [path.join(root,'resources','app','package.json'),path.join(root,'package.json')]){
  if(!fs.existsSync(p)) continue;
  try{
    const j=JSON.parse(fs.readFileSync(p,'utf8'));
    if(j.version==='0.82.06'){
      j.version='0.82.07';
      fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n','utf8');
    }
  }catch{}
}
fs.writeFileSync(gPath,g,'utf8');
console.log('UEP 0.82.07 version promotion applied');
