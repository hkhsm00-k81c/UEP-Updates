const fs=require('fs'),path=require('path');
const root=process.argv[2]; if(!root) throw new Error('app root required');
const g=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const must=(x,m)=>{if(!x)throw new Error(m)};
must(pkg.version==='0.82.81','package version mismatch');
must(g.includes('0.82.81'),'renderer version mismatch');
must(g.includes('const subjectAdmissions=activeAdmissions.filter'),'subject admission filter missing');
must(g.includes("/학생부교과/.test"),'student-record subject category check missing');
must(g.includes('hasSubjectDocument'),'subject document evidence check missing');
must(g.includes('generalMinimumGroups'),'general minimum groups missing');
must(g.includes('fallbackGeneralGroup'),'general minimum fallback missing');
must(g.includes('기타 모집단위 수능최저'),'other minimum disclosure missing');
must(g.includes('uep-uni-course-disclosure'),'course disclosure missing');
must(g.includes("관련·권장과목 '+recommendationGroups.length+'개 보기"),'course collapsed summary missing');
must(!g.includes('/일반.*(인문|자연)|인문.*자연|사범|의예|약학|수의|간호/.test(unit)'),'old special-major core minimum rule remains');
// Production regressions already fixed in prior releases.
for(const n of ['dashboardNightAttendanceRows','afterSchoolProgramGroups','openDashboardTodayUniversity','updateTopSyncStatus']) must(g.includes(n),'regression missing: '+n);
console.log('UEP 0.82.81 university summary regression PASS');
