const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const g=fs.readFileSync(path.join(root,'resources','app','gyomuon.js'),'utf8');
const out=[];
function grab(label,startPat,endPat){const s=g.indexOf(startPat);out.push(`===== ${label} @ ${s} =====`);if(s<0)return;const e=endPat?g.indexOf(endPat,s+startPat.length):-1;out.push(g.slice(s,e>0?Math.min(e+endPat.length,s+18000):s+18000));}
grab('dashboardAdmissionRows','function dashboardAdmissionRows','function dashboardAdmissionEnabled');
grab('openDashboardUniversityDetail','function openDashboardUniversityDetail','function dashboardStudentStatusMarkup');
grab('08225 wrapper','/* UEP_08225_ADMISSION_CALCULATION_CARDS */','/* UEP_08226');
grab('08230 wrapper','/* UEP_08230_ADMISSIONS_FINAL_LINK */','/* UEP_08230_RELEASE_NOTES */');
fs.writeFileSync('today-detail-inspection.txt',out.join('\n\n'),'utf8');
console.log('inspection written');
