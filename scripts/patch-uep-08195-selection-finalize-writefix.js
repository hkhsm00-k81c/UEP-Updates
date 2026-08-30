const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const mFile=path.join(root,'resources','app','electron','main.cjs');
let m=fs.readFileSync(mFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
const start='/* UEP_08195_SELECTION_DECISION_BACKEND_START */';
const end='/* UEP_08195_SELECTION_DECISION_BACKEND_END */';
const a=m.indexOf(start),b=m.indexOf(end,a+start.length);
A(a>=0&&b>a,'selection decision backend must be installed first');
let block=m.slice(a,b+end.length);
const appendPattern=/await\s+appendSheetValues\(token\s*,\s*UEP_RULES_SPREADSHEET_ID\s*,\s*["']'41_선택과목규칙'!A:Z["']\s*,\s*\[row\]\s*\)/;
if(appendPattern.test(block)){
  block=block.replace(appendPattern,"const rowNo=Math.max(4,matrix.length+1);await updateSheetValues(token,UEP_RULES_SPREADSHEET_ID,\"'41_선택과목규칙'!A\"+rowNo+\":Z\"+rowNo,[row])");
  m=m.slice(0,a)+block+m.slice(b+end.length);
}
A(!block.includes('appendSheetValues('),'selection decision backend still depends on appendSheetValues');
A(block.includes("updateSheetValues(token,UEP_RULES_SPREADSHEET_ID"),'selection decision backend updateSheetValues missing');
fs.writeFileSync(mFile,m,'utf8');
console.log('patched UEP 0.81.95 selection decision new-row write to updateSheetValues');
