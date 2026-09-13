const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const candidates=['electron/main.cjs','electron/preload.cjs','preload.cjs'];
const needles=['schoolReadSessionStatus','schoolReadLogin','school-read','sessionToken','session_token','authToken','accessToken','idToken','safeStorage','fetch(','scope','scopes','spreadsheets','www.googleapis.com/auth','accounts.google.com','oauth2','userinfo'];
for(const rel of candidates){
  const p=path.join(root,rel); if(!fs.existsSync(p))continue;
  const s=fs.readFileSync(p,'utf8');
  console.log(`===== ${rel} (${s.length}) =====`);
  for(const n of needles){
    let pos=0,found=0;
    while(found<20){const i=s.indexOf(n,pos);if(i<0)break;console.log(`\n--- ${n} @ ${i} ---\n${s.slice(Math.max(0,i-1000),Math.min(s.length,i+2200))}`);pos=i+n.length;found++;}
  }
}
