'use strict';
const assert=require('node:assert/strict');
const fs=require('fs');
const {parseGoogleSheetData}=require('../work/resources/app/electron/google-data.cjs');
const serial=d=>Date.parse(d+'T00:00:00Z')/86400000+25569;
const matrix=(h,r)=>[h,...r];
const sheets={
  '02_학생마스터':matrix(['학생ID','학번','학년','반','번호','성명','활성여부'],[['S1','1101','1','1','1','테스트','Y']]),
  '02_학사외출_일자별':matrix(['외출ID','학생ID','학번','성명','반','외출일자','외출시간','복귀예정시간','구분'],[['DOUT-1','S1','1101','테스트','1',serial('2026-08-27'),17/24,18/24,'외출']]),
  '11_방과후학교':matrix(['방과후ID','프로그램명','운영기간구분','시작시간','종료시간','야자연계여부','운영상태'],[['AF-A','여름방학 A','여름방학',520/1440,570/1440,'N','운영완료'],['AF-B','여름방학 B','여름방학',580/1440,630/1440,'N','운영완료']]),
  '12_차시일정':matrix(['차시ID','프로그램ID','프로그램유형','실제수업일','예정일','시작시각','종료시각','운영상태'],[['SES-A','AF-A','방과후학교',serial('2026-07-21'),serial('2026-07-21'),520/1440,570/1440,'운영'],['SES-B','AF-B','방과후학교',serial('2026-07-22'),serial('2026-07-22'),580/1440,630/1440,'운영']]),
  '13_출석부':matrix(['출석부ID','차시ID','프로그램ID','학생ID','학번','성명','참여상태'],[['R1','SES-A','AF-A','S1','1101','테스트','참여'],['R2','SES-B','AF-B','S1','1101','테스트','참여']])
};
const out=parseGoogleSheetData(sheets),sessions=out.programs.filter(p=>p.kind==='after'&&!p.isCourseMaster),byId=new Map(sessions.map(p=>[p.sessionId,p]));
assert.equal(out.dormOutings[0].date,'2026-08-27','A outing date');
assert.equal(byId.get('SES-A').date,'2026-07-21','B date 7/21');
assert.equal(byId.get('SES-B').date,'2026-07-22','B date 7/22');
assert.equal(byId.get('SES-A').time,'08:40~09:30','B time A');
assert.equal(byId.get('SES-B').time,'09:40~10:30','B time B');
assert.equal(sessions.filter(p=>p.affectsAttendance).length,0,'C linked program count');
assert.equal(out.nightAttendance.filter(r=>r.linkedFromAfterSchool).length,0,'C night rows');
const pkg=JSON.parse(fs.readFileSync('work/resources/app/package.json','utf8')),ui=fs.readFileSync('work/resources/app/gyomuon.js','utf8');
assert.equal(pkg.version,'0.81.77','D package');assert.match(ui,/const APP_VERSION = "0\.81\.77";/,'D UI');
assert.doesNotMatch(ui,/UEP_08175_PROGRAM_DATETIME_FIX|UEP_08176_AFTER_SCHOOL_LOCAL_FIX/);
console.log('UEP 0.81.77 regression A-D: PASS');
