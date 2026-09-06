const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const p=path.join(root,'electron/main.cjs');const s=fs.readFileSync(p,'utf8');
const needles=['parseGoogleSheetData(matrices)','readSheetBatch(token','const entries = [','UEP_SPREADSHEET_ID','require("./google-data','require(\'./google-data'];
let out=['===== main first 12000 =====\n'+s.slice(0,12000)];
for(const n of needles){let i=0,c=0;while((i=s.indexOf(n,i))>=0&&c<12){out.push(`\n===== ${n} @ ${i} =====\n`+s.slice(Math.max(0,i-1800),Math.min(s.length,i+3200)));i+=n.length;c++;}}
fs.writeFileSync('main-loader-08258-inspection.txt',out.join('\n'),'utf8');console.log('written',out.length);
