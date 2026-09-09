const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const main=fs.readFileSync(path.join(root,'electron','main.cjs'),'utf8');
const renderer=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
function must(c,m){if(!c)throw new Error(m);}
must(pkg.version==='0.82.85','package version mismatch');
must(renderer.includes('APP_VERSION="0.82.85"'),'runtime version mismatch');
must(main.includes('UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID'),'known-good admissions fallback missing');
must(main.includes('기존 52~58 안전원본으로 전환'),'known-good fallback loader missing');
must(main.includes('async function saveAdmissionCounselPoint(payload={})'),'56A save function missing');
console.log('UEP v0.82.85 rollback regression tests passed');
