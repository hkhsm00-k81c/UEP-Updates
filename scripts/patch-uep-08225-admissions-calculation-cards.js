const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const cp=path.join(root,'resources','app','gyomuon.css');
const mp=path.join(root,'resources','app','electron','main.cjs');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
let c=fs.readFileSync(cp,'utf8');
let m=fs.readFileSync(mp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
must(/const\s+APP_VERSION\s*=\s*["']0\.82\.24["'];/.test(g),'0.82.24 base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.24["'];/,'const APP_VERSION = "0.82.25";');
g=g.replace(/const CURRENT='0\.82\.24';/g,"const CURRENT='0.82.25';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.25';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// Add 57_내신산정DB to the same School Read batch as the existing admissions sheets.
if(!m.includes("['57_내신산정DB'" )&&!m.includes('["57_내신산정DB"')){
  const entryRe=/(\[\s*["']56_대학입시마스터["']\s*,\s*["']'56_대학입시마스터'!A1:R500["']\s*\],?)/;
  must(entryRe.test(m),'56 admissions read-range anchor not found');
  m=m.replace(entryRe,`$1\n    ["57_내신산정DB", "'57_내신산정DB'!A1:Y1200"],`);
}
const cacheAnchor="  data.universityAdmissions=uep08210MatrixObjects(matrices['56_대학입시마스터']);";
must(m.includes(cacheAnchor),'56 cache handoff anchor not found');
if(!m.includes("data.admissionGradeCalcs=uep08210MatrixObjects(matrices['57_내신산정DB'])")){
  m=m.replace(cacheAnchor,cacheAnchor+"\n  data.admissionGradeCalcs=uep08210MatrixObjects(matrices['57_내신산정DB']);");
}
const aliasAnchor="  data['56_대학입시마스터']=data.universityAdmissions;";
must(m.includes(aliasAnchor),'56 alias anchor not found');
if(!m.includes("data['57_내신산정DB']=data.admissionGradeCalcs")){
  m=m.replace(aliasAnchor,aliasAnchor+"\n  data['57_내신산정DB']=data.admissionGradeCalcs;");
}

// Replace only the three summary cards after the existing university detail renderer finishes.
g += `\n/* UEP_08225_ADMISSION_CALCULATION_CARDS */\n(function(){
  const original=openDashboardUniversityDetail;
  openDashboardUniversityDetail=function(university=dashboardAdmissionTodayUniversity()){
    const ret=original(university);
    if(!university)return ret;
    const norm=dashboardAdmissionNormalizeUniversity(university['대학명']||'');
    const calcs=dashboardAdmissionRows('admissionGradeCalcs','57_내신산정DB').filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);
    const minimums=dashboardAdmissionRows('admissionMinimums','54_수능최저DB').filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm&&String(r['수능최저원문']||'').trim());
    const calc=calcs.find(r=>String(r['검증상태']||'').startsWith('A-'))||calcs[0]||null;
    const esc=v=>escapeHtml(String(v??''));
    const line=(label,value)=>value?'<div class="uep-uni-detail-line"><b>'+esc(label)+'</b><span>'+esc(value)+'</span></div>':'';
    const calcHtml=calc?
      line('반영학년',calc['반영학년'])+
      line('반영교과·과목',calc['반영교과/과목'])+
      line('등급점수',calc['석차등급배점'])+
      line('성취도점수',calc['성취도배점/환산'])+
      line('등급 미기재',calc['석차등급미기재과목처리'])+
      line('이수학점·가중',calc['이수학점가중'])+
      line('최종 산식',calc['내신산식']):
      '<div class="uep-uni-detail-pending"><b>정확한 숫자 산식 검증중</b><span>등급별 점수·성취도별 점수·가중치가 공식 원문에서 확인된 뒤 표시합니다.</span></div>';
    const minHtml=minimums.length?minimums.slice(0,10).map(r=>'<div class="uep-uni-min-row"><b>'+esc(r['모집단위']||r['전형명']||'모집단위')+'</b><span>'+esc(r['수능최저원문'])+'</span></div>').join(''):'<div class="uep-uni-detail-pending"><b>모집단위별 기준 검증중</b><span>공식 원문 숫자가 확인된 기준만 표시합니다.</span></div>';
    const course=String(university['과목선택/교과포인트']||'').trim();
    const courseHtml=course?'<div class="uep-uni-course-copy">'+esc(course)+'</div>':'<div class="uep-uni-detail-pending"><b>공식 권장과목 확인중</b><span>대학이 공식적으로 제시한 권장·핵심·관련 과목만 표시합니다.</span></div>';
    const section=document.querySelector('.uep-uni-summary-section');
    if(section){section.innerHTML=
      '<div class="uep-uni-summary-card uep-uni-calc-card"><small>내신성적 산출방법</small><div class="uep-uni-detail-stack">'+calcHtml+'</div></div>'+
      '<div class="uep-uni-summary-card uep-uni-minimum-card"><small>모집단위별 수능최저</small><div class="uep-uni-detail-stack">'+minHtml+'</div></div>'+
      '<div class="uep-uni-summary-card uep-uni-course-card"><small>권장과목</small><div class="uep-uni-detail-stack">'+courseHtml+'</div></div>';
    }
    return ret;
  };
})();\n`;

c += `\n/* UEP_08225_ADMISSION_CALCULATION_CARDS */\n.uep-uni-summary-section{align-items:stretch}\n.uep-uni-summary-card{min-height:220px}\n.uep-uni-summary-card>small{display:block;font-size:15px;font-weight:800;color:#17629a;margin-bottom:14px}\n.uep-uni-detail-stack{display:flex;flex-direction:column;gap:8px}\n.uep-uni-detail-line,.uep-uni-min-row{display:grid;grid-template-columns:112px minmax(0,1fr);gap:10px;padding:8px 0;border-bottom:1px solid #edf2f7;font-size:13px;line-height:1.45}\n.uep-uni-detail-line b,.uep-uni-min-row b{color:#17324d}\n.uep-uni-detail-line span,.uep-uni-min-row span{color:#334e68;overflow-wrap:anywhere}\n.uep-uni-detail-pending{display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:12px;background:#f6f8fb;color:#52606d;font-size:13px;line-height:1.45}\n.uep-uni-detail-pending b{color:#17324d}\n.uep-uni-course-copy{font-size:14px;line-height:1.65;color:#334e68;white-space:normal}\n@media(max-width:1100px){.uep-uni-detail-line,.uep-uni-min-row{grid-template-columns:1fr}.uep-uni-summary-card{min-height:auto}}\n`;

// Reliable first-run release notes.
g += `\n/* UEP_08225_RELEASE_NOTES */\n(function(){const VERSION='0.82.25',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08225'))return;const o=document.createElement('div');o.id='uep-release-08225';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.25 수정사항</h2><ul><li>대학 상세 하단의 수시 핵심·정시 핵심·과목선택 참고를 내신성적 산출방법·모집단위별 수능최저·권장과목으로 교체했습니다.</li><li>57_내신산정DB를 실시간 연결해 등급점수·성취도점수·이수학점 가중·최종 산식을 숫자로 표시합니다.</li><li>공식 숫자 산식이 아직 검증되지 않은 대학은 추상 문구 대신 검증중으로 명확히 표시합니다.</li><li>54_수능최저DB의 모집단위별 실제 최저 원문을 카드에 직접 표시합니다.</li><li>기존 주요 전형·대학 탐색·운호고 입결·로그인 연결 구조는 유지합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;

must(m.includes("57_내신산정DB"),'57 read connection missing');
must(g.includes('UEP_08225_ADMISSION_CALCULATION_CARDS'),'calculation cards marker missing');
must(g.includes("dashboardAdmissionRows('admissionGradeCalcs','57_내신산정DB')"),'57 renderer source missing');
must(c.includes('.uep-uni-detail-line'),'calculation card css missing');
fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(cp,c,'utf8');
fs.writeFileSync(mp,m,'utf8');
console.log('UEP 0.82.25 admissions calculation cards patched');
