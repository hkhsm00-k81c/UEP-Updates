const assert=require('assert');
const {makeNeisRecordbookRecords08171}=require('./uep-0.81.71-recordbook-core.js');
const E='';
const rows=[
  [E,E,E,E,E,E,E,'학교생활기록부 세부능력 및 특기사항'],
  [E,'1학년 1반'],
  [E,'과 목','학 년','학기','번 호','성  명',E,'세부능력 및 특기사항'],
  [E,'공통국어1',1,1,1,'가학생',E,'국어 첫 학생의 충분히 긴 세부능력 및 특기사항 문장입니다.'],
  [E,E,E,E,2,'나학생',E,'페이지 끝에서 문장이 이어지는 앞부분 세부능력 및 특기사항'],
  [E,E,E,E,E,E,E,'학교생활기록부 세부능력 및 특기사항'],
  [E,'1학년 1반'],
  [E,'과 목','학 년','학기','번 호','성  명',E,'세부능력 및 특기사항'],
  [E,'공통국어1',1,1,2,'나학생',E,'다음 페이지의 뒷부분입니다.'],
  [E,'1학년 1반'],
  [E,'과 목','학 년','학기','번 호','성  명',E,'세부능력 및 특기사항'],
  [E,'공통수학1',1,1,1,'가학생',E,'수학 과목에서 문제 해결 과정을 논리적으로 설명하는 충분히 긴 문장입니다.'],
  [E,'조회된 데이터가 없습니다.']
];
const students=[
  {id:'S1101',studentNo:'1101',grade:'1',classNo:'1',number:'1',name:'가학생'},
  {id:'S1102',studentNo:'1102',grade:'1',classNo:'1',number:'2',name:'나학생'}
];
const forbidden=[['기업·브랜드·플랫폼',/(다음카카오|구글)/gi,true]];
const records=makeNeisRecordbookRecords08171({sheets:[{name:'sheet1',rows}],students,defaultGrade:'1',forbidden});
assert.equal(records.length,3,'page-boundary continuation must merge instead of creating a fourth record');
assert.deepEqual([...new Set(records.map(r=>r.subject))],['공통국어1','공통수학1'],'subject transition must be detected from repeated-page first rows');
const merged=records.find(r=>r.studentNo==='1102'&&r.subject==='공통국어1');
assert(merged,'merged Korean record missing');
assert(merged.text.includes('앞부분')&&merged.text.includes('뒷부분'),'split text was not joined');
assert(merged.lastRow>merged.row,'source row span was not retained');
assert(records.every(r=>r.masterMatched),'all synthetic students should match student master');
assert(records.every(r=>/^110[12]$/.test(r.studentNo)),'canonical master student numbers not retained');
assert(!records.some(r=>r.subject.includes('학교생활기록부')||r.text.includes('조회된 데이터')),'metadata leaked into records');
assert(!records.some(r=>r.issues.some(i=>(i.hits||[]).includes('다음'))),'ordinary word 다음 must not be a standalone hit');
console.log('UEP 0.81.71 recordbook core regression PASS',records.map(r=>({studentNo:r.studentNo,subject:r.subject,row:r.row,lastRow:r.lastRow})));
