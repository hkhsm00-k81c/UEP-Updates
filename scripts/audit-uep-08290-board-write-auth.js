const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const out=[];
const files=['gyomuon.js','electron/main.cjs','electron/preload.cjs','preload.cjs','package.json'];
const patterns=[
  'schoolReadSession','googleOAuth','idToken','accessToken','refreshToken','oauth','currentUser','userEmail','email','role','headerRoleChip','schoolBoard','ipcRenderer','ipcMain','contextBridge'
];
function excerpt(text,needle){
  let start=0,count=0;
  while(count<8){
    const i=text.toLowerCase().indexOf(needle.toLowerCase(),start); if(i<0)break;
    const a=Math.max(0,i-500),b=Math.min(text.length,i+1200);
    out.push(`\n--- ${needle} @ ${i} ---\n${text.slice(a,b)}`);
    start=i+needle.length; count++;
  }
}
for(const rel of files){
  const p=path.join(root,rel);
  if(!fs.existsSync(p))continue;
  const text=fs.readFileSync(p,'utf8');
  out.push(`\n===== FILE ${rel} size=${text.length} =====\n`);
  for(const pat of patterns)excerpt(text,pat);
}
const report=out.join('\n');
process.stdout.write(report);
