const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';const t=fs.readFileSync(path.join(root,'resources','app','electron','main.cjs'),'utf8');
const needles=['schoolReadBatchRead','schoolReadRequest','schoolReadApi','loginSchoolReadUser','readSchoolReadSession','schoolReadSessionStatus'];let out=[];
for(const n of needles){let p=0;while((p=t.indexOf(n,p))>=0){out.push(`=== ${n} @ ${p} ===\n${t.slice(Math.max(0,p-3500),Math.min(t.length,p+9000))}`);p+=n.length;}}
fs.writeFileSync('diag-08162-schoolread.txt',out.join('\n\n---\n\n'),'utf8');console.log(out.length);
