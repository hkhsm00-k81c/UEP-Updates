const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app',app=path.join(root,'resources','app'),gp=path.join(app,'gyomuon.js'),pp=path.join(app,'package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};
const func=(src,name)=>{const s=src.indexOf('function '+name+'(');must(s>=0,name+' missing');let b=src.indexOf('{',s),d=0,e=b;for(;e<src.length;e++){if(src[e]==='{')d++;else if(src[e]==='}'&&--d===0){e++;break;}}return {s,e,text:src.slice(s,e)}};
const replaceFunc=(src,name,text)=>{const f=func(src,name);return src.slice(0,f.s)+text+src.slice(f.e)};
must(/const\s+APP_VERSION\s*=\s*["']0\.82\.42["'];/.test(g),'real 0.82.42 base missing');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.42["'];/,'const APP_VERSION = "0.82.44";').replace(/const CURRENT='0\.82\.42';/g,"const CURRENT='0.82.44';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.44';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

const regions=`function uep08244UniversityDisplayName(university){
  const name=String(university?.['대학명']||'').trim(),campus=String(university?.['캠퍼스']||'').trim();
  if(!name||!campus||/캠퍼스/i.test(name)||/\\bERICA\\b|\\bWISE\\b/i.test(name))return name;
  const multi=/[\\/·,]/.test(campus);
  const base=name.replace(/\\s+(미래|세종|글로컬|WISE)(?:캠퍼스)?$/i,'').trim();
  const all=typeof dashboardAdmissionUniversities==='function'?dashboardAdmissionUniversities():[];
  const sibling=all.some(r=>{const n=String(r?.['대학명']||'').trim();return n!==name&&n.replace(/\\s+(미래|세종|글로컬|WISE)(?:캠퍼스)?$/i,'').trim()===base;});
  return multi||sibling?name+' '+campus+'캠퍼스':name;
}
function uep08223UniversityRegions(university){
  const name=String(university?.['대학명']||'').trim(),campus=String(university?.['캠퍼스']||'').trim();
  const regions=[],add=r=>{if(r&&!regions.includes(r))regions.push(r)};
  const rules=[['서울',/서울|관악|신촌/],['경기',/경기|수원|안산|고양|죽전|용인|안성|평택|다빈치|국제|글로벌|메디컬|의정부|의왕/],['인천',/인천|송도/],['충북',/충북|청주|충주|증평|개신|글로컬/],['충남',/충남|천안|아산|당진|서산|태안|예산|논산|공주/],['대전',/대전/],['세종',/세종/],['강원',/강원|원주/],['부산',/부산/],['대구',/대구/],['광주',/광주/],['전북',/전북|전주/],['전남',/전남|나주|여수/],['경북',/경북|포항|경주|경산|상주/],['경남',/경남|진주|통영|창원|양산|밀양|울산/]];
  for(const [r,re] of rules)if(re.test(campus))add(r);
  if(regions.length)return regions;
  if(name==='세종대학교')return ['서울'];
  if(/울산과학기술원|UNIST/i.test(name))return ['경남'];
  const text=name;
  const fallback=[['서울',/서울|광운|숭실|서강/],['경기',/경기|ERICA|가천|명지/],['인천',/인천/],['충북',/충북|교원|청주/],['충남',/충남/],['대전',/대전|KAIST|한국과학기술원/],['세종',/^고려대학교 세종|세종캠퍼스/],['강원',/강원|미래캠퍼스/],['부산',/부산|해양/],['대구',/대구|DGIST/],['광주',/광주|GIST/],['전북',/전북/],['전남',/전남|에너지공과/],['경북',/경북|포항|한동|WISE/],['경남',/경남/]];
  for(const [r,re] of fallback)if(re.test(text))add(r);
  if(/명지대학교/.test(name)){add('서울');add('경기')}if(/경희대학교|성균관대학교/.test(name)){add('서울');add('경기')}if(/한국교통대학교/.test(name)){add('충북');add('경기')}if(!regions.length)add('기타');return regions;
}`;
g=replaceFunc(g,'uep08223UniversityRegions',regions);

const nav=`function uep08223TodayNav(university){
  const all=dashboardAdmissionUniversities(),norm=dashboardAdmissionNormalizeUniversity(university['대학명']),currentRegions=uep08223UniversityRegions(university);
  const order=['서울','경기','인천','충북','충남','대전','세종','강원','부산','대구','광주','전북','전남','경북','경남','기타'];
  const present=order.filter(r=>all.some(u=>uep08223UniversityRegions(u).includes(r)));let active=String(window.__uepAdmissionRegion||'');
  if(!currentRegions.includes(active))active=currentRegions[0]||present[0]||'기타';window.__uepAdmissionRegion=active;
  const rows=all.filter(u=>uep08223UniversityRegions(u).includes(active));
  return '<div class="uep-uni-explorer"><div class="uep-uni-nav-row uep-uni-nav-regions"><span class="uep-uni-nav-label">지역</span><div class="uep-uni-region-tabs">'+present.map(r=>'<button type="button" data-uep-region="'+escapeHtml(r)+'" class="'+(r===active?'active':'')+'">'+escapeHtml(r)+'</button>').join('')+'</div></div><div class="uep-uni-nav-row uep-uni-nav-schools"><span class="uep-uni-nav-label">대학</span><div class="uep-uni-list">'+rows.map(u=>'<button type="button" data-uep-university="'+escapeHtml(u['대학명'])+'" class="'+(dashboardAdmissionNormalizeUniversity(u['대학명'])===norm?'active':'')+'">'+escapeHtml(uep08244UniversityDisplayName(u))+'</button>').join('')+'</div></div></div>';
}`;
g=replaceFunc(g,'uep08223TodayNav',nav);

const admOld="<p>'+escapeHtml(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r))+'</p><small><b>수능최저</b> '+escapeHtml(r['수능최저']||r['수능최저원문']||(String(r['배지사용여부']).toUpperCase()==='N'?'참고/검증중':'미적용 또는 확인 필요'))+'</small></article>";
const admNew="<p>'+escapeHtml(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r))+'</p></article>";
must(g.includes(admOld),'top admission minimum source missing');g=g.replace(admOld,admNew);

const minOld="const meta=[type,track].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · ');";
const minNew="const nt=type.replace(/\\s+/g,'').replace(/전형$/,''),nk=track.replace(/\\s+/g,'').replace(/전형$/,'');const meta=track&&(nk.startsWith(nt)||nt.startsWith(nk))?track:[type,track].filter(Boolean).join(' · ');";
must(g.includes(minOld),'minimum meta source missing');g=g.replace(minOld,minNew);

const summaryOld="<div class=\"uep-uni-summary-card uep-uni-calc-card\"><small>내신성적 산출방법</small><div class=\"uep-uni-detail-stack\">'+calcHtml+'</div></div><div class=\"uep-uni-summary-card uep-uni-minimum-card\"><small>모집단위별 수능최저</small><div class=\"uep-uni-detail-stack\">'+minHtml+'</div></div><div class=\"uep-uni-summary-card uep-uni-course-card\"><small>권장과목</small><div class=\"uep-uni-detail-stack\">'+courseHtml+'</div></div>";
const summaryNew="<div class=\"uep-uni-summary-card uep-uni-calc-card\"><small>내신성적 산출방법 및 권장과목</small><div class=\"uep-uni-detail-stack\">'+calcHtml+'</div><div class=\"uep-uni-course-inline\"><b>권장과목</b>'+courseHtml+'</div></div><div class=\"uep-uni-summary-card uep-uni-minimum-card\"><small>모집단위별 수능최저</small><div class=\"uep-uni-detail-stack\">'+minHtml+'</div></div>";
must(g.includes(summaryOld),'summary source missing');g=g.replace(summaryOld,summaryNew);

g=g.replace("const name=university['대학명']||'오늘의 대학',norm=dashboardAdmissionNormalizeUniversity(name);","const name=university['대학명']||'오늘의 대학',displayName=uep08244UniversityDisplayName(university)||name,norm=dashboardAdmissionNormalizeUniversity(name);");
must(g.includes('openDashboardAdmissionDialogBase(name,body);'),'dialog anchor missing');g=g.replace('openDashboardAdmissionDialogBase(name,body);','openDashboardAdmissionDialogBase(displayName,body);');

const css='.uep-uni-summary-section{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,2fr)!important;gap:14px!important;margin:16px 0!important}.uep-uni-course-inline{margin-top:14px;padding-top:12px;border-top:1px solid #e6edf5}.uep-uni-course-inline>b{display:block;margin-bottom:8px;color:#475569}.uep-uni-result-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}.uep-uni-result-card{padding:10px 12px!important;min-height:0!important}.uep-uni-result-card h4{margin:0 0 4px!important;font-size:14px!important}.uep-uni-result-card p{margin:0 0 6px!important;font-size:12px!important}.uep-uni-result-card div{gap:6px!important;font-size:12px!important}.uep-uni-nav-prevnext{display:none!important}@media(max-width:1100px){.uep-uni-result-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}';
g += `\n/* UEP_08244_TODAY_UNIVERSITY_COMPACT_CSS */\n(function(){const id='uep-08244-university-css';if(document.getElementById(id))return;const s=document.createElement('style');s.id=id;s.textContent=${JSON.stringify(css)};(document.head||document.documentElement).appendChild(s);})();\n`;
g += `\n/* UEP_08244_RELEASE_NOTES */\n(function(){const VERSION='0.82.44',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08244'))return;const o=document.createElement('div');o.id='uep-release-08244';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.44 수정사항</h2><ul><li>0.82.43 배포본 빌드 오류를 정정했습니다.</li><li>오늘의 대학 compact 정리와 캠퍼스 기반 지역분류를 실제 배포본에 반영했습니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown')}catch(e){}o.remove()};o.querySelector('button').onclick=close;document.body.appendChild(o)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900)})();\n`;
must(!func(g,'uep08223TodayNav').text.includes('data-uep-prev'),'prev remains');must(!func(g,'uep08223TodayNav').text.includes('data-uep-next'),'next remains');must(g.includes('APP_VERSION = "0.82.44"'),'version missing');must(g.includes('내신성적 산출방법 및 권장과목'),'merge missing');must(g.includes('UEP_08244_TODAY_UNIVERSITY_COMPACT_CSS'),'css runtime missing');
fs.writeFileSync(gp,g,'utf8');console.log('UEP 0.82.44 patch v2 PASS');