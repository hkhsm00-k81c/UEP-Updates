const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const g=fs.readFileSync(gp,'utf8');
const needles=['54_수능최저DB','수능최저DB','수능최저 조회','판단보류','세부기준 확인','3월모의고사','6월모의고사','9월모의고사','등급합기준','반영영역수'];
for(const n of needles){
  let i=0,hit=0;
  while((i=g.indexOf(n,i))>=0){
    hit++;
    const s=Math.max(0,i-1200),e=Math.min(g.length,i+2200);
    console.log(`\n===== ${n} #${hit} @${i} =====\n${g.slice(s,e)}\n`);
    i+=n.length;
    if(hit>=12)break;
  }
  if(!hit)console.log(`\n===== ${n}: NO MATCH =====`);
}
