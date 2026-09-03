const fs=require('fs'),path=require('path');
const g=fs.readFileSync(path.join(process.argv[2]||'app','resources','app','gyomuon.js'),'utf8');
const name='uep08223UniversityRegions';
let pos=0,n=0,out='';
while((pos=g.indexOf(name,pos))>=0){n++;out+=`===== occurrence ${n} @ ${pos} =====\n${g.slice(Math.max(0,pos-1200),Math.min(g.length,pos+2500))}\n---\n`;pos+=name.length;}
out=`COUNT=${n}\n`+out;
fs.writeFileSync('region-fn.txt',out,'utf8');