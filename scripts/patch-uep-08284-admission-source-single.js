const fs=require('fs');
const path=require('path');

const root=path.resolve(process.argv[2]||'.');
const mainPath=path.join(root,'electron','main.cjs');
const rendererPath=path.join(root,'gyomuon.js');
const packagePath=path.join(root,'package.json');

function read(p){return fs.readFileSync(p,'utf8');}
function write(p,s){fs.writeFileSync(p,s,'utf8');}
function must(condition,message){if(!condition)throw new Error(message);}

let main=read(mainPath);

// 1) 56A 상담포인트 저장 원본을 전용 2028 입시DB로 단일화한다.
const fnStart=main.indexOf('async function saveAdmissionCounselPoint(payload={}){');
must(fnStart>=0,'saveAdmissionCounselPoint 시작점을 찾지 못했습니다.');
let fnEnd=main.indexOf('\nasync function ',fnStart+10);
must(fnEnd>fnStart,'saveAdmissionCounselPoint 종료점을 찾지 못했습니다.');
const beforeFn=main.slice(fnStart,fnEnd);
const genericCount=(beforeFn.match(/UEP_SPREADSHEET_ID/g)||[]).length;
must(genericCount===3,`56A 기존 일반시트 참조 수가 예상(3)과 다릅니다: ${genericCount}`);
const afterFn=beforeFn.replace(/UEP_SPREADSHEET_ID/g,'UEP_ADMISSIONS_SPREADSHEET_ID');
must((afterFn.match(/UEP_ADMISSIONS_SPREADSHEET_ID/g)||[]).length>=3,'56A 전용 입시DB 참조 전환에 실패했습니다.');
main=main.slice(0,fnStart)+afterFn+main.slice(fnEnd);

// 2) 오래된 기본정보 연결시트 52~58 fallback을 제거한다.
const oldLoader="let vr;try{vr=await schoolReadBatchRead(UEP_ADMISSIONS_SPREADSHEET_ID,chunk.map(([,range])=>range));}catch(primaryError){console.warn('[UEP] 새 입시DB School Read 실패, 기존 52~58 안전원본으로 전환',primaryError?.message||primaryError);vr=await schoolReadBatchRead(UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID,chunk.map(([,range])=>range));}assignValueRangesByRange(matrices,chunk,vr);";
const newLoader="const vr=await schoolReadBatchRead(UEP_ADMISSIONS_SPREADSHEET_ID,chunk.map(([,range])=>range));assignValueRangesByRange(matrices,chunk,vr);";
must(main.includes(oldLoader),'기존 입시 fallback 로더 구조를 찾지 못했습니다.');
main=main.replace(oldLoader,newLoader);

const fallbackRegex=/const UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID = "1bphoIQ11E2qsc3ksOqrXuO7xqS4CFyH8Dagbld7A1hg";\r?\n/;
must(fallbackRegex.test(main),'기존 입시 fallback ID 정의를 찾지 못했습니다.');
main=main.replace(fallbackRegex,'');
must(!main.includes('UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID'),'fallback ID 참조가 남아 있습니다.');
must(!main.includes('기존 52~58 안전원본으로 전환'),'fallback 경고문이 남아 있습니다.');
write(mainPath,main);

// 3) 실제 실행 버전과 package 버전을 함께 올린다.
let renderer=read(rendererPath);
const oldVersion='const APP_VERSION="0.82.83"; /* UEP_08283_RUNTIME_VERSION */';
const newVersion='const APP_VERSION="0.82.84"; /* UEP_08284_RUNTIME_VERSION */';
must(renderer.includes(oldVersion),'0.82.83 런타임 버전 마커를 찾지 못했습니다.');
renderer=renderer.replace(oldVersion,newVersion);
write(rendererPath,renderer);

const pkg=JSON.parse(read(packagePath));
must(pkg.version==='0.82.83',`package.json 기준 버전이 0.82.83이 아닙니다: ${pkg.version}`);
pkg.version='0.82.84';
write(packagePath,JSON.stringify(pkg,null,2)+'\n');

console.log('UEP v0.82.84 patch complete: 56A dedicated DB + old admissions fallback removed + version synchronized');
