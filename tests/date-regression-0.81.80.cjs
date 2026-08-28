"use strict";

const assert=require("node:assert/strict");
const path=require("node:path");
const appRoot=path.resolve(process.argv[2]||path.join(__dirname,"../candidate-0.81.80/resources/app"));
const {parseGoogleSheetData}=require(path.join(appRoot,"electron/google-data.cjs"));

const table=(headers,...rows)=>[["설명"],[],headers,...rows];
const matrices={
  "02_학생마스터":table(
    ["학생ID","학번","성명","학년","반","번호","활성여부"],
    ["STU-1","1101","테스트학생","1","1","1","Y"]
  ),
  "09_공통활동마스터":table(
    ["활동ID","활동명","활동영역","운영시작일","운영종료일","보고서사용"],
    ["J015","진로활동 챌린지데이","진로활동","2026-06-11","2026-06-11","Y"],
    ["A003","학생 주도 학교 주변 환경 개선","자율활동","2026-04-01","2026-04-01","Y"]
  ),
  "11_방과후학교":table(
    ["방과후ID","학년도","운영기간구분","프로그램명","방과후유형","운영시작일","운영종료일","시작시간","종료시간","야자연계여부","운영상태"],
    ["AF2026-SUM-04","2026","여름방학","공통국어 여름캠프 고전문학과 독서","방학 방과후","2026-07-22","2026-07-31","08:40","10:30","N","운영완료"]
  ),
  "12_차시일정":table(
    ["차시ID","프로그램ID","프로그램유형","실제수업일","예정일","시작시각","종료시각","운영상태"],
    ["S-1","AF2026-SUM-04","방과후학교","2026-07-22","2026-07-22","08:40","09:30","완료"],
    ["S-2","AF2026-SUM-04","방과후학교","2026-07-22","2026-07-22","09:40","10:30","완료"]
  ),
  "13_출석부":table(["출석ID","방과후ID","차시ID","학생ID","학번","성명","출결결과"]),
  "02_학사외출_일자별":table(
    ["외출ID","외출일자","학생ID","학번","성명","신청구분","외출구분","운영형태","외출시간","복귀예정시간"],
    ["OUT-FRI","2026-08-28","STU-1","1101","테스트학생","정기외출","귀가","귀가형","17:00",""],
    ["OUT-SUN","2026-08-30","STU-1","1101","테스트학생","정기외출","늦은 입소","입소형","","22:30"]
  ),
  "30_공식출결기록":table(
    ["출결ID","학생ID","학번","성명","반","일자","출결구분","세부구분"],
    ["OFF-1","STU-1","1101","테스트학생","1","2026-08-27","출석인정","결석"]
  )
};

const data=parseGoogleSheetData(matrices);
const common=Object.fromEntries(data.programs.filter(x=>x.source==="09_공통활동마스터").map(x=>[x.title,x.date]));
assert.equal(common["진로활동 챌린지데이"],"2026-06-11");
assert.equal(common["학생 주도 학교 주변 환경 개선"],"2026-04-01");

const master=data.programs.find(x=>x.id==="after-master-AF2026-SUM-04");
assert.equal(master.date,"2026-07-22");
assert.equal(master.endDate,"2026-07-31");
assert.equal(master.time,"08:40~10:30");

const sessions=data.programs.filter(x=>x.programId==="AF2026-SUM-04"&&!x.isCourseMaster);
assert.deepEqual(sessions.map(x=>[x.date,x.time]),[
  ["2026-07-22","08:40~09:30"],
  ["2026-07-22","09:40~10:30"]
]);
assert.ok(sessions.every(x=>x.affectsAttendance===false));
assert.equal(data.afterSchoolAttendance.filter(x=>x.linkedFromAfterSchool).length,0);

assert.deepEqual(data.dormOutings.map(x=>x.date),["2026-08-28","2026-08-30"]);
assert.equal(data.officialAttendance[0].date,"2026-08-27");

console.log("A-D date regression fixtures passed");
