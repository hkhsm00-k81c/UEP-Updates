const fs=require('fs'),path=require('path'),vm=require('vm');
const g=fs.readFileSync(path.join(process.argv[2]||'app','resources','app','gyomuon.js'),'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};
function fn(name){const s=g.indexOf('function '+name+'(');must(s>=0,name+' missing');let b=g.indexOf('{',s),d=0,e=b;for(;e<g.length;e++){if(g[e]==='{')d++;else if(g[e]==='}'&&--d===0){e++;break;}}return g.slice(s,e);}
const rows=[
 {'대학명':'세종대학교','캠퍼스':'서울'},
 {'대학명':'울산과학기술원','캠퍼스':'울산'},
 {'대학명':'연세대학교','캠퍼스':'신촌'},
 {'대학명':'연세대학교 미래캠퍼스','캠퍼스':'원주'},
 {'대학명':'성균관대학교','캠퍼스':'서울/수원'},
 {'대학명':'충북대학교','캠퍼스':'개신'}
];
const ctx={dashboardAdmissionUniversities:()=>rows};vm.createContext(ctx);vm.runInContext(fn('uep08243UniversityBaseName')+'\n'+fn('uep08243UniversityDisplayName')+'\n'+fn('uep08223UniversityRegions'),ctx);
must(JSON.stringify(ctx.uep08223UniversityRegions(rows[0]))===JSON.stringify(['서울']),'세종대 region');
must(JSON.stringify(ctx.uep08223UniversityRegions(rows[1]))===JSON.stringify(['경남']),'UNIST region');
must(ctx.uep08243UniversityDisplayName(rows[2])==='연세대학교 신촌캠퍼스','main campus display');
must(ctx.uep08243UniversityDisplayName(rows[3])==='연세대학교 미래캠퍼스','named campus preservation');
const skk=ctx.uep08223UniversityRegions(rows[4]);must(skk.includes('서울')&&skk.includes('경기'),'multi-campus regions');
must(ctx.uep08243UniversityDisplayName(rows[4])==='성균관대학교 서울/수원캠퍼스','multi-campus display');
must(ctx.uep08243UniversityDisplayName(rows[5])==='충북대학교','single campus not over-labeled');
const nav=fn('uep08223TodayNav');must(!nav.includes('data-uep-prev')&&!nav.includes('data-uep-next')&&!nav.includes('탐색'),'explorer row removal');
const detail=fn('openDashboardUniversityDetail');must(!detail.includes("<small><b>수능최저</b>"),'top minimum duplicate');must(detail.includes('내신성적 산출방법 및 권장과목'),'merged card');must(!detail.includes('uep-uni-course-card'),'separate course card');must(detail.includes("nk.startsWith(nt)||nt.startsWith(nk)"),'minimum label dedupe');
must(g.includes('.uep-uni-summary-section{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr)'),'summary width');must(g.includes('.uep-uni-result-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))'),'result compact grid');
console.log('UEP 0.82.43 validation PASS');
