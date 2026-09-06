const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const NEW_ID='1BHSdaUbOhp9p_9RB0XGgrfOo4wS_Z8Up0ocSCAMYIIk';
const must=(v,m)=>{if(!v)throw new Error(m)};
for(const rel of ['electron/google-data.cjs','electron/main.cjs']){
  const p=path.join(root,rel);let s=fs.readFileSync(p,'utf8');
  const base='const UEP_SPREADSHEET_ID = "1bphoIQ11E2qsc3ksOqrXuO7xqS4CFyH8Dagbld7A1hg";';
  must(s.includes(base),rel+': base spreadsheet id missing');
  if(!s.includes('UEP_ADMISSIONS_SPREADSHEET_ID'))s=s.replace(base,base+'\nconst UEP_ADMISSIONS_SPREADSHEET_ID = "'+NEW_ID+'";');
  s=s.replace(/'53B_전형유형별대학DB'!A1:P3000/g,"'53B_전형유형별대학DB'!A1:S3000");
  const re=/const chunkSize\s*=\s*12;\s*const chunks\s*=\s*\[\];\s*for\s*\(let offset\s*=\s*0;\s*offset\s*<\s*entries\.length;\s*offset\s*\+=\s*chunkSize\)\s*\{\s*chunks\.push\(\{\s*offset,\s*chunk:\s*entries\.slice\(offset,\s*offset\s*\+\s*chunkSize\)\s*\}\);\s*\}\s*await mapWithConcurrency\(chunks,\s*1,\s*async\s*\(\{\s*offset,\s*chunk\s*\}\)\s*=>\s*\{/g;
  const count=(s.match(re)||[]).length;must(count>0,rel+': chunk loader not found');
  const rep=`const chunkSize = 12;\n  const admissionSheetNames = new Set(['52_대입기초','53_전형이해','53A_전형세부유형DB','53B_전형유형별대학DB','53C_전형DB점검','54_수능최저DB','55_대학입결DB','56_대학입시마스터','56A_대학상담포인트DB','57_내신산정DB','58_권장과목DB']);\n  const baseEntries = entries.filter(([logicalName])=>!admissionSheetNames.has(logicalName));\n  const admissionEntries = entries.filter(([logicalName])=>admissionSheetNames.has(logicalName));\n  const chunks = [];\n  for (const source of [{spreadsheetId:UEP_SPREADSHEET_ID,entries:baseEntries},{spreadsheetId:UEP_ADMISSIONS_SPREADSHEET_ID,entries:admissionEntries}]) {\n    for (let offset = 0; offset < source.entries.length; offset += chunkSize) chunks.push({offset,chunk:source.entries.slice(offset,offset+chunkSize),spreadsheetId:source.spreadsheetId});\n  }\n  await mapWithConcurrency(chunks, 1, async ({ offset, chunk, spreadsheetId }) => {`;
  s=s.replace(re,rep);
  s=s.replace(/readSheetBatch\(token,\s*UEP_SPREADSHEET_ID,\s*chunk\.map\(/g,'readSheetBatch(token, spreadsheetId, chunk.map(');
  s=s.replace(/readSheetBatch\(token,\s*UEP_SPREADSHEET_ID,\s*\[range\]\)/g,'readSheetBatch(token, spreadsheetId, [range])');
  must(s.includes('const UEP_ADMISSIONS_SPREADSHEET_ID = "'+NEW_ID+'";'),rel+': new admissions id missing');
  must(s.includes("'53B_전형유형별대학DB'!A1:S3000"),rel+': 53B A:S range missing');
  must(s.includes('spreadsheetId:UEP_ADMISSIONS_SPREADSHEET_ID'),rel+': source split missing');
  fs.writeFileSync(p,s);
  console.log(rel,'chunk loaders patched',count);
}
