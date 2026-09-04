const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app',app=path.join(root,'resources','app'),gp=path.join(app,'gyomuon.js'),pp=path.join(app,'package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};
const extractFunction=(src,name)=>{const s=src.indexOf('function '+name+'(');must(s>=0,name+' not found');let b=src.indexOf('{',s),d=0,e=b;for(;e<src.length;e++){if(src[e]==='{')d++;else if(src[e]==='}'&&--d===0){e++;break;}}return {s,e,text:src.slice(s,e)};};
const replaceFunction=(src,name,next)=>{const f=extractFunction(src,name);return src.slice(0,f.s)+next+src.slice(f.e);};
const replaceCss=(src,selector,body)=>{const esc=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const re=new RegExp(esc+'\\s*\\{[^}]*\\}');must(re.test(src),'CSS '+selector+' not found');return src.replace(re,selector+'{'+body+'}');};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.42["'];/.test(g),'0.82.42 base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.42["'];/, 'const APP_VERSION = "0.82.43";').replace(/const CURRENT='0\.82\.42';/g,"const CURRENT='0.82.43';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.43';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

const regionAndDisplay=`function uep08243UniversityBaseName(value){
  return String(value||'').trim().replace(/\\s+(미래|세종|글로컬|WISE)(?:캠퍼스)?$/i,'').replace(/\\s*캠퍼스$/,'').trim();
}
function uep08243UniversityDisplayName(university){
  const name=String(university?.['대학명']||'').trim(),campus=String(university?.['캠퍼스']||'').trim();
  if(!name||!campus||/캠퍼스/i.test(name)||/\\bERICA\\b|\\bWISE\\b/i.test(name))return name;
  const base=uep08243UniversityBaseName(name),all=typeof dashboardAdmissionUniversities==='function'?dashboardAdmissionUniversities():[];
  const sibling=all.some(r=>String(r?.['대학명']||'').trim()!==name&&uep08243UniversityBaseName(r?.['대학명'])===base);
  const multi=/[\\/·,]/.test(campus);
  return sibling||multi?name+' '+campus+'캠퍼스':name;
}
function uep08223UniversityRegions(university){
  const name=String(university?.['대학명']||'').trim(),campus=String(university?.['캠퍼스']||'').trim();
  const regions=[],add=r=>{if(r&&!regions.includes(r))regions.push(r);};
  const campusRules=[
    ['서울',/서울|관악|신촌/],['경기',/경기|수원|안산|고양|죽전|용인|안성|평택|다빈치|국제|글로벌|메디컬|의정부|의왕/],['인천',/인천|송도/],
    ['충북',/충북|청주|충주|증평|개신|글로컬/],['충남',/충남|천안|아산|당진|서산|태안|예산|논산|공주/],['대전',/대전/],['세종',/세종/],['강원',/강원|원주/],
    ['부산',/부산/],['대구',/대구/],['광주',/광주/],['전북',/전북|전주/],['전남',/전남|나주|여수/],['경북',/경북|포항|경주|경산|상주/],['경남',/경남|진주|통영|창원|양산|밀양|울산/]
  ];
  for(const [region,re] of campusRules)if(re.test(campus))add(region);
  if(regions.length)return regions;
  if(name==='세종대학교')return ['서울'];
  if(/울산과학기술원|UNIST/i.test(name))return ['경남'];
  const text=name;
  const fallback=[['서울',/서울|광운|숭실|서강/],['경기',/경기|ERICA|가천|명지/],['인천',/인천/],['충북',/충북|교원|청주/],['충남',/충남/],['대전',/대전|KAIST|한국과학기술원/],['세종',/^고려대학교 세종|세종캠퍼스/],['강원',/강원|미래캠퍼스/],['부산',/부산|해양/],['대구',/대구|DGIST/],['광주',/광주|GIST/],['전북',/전북/],['전남',/전남|에너지공과/],['경북',/경북|포항|한동|WISE/],['경남',/경남/]];
  for(const [region,re] of fallback)if(re.test(text))add(region);
  if(/명지대학교/.test(name)){add('서울');add('경기');}
  if(/경희대학교|성균관대학교/.test(name)){add('서울');add('경기');}
  if(/한국교통대학교/.test(name)){add('충북');add('경기');}
  if(!regions.length)add('기타');
  return regions;
}`;
g=replaceFunction(g,'uep08223UniversityRegions',regionAndDisplay);

const newNav=`function uep08223TodayNav(university){
  const all=dashboardAdmissionUniversities();
  const norm=dashboardAdmissionNormalizeUniversity(university['대학명']);
  const currentRegions=uep08223UniversityRegions(university);
  const regionOrder=['서울','경기','인천','충북','충남','대전','세종','강원','부산','대구','광주','전북','전남','경북','경남','기타'];
  const present=regionOrder.filter(region=>all.some(r=>uep08223UniversityRegions(r).includes(region)));
  let active=String(window.__uepAdmissionRegion||'');
  if(!currentRegions.includes(active))active=currentRegions[0]||present[0]||'기타';
  window.__uepAdmissionRegion=active;
  const regionRows=all.filter(r=>uep08223UniversityRegions(r).includes(active));
  return '<div class="uep-uni-explorer">'+
    '<div class="uep-uni-nav-row uep-uni-nav-regions"><span class="uep-uni-nav-label">지역</span><div class="uep-uni-region-tabs">'+present.map(region=>'<button type="button" data-uep-region="'+escapeHtml(region)+'" class="'+(region===active?'active':'')+'">'+escapeHtml(region)+'</button>').join('')+'</div></div>'+ 
    '<div class="uep-uni-nav-row uep-uni-nav-schools"><span class="uep-uni-nav-label">대학</span><div class="uep-uni-list">'+regionRows.map(r=>'<button type="button" data-uep-university="'+escapeHtml(r['대학명'])+'" class="'+(dashboardAdmissionNormalizeUniversity(r['대학명'])===norm?'active':'')+'">'+escapeHtml(uep08243UniversityDisplayName(r))+'</button>').join('')+'</div></div>'+ 
  '</div>';
}`;
g=replaceFunction(g,'uep08223TodayNav',newNav);

const oldAdmission="const admissionHtml=admissions.length?admissions.slice(0,18).map(r=>'<article class=\"uep-uni-admission-card\"><div class=\"uep-uni-badges\">'+uep08223UniversityBadges(r)+'</div><h4>'+escapeHtml(r['전형명']||r['전형유형']||r['대전형']||'전형명 확인')+'</h4><p>'+escapeHtml(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r))+'</p><small><b>수능최저</b> '+escapeHtml(r['수능최저']||r['수능최저원문']||(String(r['배지사용여부']).toUpperCase()==='N'?'참고/검증중':'미적용 또는 확인 필요'))+'</small></article>').join(''):'<p>대학별 전형구조 자료를 연결 중입니다.</p>';";
const newAdmission="const admissionHtml=admissions.length?admissions.slice(0,18).map(r=>'<article class=\"uep-uni-admission-card\"><div class=\"uep-uni-badges\">'+uep08223UniversityBadges(r)+'</div><h4>'+escapeHtml(r['전형명']||r['전형유형']||r['대전형']||'전형명 확인')+'</h4><p>'+escapeHtml(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r))+'</p></article>').join(''):'<p>대학별 전형구조 자료를 연결 중입니다.</p>';";
must(g.includes(oldAdmission),'admission card source changed');g=g.replace(oldAdmission,newAdmission);

const oldMin="const minHtml=minimums.length?minimums.slice(0,14).map(r=>{const unit=String(r['모집단위']||'모집단위').trim();const type=String(r['전형유형']||'').trim();const track=String(r['전형명']||'').trim();const meta=[type,track].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · ');return '<div class=\"uep-uni-min-row\"><b>'+escapeHtml(unit)+'</b><span>'+(meta?'<small>'+escapeHtml(meta)+'</small><br>':'')+escapeHtml(r['수능최저원문']||'')+'</span></div>';}).join(''):'<div class=\"uep-uni-detail-pending\"><b>모집단위별 기준 검증중</b><span>공식 원문 숫자가 확인된 기준만 표시합니다.</span></div>';";
const newMin="const minHtml=minimums.length?minimums.slice(0,14).map(r=>{const unit=String(r['모집단위']||'모집단위').trim();const type=String(r['전형유형']||'').trim();const track=String(r['전형명']||'').trim();const nt=type.replace(/\\s+/g,'').replace(/전형$/,'');const nk=track.replace(/\\s+/g,'').replace(/전형$/,'');const meta=track&&(nk.startsWith(nt)||nt.startsWith(nk))?track:[type,track].filter(Boolean).join(' · ');return '<div class=\"uep-uni-min-row\"><b>'+escapeHtml(unit)+'</b><span>'+(meta?'<small>'+escapeHtml(meta)+'</small><br>':'')+escapeHtml(r['수능최저원문']||'')+'</span></div>';}).join(''):'<div class=\"uep-uni-detail-pending\"><b>모집단위별 기준 검증중</b><span>공식 원문 숫자가 확인된 기준만 표시합니다.</span></div>';";
must(g.includes(oldMin),'minimum renderer source changed');g=g.replace(oldMin,newMin);

const oldSummary="'<section class=\"uep-uni-summary-section\"><div class=\"uep-uni-summary-card uep-uni-calc-card\"><small>내신성적 산출방법</small><div class=\"uep-uni-detail-stack\">'+calcHtml+'</div></div><div class=\"uep-uni-summary-card uep-uni-minimum-card\"><small>모집단위별 수능최저</small><div class=\"uep-uni-detail-stack\">'+minHtml+'</div></div><div class=\"uep-uni-summary-card uep-uni-course-card\"><small>권장과목</small><div class=\"uep-uni-detail-stack\">'+courseHtml+'</div></div></section>'+";
const newSummary="'<section class=\"uep-uni-summary-section\"><div class=\"uep-uni-summary-card uep-uni-calc-card\"><small>내신성적 산출방법 및 권장과목</small><div class=\"uep-uni-detail-stack\">'+calcHtml+'</div><div class=\"uep-uni-course-inline\"><b>권장과목</b>'+courseHtml+'</div></div><div class=\"uep-uni-summary-card uep-uni-minimum-card\"><small>모집단위별 수능최저</small><div class=\"uep-uni-detail-stack\">'+minHtml+'</div></div></section>'+";
must(g.includes(oldSummary),'summary source changed');g=g.replace(oldSummary,newSummary);

g=g.replace("const name=university['대학명']||'오늘의 대학',norm=dashboardAdmissionNormalizeUniversity(name);","const name=university['대학명']||'오늘의 대학',displayName=uep08243UniversityDisplayName(university)||name,norm=dashboardAdmissionNormalizeUniversity(name);");
g=g.replace('openDashboardAdmissionDialogBase(name,body);','openDashboardAdmissionDialogBase(displayName,body);');

g=g.replace(/\n\s*layer\.querySelectorAll\('\[data-uep-prev\]'\)[\s\S]*?\n\s*\}\);/,'').replace(/\n\s*layer\.querySelectorAll\('\[data-uep-next\]'\)[\s\S]*?\n\s*\}\);/,'');

