const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const rendererPath=path.join(root,'gyomuon.js');
const mainPath=path.join(root,'electron','main.cjs');
const packagePath=path.join(root,'package.json');
function read(p){return fs.readFileSync(p,'utf8');}
function write(p,s){fs.writeFileSync(p,s,'utf8');}
function must(c,m){if(!c)throw new Error(m);}
function replaceOnce(text,from,to,label){must(text.includes(from),label+' source pattern not found');const next=text.replace(from,to);must(next!==text,label+' replacement failed');return next;}

let renderer=read(rendererPath);
let main=read(mainPath);
const pkg=JSON.parse(read(packagePath));

// 1) Canonical package/runtime version.
must(pkg.version==='0.82.85',`baseline package version mismatch: ${pkg.version}`);
pkg.version='0.82.86';
renderer=replaceOnce(
  renderer,
  'const APP_VERSION="0.82.85"; /* UEP_08285_ADMISSIONS_ROLLBACK */',
  'const APP_VERSION="0.82.86"; /* UEP_08286_ADMISSIONS_VERSION_POPUP */',
  'runtime version'
);

// 2) Top version indicator must use the real runtime version, never a historical hardcoded value.
renderer=replaceOnce(
  renderer,
  "const CURRENT='0.82.81';",
  'const CURRENT=String(APP_VERSION);',
  'top version indicator canonical source'
);

// 3) Historical release-note IIFEs must never run on a different app version.
//    This fixes old 0.82.18/0.82.22~0.82.66 popups resurfacing when localStorage lacks their key.
let gated=0;
renderer=renderer.replace(/(,\s*KEY='uep:release-notes:'\+VERSION;)(?!\s*if\(String\(APP_VERSION\)!==VERSION\)return;)/g,(m,p)=>{gated++;return p+'if(String(APP_VERSION)!==VERSION)return;';});
renderer=renderer.replace(/(const STORAGE_KEY='uep:release-notes:'\+VERSION;)(?!\s*if\(String\(APP_VERSION\)!==VERSION\)return;)/g,(m,p)=>{gated++;return p+'\n  if(String(APP_VERSION)!==VERSION)return;';});
must(gated>=10,`too few historical release-note guards added: ${gated}`);

// 4) Load 59/59A from the new admissions DB as formal cache datasets.
const oldEntries="['58_권장과목DB',\"'58_권장과목DB'!A1:P2000\"]];";
const newEntries="['58_권장과목DB',\"'58_권장과목DB'!A1:P2000\"],['59_모집단위DB',\"'59_모집단위DB'!A1:P2000\"],['59A_전형별모집단위DB',\"'59A_전형별모집단위DB'!A1:R3000\"]];";
main=replaceOnce(main,oldEntries,newEntries,'59/59A admission ranges');

const oldMappings="data.admissionRecommendations=uep08210MatrixObjects(matrices['58_권장과목DB']);\n  data.curriculumDb=";
const newMappings="data.admissionRecommendations=uep08210MatrixObjects(matrices['58_권장과목DB']);\n  data.admissionMajors=uep08210MatrixObjects(matrices['59_모집단위DB']);\n  data.admissionMajorTracks=uep08210MatrixObjects(matrices['59A_전형별모집단위DB']);\n  data.curriculumDb=";
main=replaceOnce(main,oldMappings,newMappings,'59/59A object mappings');
const oldRawMappings="data['58_권장과목DB']=data.admissionRecommendations;\n  data.admissionMinimumRows=";
const newRawMappings="data['58_권장과목DB']=data.admissionRecommendations;\n  data['59_모집단위DB']=data.admissionMajors;\n  data['59A_전형별모집단위DB']=data.admissionMajorTracks;\n  data.admissionMinimumRows=";
main=replaceOnce(main,oldRawMappings,newRawMappings,'59/59A raw mappings');

