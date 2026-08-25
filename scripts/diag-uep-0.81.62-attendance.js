const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
for(const rel of ['resources/app/electron/google-data.cjs','resources/app/electron/main.cjs']){
 const t=fs.readFileSync(path.join(root,rel),'utf8');
 for(const n of ['const officialRows','officialRows =','parseGoogleSheetData(','liveDataCache = parse','parseGoogleSheetData','fetchLiveData({ force']){
  let p=0;while((p=t.indexOf(n,p))>=0){fs.appendFileSync('diag-08162-attendance.txt',`=== ${rel} :: ${n} @ ${p} ===\n${t.slice(Math.max(0,p-1800),Math.min(t.length,p+7000))}\n\n---\n\n`,'utf8');p+=n.length;}
 }
}
