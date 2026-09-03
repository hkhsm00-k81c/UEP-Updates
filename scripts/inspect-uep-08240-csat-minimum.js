const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const g=fs.readFileSync(gp,'utf8');
const needles=['admissionMinimums','minimumCheck','minimumAllExamsMarkup','54_수능최저DB','등급합기준','반영영역수','수능최저원문','탐구반영과목수','영어별도기준'];
for(const n of needles){
  let i=0,hit=0;
  while((i=g.indexOf(n,i))>=0){
    hit++;
    const s=Math.max(0,i-5000),e=Math.min(g.length,i+8000);
    console.log(`\n===== ${n} #${hit} @${i} =====\n${g.slice(s,e)}\n`);
    i+=n.length;
    if(hit>=20)break;
  }
  if(!hit)console.log(`\n===== ${n}: NO MATCH =====`);
}
