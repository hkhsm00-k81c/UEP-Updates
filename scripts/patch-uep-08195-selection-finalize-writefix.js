const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const mFile=path.join(root,'resources','app','electron','main.cjs');
let m=fs.readFileSync(mFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
A(m.includes('UEP_08195_SELECTION_DECISION_BACKEND_START'),'decision backend must be installed first');
const old="await appendSheetValues(token,UEP_RULES_SPREADSHEET_ID,\"'41_선택과목규칙'!A:Z\",[row])";
if(m.includes(old)){
  const replacement="const rowNo=Math.max(4,matrix.length+1);await updateSheetValues(token,UEP_RULES_SPREADSHEET_ID,\"'41_선택과목규칙'!A\"+rowNo+\":Z\"+rowNo,[row])";
  m=m.replace(old,replacement);
}
A(!m.includes('appendSheetValues(token,UEP_RULES_SPREADSHEET_ID'),'selection decision backend still depends on appendSheetValues');
fs.writeFileSync(mFile,m,'utf8');
console.log('patched UEP 0.81.95 selection decision new-row write to updateSheetValues');
