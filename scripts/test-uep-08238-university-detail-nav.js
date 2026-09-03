const fs=require('fs'),path=require('path'),vm=require('vm');
const root=process.argv[2]||'app';
const g=fs.readFileSync(path.join(root,'resources','app','gyomuon.js'),'utf8');
const extract=(name,next)=>{const a=g.indexOf('function '+name+'(');if(a<0)throw new Error(name+' not found');const b=next?g.indexOf('function '+next+'(',a+1):-1;return g.slice(a,b>0?b:a+12000);};
const helper=extract('uep08223UniversityRegions','uep08223TodayNav');
const nav=extract('uep08223TodayNav');
const universities=[
 {'대학명':'단국대학교','캠퍼스':'죽전/천안','노출순서':28},
 {'대학명':'한양대학교','캠퍼스':'서울','노출순서':7},
 {'대학명':'충남대학교','캠퍼스':'대전','노출순서':33},
 {'대학명':'국립한국교통대학교','캠퍼스':'충주/증평/의왕','노출순서':56}
];
const ctx={window:{__uepAdmissionRegion:''},dashboardAdmissionUniversities:()=>universities,dashboardAdmissionNormalizeUniversity:v=>String(v||'').replace(/대학교/g,'대').replace(/\s|\(.*?\)/g,''),escapeHtml:v=>String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))};
vm.createContext(ctx);vm.runInContext(helper+'\n'+nav,ctx);
const d=universities[0];
const regions=ctx.uep08223UniversityRegions(d);
if(!regions.includes('경기')||!regions.includes('충남'))throw new Error('단국대 region mapping failed: '+JSON.stringify(regions));
const html=ctx.uep08223TodayNav(d);
if(!html.includes('단국대학교'))throw new Error('today nav missing current university');
if(!html.includes('data-uep-region="경기"')||!html.includes('data-uep-region="충남"'))throw new Error('today nav missing expected regional tabs');
const k=ctx.uep08223UniversityRegions(universities[3]);
if(!k.includes('충북')||!k.includes('경기'))throw new Error('한국교통대 multi-region mapping failed: '+JSON.stringify(k));
console.log('PASS: uep08223UniversityRegions + today nav with live-shaped university data');
