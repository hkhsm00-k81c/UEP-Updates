const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app/resources/app';
const gp=path.join(root,'gyomuon.js');
const mp=path.join(root,'electron','main.cjs');
const pp=path.join(root,'package.json');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
let g=fs.readFileSync(gp,'utf8');
let m=fs.readFileSync(mp,'utf8');
must(/const\s+APP_VERSION\s*=\s*["']0\.82\.69["'];/.test(g),'expected 0.82.69 renderer base');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.69["'];/,'const APP_VERSION = "0.82.70";');
g=g.replace(/const CURRENT='0\.82\.69';/g,"const CURRENT='0.82.70';");
const oldBlock=`  const operationalEntries=UEP_OPERATIONAL_RANGE_NAMES.map(name=>[name,SHEET_RANGES[name]]);\n  const result=await readSheetBatch(token,UEP_SPREADSHEET_ID,operationalEntries.map(([,range])=>range));\n  const matrices={};assignValueRangesByRange(matrices,operationalEntries,result);\n  const partial=parseGoogleSheetData(matrices);\n  const patch={officialAttendance:partial.officialAttendance||[],lateAttendance:partial.lateAttendance||[],notices:partial.notices||[],noticeReceipts:partial.noticeReceipts||[],lunchDuties:partial.lunchDuties||[],nightSupervisors:partial.nightSupervisors||[]};`;
must(m.includes(oldBlock),'operational refresh block missing');
const newBlock=`  const operationalEntries=UEP_OPERATIONAL_RANGE_NAMES.map(name=>[name,SHEET_RANGES[name]]);\n  const [result,nightResult]=await Promise.all([\n    readSheetBatch(token,UEP_SPREADSHEET_ID,operationalEntries.map(([,range])=>range)),\n    // 0.82.70: 야자 출결은 실행 중에도 계속 추가·사후보정되므로 운영 동기화에서 함께 갱신합니다.\n    // 데이터처리 탭의 사용행만 반환되는 열린 범위를 사용해 고정 7만행 조회를 피합니다.\n    readSheetBatch(token,UEP_PROCESSING_SPREADSHEET_ID,[\"'30_야자출결_정규화'!A:U\"])\n  ]);\n  const matrices={};assignValueRangesByRange(matrices,operationalEntries,result);\n  matrices['30_야자출결_정규화']=nightResult?.[0]?.values||[];\n  const partial=parseGoogleSheetData(matrices);\n  const patch={officialAttendance:partial.officialAttendance||[],lateAttendance:partial.lateAttendance||[],notices:partial.notices||[],noticeReceipts:partial.noticeReceipts||[],lunchDuties:partial.lunchDuties||[],nightSupervisors:partial.nightSupervisors||[],nightAttendance:partial.nightAttendance||[]};`;
m=m.replace(oldBlock,newBlock);
if(fs.existsSync(pp)){
  const p=JSON.parse(fs.readFileSync(pp,'utf8'));
  must(String(p.version)==='0.82.69','expected package 0.82.69');
  p.version='0.82.70';
  fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');
}
fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(mp,m,'utf8');
console.log('UEP 0.82.70 night attendance live refresh patch applied');
