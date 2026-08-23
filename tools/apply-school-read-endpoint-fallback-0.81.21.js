const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const mainPath=path.join(root,'resources/app/electron/main.cjs');
const gyoPath=path.join(root,'resources/app/gyomuon.js');
let main=fs.readFileSync(mainPath,'utf8');
let gyo=fs.readFileSync(gyoPath,'utf8');
const endpoint='https://script.google.com/macros/s/AKfycbyLEEam4L2sX653pii69TC3_84wTyfAed_UL8HRY6PBG467im1LmZJ0CIpSKSOj4r6-0w/exec';
const marker='__UEP_SCHOOL_READ_ENDPOINT_FALLBACK_08121__';
if(!main.includes('__UEP_SCHOOL_READ_API_PRIMARY_08120__')) throw new Error('0.81.20 School Read API integration missing');
if(!main.includes(marker)){
  const cacheAnchor="let schoolReadPolicyCache={url:'',expiresAt:0};";
  if(!main.includes(cacheAnchor)) throw new Error('schoolReadPolicyCache anchor missing');
  main=main.replace(cacheAnchor,`// ${marker}\nconst UEP_SCHOOL_READ_API_FALLBACK='${endpoint}';\n${cacheAnchor}`);
  const urlAnchor="const url=String(policy?.schoolReadApiUrl||'').trim();";
  if(!main.includes(urlAnchor)) throw new Error('schoolReadApiUrl resolver anchor missing');
  main=main.replace(urlAnchor,"const url=String(policy?.schoolReadApiUrl||UEP_SCHOOL_READ_API_FALLBACK||'').trim();");
}
if(!main.includes(endpoint)) throw new Error('embedded endpoint missing');
gyo=gyo.replace(/const APP_VERSION\s*=\s*["'][^"']+["'];/, 'const APP_VERSION = "0.81.21";');
if(!gyo.includes('const APP_VERSION = "0.81.21";')) throw new Error('version bump failed');
fs.writeFileSync(mainPath,main,'utf8');
fs.writeFileSync(gyoPath,gyo,'utf8');
console.log('Applied 0.81.21 School Read API endpoint fallback and version bump');
