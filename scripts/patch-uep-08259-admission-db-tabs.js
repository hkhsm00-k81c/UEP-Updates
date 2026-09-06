const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const NEW_ADMISSION_ID='1BHSdaUbOhp9p_9RB0XGgrfOo4wS_Z8Up0ocSCAMYIIk';
const must=(v,m)=>{if(!v)throw new Error(m)};

function patchLoader(file){
  const p=path.join(root,file);let s=fs.readFileSync(p,'utf8');
  must(s.includes('const UEP_SPREADSHEET_ID = "1bphoIQ11E2qsc3ksOqrXuO7xqS4CFyH8Dagbld7A1hg";'),`${file}: base spreadsheet constant missing`);
  if(!s.includes('UEP_ADMISSIONS_SPREADSHEET_ID')){
    s=s.replace('const UEP_SPREADSHEET_ID = "1bphoIQ11E2qsc3ksOqrXuO7xqS4CFyH8Dagbld7A1hg";',`const UEP_SPREADSHEET_ID = "1bphoIQ11E2qsc3ksOqrXuO7xqS4CFyH8Dagbld7A1hg";\nconst UEP_ADMISSIONS_SPREADSHEET_ID = "${NEW_ADMISSION_ID}";`);
  }
  s=s.replace(/\["53B_전형유형별대학DB", "'53B_전형유형별대학DB'!A1:P3000"\]/g,'["53B_전형유형별대학DB", "\'53B_전형유형별대학DB\'!A1:S3000"]');
  const chunkRe=/const chunkSize = 12;\n  const chunks = \[\];\n  for \(let offset = 0; offset < entries\.length; offset \+= chunkSize\) \{\n    chunks\.push\(\{ offset, chunk: entries\.slice\(offset, offset \+ chunkSize\) \}\);\n  \}\n  await mapWithConcurrency\(chunks, 1, async \(\{ offset, chunk \}\) => \{/g;
  const repl=`const chunkSize = 12;\n  const admissionSheetNames = new Set(['52_대입기초','53_전형이해','53A_전형세부유형DB','53B_전형유형별대학DB','53C_전형DB점검','54_수능최저DB','55_대학입결DB','56_대학입시마스터','56A_대학상담포인트DB','57_내신산정DB','58_권장과목DB']);\n  const baseEntries = entries.filter(([logicalName])=>!admissionSheetNames.has(logicalName));\n  const admissionEntries = entries.filter(([logicalName])=>admissionSheetNames.has(logicalName));\n  const chunks = [];\n  for (const source of [{spreadsheetId:UEP_SPREADSHEET_ID,entries:baseEntries},{spreadsheetId:UEP_ADMISSIONS_SPREADSHEET_ID,entries:admissionEntries}]) {\n    for (let offset = 0; offset < source.entries.length; offset += chunkSize) {\n      chunks.push({ offset, chunk: source.entries.slice(offset, offset + chunkSize), spreadsheetId: source.spreadsheetId });\n    }\n  }\n  await mapWithConcurrency(chunks, 1, async ({ offset, chunk, spreadsheetId }) => {`;
  const before=(s.match(chunkRe)||[]).length;must(before>0,`${file}: loader chunk block missing`);s=s.replace(chunkRe,repl);
  s=s.replace(/readSheetBatch\(token, UEP_SPREADSHEET_ID, chunk\.map\(/g,'readSheetBatch(token, spreadsheetId, chunk.map(');
  s=s.replace(/readSheetBatch\(token, UEP_SPREADSHEET_ID, \[range\]\)/g,'readSheetBatch(token, spreadsheetId, [range])');
  must(s.includes(`const UEP_ADMISSIONS_SPREADSHEET_ID = "${NEW_ADMISSION_ID}";`),`${file}: admission spreadsheet id missing`);
  must(s.includes("'53B_전형유형별대학DB'!A1:S3000"),`${file}: 53B Q/R/S range missing`);
  fs.writeFileSync(p,s);
}
patchLoader('electron/google-data.cjs');
patchLoader('electron/main.cjs');

const gp=path.join(root,'gyomuon.js'),pp=path.join(root,'package.json');let g=fs.readFileSync(gp,'utf8');
must(/APP_VERSION\s*=\s*["']0\.82\.58["']/.test(g),'0.82.58 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.58["']/,'APP_VERSION = "0.82.59"');
g=g.replace(/const CURRENT='0\.82\.58';/g,"const CURRENT='0.82.59';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.59';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

const splitRe=/  const activeAdmissions=admissions\.filter\(uep08258AdmissionActive\);[\s\S]*?  const restrictedHtml=[^\n]*\n/;
must(splitRe.test(g),'0.82.58 admission split renderer not found');
const tabs=`  const activeAdmissions=admissions.filter(uep08258AdmissionActive).sort(uep08258AdmissionCompare);\n  const tabKey=r=>{const group=uep08258AdmissionMeta(r).group;return group==='교과'||group==='종합'?'early':group==='정시'?'regular':'other';};\n  const importance=r=>String(r?.['UEP상담중요도']||'일반').trim();\n  const renderTabPanel=(key,label)=>{\n    const rows=activeAdmissions.filter(r=>tabKey(r)===key);\n    const ordinary=rows.filter(r=>{const i=uep08258AdmissionMeta(r);return !i.restricted&&!i.unavailable;});\n    const featured=rows.filter(r=>{const i=uep08258AdmissionMeta(r);return !i.unavailable&&i.restricted&&importance(r)==='주요';});\n    const detail=rows.filter(r=>{const i=uep08258AdmissionMeta(r);return i.unavailable||(i.restricted&&!featured.includes(r));});\n    const ordinaryHtml=ordinary.length?'<div class="uep-uni-admission-grid uep-uni-primary-grid">'+ordinary.map(renderAdmissionCard).join('')+'</div>':'<p class="uep-uni-admission-empty">'+escapeHtml(label)+' 일반 전형자료를 연결 중입니다.</p>';\n    const featuredHtml=featured.length?'<div class="uep-uni-featured-admissions"><div class="uep-uni-admission-subtitle">지역의사제·주요 자격전형</div><div class="uep-uni-admission-grid uep-uni-featured-grid">'+featured.map(renderAdmissionCard).join('')+'</div></div>':'';\n    const detailHtml=detail.length?'<details class="uep-uni-restricted-disclosure uep-uni-more-admissions"><summary>다른 전형 자세히 보기 <b>'+detail.length+'개</b><span>펼쳐보기</span></summary><div class="uep-uni-admission-grid uep-uni-restricted-grid">'+detail.map(renderAdmissionCard).join('')+'</div></details>':'';\n    return '<section class="uep-uni-admission-tab-panel uep-uni-admission-tab-'+key+'">'+ordinaryHtml+featuredHtml+detailHtml+'</section>';\n  };\n  const admissionHtml='<div class="uep-uni-admission-tabs">'+\n    '<input type="radio" name="uep-uni-admission-tab" id="uep-uni-tab-early" checked><input type="radio" name="uep-uni-admission-tab" id="uep-uni-tab-other"><input type="radio" name="uep-uni-admission-tab" id="uep-uni-tab-regular">'+\n    '<div class="uep-uni-admission-tab-labels"><label for="uep-uni-tab-early">수시(교과·종합)</label><label for="uep-uni-tab-other">수시(논술·기타)</label><label for="uep-uni-tab-regular">정시</label></div>'+\n    '<div class="uep-uni-admission-tab-panels">'+renderTabPanel('early','수시(교과·종합)')+renderTabPanel('other','수시(논술·기타)')+renderTabPanel('regular','정시')+'</div></div>';\n  const restrictedHtml='';\n`;
g=g.replace(splitRe,tabs);
const styleAnchor='.uep-admission-restricted-badge{display:inline-flex;align-items:center;margin:0 0 7px;padding:3px 7px;border:1px solid #dcc89e;border-radius:999px;background:#fffaf0;color:#8a6426;font-size:11px;font-weight:700}';
must(g.includes(styleAnchor),'0.82.58 admission style anchor missing');
const extra='.uep-uni-admission-tabs>input{position:absolute;opacity:0;pointer-events:none}.uep-uni-admission-tab-labels{display:flex;gap:8px;margin:4px 0 14px;flex-wrap:wrap}.uep-uni-admission-tab-labels label{display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;border:1px solid #d7dee8;border-radius:10px;background:#f8fafc;color:#475569;font-size:12px;font-weight:800;cursor:pointer}.uep-uni-admission-tab-panel{display:none}.uep-uni-admission-tabs #uep-uni-tab-early:checked~.uep-uni-admission-tab-labels label[for="uep-uni-tab-early"],.uep-uni-admission-tabs #uep-uni-tab-other:checked~.uep-uni-admission-tab-labels label[for="uep-uni-tab-other"],.uep-uni-admission-tabs #uep-uni-tab-regular:checked~.uep-uni-admission-tab-labels label[for="uep-uni-tab-regular"]{background:#eef4ff;border-color:#9bb8e8;color:#214d8f}.uep-uni-admission-tabs #uep-uni-tab-early:checked~.uep-uni-admission-tab-panels .uep-uni-admission-tab-early,.uep-uni-admission-tabs #uep-uni-tab-other:checked~.uep-uni-admission-tab-panels .uep-uni-admission-tab-other,.uep-uni-admission-tabs #uep-uni-tab-regular:checked~.uep-uni-admission-tab-panels .uep-uni-admission-tab-regular{display:block}.uep-uni-featured-admissions{margin-top:14px;padding-top:12px;border-top:1px dashed #d8dee8}.uep-uni-admission-subtitle{margin:0 0 8px;font-size:12px;font-weight:900;color:#475569}.uep-uni-admission-empty{padding:12px 0;color:#64748b;font-size:12px}';
g=g.replace(styleAnchor,styleAnchor+extra);
g=g.replace(/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/,"const UEP_08221_RELEASE_NOTES=['0.82.59 · 입시DB 분리 및 대학 전형 3탭 표준화','52~58 입시DB는 [UEP] 2028학년도 대학입시 데이터에서 읽도록 분리','53B는 A:S까지 읽어 상담중요도·자격제한·운호고지원 값을 실제 렌더링에 사용','오늘의 대학 주요전형을 수시(교과·종합) / 수시(논술·기타) / 정시 3탭으로 분리','각 탭의 일반전형은 먼저 표시하고 UEP상담중요도=주요인 자격전형은 아래 별도 표시','그 외 자격제한·운호고 지원불가 전형은 해당 탭의 다른 전형 자세히 보기에 배치','기존 학생성적·학생정보 원본은 기본정보 연결시트에 유지'];");
fs.writeFileSync(gp,g);
console.log('patched 0.82.59 admission db separation and tabs');
