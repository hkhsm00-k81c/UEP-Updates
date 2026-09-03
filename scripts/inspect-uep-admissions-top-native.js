const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const g=fs.readFileSync(gp,'utf8');
const needles=['대입 기초','전형 이해','오늘의 대학','openDashboardAdmissionBasics','openDashboardAdmissionTypes','openDashboardUniversityDetail','dashboardAdmissionTodayUniversity'];
const out=[];
out.push('UEP admissions native inspection');
out.push('file='+gp);
out.push('length='+g.length);
for(const needle of needles){
  out.push('\n===== '+needle+' =====');
  let from=0,count=0;
  while(true){
    const i=g.indexOf(needle,from); if(i<0)break;
    count++;
    const s=Math.max(0,i-1800), e=Math.min(g.length,i+2600);
    out.push('\n--- occurrence '+count+' @ '+i+' ---\n'+g.slice(s,e));
    from=i+needle.length;
    if(count>=12){out.push('\n[truncated after 12 occurrences]');break;}
  }
  if(!count)out.push('(none)');
}
fs.writeFileSync('admissions-native-inspection.txt',out.join('\n'),'utf8');
console.log('wrote admissions-native-inspection.txt');