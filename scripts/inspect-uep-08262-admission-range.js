const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const m=fs.readFileSync(path.join(root,'electron/main.cjs'),'utf8');
const needle='53B_전형유형별대학DB';
let pos=0,count=0;
while((pos=m.indexOf(needle,pos))>=0){count++; const s=Math.max(0,pos-600),e=Math.min(m.length,pos+1000); console.log('\n--- MATCH '+count+' ---\n'+m.slice(s,e)); pos+=needle.length;}
if(!count) throw new Error('53B range reference not found in main.cjs');
console.log('\nMATCH_COUNT='+count);
