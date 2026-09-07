const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root) throw new Error('app root argument required');
const mainPath = path.join(root, 'electron', 'main.cjs');
if (!fs.existsSync(mainPath)) throw new Error('main.cjs not found');

let text = fs.readFileSync(mainPath, 'utf8');
const startNeedle = 'async function fetchOperationalData({credentials=null}={}){';
const start = text.indexOf(startNeedle);
const end = text.indexOf('\nasync function fetchLiveData', start);
if (start < 0 || end < 0) throw new Error('fetchOperationalData boundaries not found');

const replacement = `async function fetchOperationalData({credentials=null}={}){
  if(!liveDataCache)return {ok:false,requiresFullSync:true,reason:'전체 캐시가 아직 준비되지 않았습니다.'};
  const auth=await getReadonlySheetsAuth(credentials),token=auth.token;
  const operationalEntries=UEP_OPERATIONAL_RANGE_NAMES.map(name=>[name,SHEET_RANGES[name]]);
  const [result,nightResult]=await Promise.all([
    readSheetBatch(token,UEP_SPREADSHEET_ID,operationalEntries.map(([,range])=>range)),
    // School Read API는 행번호가 있는 bounded A1만 허용한다. A:U 같은 열린 범위는 INVALID_RANGE가 된다.
    readSheetBatch(token,UEP_PROCESSING_SPREADSHEET_ID,["'30_야자출결_정규화'!A1:U70000"])
  ]);
  const matrices={};assignValueRangesByRange(matrices,operationalEntries,result);
  // 전체 학생마스터를 다시 읽지 않고 현재 캐시 학생정보를 파서용 02_학생마스터로 재구성한다.
  const cachedStudents=Array.isArray(liveDataCache?.students)?liveDataCache.students:[];
  matrices['02_학생마스터']=[
    ['02_학생마스터'],
    ['UEP operational synthetic student master'],
    ['학생ID','학년도','학번','성명','사용성명','학년','반','번호','검색표시명','출신중학교','학적상태','학적기준일','학적변동사유','입학일','활성여부','수정일시','수정자','비고'],
    ...cachedStudents.map((student)=>[
      String(student?.id||student?.studentId||''),
      String(student?.schoolYear||student?.year||'2026'),
      String(student?.studentNo||student?.number||''),
      String(student?.name||''),
      String(student?.name||''),
      String(student?.grade||student?.gradeNo||'1'),
      String(student?.className||student?.classNo||''),
      String(student?.studentNumber||student?.numberInClass||''),
      '', '',
      String(student?.status||student?.enrollmentStatus||'재학'),
      '', '', '',
      String(student?.active||student?.activeYn||'Y'),
      '', '', ''
    ])
  ];
  matrices['30_야자출결_정규화']=nightResult?.[0]?.values||[];
  const partial=parseGoogleSheetData(matrices);

  // 운영 갱신에서는 30의 최신 NFC/교사확인 행만 교체하고,
  // 전체 동기화에서 11_방과후학교→12_차시일정→13_출석부로 만든 프로그램 인정 행은 보존한다.
  // 같은 학생·날짜·시간대가 겹치면 전체 파서와 동일하게 프로그램 인정 행이 우선한다.
  const freshRawNight=Array.isArray(partial.nightAttendance)?partial.nightAttendance.filter(row=>!row?.recognizedByProgram&&!row?.linkedFromAfterSchool):[];
  const retainedProgramNight=Array.isArray(liveDataCache?.nightAttendance)?liveDataCache.nightAttendance.filter(row=>row?.recognizedByProgram===true||row?.linkedFromAfterSchool===true):[];
  const nightKey=(row)=>[String(row?.date||'').slice(0,10),String(row?.time||row?.period||''),String(row?.studentNo||row?.studentId||'')].join('|');
  const mergedNightMap=new Map();
  freshRawNight.forEach(row=>mergedNightMap.set(nightKey(row),row));
  retainedProgramNight.forEach(row=>mergedNightMap.set(nightKey(row),row));
  const mergedNightAttendance=[...mergedNightMap.values()];

  const patch={
    officialAttendance:partial.officialAttendance||[],
    lateAttendance:partial.lateAttendance||[],
    notices:partial.notices||[],
    noticeReceipts:partial.noticeReceipts||[],
    lunchDuties:partial.lunchDuties||[],
    nightSupervisors:partial.nightSupervisors||[],
    nightAttendance:mergedNightAttendance
  };
  const operationalSyncedAt=new Date().toISOString();
  liveDataCache={...liveDataCache,...patch,operationalSyncedAt};liveDataFetchedAt=Date.now();
  return {ok:true,operationalSyncedAt,syncedAt:operationalSyncedAt,patch};
}
`;

text = text.slice(0, start) + replacement + text.slice(end);
text = text.replaceAll('0.82.71', '0.82.72');
fs.writeFileSync(mainPath, text, 'utf8');

for (const name of ['gyomuon.js', 'package.json', 'package-lock.json']) {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) continue;
  const c = fs.readFileSync(p, 'utf8').replaceAll('0.82.71', '0.82.72');
  fs.writeFileSync(p, c, 'utf8');
}
console.log('UEP 0.82.72 patch applied');
