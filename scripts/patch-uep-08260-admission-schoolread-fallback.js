const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const NEW_ID='1BHSdaUbOhp9p_9RB0XGgrfOo4wS_Z8Up0ocSCAMYIIk';
const BASIC_ID='1bphoIQ11E2qsc3ksOqrXuO7xqS4CFyH8Dagbld7A1hg';
const must=(v,m)=>{if(!v)throw new Error(m)};
const mainPath=path.join(root,'electron/main.cjs');
const gyomuPath=path.join(root,'gyomuon.js');
const packagePath=path.join(root,'package.json');
let m=fs.readFileSync(mainPath,'utf8');
let g=fs.readFileSync(gyomuPath,'utf8');
must(m.includes('const UEP_ADMISSIONS_SPREADSHEET_ID = "'+NEW_ID+'";'),'0.82.59 admissions spreadsheet constant missing');
if(!m.includes('const UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID =')){
  m=m.replace('const UEP_ADMISSIONS_SPREADSHEET_ID = "'+NEW_ID+'";','const UEP_ADMISSIONS_SPREADSHEET_ID = "'+NEW_ID+'";\nconst UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID = "'+BASIC_ID+'";');
}
const oldCall='const vr=await readSheetBatch(token,UEP_ADMISSIONS_SPREADSHEET_ID,chunk.map(([,range])=>range));assignValueRangesByRange(matrices,chunk,vr);';
must(m.includes(oldCall),'0.82.59 admissions read call missing');
const newCall=`let vr;try{vr=await schoolReadBatchRead(UEP_ADMISSIONS_SPREADSHEET_ID,chunk.map(([,range])=>range));}catch(primaryError){console.warn('[UEP] 새 입시DB School Read 실패, 기존 52~58 안전원본으로 전환',primaryError?.message||primaryError);vr=await schoolReadBatchRead(UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID,chunk.map(([,range])=>range));}assignValueRangesByRange(matrices,chunk,vr);`;
m=m.replace(oldCall,newCall);
must(m.includes('schoolReadBatchRead(UEP_ADMISSIONS_SPREADSHEET_ID'),'new admissions School Read primary missing');
must(m.includes('schoolReadBatchRead(UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID'),'basic-info admissions fallback missing');
must(!m.includes('readSheetBatch(token,UEP_ADMISSIONS_SPREADSHEET_ID'),'legacy direct admissions read still present');
fs.writeFileSync(mainPath,m);
must(/APP_VERSION\s*=\s*["']0\.82\.59["']/.test(g),'0.82.59 app version missing');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.59["']/,'APP_VERSION = "0.82.60"');
g=g.replace(/const CURRENT='0\.82\.59';/g,"const CURRENT='0.82.60';");
g=g.replace(/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/,"const UEP_08221_RELEASE_NOTES=['0.82.60 · 입시DB School Read 연결 안정화','새 [UEP] 2028학년도 대학입시 데이터는 School Read 표준 경로로 우선 조회','School Read 서버가 새 입시DB를 아직 허용하지 않는 동안 기존 기본정보 연결시트의 보존된 52~58을 데이터 로더 계층에서 안전원본으로 사용','입시DB가 비어 버리는 실패 대신 기존 검증 데이터를 유지해 대입이해·오늘의 대학을 보호','오늘의 대학 수시(교과·종합) / 수시(논술·기타) / 정시 3탭과 53B Q/R/S 판정은 그대로 유지','서버에 새 입시DB가 정식 등록되면 동일 클라이언트가 자동으로 새 DB를 우선 사용'];");
fs.writeFileSync(gyomuPath,g);
if(fs.existsSync(packagePath)){const p=JSON.parse(fs.readFileSync(packagePath,'utf8'));p.version='0.82.60';fs.writeFileSync(packagePath,JSON.stringify(p,null,2)+'\n');}
console.log('patched UEP 0.82.60 admissions School Read migration fallback');
