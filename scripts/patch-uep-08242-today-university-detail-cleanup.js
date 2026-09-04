const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const app=path.join(root,'resources','app');
const gp=path.join(app,'gyomuon.js');
const pp=path.join(app,'package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.41["'];/.test(g),'0.82.41 base not found');
must(g.includes('function openDashboardUniversityDetail(university=dashboardAdmissionTodayUniversity()){'),'native university detail renderer not found');
must(g.includes('/* UEP_08225_ADMISSION_CALCULATION_CARDS */'),'0.82.25 post-render calculation wrapper not found');
must(g.includes("const originalDetail=typeof openDashboardUniversityDetail==='function'?openDashboardUniversityDetail:null;"),'0.82.30 linked-track detail wrapper not found');

// Bump only after the exact native/detail wrapper structure is confirmed.
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.41["'];/,()=> 'const APP_VERSION = "0.82.42";')
   .replace(/const CURRENT='0\.82\.41';/g,()=>"const CURRENT='0.82.42';");
if(fs.existsSync(pp)){
  const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.42';
  fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');
}

// 1) Native top admission cards: keep the broad type in the badge, and show the official track name once in the title.
const oldAdmission="const admissionHtml=admissions.length?admissions.slice(0,18).map(r=>'<article class=\"uep-uni-admission-card\"><div class=\"uep-uni-badges\">'+uep08223UniversityBadges(r)+'</div><h4>'+escapeHtml(r['전형유형']||r['대전형']||'전형')+' · '+escapeHtml(r['전형명']||'전형명 확인')+'</h4><p>'+escapeHtml(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r))+'</p><small><b>수능최저</b> '+escapeHtml(r['수능최저']||r['수능최저원문']||(String(r['배지사용여부']).toUpperCase()==='N'?'참고/검증중':'미적용 또는 확인 필요'))+'</small></article>').join(''):'<p>대학별 전형구조 자료를 연결 중입니다.</p>';";
const newAdmission="const admissionHtml=admissions.length?admissions.slice(0,18).map(r=>'<article class=\"uep-uni-admission-card\"><div class=\"uep-uni-badges\">'+uep08223UniversityBadges(r)+'</div><h4>'+escapeHtml(r['전형명']||r['전형유형']||r['대전형']||'전형명 확인')+'</h4><p>'+escapeHtml(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r))+'</p><small><b>수능최저</b> '+escapeHtml(r['수능최저']||r['수능최저원문']||(String(r['배지사용여부']).toUpperCase()==='N'?'참고/검증중':'미적용 또는 확인 필요'))+'</small></article>').join(''):'<p>대학별 전형구조 자료를 연결 중입니다.</p>';";
must(g.includes(oldAdmission),'native admission card markup changed unexpectedly');
g=g.replace(oldAdmission,newAdmission);

// 2) Move 57/54/56 detail cards into the native renderer instead of post-render wrapper.
const afterResults="const resultHtml=results.length?results.slice(0,12).map(r=>'<article class=\"uep-uni-result-card\"><h4>'+escapeHtml(r['모집단위']||'모집단위')+'</h4><p>'+escapeHtml(r['전형명(대)']||r['전형명']||'')+'</p><div><b>합격 '+escapeHtml(r['합격자수']||'-')+'명</b><span>최저내신 '+escapeHtml(r['최저내신등급']||'-')+'</span></div></article>').join(''):'<p>현재 연결된 운호고 실제 입결이 없습니다.</p>';";
must(g.includes(afterResults),'native resultHtml anchor not found');
const nativeDetails=`\n  const calcs=dashboardAdmissionRows('admissionGradeCalcs','57_내신산정DB').filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);\n  const calc=calcs.find(r=>String(r['검증상태']||'').startsWith('A-'))||calcs[0]||null;\n  const detailLine=(label,value)=>value?'<div class="uep-uni-detail-line"><b>'+escapeHtml(label)+'</b><span>'+escapeHtml(value)+'</span></div>':'';\n  const calcHtml=calc?detailLine('반영학년',calc['반영학년'])+detailLine('반영교과·과목',calc['반영교과/과목'])+detailLine('등급점수',calc['석차등급배점'])+detailLine('성취도점수',calc['성취도배점/환산'])+detailLine('등급 미기재',calc['석차등급미기재과목처리'])+detailLine('이수학점·가중',calc['이수학점가중'])+detailLine('최종 산식',calc['내신산식']):'<div class="uep-uni-detail-pending"><b>정확한 숫자 산식 검증중</b><span>등급별 점수·성취도별 점수·가중치가 공식 원문에서 확인된 뒤 표시합니다.</span></div>';\n  const minHtml=minimums.length?minimums.slice(0,14).map(r=>{const unit=String(r['모집단위']||'모집단위').trim();const type=String(r['전형유형']||'').trim();const track=String(r['전형명']||'').trim();const meta=[type,track].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · ');return '<div class="uep-uni-min-row"><b>'+escapeHtml(unit)+'</b><span>'+(meta?'<small>'+escapeHtml(meta)+'</small><br>':'')+escapeHtml(r['수능최저원문']||'')+'</span></div>';}).join(''):'<div class="uep-uni-detail-pending"><b>모집단위별 기준 검증중</b><span>공식 원문 숫자가 확인된 기준만 표시합니다.</span></div>';\n  const course=String(university['과목선택/교과포인트']||'').trim();\n  const courseHtml=course?'<div class="uep-uni-course-copy">'+escapeHtml(course)+'</div>':'<div class="uep-uni-detail-pending"><b>공식 권장과목 확인중</b><span>대학이 공식적으로 제시한 권장·핵심·관련 과목만 표시합니다.</span></div>';`;
g=g.replace(afterResults,afterResults+nativeDetails);

const oldSummary="'<section class=\"uep-uni-summary-section\"><div class=\"uep-uni-summary-card\"><small>수시 핵심</small><p>'+escapeHtml(university['수시핵심']||'수시 전형별 평가요소를 확인합니다.')+'</p></div><div class=\"uep-uni-summary-card\"><small>정시 핵심</small><p>'+escapeHtml(university['정시핵심']||'정시 영역별 반영비율과 가산점을 확인합니다.')+'</p></div><div class=\"uep-uni-summary-card\"><small>과목선택 참고</small><p>'+escapeHtml(university['과목선택/교과포인트']||'-')+'</p></div></section>'+";
const newSummary="'<section class=\"uep-uni-summary-section\"><div class=\"uep-uni-summary-card uep-uni-calc-card\"><small>내신성적 산출방법</small><div class=\"uep-uni-detail-stack\">'+calcHtml+'</div></div><div class=\"uep-uni-summary-card uep-uni-minimum-card\"><small>모집단위별 수능최저</small><div class=\"uep-uni-detail-stack\">'+minHtml+'</div></div><div class=\"uep-uni-summary-card uep-uni-course-card\"><small>권장과목</small><div class=\"uep-uni-detail-stack\">'+courseHtml+'</div></div></section>'+";
must(g.includes(oldSummary),'native summary section markup changed unexpectedly');
g=g.replace(oldSummary,newSummary);

// 3) Remove obsolete 0.82.25 post-render summary wrapper; native renderer now owns those cards.
const calcStart=g.indexOf('/* UEP_08225_ADMISSION_CALCULATION_CARDS */');
const calcEnd=g.indexOf('/* UEP_08225_RELEASE_NOTES */',calcStart);
must(calcStart>=0&&calcEnd>calcStart,'0.82.25 wrapper bounds not found');
g=g.slice(0,calcStart)+g.slice(calcEnd);

// 4) Keep 0.82.30 graph/today ordering, but remove only its duplicate detail-card injection wrapper.
const wrapperStart=g.indexOf("  const originalDetail=typeof openDashboardUniversityDetail==='function'?openDashboardUniversityDetail:null;");
const wrapperEnd=g.indexOf("  document.addEventListener('DOMContentLoaded'",wrapperStart);
must(wrapperStart>=0&&wrapperEnd>wrapperStart,'0.82.30 detail wrapper bounds not found');
g=g.slice(0,wrapperStart)+g.slice(wrapperEnd);
// Graph raw minimum source follows the 0.82.41 model split.
g=g.replace("minimums:()=>rows('admissionMinimums','54_수능최저DB')","minimums:()=>rows('admissionMinimumRows','54_수능최저DB')");

// Release notes only; no runtime repair wrapper.
g += `\n/* UEP_08242_RELEASE_NOTES */\n(function(){const VERSION='0.82.42',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08242'))return;const o=document.createElement('div');o.id='uep-release-08242';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.42 수정사항</h2><ul><li>오늘의 대학 전형카드에서 전형유형과 전형명이 겹쳐 보이던 표현을 정리했습니다.</li><li>상단 전형카드와 중복되던 하단 주요 전형·선발방식 카드를 제거했습니다.</li><li>모집단위별 수능최저에 전형유형·전형명을 함께 표시해 같은 학과의 전형별 기준 차이를 구분합니다.</li><li>내신산정·수능최저·권장과목을 상세 네이티브 렌더러가 직접 그리도록 정리했습니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900);})();\n`;

must(!g.includes('/* UEP_08225_ADMISSION_CALCULATION_CARDS */'),'0.82.25 post-render wrapper still present');
must(!g.includes("const originalDetail=typeof openDashboardUniversityDetail==='function'?openDashboardUniversityDetail:null;"),'0.82.30 detail injection wrapper still present');
must(!g.includes('uep-08230-linked-tracks'),'duplicate linked-track card injection still present');
must(g.includes("<h4>'+escapeHtml(r['전형명']||r['전형유형']||r['대전형']||'전형명 확인')+'</h4>"),'native track title cleanup missing');
must(g.includes("const minHtml=minimums.length?minimums.slice(0,14)"),'native minimum renderer missing');
must(g.includes("const meta=[type,track]"),'minimum track meta missing');
must(g.includes("minimums:()=>rows('admissionMinimumRows','54_수능최저DB')"),'graph raw minimum model not aligned');
must(g.includes("data-uep-region")&&g.includes("data-uep-university")&&g.includes("data-uep-prev")&&g.includes("data-uep-next"),'university navigation markers lost');

fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.42 today university native detail cleanup patched');
