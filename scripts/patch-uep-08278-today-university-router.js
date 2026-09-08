const fs=require('fs'),path=require('path');
const root=process.argv[2];if(!root)throw new Error('app root required');
const gp=path.join(root,'gyomuon.js'),mp=path.join(root,'electron','main.cjs'),pp=path.join(root,'package.json'),lp=path.join(root,'package-lock.json');
let g=fs.readFileSync(gp,'utf8');
const must=(x,msg)=>{if(!x)throw new Error(msg)};
must(g.includes('0.82.77'),'expected renderer 0.82.77');

// 1) Keep the rich university renderer, but put it behind one named native route and an error boundary.
const fn='function openDashboardUniversityDetail(university=dashboardAdmissionTodayUniversity()){' ;
const pos=g.indexOf(fn);must(pos>=0,'openDashboardUniversityDetail not found');
g=g.slice(0,pos)+g.slice(pos).replace(fn,'function openDashboardUniversityDetailRich(university=dashboardAdmissionTodayUniversity()){');

const insertAt=g.indexOf('\nfunction dashboardStudentStatusCompactMarkup',pos);must(insertAt>=0,'dashboardStudentStatusCompactMarkup anchor missing');
const wrapper=`
function openDashboardUniversityDetailFallback(university,error){
  const name=String(university?.['대학명']||'오늘의 대학').trim()||'오늘의 대학';
  let structures=[],minimums=[],results=[];
  try{const norm=dashboardAdmissionNormalizeUniversity(name);structures=dashboardAdmissionStructureRows().filter(r=>uep08258AdmissionActive(r)&&dashboardAdmissionNormalizeUniversity(r['대학명'])===norm).sort(uep08258AdmissionCompare);minimums=dashboardAdmissionRows('admissionMinimumRows','54_수능최저DB').filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);results=dashboardAdmissionRows('admissionResults','55_대학입결DB').filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);}catch(e){console.error('[UEP 0.82.78] university fallback data error',e);}
  const cards=structures.slice(0,10).map(r=>'<article class="uep-uni-admission-card'+uep08261AdmissionCardClass(r)+'"><div class="uep-uni-badges">'+uep08223UniversityBadges(r)+'</div>'+uep08258AdmissionSupportBadge(r)+'<h4>'+escapeHtml(r['전형명']||r['대전형']||'전형 확인')+'</h4><p>'+escapeHtml(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r))+'</p></article>').join('');
  const body='<div class="uep-admission-university-detail uep-university-safe-fallback"><section class="uep-uni-section"><div class="uep-uni-section-title"><div><small>UNIVERSITY</small><h3>'+escapeHtml(name)+'</h3></div><span>안전 표시 모드</span></div><p class="safe-note">대학 상세 화면의 일부 항목을 불러오는 중 오류가 발생해 확인 가능한 공식 연결자료를 우선 표시합니다.</p></section><section class="uep-uni-section"><div class="uep-uni-section-title"><div><small>ADMISSION</small><h3>주요 전형과 선발방식</h3></div><span>'+structures.length+'개 연결</span></div><div class="uep-uni-admission-grid">'+(cards||'<p>전형 자료를 연결 중입니다.</p>')+'</div></section><section class="uep-uni-section"><div class="uep-uni-section-title"><div><small>CONNECTED DATA</small><h3>연결 현황</h3></div></div><div class="uep-uni-profile-badges"><div class="uep-uni-profile-badge"><b>수능최저 '+minimums.length+'건</b><span>54_수능최저DB</span></div><div class="uep-uni-profile-badge"><b>운호고 입결 '+results.length+'건</b><span>55_대학입결DB</span></div></div></section></div>';
  console.error('[UEP 0.82.78] rich university renderer failed',error);
  return openDashboardAdmissionDialog(name,body);
}
function openDashboardUniversityDetail(university=dashboardAdmissionTodayUniversity()){
  try{return openDashboardUniversityDetailRich(university);}catch(error){return openDashboardUniversityDetailFallback(university,error);}
}
async function openDashboardTodayUniversity(){
  window.__uepAdmissionReturn='today';window.__uepAdmissionRegion='';
  let university=dashboardAdmissionTodayUniversity();
  if(!university){
    openDashboardAdmissionDialog('오늘의 대학','<div class="uep-uni-detail-pending"><b>입시자료 불러오는 중</b><span>56_대학입시마스터와 대학별 입시DB를 연결하고 있습니다.</span></div>');
    const ok=await uep08250PrioritizeAdmission();university=dashboardAdmissionTodayUniversity();
    if(!ok||!university)return openDashboardAdmissionDialog('오늘의 대학','<p>입시자료 연결을 완료하지 못했습니다. 동기화 상태를 확인한 뒤 다시 시도해 주세요.</p>');
  }
  return openDashboardUniversityDetail(university);
}
`;
g=g.slice(0,insertAt)+wrapper+g.slice(insertAt);

// 2) Route the dashboard university card through the named native route. No document-level interception.
const old="if(key==='university'){window.__uepAdmissionReturn='today';window.__uepAdmissionRegion='';let u=dashboardAdmissionTodayUniversity();if(u)return openDashboardUniversityDetail(u);openDashboardAdmissionDialog('오늘의 대학','<div class=\"uep-uni-detail-pending\"><b>입시자료 불러오는 중</b><span>56_대학입시마스터와 대학별 입시DB를 연결하고 있습니다.</span></div>');const ok=await uep08250PrioritizeAdmission();u=dashboardAdmissionTodayUniversity();if(ok&&u)return openDashboardUniversityDetail(u);return openDashboardAdmissionDialog('오늘의 대학','<p>입시자료 연결을 완료하지 못했습니다. 동기화 상태를 확인한 뒤 다시 시도해 주세요.</p>');}";
const neu="if(key==='university')return openDashboardTodayUniversity();";
must(g.includes(old),'v0.82.77 inline university route not found');
g=g.replace(old,neu);

// 3) Remove the old admission-only document capture listener; native card binding is the single route.
const capture=`  document.addEventListener('click',e=>{\n    const btn=e.target&&e.target.closest?e.target.closest('[data-dashboard-admission]'):null;\n    if(!btn)return;\n    const key=btn.getAttribute('data-dashboard-admission');\n    if(key==='university'){window.__uepAdmissionReturn='today';window.__uepAdmissionRegion='';}\n    else if(key==='types'||key==='basics'){window.__uepAdmissionReturn='';window.__uepAdmissionRegion='';}\n  },true);\n`;
if(g.includes(capture))g=g.replace(capture,'');

g=g.replaceAll('0.82.77','0.82.78');
fs.writeFileSync(gp,g,'utf8');
for(const p of [mp,pp,lp])if(fs.existsSync(p)){let x=fs.readFileSync(p,'utf8').replaceAll('0.82.77','0.82.78');fs.writeFileSync(p,x,'utf8');}
console.log('UEP 0.82.78 Today University native router/error-boundary patch applied');
