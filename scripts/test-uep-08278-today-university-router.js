const fs=require('fs'),path=require('path'),vm=require('vm');
const root=process.argv[2];if(!root)throw new Error('app root required');
const gp=path.join(root,'gyomuon.js'),mp=path.join(root,'electron','main.cjs'),dp=path.join(root,'electron','google-data.cjs'),pp=path.join(root,'package.json');
const g=fs.readFileSync(gp,'utf8'),m=fs.readFileSync(mp,'utf8'),d=fs.readFileSync(dp,'utf8');
const must=(x,msg)=>{if(!x)throw new Error(msg)};

must(g.includes("$$('[data-dashboard-admission]').forEach"),'native multi-card admission binding missing');
must(g.includes("if(key==='university')return openDashboardTodayUniversity();"),'Today University card not routed to named native router');
must(g.includes('function openDashboardTodayUniversity()'),'named Today University router missing');
must(g.includes('function openDashboardUniversityDetailRich('),'rich university renderer not preserved');
must(g.includes('function openDashboardUniversityDetailFallback('),'university render error boundary missing');
must(g.includes('try{return openDashboardUniversityDetailRich(university);}catch(error)'),'rich renderer is not protected by error boundary');
must(!g.includes("document.addEventListener('click',e=>{\n    const btn=e.target&&e.target.closest?e.target.closest('[data-dashboard-admission]'):null;"),'old document-level admission click listener still present');

// Behavioral route test: extract only the named router and execute it with stubs.
const s=g.indexOf('async function openDashboardTodayUniversity()');
const e=g.indexOf('\nfunction dashboardStudentStatusCompactMarkup',s);
must(s>=0&&e>s,'router extraction boundaries missing');
let source=g.slice(s,e);
const richStart=source.indexOf('function openDashboardUniversityDetailFallback');
const routerStart=source.indexOf('async function openDashboardTodayUniversity()');
must(routerStart>=0,'router source missing');
source=source.slice(routerStart);
// Keep only named router body.
let depth=0,startBrace=source.indexOf('{'),end=-1,quote=null,esc=false;
for(let i=startBrace;i<source.length;i++){const c=source[i];if(quote){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===quote)quote=null;continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0){end=i+1;break;}}
must(end>0,'router body parse failed');
const routerCode=source.slice(0,end)+';globalThis.__router=openDashboardTodayUniversity;';
const calls=[];
const university={'대학명':'테스트대학교'};
const ctx={window:{},dashboardAdmissionTodayUniversity:()=>university,openDashboardUniversityDetail:u=>{calls.push(['detail',u]);return 'opened';},openDashboardAdmissionDialog:(a,b)=>calls.push(['dialog',a,b]),uep08250PrioritizeAdmission:async()=>true,globalThis:null};ctx.globalThis=ctx;
vm.createContext(ctx);vm.runInContext(routerCode,ctx);Promise.resolve(ctx.__router()).then(result=>{must(result==='opened','router did not return university detail result');must(calls.length===1&&calls[0][0]==='detail'&&calls[0][1]===university,'router did not open current university directly');
  // Preserve v0.82.77 attendance/program fixes and v0.82.76 university features.
  for(const needle of ["afterEntries=['11_방과후학교','12_차시일정','13_출석부']",'afterSchoolAttendance:partial.afterSchoolAttendance||[]'])must(m.includes(needle),'v0.82.77 operational regression: '+needle);
  for(const needle of ['const participantRows =','sessionSpecific.length ? sessionSpecific : (rosterByProgram.get(normalizedProgramId) || [])','const eighthPeriod=/8교시/','slot.label==="오후자습"'])must(d.includes(needle),'v0.82.77 parser regression: '+needle);
  must(g.includes('uep08261AdmissionCardClass'),'v0.82.76/77 admission card features missing');
  must(g.includes('const achievementRaw=calc?'),'v0.82.76 achievement TDZ fix missing');
  const calcUse=g.indexOf('const calcHtml=',g.indexOf('function openDashboardUniversityDetailRich'));
  const achDecl=g.indexOf('const achievementRaw=',g.indexOf('function openDashboardUniversityDetailRich'));
  must(achDecl>=0&&calcUse>=0&&achDecl<calcUse,'achievement TDZ ordering regressed');
  const pkg=JSON.parse(fs.readFileSync(pp,'utf8'));must(String(pkg.version)==='0.82.78','package version mismatch');
  console.log('PASS: native Today University route opens current university; rich renderer protected; v0.82.77 night/after-school regressions preserved');
}).catch(err=>{console.error(err);process.exit(1);});
