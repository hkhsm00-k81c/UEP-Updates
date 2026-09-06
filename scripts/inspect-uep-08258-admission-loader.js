const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const files=[];
function walk(p){for(const n of fs.readdirSync(p)){const f=path.join(p,n);const s=fs.statSync(f);if(s.isDirectory())walk(f);else if(/\.(js|cjs|mjs|json)$/i.test(n))files.push(f);}}
walk(root);
const needles=['schoolReadApiUrl','script.google.com/macros','53B_전형유형별대학DB','54_수능최저DB','56_대학입시마스터','dashboardAdmissionRows','dashboardAdmissionStructureRows','fetch(','spreadsheets','sheetName','sheet='];
let out=[];
for(const f of files){const t=fs.readFileSync(f,'utf8');for(const needle of needles){let i=0,c=0;while((i=t.indexOf(needle,i))>=0&&c<8){const a=Math.max(0,i-900),b=Math.min(t.length,i+1800);out.push(`\n===== ${path.relative(root,f)} :: ${needle} @ ${i} =====\n${t.slice(a,b)}`);i+=needle.length;c++;}}}
fs.writeFileSync('admission-loader-08258-inspection.txt',out.join('\n'),'utf8');
console.log('inspection entries',out.length);
