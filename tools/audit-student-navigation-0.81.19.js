const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
const fnRe=/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g;
const hits=[]; let m;
while((m=fnRe.exec(text))){
  const name=m[1];
  if(!/(student|pupil|learner|next|prev|record|profile|detail)/i.test(name)) continue;
  const start=m.index, next=text.indexOf('\nfunction ',m.index+10); const end=next>start?next:Math.min(text.length,start+14000);
  const body=text.slice(start,end);
  const score={
    name,
    chars:body.length,
    render:(body.match(/\brender\s*\(/g)||[]).length,
    refresh:(body.match(/refreshReadonlyCacheSilently\s*\(/g)||[]).length,
    queryAll:(body.match(/querySelectorAll\s*\(/g)||[]).length,
    filter:(body.match(/\.filter\s*\(/g)||[]).length,
    map:(body.match(/\.map\s*\(/g)||[]).length,
    sort:(body.match(/\.sort\s*\(/g)||[]).length,
    find:(body.match(/\.find\s*\(/g)||[]).length,
    findIndex:(body.match(/\.findIndex\s*\(/g)||[]).length,
    studentRefs:(body.match(/student/gi)||[]).length
  };
  score.cost=score.render*8+score.refresh*10+score.queryAll*5+score.filter*3+score.map*2+score.sort*4+score.find*2+score.findIndex*3;
  hits.push(score);
}
hits.sort((a,b)=>b.cost-a.cost||b.studentRefs-a.studentRefs);
const top=hits.slice(0,20);
const out={candidateCount:hits.length,top,decision:top.length?'REVIEW_TOP_STUDENT_NAVIGATION_PATHS':'NO_CANDIDATES_FOUND'};
fs.mkdirSync('performance-phase18-output',{recursive:true});
fs.writeFileSync('performance-phase18-output/student-navigation-audit.json',JSON.stringify(out,null,2));
fs.writeFileSync('performance-phase18-output/STUDENT-NAVIGATION-AUDIT.md','# UEP 0.81.19 Student Navigation Audit\n\n```json\n'+JSON.stringify(out,null,2)+'\n```\n');
console.log(JSON.stringify(out,null,2));
if(!top.length) process.exitCode=2;
