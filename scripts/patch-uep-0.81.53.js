const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(rendererFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.53";');

// School Read API가 원본 한글 헤더 행을 반환해도 공결 표준 필드로 변환합니다.
const normalizeReturn=`  if(!Array.isArray(data.schoolDeadlines)||!data.schoolDeadlines.length){
    const rows=uep08123FirstArray(data.deadlines,data.workDeadlines,data.work?.deadlines);
    if(rows.length) data.schoolDeadlines=rows;
  }
  return data;`;
const normalizeReturnNew=`  if(!Array.isArray(data.schoolDeadlines)||!data.schoolDeadlines.length){
    const rows=uep08123FirstArray(data.deadlines,data.workDeadlines,data.work?.deadlines);
    if(rows.length) data.schoolDeadlines=rows;
  }
  if(Array.isArray(data.officialAttendance))data.officialAttendance=data.officialAttendance.map((row,index)=>({
    ...row,
    id:String(row.id||row.attendanceId||row['출결ID']||\`official-\${index}\`).trim(),
    studentId:String(row.studentId||row['학생ID']||'').trim(),
    studentNo:String(row.studentNo||row['학번']||'').replace(/\\.0$/,''),
    name:String(row.name||row['성명']||row['학생명']||'').trim(),
    className:String(row.className||row.classNo||row['반']||'').replace(/\\.0$/,''),
    date:uepComparableDate(row.date||row.day||row.rawDate||row['일자']||row['출결일자']||row['출결일']),
    type:String(row.type||[row['출결구분'],row['세부구분']].filter(Boolean).join(' · ')||'공결'),
    period:String(row.period||row['인정범위']||[row['시작교시'],row['종료교시']].filter(Boolean).join('~')||'하루 전체'),
    reason:String(row.reason||[row['사유'],row['장소']].filter(Boolean).join(' · ')),
    evidence:String(row.evidence||row['증빙상태']||''),
    sourceTab:String(row.sourceTab||row['원본탭']||'30_공결기록')
  }));
  return data;`;
assert(g.includes(normalizeReturn),'readonly normalization return anchor not found');
g=g.replace(normalizeReturn,normalizeReturnNew);

// 구형 캡처 리스너가 교육과정 학생 클릭을 하단 렌더링으로 되돌리지 않게 합니다.
const captureOld=`        try{ recordStudentId=id; }catch(_e){}
        renderRecordsSafe();
        return;`;
const captureNew=`        try{ recordStudentId=id; }catch(_e){}
        let curriculum=false;try{curriculum=recordMode==='curriculum';}catch(_e){}
        if(curriculum&&typeof openCurriculumStudentSidePanel==='function')openCurriculumStudentSidePanel(id);else renderRecordsSafe();
        return;`;
assert(g.includes(captureOld),'legacy capture student handler not found');
g=g.replace(captureOld,captureNew);

for(const marker of ['const APP_VERSION = "0.81.53";',"row['일자']||row['출결일자']",'function openCurriculumStudentSidePanel(',"curriculum&&typeof openCurriculumStudentSidePanel==='function'",'최근 학기말 평균','function upsertNoticeCache('])assert(g.includes(marker),'0.81.53 marker missing: '+marker);
fs.writeFileSync(rendererFile,g,'utf8');
console.log('UEP 0.81.53 school-read attendance normalization and curriculum capture repair applied');
