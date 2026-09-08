const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root)throw new Error('app root required');
const main=path.join(root,'electron','main.cjs');
const data=path.join(root,'electron','google-data.cjs');
const gy=path.join(root,'gyomuon.js');
for(const f of [main,data,gy])if(!fs.existsSync(f))throw new Error(`missing ${f}`);
let text=fs.readFileSync(main,'utf8');
const start=text.indexOf('async function fetchOperationalData({credentials=null}={}){');
const end=text.indexOf('\nasync function fetchLiveData',start);
if(start<0||end<0)throw new Error('fetchOperationalData boundaries not found');
const replacement=`async function fetchOperationalData({credentials=null}={}){
  if(!liveDataCache)return {ok:false,requiresFullSync:true,reason:'전체 캐시가 아직 준비되지 않았습니다.'};
  const auth=await getReadonlySheetsAuth(credentials),token=auth.token;
  const operationalEntries=UEP_OPERATIONAL_RANGE_NAMES.map(name=>[name,SHEET_RANGES[name]]);
  const afterEntries=['11_방과후학교','12_차시일정','13_출석부'].map(name=>[name,SHEET_RANGES[name]]);
  const [result,nightResult,afterResult]=await Promise.all([
    readSheetBatch(token,UEP_SPREADSHEET_ID,operationalEntries.map(([,range])=>range)),
    readSheetBatch(token,UEP_PROCESSING_SPREADSHEET_ID,["'30_야자출결_정규화'!A1:U70000"]),
    readSheetBatch(token,UEP_SPREADSHEET_ID,afterEntries.map(([,range])=>range))
  ]);
  const matrices={};
  assignValueRangesByRange(matrices,operationalEntries,result);
  assignValueRangesByRange(matrices,afterEntries,afterResult);
  const cachedStudents=Array.isArray(liveDataCache?.students)?liveDataCache.students:[];
  matrices['02_학생마스터']=[
    ['02_학생마스터'],['UEP operational synthetic student master'],
    ['학생ID','학년도','학번','성명','사용성명','학년','반','번호','검색표시명','출신중학교','학적상태','학적기준일','학적변동사유','입학일','활성여부','수정일시','수정자','비고'],
    ...cachedStudents.map(student=>[
      String(student?.id||student?.studentId||''),String(student?.schoolYear||student?.year||'2026'),String(student?.studentNo||student?.number||''),
      String(student?.name||''),String(student?.name||''),String(student?.grade||student?.gradeNo||'1'),String(student?.className||student?.classNo||''),
      String(student?.studentNumber||student?.numberInClass||''),'','',String(student?.status||student?.enrollmentStatus||'재학'),'','','',String(student?.active||student?.activeYn||'Y'),'','',''
    ])
  ];
  matrices['30_야자출결_정규화']=nightResult?.[0]?.values||[];
  const partial=parseGoogleSheetData(matrices);
  const existingPrograms=Array.isArray(liveDataCache?.programs)?liveDataCache.programs:[];
  const preservedPrograms=existingPrograms.filter(program=>program?.kind!=='after');
  const freshAfterPrograms=(Array.isArray(partial?.programs)?partial.programs:[]).filter(program=>program?.kind==='after');
  const programs=[...preservedPrograms,...freshAfterPrograms];
  const freshNight=Array.isArray(partial?.nightAttendance)?partial.nightAttendance:[];
  let nightAttendance=freshNight;
  if(!freshAfterPrograms.length){
    const oldProgramRows=Array.isArray(liveDataCache?.nightAttendance)?liveDataCache.nightAttendance.filter(row=>row?.recognizedByProgram===true||row?.linkedFromAfterSchool===true):[];
    const key=row=>[String(row?.date||'').slice(0,10),String(row?.time||row?.period||''),String(row?.studentNo||row?.studentId||'')].join('|');
    const map=new Map(freshNight.map(row=>[key(row),row]));oldProgramRows.forEach(row=>map.set(key(row),row));nightAttendance=[...map.values()];
  }
  const patch={
    officialAttendance:partial.officialAttendance||[],lateAttendance:partial.lateAttendance||[],notices:partial.notices||[],noticeReceipts:partial.noticeReceipts||[],
    lunchDuties:partial.lunchDuties||[],nightSupervisors:partial.nightSupervisors||[],programs,afterSchoolAttendance:partial.afterSchoolAttendance||[],nightAttendance
  };
  const operationalSyncedAt=new Date().toISOString();
  liveDataCache={...liveDataCache,...patch,operationalSyncedAt};liveDataFetchedAt=Date.now();
  return {ok:true,operationalSyncedAt,syncedAt:operationalSyncedAt,patch};
}`;
text=text.slice(0,start)+replacement+text.slice(end);
text=text.replaceAll('0.82.76','0.82.77');
fs.writeFileSync(main,text,'utf8');
let gd=fs.readFileSync(data,'utf8');
const rx=/    const matchedSlots=explicitSlots\.length\r?\n\s*\? nightSlotTemplates\.filter\(slot=>explicitSlots\.includes\(slot\.label\)\)\r?\n\s*: \(Number\.isFinite\(start\)&&Number\.isFinite\(end\)\?nightSlotTemplates\.filter\(slot=>start<slot\.end&&end>slot\.start\):\[\]\);/;
const neu=`    const eighthPeriod=/8교시/.test(String(program.time||""));\n    const matchedSlots=eighthPeriod\n      ? nightSlotTemplates.filter(slot=>slot.label==="오후자습")\n      : (explicitSlots.length\n        ? nightSlotTemplates.filter(slot=>explicitSlots.includes(slot.label))\n        : (Number.isFinite(start)&&Number.isFinite(end)?nightSlotTemplates.filter(slot=>start<slot.end&&end>slot.start):[]));`;
if(!rx.test(gd)){
 const p=gd.indexOf('const matchedSlots=');
 throw new Error(`night matchedSlots anchor not found; index=${p}; sample=${p>=0?gd.slice(p,p+350):'none'}`);
}
gd=gd.replace(rx,neu).replaceAll('0.82.76','0.82.77');
fs.writeFileSync(data,gd,'utf8');
for(const f of [gy,path.join(root,'package.json'),path.join(root,'package-lock.json')]){
 if(fs.existsSync(f)){let c=fs.readFileSync(f,'utf8');c=c.replaceAll('0.82.76','0.82.77');fs.writeFileSync(f,c,'utf8');}
}
console.log('UEP 0.82.77 after-school roster patch applied');
