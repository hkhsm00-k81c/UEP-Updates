const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const f=path.join(root,'resources','app','gyomuon.js');
const s=fs.readFileSync(f,'utf8');
const needles=['반·번호순','예상성적순','curriculumRosterSort','과목별 신청현황'];
for(const n of needles){
  let i=-1,k=0;
  while((i=s.indexOf(n,i+1))>=0){
    k++;
    const a=Math.max(0,i-1800),b=Math.min(s.length,i+2200);
    console.log(`\n===== ${n} #${k} @${i} =====\n`+s.slice(a,b)+'\n===== END =====\n');
  }
  if(!k)console.log(`NO MATCH: ${n}`);
}