g=replaceCss(g,'.uep-uni-summary-section','display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:14px;margin:16px 0;');
g=replaceCss(g,'.uep-uni-result-grid','display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;');
g=replaceCss(g,'.uep-uni-result-card','border:1px solid #dbe5ef;border-radius:14px;padding:10px 12px;background:#fff;min-height:0;');
const cssAnchor='.uep-uni-result-card{border:1px solid #dbe5ef;border-radius:14px;padding:10px 12px;background:#fff;min-height:0;}';
must(g.includes(cssAnchor),'compact result css anchor missing');g=g.replace(cssAnchor,cssAnchor+'.uep-uni-course-inline{margin-top:14px;padding-top:12px;border-top:1px solid #e5edf5}.uep-uni-course-inline>b{display:block;margin-bottom:6px;color:#164a73}.uep-uni-course-inline .uep-uni-course-copy{line-height:1.55}.uep-uni-admission-card p{margin-bottom:0}');

g += `\n/* UEP_08243_RELEASE_NOTES */\n(function(){const VERSION='0.82.43',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08243'))return;const o=document.createElement('div');o.id='uep-release-08243';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.43 수정사항</h2><ul><li>오늘의 대학 상단 전형카드에서는 수능최저 중복 안내를 제거했습니다.</li><li>내신성적 산출방법과 권장과목을 통합하고 모집단위별 수능최저 영역을 넓혔습니다.</li><li>수능최저의 전형유형·전형명 중복 표기를 정리했습니다.</li><li>운호고 실제 입결 카드를 4열 compact 구조로 줄였습니다.</li><li>중복되던 이전·현재·다음 탐색 줄을 제거하고 지역·대학 선택만 유지했습니다.</li><li>캠퍼스 정보 기반 지역 분류와 캠퍼스 구분 대학명을 적용했습니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900);})();\n`;

must(!extractFunction(g,'uep08223TodayNav').text.includes('data-uep-prev'),'prev/next nav still rendered');
must(!extractFunction(g,'uep08223TodayNav').text.includes('탐색'),'explorer row still rendered');
must(!newAdmission.includes('수능최저'),'top admission minimum still present');
must(g.includes('내신성적 산출방법 및 권장과목'),'merged calc/course missing');
must(!g.includes('uep-uni-course-card'),'separate course card still present');
must(g.includes('repeat(4,minmax(0,1fr))'),'compact result grid missing');
must(g.includes("if(name==='세종대학교')return ['서울'];")&&g.includes("if(/울산과학기술원|UNIST/i.test(name))return ['경남'];"),'region safety rules missing');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.43 Today University compact/campus cleanup patched');
