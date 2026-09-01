const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root) throw new Error('usage: node patch-uep-08209-dashboard-data.js <app-root>');
const gPath=path.join(root,'resources','app','gyomuon.js');
const cssPath=path.join(root,'resources','app','gyomuon.css');
let g=fs.readFileSync(gPath,'utf8');
let css=fs.readFileSync(cssPath,'utf8');
if(!g.includes('const APP_VERSION = "0.82.08";')) throw new Error('APP_VERSION 0.82.08 marker missing');
g=g.replace('const APP_VERSION = "0.82.08";','const APP_VERSION = "0.82.09";');

const injected=String.raw`
/* UEP_08209_DASHBOARD_DATA_FIX_START */
(function(){
 if(typeof window==='undefined'||window.__UEP08209DashboardDataFix)return;window.__UEP08209DashboardDataFix=true;
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const arr=(...xs)=>xs.find(Array.isArray)||[];
 const cache=()=>window.readonlyCache||globalThis.readonlyCache||{};
 const order=x=>Number(x?.['노출순서']??x?.order??9999)||9999;
 const rows52=()=>{const c=cache();return arr(c.admissionBasics,c.admissionBasic,c['52_대입기초'],c.collegeBasics).filter(x=>String(x?.['사용여부']??x?.use??'Y').toUpperCase()!=='N')};
 const rows53=()=>{const c=cache();return arr(c.admissionTypes,c.admissionUnderstanding,c['53_전형이해'],c.collegeTypes).filter(x=>String(x?.['사용여부']??x?.use??'Y').toUpperCase()!=='N')};
 const rows56=()=>{const c=cache();return arr(c.universityAdmissions,c.admissionUniversities,c['56_대학입시마스터'],c.collegeMaster).filter(x=>String(x?.['사용여부']??x?.use??'Y').toUpperCase()==='Y')};
 function dayIndex(n){if(!n)return 0;const d=new Date(),start=new Date(d.getFullYear(),0,0);return Math.floor((d-start)/86400000)%n}
 function modal(title,body){document.getElementById('uepAdmissionModal08209')?.remove();const m=document.createElement('div');m.id='uepAdmissionModal08209';m.className='uep-admission-modal';m.innerHTML='<div class="uep-admission-dialog"><header><div><small>UEP 대입상담 참고</small><h2>'+esc(title)+'</h2></div><button type="button" aria-label="닫기">×</button></header><div class="uep-admission-body">'+body+'</div></div>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.closest('header button'))m.remove()})}
 function loading(title,sheet){modal(title,'<p>'+sheet+' 연결 데이터를 동기화하고 있습니다. 잠시 후 다시 열어 주세요.</p>')}
 function basicDetail(){const rows=rows52().slice().sort((a,b)=>order(a)-order(b));if(!rows.length)return loading('대입 기초','52_대입기초');modal('대입 기초',rows.map(r=>'<article><h3>'+esc(r['주제']||'')+'</h3><p>'+esc(r['상세설명']||r['카드요약']||'')+'</p><small>'+esc(r['상담포인트']||'')+'</small></article>').join(''))}
 function typeDetail(){const rows=rows53().slice().sort((a,b)=>order(a)-order(b));if(!rows.length)return loading('전형 이해','53_전형이해');modal('전형 이해',rows.map(r=>'<article><h3>'+esc(r['전형유형']||'')+'</h3><p>'+esc(r['한줄요약']||'')+'</p><small>'+esc(r['고1준비포인트']||r['상담체크']||'')+'</small></article>').join(''))}
 function uniDetail(){const us=rows56().slice().sort((a,b)=>order(a)-order(b)),u=us[dayIndex(us.length)];if(!u)return loading('오늘의 대학','56_대학입시마스터');modal(u['대학명']||'오늘의 대학','<article><h3>'+esc(u['카드한줄']||'')+'</h3><p>'+esc(u['수시핵심']||'')+'</p><p>'+esc(u['정시핵심']||'')+'</p><p>'+esc(u['과목선택/교과포인트']||'')+'</p><small>'+esc(u['자료상태']||'')+(u['수능최저요약']?' · '+esc(u['수능최저요약']):'')+'</small></article>')}
 function defs(){const b=rows52().slice().sort((a,b)=>order(a)-order(b))[0],t=rows53().slice().sort((a,b)=>order(a)-order(b))[0],us=rows56().slice().sort((a,b)=>order(a)-order(b)),u=us[dayIndex(us.length)];return [['대입 기초',b?.['주제']||'1학년 대입 기본',b?.['카드요약']||'과목선택·내신·모의 흐름을 함께 봅니다.',basicDetail],['전형 이해',t?.['전형유형']||'교과·종합·정시',t?.['한줄요약']||'전형별 평가방식을 구분해 봅니다.',typeDetail],['오늘의 대학',u?.['대학명']||'대학 정보',u?.['카드한줄']||'공식 시행계획 기준 상담 참고',uniDetail]]}
 function ensureAdmissions(){const cards=[...document.querySelectorAll('[data-uep-admission08208="1"],.uep-admission-kpi')];if(cards.length!==3)return false;const d=defs();cards.forEach((el,i)=>{el.innerHTML='<small>'+esc(d[i][0])+'</small><strong>'+esc(d[i][1])+'</strong><span>'+esc(d[i][2])+'</span>';el.onclick=d[i][3]});return true}
 function currentRole(){const c=cache();return String(window.currentUser?.role||window.currentUserRole||c.currentUser?.role||'')}
 function currentClass(){const c=cache();return Number(window.currentUser?.classNo||window.currentUser?.homeroomClass||c.currentUser?.classNo||0)||0}
 function isHomeroom(){return /담임/.test(currentRole())&&currentClass()>0}
 function reportRows(){try{return typeof dashboardReportStatusRows==='function'?(dashboardReportStatusRows()||[]):[]}catch{return []}}
 function missingRows(){return reportRows().filter(r=>/missing|미제출/i.test(String(r?.state??r?.status??r?.제출상태??'')))}
 function classNoOf(r){const raw=r?.classNo??r?.class??r?.반??r?.학급??r?.student?.classNo??r?.student?.class??r?.student?.반??'';const m=String(raw).match(/([1-9])\s*반?/);return m?Number(m[1]):(Number(raw)||0)}
 function studentNameOf(r){return String(r?.studentName??r?.name??r?.학생명??r?.성명??r?.student?.name??r?.student?.학생명??'').trim()}
 function missingByClass(){const map=new Map();for(let i=1;i<=9;i++)map.set(i,new Set());for(const r of missingRows()){const cn=classNoOf(r),nm=studentNameOf(r);if(cn>=1&&cn<=9&&nm)map.get(cn).add(nm)}return map}
 function reviewByClass(){const out=new Map();for(let i=1;i<=9;i++)out.set(i,0);const c=cache(),rows=arr(c.consultationCandidates,c.studentReviewCandidates,c.counselCandidates,c.discoveryStudents);for(const r of rows){const cn=classNoOf(r);if(cn>=1&&cn<=9)out.set(cn,(out.get(cn)||0)+1)}return out}
 function approvedNotices(){const c=cache(),rows=arr(c.gradeNotices,c.schoolNotices,c.notices,c.dashboardNotices);return rows.filter(r=>{const approved=String(r?.승인여부??r?.approved??r?.status??'').toUpperCase();const type=String(r?.유형??r?.type??r?.source??'');if(/자동|마감/.test(type))return /Y|승인|APPROVED/.test(approved);return !/N|미승인|대기|REJECT/.test(approved)})}
 function noticeHtml(){const rows=approvedNotices();if(!rows.length)return '<div class="uep-panel-empty"><strong>학년공지</strong><span>현재 게시 중인 학년공지가 없습니다.</span></div>';return '<div class="uep-notice-list">'+rows.slice(0,8).map(r=>'<button type="button"><b>'+esc(r?.제목??r?.title??r?.내용??r?.text??'학년공지')+'</b><span>'+esc(r?.마감일??r?.deadline??r?.date??'')+'</span></button>').join('')+'</div>'}
 function reviewHtml(){const cn=currentClass(),map=reviewByClass();if(isHomeroom())return '<div class="uep-panel-empty"><strong>'+cn+'반 학생 점검</strong><span>데이터 기반 점검 후보를 담임이 판단해 상담대상으로 확인합니다.</span></div>';return '<div class="uep-class-grid">'+[1,2,3,4,5,6,7,8,9].map(i=>'<button type="button"><b>'+i+'반</b><span>점검 참고 '+(map.get(i)||0)+'명</span></button>').join('')+'</div>'}
 function missingHtml(){const cn=currentClass(),map=missingByClass();if(isHomeroom()){const names=[...(map.get(cn)||new Set())];return names.length?'<div class="uep-student-mini-list">'+names.map(n=>'<button type="button">'+esc(n)+'</button>').join('')+'</div>':'<div class="uep-panel-empty">현재 확인된 미제출 학생이 없습니다.</div>'}return '<div class="uep-class-grid">'+[1,2,3,4,5,6,7,8,9].map(i=>'<button type="button"><b>'+i+'반</b><span>미제출 '+((map.get(i)||new Set()).size)+'명</span></button>').join('')+'</div>'}
 function ensurePanels(){const host=document.querySelector('[data-uep-dashboard-panels-08208="1"]');if(!host)return false;host.dataset.uepDashboardPanels08209='1';host.innerHTML='<div class="uep-dashboard-panels-head"><strong>학년업무 · 학생점검</strong></div><div class="uep-dashboard-panels-grid"><section><h3>학년공지</h3>'+noticeHtml()+'</section><section><h3>학생상담/점검</h3>'+reviewHtml()+'</section><section><h3>보고서 미제출 현황</h3>'+missingHtml()+'</section></div>';return true}
 let scheduled=false;function sync(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;ensureAdmissions();ensurePanels()},120)}
 new MutationObserver(sync).observe(document.documentElement,{childList:true,subtree:true});sync();setInterval(sync,3000);
})();
/* UEP_08209_DASHBOARD_DATA_FIX_END */
`;
g+='\n'+injected+'\n';
css+='\n/* UEP_08209_DASHBOARD_DATA_FIX_CSS */\n.uep-dashboard-panels-grid{min-height:226px!important}.uep-dashboard-panels-grid>section{overflow:visible!important}.uep-class-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-auto-rows:minmax(48px,auto);gap:6px!important}.uep-class-grid button{min-height:48px}.uep-notice-list{display:grid;gap:6px}.uep-notice-list button{border:1px solid #e1ebe7;background:#fff;border-radius:9px;padding:8px;text-align:left}.uep-notice-list b,.uep-notice-list span{display:block}.uep-notice-list span{font-size:10px;color:#6c7d78;margin-top:3px}\n';
for(const p of [path.join(root,'resources','app','package.json'),path.join(root,'package.json')]){if(!fs.existsSync(p))continue;try{const j=JSON.parse(fs.readFileSync(p,'utf8'));if(j.version==='0.82.08'){j.version='0.82.09';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n','utf8')}}catch{}}
fs.writeFileSync(gPath,g,'utf8');fs.writeFileSync(cssPath,css,'utf8');
console.log('UEP 0.82.09 dashboard data fix applied');
