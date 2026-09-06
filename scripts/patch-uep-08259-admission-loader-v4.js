const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const NEW_ID='1BHSdaUbOhp9p_9RB0XGgrfOo4wS_Z8Up0ocSCAMYIIk';
const must=(v,m)=>{if(!v)throw new Error(m)};
// 53B 운영필드는 모든 로더에서 A:S까지 읽을 수 있도록 범위를 확장합니다.
for(const rel of ['electron/google-data.cjs','electron/main.cjs']){
  const p=path.join(root,rel);let s=fs.readFileSync(p,'utf8');
  s=s.replace(/'53B_전형유형별대학DB'!A1:P3000/g,"'53B_전형유형별대학DB'!A1:S3000");
  fs.writeFileSync(p,s);
}
// 현재 실제 런타임 데이터 조립이 이루어지는 main.cjs에서 52~58을 새 입시DB 값으로 최종 교체합니다.
const p=path.join(root,'electron/main.cjs');let s=fs.readFileSync(p,'utf8');
const base='const UEP_SPREADSHEET_ID = "1bphoIQ11E2qsc3ksOqrXuO7xqS4CFyH8Dagbld7A1hg";';
must(s.includes(base),'main: base id missing');
if(!s.includes('UEP_ADMISSIONS_SPREADSHEET_ID'))s=s.replace(base,base+'\nconst UEP_ADMISSIONS_SPREADSHEET_ID = "'+NEW_ID+'";');
const anchor='  const data = parseGoogleSheetData(matrices);';
must(s.includes(anchor),'main: parse anchor missing');
const inject=`  const uep08259AdmissionEntries=[['52_대입기초',"'52_대입기초'!A1:N500"],['53_전형이해',"'53_전형이해'!A1:N500"],['53A_전형세부유형DB',"'53A_전형세부유형DB'!A1:R500"],['53B_전형유형별대학DB',"'53B_전형유형별대학DB'!A1:S3000"],['53C_전형DB점검',"'53C_전형DB점검'!A1:T500"],['54_수능최저DB',"'54_수능최저DB'!A1:Z1000"],['55_대학입결DB',"'55_대학입결DB'!A1:Z1000"],['56_대학입시마스터',"'56_대학입시마스터'!A1:R500"],['56A_대학상담포인트DB',"'56A_대학상담포인트DB'!A1:P1200"],['57_내신산정DB',"'57_내신산정DB'!A1:Z1200"],['58_권장과목DB',"'58_권장과목DB'!A1:P2000"]];\n  try{for(let offset=0;offset<uep08259AdmissionEntries.length;offset+=6){const chunk=uep08259AdmissionEntries.slice(offset,offset+6);const vr=await readSheetBatch(token,UEP_ADMISSIONS_SPREADSHEET_ID,chunk.map(([,range])=>range));assignValueRangesByRange(matrices,chunk,vr);}}catch(admissionError){console.warn('[UEP] 2028 입시DB 조회 실패',admissionError?.message||admissionError);for(const [logicalName] of uep08259AdmissionEntries)matrices[logicalName]=[];}\n`;
if(!s.includes('const uep08259AdmissionEntries='))s=s.replace(anchor,inject+anchor);
must(s.includes('const UEP_ADMISSIONS_SPREADSHEET_ID = "'+NEW_ID+'";'),'main: new admissions id missing');
must(s.includes('readSheetBatch(token,UEP_ADMISSIONS_SPREADSHEET_ID'),'main: new admissions read missing');
fs.writeFileSync(p,s);
console.log('patched 0.82.59 admission DB final source in main runtime');
