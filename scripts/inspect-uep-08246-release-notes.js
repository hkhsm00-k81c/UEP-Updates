const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const g=fs.readFileSync(gp,'utf8');
const terms=['수정사항','업데이트','release','Release','changelog','changeLog','localStorage','APP_VERSION'];
let out=[];
for(const term of terms){
  let start=0,count=0;
  while(count<30){
    const i=g.indexOf(term,start); if(i<0) break;
    out.push(`\n===== ${term} @ ${i} =====\n`+g.slice(Math.max(0,i-1200),Math.min(g.length,i+2200))+'\n');
    start=i+term.length; count++;
  }
}
fs.writeFileSync('release-notes-inspection.txt',out.join('\n'),'utf8');
console.log('matches',out.length);
