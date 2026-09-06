const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const g=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const needles=['const renderAdmissionCard=','function renderAdmissionCard','renderAdmissionCard ='];
let idx=-1; for(const n of needles){idx=g.indexOf(n); if(idx>=0) break;}
if(idx<0) throw new Error('renderAdmissionCard not found');
const start=Math.max(0,idx-1200), end=Math.min(g.length,idx+7000);
console.log(g.slice(start,end));
