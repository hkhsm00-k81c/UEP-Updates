const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const NEW_ID='1BHSdaUbOhp9p_9RB0XGgrfOo4wS_Z8Up0ocSCAMYIIk';
const must=(v,m)=>{if(!v)throw new Error(m)};
// 53B는 Q/R/S까지 실제 데이터로 읽도록 A:S로 확장.
for(const rel of ['electron/google-data.cjs','electron/main.cjs']){
  const p=path.join(root,rel);let s=fs.readFileSync(p,'utf8');
  s=s.replace(/'53B_전형유형별대학DB'!A1:P3000/g,"'53B_전형유형별대학DB'!A1:S3000");
  fs.writeFileSync(p,s);
}
// main.cjs는 google-data.cjs에서 기본정보 ID를 import하므로 별도 입시DB 상수를 import 블록 직후 정의한다.
const p=path.join(root,'electron/main.cjs');let s=fs.readFileSync(p,'utf8');
const requireAnchor='} = require("./google-data.cjs");';
must(s.includes(requireAnchor),'main: google-data import anchor missing');
if(!s.includes('const UEP_ADMISSIONS_SPREADSHEET_ID ='))s=s.replace(requireAnchor,requireAnchor+'\nconst UEP_ADMISSIONS_SPREADSHEET_ID = "'+NEW_ID+'";');
const parseAnchor='  const data = parseGoogleSheetData(matrices);';
must(s.includes(parseAnchor),'main: parse anchor missing');
const inject=`  const uep08259AdmissionEntries=[['52_대입기초',"'52_대입기초'!A1:N500"],['53_전형이해',"'53_전형이해'!A1:N500"],['53A_전형세부유형DB',"'53A_전형세부유형DB'!A1:R500"],['53B_전형유형별대학DB',"'53B_전형유형별대학DB'!A1:S3000"],['53C_전형DB점검',"'53C_전형DB점검'!A1:T500"],['54_수능최저DB',"'54_수능최저DB'!A1:Z1000"],['55_대학입결DB',"'55_대학입결DB'!A1:Z1000"],['56_대학입시마스터',"'56_대학입시마스터'!A1:R500"],['56A_대학상담포인트DB',"'56A_대학상담포인트DB'!A1:P1200"],['57_내신산정DB',"'57_내신산정DB'!A1:Z1200"],['58_권장과목DB',"'58_권장과목DB'!A1:P2000"]];\n  try{for(let offset=0;offset<uep08259AdmissionEntries.length;offset+=6){const chunk=uep08259AdmissionEntries.slice(offset,offset+6);const vr=await readSheetBatch(token,UEP_ADMISSIONS_SPREADSHEET_ID,chunk.map(([,range])=>range));assignValueRangesByRange(matrices,chunk,vr);}}catch(admissionError){console.warn('[UEP] 2028 입시DB 조회 실패',admissionError?.message||admissionError);for(const [logicalName] of uep08259AdmissionEntries)matrices[logicalName]=[];}\n`;
if(!s.includes('const uep08259AdmissionEntries='))s=s.replace(parseAnchor,inject+parseAnchor);
must(s.includes('const UEP_ADMISSIONS_SPREADSHEET_ID = "'+NEW_ID+'";'),'main: admissions id missing');
must(s.includes('readSheetBatch(token,UEP_ADMISSIONS_SPREADSHEET_ID'),'main: admissions read missing');
must(s.includes("'53B_전형유형별대학DB'!A1:S3000"),'main: 53B A:S missing');
fs.writeFileSync(p,s);
console.log('patched 0.82.59 admissions DB loader v5');
