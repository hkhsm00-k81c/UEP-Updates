const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const g=fs.readFileSync(path.join(root,'resources','app','gyomuon.js'),'utf8');
const terms=['알림','bell','notification','noticeType','공지유형','일반공지','긴급공지','confirmRequired','확인했습니다','data-notice','공지'];
let out='';
for(const term of terms){let pos=0,count=0;while((pos=g.indexOf(term,pos))>=0&&count<12){out+=`\n=== ${term} @ ${pos} ===\n${g.slice(Math.max(0,pos-1200),Math.min(g.length,pos+2400))}\n`;pos+=term.length;count++;}}
fs.writeFileSync('diag-08164-urgent-notice.txt',out,'utf8');
console.log('diag written',out.length);
