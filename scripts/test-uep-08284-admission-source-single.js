const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const main=fs.readFileSync(path.join(root,'electron','main.cjs'),'utf8');
const renderer=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
function ok(v,m){if(!v)throw new Error(m);}

const fnStart=main.indexOf('async function saveAdmissionCounselPoint(payload={}){');
ok(fnStart>=0,'saveAdmissionCounselPoint missing');
const fnEnd=main.indexOf('\nasync function ',fnStart+10);
ok(fnEnd>fnStart,'saveAdmissionCounselPoint end missing');
const fn=main.slice(fnStart,fnEnd);
ok(!/\bUEP_SPREADSHEET_ID\b/.test(fn),'56A save function still uses generic UEP_SPREADSHEET_ID');
ok((fn.match(/UEP_ADMISSIONS_SPREADSHEET_ID/g)||[]).length===3,'56A read/update/append must all use dedicated admissions spreadsheet');
ok(fn.includes("'56A_대학상담포인트DB'!A1:P1200"),'56A read range changed unexpectedly');
ok(fn.includes("'56A_대학상담포인트DB'!A${sheetRow}:P${sheetRow}"),'56A update range changed unexpectedly');
ok(fn.includes("'56A_대학상담포인트DB'!A:P"),'56A append range changed unexpectedly');
ok(fn.includes("new Set(['admin','grade_head','grade_manager'])"),'56A role authorization changed unexpectedly');
ok(fn.includes('liveDataCache.admissionCounselPoints'),'56A live cache update missing');

ok(!main.includes('UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID'),'old admissions fallback spreadsheet ID remains');
ok(!main.includes('기존 52~58 안전원본으로 전환'),'old admissions fallback warning remains');
ok(main.includes('const vr=await schoolReadBatchRead(UEP_ADMISSIONS_SPREADSHEET_ID,chunk.map(([,range])=>range));assignValueRangesByRange(matrices,chunk,vr);'),'dedicated admissions loader not found');

for(const name of ['52_대입기초','53_전형이해','53A_전형세부유형DB','53B_전형유형별대학DB','53C_전형DB점검','54_수능최저DB','55_대학입결DB','56_대학입시마스터','56A_대학상담포인트DB','57_내신산정DB','58_권장과목DB']) ok(main.includes(`['${name}'`)||main.includes(`[\"${name}\"`),`admissions loader entry missing: ${name}`);
for(const alias of ['admissionCounselPoints','universityAdmissions','admissionMinimumRows','admissionResults','admissionGradeCalcs','admissionRecommendations']) ok(main.includes(alias),`admissions cache alias missing: ${alias}`);

const genericRefs=(main.match(/\bUEP_SPREADSHEET_ID\b/g)||[]).length;
ok(genericRefs>20,`unrelated operational UEP_SPREADSHEET_ID paths appear to have been replaced broadly: ${genericRefs}`);
ok(main.includes("'04_학생연락식별정보'"),'student contact operational path missing');
ok(main.includes("'42_급식지도계획'"),'meal duty operational path missing');
ok(main.includes("'43_야자감독계획'"),'night duty operational path missing');

ok(renderer.includes('const APP_VERSION="0.82.84"; /* UEP_08284_RUNTIME_VERSION */'),'runtime version is not 0.82.84');
ok(pkg.version==='0.82.84','package.json version is not 0.82.84');
ok(!renderer.includes('UEP_08283_RUNTIME_VERSION'),'old runtime version marker remains');

console.log('UEP v0.82.84 regression tests passed');
