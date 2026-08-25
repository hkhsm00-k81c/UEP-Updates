const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const files=['resources/app/electron/google-data.cjs','resources/app/electron/main.cjs'];
const needles=['function localDate','localDate =','const localDate','function fetchLiveData','fetchLiveData =','async function fetchLiveData','google:authorizeUser','credentialStatus','notice:receiptSave','getSheetsToken','getUserSheetsToken','scope','spreadsheets.readonly','spreadsheets'];
let out=[];
for(const rel of files){const t=fs.readFileSync(path.join(root,rel),'utf8');for(const n of needles){let p=0;while((p=t.indexOf(n,p))>=0){out.push(`=== ${rel} :: ${n} @ ${p} ===\n${t.slice(Math.max(0,p-2400),Math.min(t.length,p+6500))}`);p+=n.length;}}}
fs.writeFileSync('diag-08162-core.txt',out.join('\n\n---\n\n'),'utf8');console.log(out.length);
