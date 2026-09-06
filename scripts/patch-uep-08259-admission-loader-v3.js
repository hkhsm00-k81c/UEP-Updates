const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const NEW_ID='1BHSdaUbOhp9p_9RB0XGgrfOo4wS_Z8Up0ocSCAMYIIk';
const must=(v,m)=>{if(!v)throw new Error(m)};
const inject=`  const uep08259AdmissionEntries=[\n    ['52_대입기초',"'52_대입기초'!A1:N500"],['53_전형이해',"'53_전형이해'!A1:N500"],['53A_전형세부유형DB',"'53A_전형세부유형DB'!A1:R500"],['53B_전형유형별대학DB',"'53B_전형유형별대학DB'!A1:S3000"],['53C_전형DB점검',"'53C_전형DB점검'!A1:T500"],['54_수능최저DB',"'54_수능최저DB'!A1:Z1000"],['55_대학입결DB',"'55_대학입결DB'!A1:Z1000"],['56_대학입시마스터',"'56_대학입시마스터'!A1:R500"],['56A_대학상담포인트DB',"'56A_대학상담포인트DB'!A1:P1200"],['57_내신산정DB',"'57_내신산정DB'!A1:Z1200"],['58_권장과목DB',"'58_권장과목DB'!A1:P2000"]\n  ];\n  try{\n    for(let offset=0;offset<uep08259AdmissionEntries.length;offset+=6){\n      const chunk=uep08259AdmissionEntries.slice(offset,offset+6);\n      const vr=await readSheetBatch(token,UEP_ADMISSIONS_SPREADSHEET_ID,chunk.map(([,range])=>range));\n      assignValueRangesByRange(matrices,chunk,vr);\n    }\n  }catch(admissionError){\n    console.warn('[UEP] 2028 입시DB 조회 실패',admissionError?.message||admissionError);\n    for(const [logicalName] of uep08259AdmissionEntries)matrices[logicalName]=[];\n  }\n`;
for(const rel of ['electron/google-data.cjs','electron/main.cjs']){
  const p=path.join(root,rel);let s=fs.readFileSync(p,'utf8');
  const base='const UEP_SPREADSHEET_ID = "1bphoIQ11E2qsc3ksOqrXuO7xqS4CFyH8Dagbld7A1hg";';
  must(s.includes(base),rel+': base id missing');
  if(!s.includes('UEP_ADMISSIONS_SPREADSHEET_ID'))s=s.replace(base,base+'\nconst UEP_ADMISSIONS_SPREADSHEET_ID = "'+NEW_ID+'";');
  s=s.replace(/'53B_전형유형별대학DB'!A1:P3000/g,"'53B_전형유형별대학DB'!A1:S3000");
  const anchor='  const data = parseGoogleSheetData(matrices);';
  const count=s.split(anchor).length-1;must(count>0,rel+': parse anchor missing');
  if(!s.includes('const uep08259AdmissionEntries='))s=s.replace(anchor,inject+anchor);
  must(s.includes('UEP_ADMISSIONS_SPREADSHEET_ID = "'+NEW_ID+'"'),rel+': new id missing');
  must(s.includes("'53B_전형유형별대학DB'!A1:S3000"),rel+': Q/R/S range missing');
  must(s.includes('readSheetBatch(token,UEP_ADMISSIONS_SPREADSHEET_ID'),rel+': new DB override read missing');
  fs.writeFileSync(p,s);console.log(rel,'patched admission override before parse');
}