// 5) Keep fallback safe: if a primary chunk fails, only read ranges that exist in the legacy 52~58 source.
const oldLoader="try{for(let offset=0;offset<uep08259AdmissionEntries.length;offset+=6){const chunk=uep08259AdmissionEntries.slice(offset,offset+6);let vr;try{vr=await schoolReadBatchRead(UEP_ADMISSIONS_SPREADSHEET_ID,chunk.map(([,range])=>range));}catch(primaryError){console.warn('[UEP] 새 입시DB School Read 실패, 기존 52~58 안전원본으로 전환',primaryError?.message||primaryError);vr=await schoolReadBatchRead(UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID,chunk.map(([,range])=>range));}assignValueRangesByRange(matrices,chunk,vr);}}catch(admissionError){console.warn('[UEP] 2028 입시DB 조회 실패',admissionError?.message||admissionError);for(const [logicalName] of uep08259AdmissionEntries)matrices[logicalName]=[];}";
const newLoader="try{for(let offset=0;offset<uep08259AdmissionEntries.length;offset+=6){const chunk=uep08259AdmissionEntries.slice(offset,offset+6);try{const vr=await schoolReadBatchRead(UEP_ADMISSIONS_SPREADSHEET_ID,chunk.map(([,range])=>range));assignValueRangesByRange(matrices,chunk,vr);}catch(primaryError){console.warn('[UEP] 새 입시DB School Read 실패, 기존 52~58 안전원본으로 전환',primaryError?.message||primaryError);const legacyChunk=chunk.filter(([logicalName])=>!/^59A?_/.test(logicalName));for(const [logicalName] of chunk){if(/^59A?_/.test(logicalName))matrices[logicalName]=[];}if(legacyChunk.length){const fallbackVr=await schoolReadBatchRead(UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID,legacyChunk.map(([,range])=>range));assignValueRangesByRange(matrices,legacyChunk,fallbackVr);}}}}catch(admissionError){console.warn('[UEP] 2028 입시DB 조회 실패',admissionError?.message||admissionError);for(const [logicalName] of uep08259AdmissionEntries)if(!Array.isArray(matrices[logicalName]))matrices[logicalName]=[];}";
main=replaceOnce(main,oldLoader,newLoader,'admissions primary/fallback loader');

// 6) One current-version popup only. Legacy popups are source-gated above.
const releaseMarker='/* UEP_08286_RELEASE_NOTES_CANONICAL */';
must(!renderer.includes(releaseMarker),'0.82.86 release notes already present');
renderer+='\n\n'+releaseMarker+`\n(function(){\n  const VERSION='0.82.86',KEY='uep:release-notes:'+VERSION;\n  if(String(APP_VERSION)!==VERSION)return;\n  function show(){\n    try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}\n    if(document.getElementById('uep-release-08286'))return;\n    document.querySelectorAll('.uep-release-overlay,.uep-release-notes-layer,[id^="uepUpdateNotes"]').forEach(el=>el.remove());\n    const o=document.createElement('div');o.id='uep-release-08286';o.className='uep-release-overlay';\n    o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.86 수정사항</h2><ul><li>2028 대학입시 표준 DB를 School Read API 0.81.06 Registry를 통해 우선 조회합니다.</li><li>59 모집단위DB와 59A 전형별모집단위DB를 입시 공통 캐시에 정식 연결했습니다.</li><li>상단 버전 표시가 과거 0.82.81을 기준으로 잡던 오류를 수정해 실제 실행 버전을 기준으로 표시합니다.</li><li>과거 0.82.65 등 이전 버전 팝업이 다시 나타나지 않도록 모든 릴리스 안내를 해당 실행 버전에서만 열도록 정리했습니다.</li><li>새 입시DB 조회 실패 시 기존 52~58 안전원본 fallback은 유지합니다.</li></ul><button type="button">확인</button></div>';\n    const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};\n    o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);\n  }\n  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900);\n})();\n`;

write(rendererPath,renderer);
write(mainPath,main);
write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log(`UEP v0.82.86 candidate patched; historical popup guards added=${gated}`);
