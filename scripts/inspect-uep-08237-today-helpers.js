const fs=require('fs'),path=require('path');
const g=fs.readFileSync(path.join(process.argv[2]||'app','resources','app','gyomuon.js'),'utf8');
const names=['function escapeHtml','function uep08223TodayNav','function uep08223UniversityBadges','function uep08223BindUniversityNavigation','UEP_08233_ADMISSIONS_RUNTIME_OVERRIDE','data-dashboard-admission'];
let out='';
for(const n of names){let p=0,i=0;while((p=g.indexOf(n,p))>=0){i++;out+=`\n===== ${n} #${i} @ ${p} =====\n${g.slice(Math.max(0,p-500),Math.min(g.length,p+5000))}\n`;p+=n.length;}}
fs.writeFileSync('today-helper-inspection.txt',out,'utf8');
