const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const g=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const d=fs.readFileSync(path.join(root,'electron','google-data.cjs'),'utf8');
const p=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.66["'];/.test(g),'renderer version is not 0.82.66');
must(p.version==='0.82.66','package version is not 0.82.66');
must(g.includes('UEP_08266_HISTORICAL_NIGHT_ADVANCED_SESSIONS'),'0.82.66 marker missing');
must(d.includes('const supportedAfterSession=programType==="방과후학교"||/야간심화/.test(programType)||/야간심화/.test(parentType);'),'supported session rule missing');
must(!d.includes('return programType==="방과후학교" && Boolean(effectiveDate) && session.__date===effectiveDate;'),'old strict 방과후-only filter remains');
must(g.includes('function dashboardAfterProgramsForDay(dayKey)')&&g.includes('afterSchoolProgramGroups()'),'canonical weekly night path missing');

const supported=(programType,parentType,effectiveDate,rowDate)=>{
  const ok=programType==='방과후학교'||/야간심화/.test(programType)||/야간심화/.test(parentType);
  return ok&&Boolean(effectiveDate)&&rowDate===effectiveDate;
};
must(supported('방과후학교','2학기 방과후','2026-09-07','2026-09-07'),'current after-school session regressed');
must(supported('야간심화','야간심화 수학','2026-06-15','2026-06-15'),'explicit historical night-advanced session rejected');
must(supported('','야간심화 영어 · 고등 기초 영문법','2026-06-16','2026-06-16'),'blank legacy type with night-advanced parent rejected');
must(!supported('선택활동','진로탐구','2026-06-15','2026-06-15'),'unrelated program incorrectly accepted');
must(!supported('야간심화','야간심화 수학','2026-06-15','2026-06-16'),'different date incorrectly accepted');
must(!supported('야간심화','야간심화 수학','',''),'missing effective date incorrectly accepted');

console.log('UEP 0.82.66 historical night advanced regression tests passed');
