const path=require('path');
const root=process.argv[2];
if(!root)throw new Error('app root required');
const {parseGoogleSheetData}=require(path.join(root,'electron','google-data.cjs'));
const table=(name,desc,header,rows)=>[[name],[desc],header,...rows];
const students=Array.from({length:12},(_,i)=>{const no=String(1101+i);return [`STU-${i+1}`,'2026',no,`학생${i+1}`,`학생${i+1}`,'1','1',String(i+1),`1-1 ${i+1}번 학생${i+1}`,'','재학','','','','Y','','',''];});
const matrices={
 '02_학생마스터':table('02_학생마스터','학생',['학생ID','학년도','학번','성명','사용성명','학년','반','번호','검색표시명','출신중학교','학적상태','학적기준일','학적변동사유','입학일','활성여부','수정일시','수정자','비고'],students),
 '11_방과후학교':table('11_방과후학교','방과후',['방과후ID','학년도','운영기간구분','프로그램명','교과','담당부서','방과후유형','담당교사','운영시작일','운영종료일','요일','시작시간','종료시간','장소','대상학년','야자연계여부','출석관리방식','운영상태','수정일시','수정자','비고','원본ID','학생안내'],[['AF2026-2-02','2026','2학기','고등 기초 영문법','영어','방과후교육부','일반 방과후','이태연','2026-09-07','2026-11-23','월,목','8교시','','105','1','Y','출석부','운영예정','2026-09-03','UEP연결','','2학기-2','']]),
 '12_차시일정':table('12_차시일정','차시',['차시ID','강좌ID','차시번호','운영일자','요일','시작시각','종료시각','장소','담당교사','운영상태','원차시ID','보강차시ID','야자영향타임','출석부생성여부','수정일시','수정자','비고','예정일','실제수업일','변경유형','원예정일','변경사유','출석확정','프로그램유형'],[['SES-AF2026-2-02-01','AF2026-2-02','1','2026-09-07','월','8교시','','1-5','이태연','예정','','','야자1','Y','2026-09-03','UEP연결','','2026-09-07','','정상','','','N','방과후학교']]),
 '13_출석부':table('13_출석부','출석부',['출석부ID','프로그램ID','학생ID','학번','성명','학년','반','번호','검색표시명','신청일','참여상태','시작일','종료일','변경사유','수정일시','수정자','비고','차시ID','출석상태','출석시각','확인방식','보고서제출상태','보고서제출일','프로그램유형'],students.map((s,i)=>[`REG-AF2026-2-02-${s[2]}`,'AF2026-2-02',s[0],s[2],s[3],'1','1',String(i+1),s[8],'','참여','2026-09-07','2026-11-23','','2026-09-03','UEP연결','2026학년도 2학기 1학년 방과후 신청현황','','','','신청현황','','','방과후학교'])),
 '30_야자출결_정규화':table('30_야자출결_정규화','야자',['기록ID','학생ID','학번','성명','운영일','요일','시간대','입력경로','제출일시','출결상태','최종여부','매칭상태'],[])
};
const data=parseGoogleSheetData(matrices);
const session=(data.programs||[]).find(p=>p.sessionId==='SES-AF2026-2-02-01');
if(!session)throw new Error('session program missing');
if((session.students||[]).length!==12)throw new Error(`program-level roster fallback expected 12 got ${(session.students||[]).length}`);
if(Number(session.attendedCount)!==12)throw new Error(`attendedCount expected 12 got ${session.attendedCount}`);
const afternoon=(data.nightAttendance||[]).filter(r=>r.date==='2026-09-07'&&r.time==='오후자습'&&(r.recognizedByProgram||r.linkedFromAfterSchool));
if(afternoon.length!==12)throw new Error(`8교시 afternoon recognition expected 12 got ${afternoon.length}`);
const night1=(data.nightAttendance||[]).filter(r=>r.date==='2026-09-07'&&r.time==='야자1'&&(r.recognizedByProgram||r.linkedFromAfterSchool));
if(night1.length!==0)throw new Error(`8교시 incorrectly recognized as 야자1: ${night1.length}`);
console.log('PASS: 13 roster fallback 12 / attended 12 / 8교시→오후자습 12');
