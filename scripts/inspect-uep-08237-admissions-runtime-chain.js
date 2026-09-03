const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const p=path.join(root,'resources','app','gyomuon.js');
const g=fs.readFileSync(p,'utf8');
const out=[];
function all(label,needle,before=700,after=2600){let pos=0,n=0;while((pos=g.indexOf(needle,pos))>=0){n++;out.push(`\n===== ${label} #${n} @ ${pos} =====\n`+g.slice(Math.max(0,pos-before),Math.min(g.length,pos+after)));pos+=needle.length;}out.push(`\nCOUNT ${label}=${n}\n`)}
all('detail wrapper','openDashboardUniversityDetail=function',500,3400);
all('detail declaration','function openDashboardUniversityDetail',500,3200);
all('today wrapper','dashboardAdmissionTodayUniversity=function',500,2200);
all('native admission bind',"[data-dashboard-admission]",800,1800);
all('cache universityAdmissions','universityAdmissions',600,1800);
all('render dashboard compact','dashboardStudentStatusCompactMarkup',700,1800);
all('readonly cache assignment','readonlyCache',500,1000);
fs.writeFileSync('admissions-runtime-chain.txt',out.join('\n'),'utf8');
console.log('wrote admissions-runtime-chain.txt',out.length);
