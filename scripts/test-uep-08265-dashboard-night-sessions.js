const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=process.argv[2]||'app';
const gp=path.join(root,'gyomuon.js');
const g=fs.readFileSync(gp,'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
assert(/const\s+APP_VERSION\s*=\s*["']0\.82\.65["'];/.test(g),'version not 0.82.65');
assert(g.includes('UEP_08265_DASHBOARD_NIGHT_ACTUAL_SESSIONS'),'release marker missing');
const start=g.indexOf('function dashboardAfterProgramsForDay(dayKey){');
const end=g.indexOf('function dashboardProgramNightSlot(program){',start);
assert(start>=0&&end>start,'dashboard function block missing');
const fnSource=g.slice(start,end);
assert(fnSource.includes('afterSchoolProgramGroups()'),'dashboard does not use canonical after-school groups');
assert(fnSource.includes('program.isCourseMaster'),'course-master guard missing');
assert(!fnSource.includes('(readonlyCache?.programs||[])'),'dashboard still reads raw program cache directly');

const fixtures=[];
const add=(date,title,course,extra={})=>fixtures.push({kind:'after',date,title,actualTitle:title,courseId:course,id:`after-session-${course}-${date}-${title}`,sessionId:`${course}-${date}-${title}`,time:'17:00~18:00',affectsAttendance:true,students:[{studentId:'S1'}],...extra});
// 월/목 세트: 실제 강좌 3개. 월요일에는 과거 문제를 재현하는 마스터 3개도 함께 둔다.
['국어문학','영문법','독서심화'].forEach((t,i)=>{
  fixtures.push({kind:'after',date:'2026-09-07',title:t,actualTitle:t,courseId:`M${i}`,id:`after-master-M${i}`,isCourseMaster:true,time:'17:00~18:00',affectsAttendance:true,students:[{studentId:'S1'}]});
  add('2026-09-07',t,`M${i}`); add('2026-09-10',t,`M${i}`);
});
// 화/금 세트: 실제 강좌 2개 + 화요일 마스터 2개.
['수학심화','영어독해'].forEach((t,i)=>{
  fixtures.push({kind:'after',date:'2026-09-08',title:t,actualTitle:t,courseId:`T${i}`,id:`after-master-T${i}`,isCourseMaster:true,time:'17:00~18:00',affectsAttendance:true,students:[{studentId:'S2'}]});
  add('2026-09-08',t,`T${i}`); add('2026-09-11',t,`T${i}`);
});
// 동일 sessionId가 중복 유입되어도 1개만 유지.
fixtures.push({...fixtures.find(x=>x.sessionId==='M0-2026-09-07-국어문학')});
// 야간심화도 마스터+실제차시가 겹칠 때 실제차시만.
fixtures.push({kind:'after',date:'2026-09-07',title:'야간심화수학',actualTitle:'야간심화수학',courseId:'N1',id:'after-master-N1',isCourseMaster:true,time:'19:20~20:10',affectsAttendance:true,afterType:'야간심화',students:[{studentId:'S3'}]});
fixtures.push({kind:'after',date:'2026-09-07',title:'야간심화수학',actualTitle:'야간심화수학',courseId:'N1',id:'after-session-N1-1',sessionId:'N1-1',time:'19:20~20:10',affectsAttendance:true,afterType:'야간심화',students:[{studentId:'S3'}]});

const context={
  afterSchoolProgramGroups:()=>fixtures,
  programHasNightStudyImpact:p=>Boolean(p.affectsAttendance),
  dashboardProgramNightSlot:p=>/야간심화/.test(`${p.afterType||''} ${p.title||''}`)?'야자1':'오후자습',
  console
};
vm.createContext(context);
vm.runInContext(fnSource+'\nthis.__fn=dashboardAfterProgramsForDay;',context);
const fn=context.__fn;
const mon=fn('2026-09-07'),tue=fn('2026-09-08'),thu=fn('2026-09-10'),fri=fn('2026-09-11');
const afternoon=a=>a.filter(p=>!(/야간심화/.test(`${p.afterType||''} ${p.title||''}`)));
assert(afternoon(mon).length===3,`Monday expected 3 afterschool sessions, got ${afternoon(mon).length}`);
assert(afternoon(tue).length===2,`Tuesday expected 2 afterschool sessions, got ${afternoon(tue).length}`);
assert(afternoon(thu).length===3,`Thursday expected 3 afterschool sessions, got ${afternoon(thu).length}`);
assert(afternoon(fri).length===2,`Friday expected 2 afterschool sessions, got ${afternoon(fri).length}`);
assert(mon.filter(p=>/야간심화/.test(`${p.afterType||''} ${p.title||''}`)).length===1,'night-intensive master/session duplicate remains');
assert(mon.every(p=>!p.isCourseMaster)&&tue.every(p=>!p.isCourseMaster),'course master leaked to dashboard');
console.log('UEP 0.82.65 dashboard night session regression tests passed');
