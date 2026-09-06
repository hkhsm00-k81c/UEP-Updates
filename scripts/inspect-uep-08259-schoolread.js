const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const s=fs.readFileSync(path.join(root,'electron/main.cjs'),'utf8');
for(const term of ['schoolReadBatchRead','async function schoolReadBatchRead','UEP_SCHOOL_READ','schoolReadApiUrl','readSheetBatch(token']){
 const i=s.indexOf(term); console.log('\n===== '+term+' @ '+i+' =====\n'); console.log(i>=0?s.slice(Math.max(0,i-2500),i+6500):'NOT FOUND');
}
