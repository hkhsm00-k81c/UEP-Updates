const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const mp=path.join(root,'resources','app','electron','main.cjs');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
let m=fs.readFileSync(mp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
must(/const\s+APP_VERSION\s*=\s*["']0\.82\.29["'];/.test(g),'0.82.29 base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.29["'];/,'const APP_VERSION = "0.82.30";').replace(/const CURRENT='0\.82\.29';/g,"const CURRENT='0.82.30';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.30';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// Ensure the whole admissions graph is fetched in one School Read batch.
const rangeAnchor=/(\[\s*["']56_대학입시마스터["']\s*,\s*["']'56_대학입시마스터'!A1:R500["']\s*\],?)/;
must(rangeAnchor.test(m),'56 admissions read-range anchor not found');
const neededRanges=[
  ['53_전형이해',"'53_전형이해'!A1:N300"],
  ['53A_전형세부유형DB',"'53A_전형세부유형DB'!A1:R600"],
  ['53B_전형유형별대학DB',"'53B_전형유형별대학DB'!A1:P1200"],
  ['54_수능최저DB',"'54_수능최저DB'!A1:T1500"],
  ['57_내신산정DB',"'57_내신산정DB'!A1:Y1500"]
];
for(const [name,range] of neededRanges){
  if(!m.includes(`["${name}"`)&&!m.includes(`['${name}'`)) m=m.replace(rangeAnchor,`$1\n    ["${name}", "${range}"],`);
}

const cacheAnchor="  data.universityAdmissions=uep08210MatrixObjects(matrices['56_대학입시마스터']);";
must(m.includes(cacheAnchor),'56 cache handoff anchor not found');
const handoffs=[
  ['admissionTypes','53_전형이해'],
  ['admissionSubtypes','53A_전형세부유형DB'],
  ['admissionTypeUniversities','53B_전형유형별대학DB'],
  ['admissionMinimums','54_수능최저DB'],
  ['admissionGradeCalcs','57_내신산정DB']
];
for(const [key,sheet] of handoffs){const line=`  data.${key}=uep08210MatrixObjects(matrices['${sheet}']);`;if(!m.includes(line))m=m.replace(cacheAnchor,cacheAnchor+'\n'+line);}
const aliasAnchor="  data['56_대학입시마스터']=data.universityAdmissions;";
must(m.includes(aliasAnchor),'56 alias anchor not found');
for(const [key,sheet] of handoffs){const line=`  data['${sheet}']=data.${key};`;if(!m.includes(line))m=m.replace(aliasAnchor,aliasAnchor+'\n'+line);}

// Final renderer bridge: university master is authoritative for order/id; details join by university+campus/name, never by old hardcoded U-id.
g += `\n/* UEP_08230_ADMISSIONS_FINAL_LINK */\n(function(){
  const rows=(key,sheet)=>{try{return dashboardAdmissionRows(key,sheet)||[]}catch(e){return (readonlyCache&&readonlyCache[key])||[]}};
  const norm=v=>{try{return dashboardAdmissionNormalizeUniversity(v||'')}catch(e){return String(v||'').replace(/\\s+/g,'').replace(/대학교/g,'대')}};
  const campuses=v=>String(v||'').split(/[\\/·,]/).map(x=>x.trim()).filter(Boolean);
  const activeUniversities=()=>rows('universityAdmissions','56_대학입시마스터').filter(r=>String(r['사용여부']||'Y').toUpperCase()!=='N').sort((a,b)=>(Number(a['노출순서'])||9999)-(Number(b['노출순서'])||9999)||(String(a['대학ID']||'').localeCompare(String(b['대학ID']||''))));
  window.uepAdmissionsGraph={universities:activeUniversities,types:()=>rows('admissionTypes','53_전형이해'),subtypes:()=>rows('admissionSubtypes','53A_전형세부유형DB'),typeUniversities:()=>rows('admissionTypeUniversities','53B_전형유형별대학DB'),minimums:()=>rows('admissionMinimums','54_수능최저DB'),gradeCalcs:()=>rows('admissionGradeCalcs','57_내신산정DB')};
  const originalToday=typeof dashboardAdmissionTodayUniversity==='function'?dashboardAdmissionTodayUniversity:null;
  if(originalToday){dashboardAdmissionTodayUniversity=function(){const list=activeUniversities();if(!list.length)return originalToday();const day=Math.floor(Date.now()/86400000);return list[((day%list.length)+list.length)%list.length];};}
  const originalDetail=typeof openDashboardUniversityDetail==='function'?openDashboardUniversityDetail:null;
  if(originalDetail){openDashboardUniversityDetail=function(university=dashboardAdmissionTodayUniversity()){
    const ret=originalDetail(university);if(!university)return ret;
    const un=norm(university['대학명']);const uc=campuses(university['캠퍼스']);
    const typeRows=rows('admissionTypeUniversities','53B_전형유형별대학DB').filter(r=>norm(r['대학명'])===un && (!uc.length || !r['캠퍼스'] || uc.some(c=>String(r['캠퍼스']).includes(c)) || campuses(r['캠퍼스']).some(c=>String(university['캠퍼스']||'').includes(c))));
    const root=document.querySelector('.uep-uni-detail-modal,.uep-university-detail,.uep-uni-detail-panel')||document.body;
    const existing=document.getElementById('uep-08230-linked-tracks');if(existing)existing.remove();
    if(typeRows.length){const box=document.createElement('section');box.id='uep-08230-linked-tracks';box.className='uep-uni-summary-card';box.innerHTML='<small>주요 전형 · 선발방식</small>'+typeRows.slice(0,12).map(r=>'<div class="uep-uni-detail-line"><b>'+escapeHtml(String(r['전형명']||r['대전형']||''))+'</b><span>'+escapeHtml(String(r['평가구조요약']||''))+(r['수능최저']?'<br><em>수능최저 '+escapeHtml(String(r['수능최저']))+'</em>':'')+'</span></div>').join('');const summary=root.querySelector('.uep-uni-summary-section');if(summary)summary.insertBefore(box,summary.firstChild);}
    return ret;
  };}
  document.addEventListener('DOMContentLoaded',()=>{try{const list=activeUniversities();console.info('[UEP admissions] 56→53B/54/57 linked universities',list.length);}catch(e){}},{once:true});
})();\n`;

g += `\n/* UEP_08230_RELEASE_NOTES */\n(function(){const VERSION='0.82.30',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08230'))return;const o=document.createElement('div');o.id='uep-release-08230';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.30 수정사항</h2><ul><li>전형 이해의 53→53A→53B→54 연결과 오늘의 대학의 56→53B·54·57 연결을 한 번에 읽도록 정리했습니다.</li><li>오늘의 대학은 56_대학입시마스터의 새 U001~U068 및 노출순서를 기준으로 순환합니다.</li><li>대학 상세에 53B의 주요 전형·선발방식을 직접 표시하고 기존 내신산정·수능최저·권장과목 카드와 연결했습니다.</li><li>옛 U번호 하드코딩 대신 대학명+캠퍼스 연결을 사용해 대학번호 재정렬 후에도 상세정보가 끊기지 않습니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;

must(m.includes('53A_전형세부유형DB')&&m.includes('53B_전형유형별대학DB')&&m.includes('54_수능최저DB')&&m.includes('56_대학입시마스터')&&m.includes('57_내신산정DB'),'admissions graph ranges missing');
must(g.includes('UEP_08230_ADMISSIONS_FINAL_LINK')&&g.includes('uepAdmissionsGraph'),'renderer graph bridge missing');
fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(mp,m,'utf8');
console.log('UEP 0.82.30 admissions final link patched');
