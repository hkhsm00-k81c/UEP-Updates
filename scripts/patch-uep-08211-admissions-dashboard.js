const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root)throw new Error('usage: node patch-uep-08211-admissions-dashboard.js <app-root>');
const gPath=path.join(root,'resources','app','gyomuon.js');
const cssPath=path.join(root,'resources','app','gyomuon.css');
const mainPath=path.join(root,'resources','app','electron','main.cjs');
let g=fs.readFileSync(gPath,'utf8'),css=fs.readFileSync(cssPath,'utf8'),main=fs.readFileSync(mainPath,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};
must(g.includes('const APP_VERSION = "0.82.10";'),'0.82.10 version missing');
g=g.replace('const APP_VERSION = "0.82.10";','const APP_VERSION = "0.82.11";');
// Include admissions minimum/actual-result DBs in the same readonly full-read pipeline.
const entriesEnd='    ["56_대학입시마스터", "\'56_대학입시마스터\'!A1:R500"],\n  ];';
if(main.includes(entriesEnd))main=main.replace(entriesEnd,'    ["56_대학입시마스터", "\'56_대학입시마스터\'!A1:R500"],\n    ["54_수능최저DB", "\'54_수능최저DB\'!A1:U2000"],\n    ["55_대학입결DB", "\'55_대학입결DB\'!A1:K5000"],\n  ];');
const parseAnchor="  data['56_대학입시마스터']=data.universityAdmissions;";
must(main.includes(parseAnchor),'08210 admissions parse anchor missing');
main=main.replace(parseAnchor,parseAnchor+"\n  data.admissionMinimums=uep08210MatrixObjects(matrices['54_수능최저DB']);\n  data.admissionResults=uep08210MatrixObjects(matrices['55_대학입결DB']);\n  data['54_수능최저DB']=data.admissionMinimums;\n  data['55_대학입결DB']=data.admissionResults;");
const injected=String.raw`
/* UEP_08211_ADMISSIONS_COUNSELING_START */
(function(){
 if(typeof window==='undefined'||window.__UEP08211Admissions)return;window.__UEP08211Admissions=true;
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
 const cache=()=>{try{return(typeof readonlyCache!=='undefined'&&readonlyCache)||{};}catch{return{};}};
 const rows=(...keys)=>{const c=cache();for(const k of keys)if(Array.isArray(c[k]))return c[k];return[];};
 const active=r=>String(r?.['사용여부']??'Y').toUpperCase()!=='N';
 const basics=()=>rows('admissionBasics','52_대입기초').filter(active);
 const types=()=>rows('admissionTypes','53_전형이해').filter(active);
 const unis=()=>rows('universityAdmissions','56_대학입시마스터').filter(r=>String(r?.['사용여부']??'Y').toUpperCase()==='Y');
 const mins=()=>rows('admissionMinimums','54_수능최저DB');
 const results=()=>rows('admissionResults','55_대학입결DB');
 const day=n=>{if(!n)return 0;const d=new Date(),s=new Date(d.getFullYear(),0,0);return Math.floor((d-s)/86400000)%n;};
 function dialog(title,html){document.getElementById('uepAdmissionModal08210')?.remove();let m=document.createElement('div');m.id='uepAdmissionModal08210';m.className='uep-admission-modal uep-08211-modal';m.innerHTML='<div class="uep-admission-dialog"><header><div><small>UEP 대입상담</small><h2>'+esc(title)+'</h2></div><button type="button">×</button></header><div class="uep-admission-body">'+html+'</div></div>';document.body.appendChild(m);m.onclick=e=>{if(e.target===m||e.target.closest('header button'))m.remove();};}
 function basic(){const b=basics();const find=q=>b.find(x=>String(x['주제']||'').includes(q));dialog('대입 기초','<div class="uep-flow"><section><h3>대입</h3><div class="uep-two"><article><b>수시</b><p>학생부교과 · 학생부종합 · 논술 · 실기/실적</p><small>원서접수·전형시기, 지원 구조, 대학별 학생부 반영학기와 수능최저를 함께 확인합니다.</small></article><article><b>정시</b><p>수능 중심 선발</p><small>영역별 반영비율·가산점·학생부/면접 반영 여부는 대학별로 확인합니다.</small></article></div></section><section><h3>수시에서 꼭 확인할 것</h3><div class="uep-chiprow"><span>어떤 전형?</span><span>언제 지원?</span><span>내신 몇 학기?</span><span>수능최저?</span><span>서류·면접?</span></div></section><section><h3>1학년에서의 연결</h3><p>'+esc(find('선택과목')?.['상세설명']||'희망계열과 선택과목, 내신 추이, 수업·탐구, 모의고사를 함께 축적해 2·3학년 상담으로 연결합니다.')+'</p></section></div>');}
 const pattern=r=>{const s=[r['핵심평가'],r['주요평가자료'],r['한줄요약']].filter(Boolean).join(' ');let a=['내신'];if(/수능최저|최저/.test(s))a.push('수능최저');if(/서류|학생부/.test(s))a.push('서류');if(/면접/.test(s))a.push('면접');if(/논술/.test(s))a=['논술',...a.filter(x=>x!=='내신')];if(/수능/.test(s)&&String(r['전형유형']).includes('수능'))a=['수능'];return a.join(' + ');};
 function typeView(){const t=types();const groups=['학생부교과','학생부종합','수능위주','논술','실기/실적'];dialog('전형 이해','<div class="uep-type-tabs">'+groups.map(g=>'<section><h3>'+g+'</h3>'+t.filter(r=>String(r['전형유형']||'').includes(g.replace('위주',''))).map(r=>'<article><b>'+esc(pattern(r))+'</b><p>'+esc(r['핵심평가']||r['한줄요약']||'')+'</p><small>'+esc(r['상담체크']||'')+'</small></article>').join('')+'<div class="uep-university-patterns" data-type="'+g+'"><small>대학별 실제 전형·평가방식은 2028 공식자료 검증 DB와 연결해 표시합니다.</small></div></section>').join('')+'</div>');}
 function norm(s){return String(s||'').replace(/대학교/g,'대').replace(/\s|\(.*?\)/g,'');}
 function uni(){const us=unis(),u=us[day(us.length)];if(!u)return dialog('오늘의 대학','대학 자료 없음');const n=norm(u['대학명']);const mm=mins().filter(r=>norm(r['대학명'])===n);const rr=results().filter(r=>norm(r['대학명'])===n);const byType=[...new Set(mm.map(r=>r['전형유형']).filter(Boolean))];dialog(u['대학명'],'<div class="uep-uni-summary"><section><h3>전형 구조</h3><p>'+(byType.length?byType.map(esc).join(' · '):'연결된 2028 전형자료 확인 중')+'</p>'+mm.slice(0,12).map(r=>'<article><b>'+esc(r['전형유형'])+' · '+esc(r['전형명'])+'</b><span>'+esc(r['모집단위']||'전체')+'</span><small>수능최저: '+(String(r['배지사용여부']).toUpperCase()==='Y'?esc(r['수능최저원문']||'미적용'):'검증 중')+'</small></article>').join('')+'</section><section><h3>운호고 실제 입결</h3>'+(rr.length?rr.slice(0,12).map(r=>'<article><b>'+esc(r['모집단위'])+'</b><span>'+esc(r['전형명(대)'])+'</span><small>합격 '+esc(r['합격자수'])+'명 · 최저내신 '+esc(r['최저내신등급'])+'</small></article>').join(''):'<p>현재 연결된 운호고 실제 입결이 없습니다.</p>')+'</section><section><h3>상담 포인트</h3><p>'+esc(u['담임상담체크']||u['과목선택/교과포인트']||'')+'</p><small>'+esc(u['자료상태']||'')+' · '+esc(u['기준학년도']||'')+'</small></section></div>');}
 // Override 0.82.10 capture handler earlier in event path by binding window capture.
 window.addEventListener('click',e=>{const c=e.target.closest?.('[data-uep-admission-card-08210]');if(!c)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();[basic,typeView,uni][Number(c.dataset.uepAdmissionCard08210)]?.();},true);
 function fixTop(){const cs=[...document.querySelectorAll('[data-uep-admission-card-08210]')];if(cs.length!==3)return;const host=cs.map(c=>c.parentElement).find(p=>p&&cs.every(c=>p===c.parentElement));if(host){host.classList.add('uep-top-five-08211');host.style.maxWidth='100%';host.style.boxSizing='border-box';}cs.forEach(c=>{c.style.minWidth='0';c.style.maxWidth='100%';});}
 function fixCenter(){const panels=[...document.querySelectorAll('.uep-work-grid-08210')];panels.forEach(p=>{p.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';const checklist=[...p.children].find(x=>(x.innerText||'').includes('내 체크리스트'));if(checklist)checklist.remove();});}
 const apply=()=>{fixTop();fixCenter();};new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});setInterval(apply,2500);setTimeout(apply,200);
})();
/* UEP_08211_ADMISSIONS_COUNSELING_END */`;
g+='\n'+injected+'\n';
css+=String.raw`
/* UEP_08211_ADMISSIONS_COUNSELING_CSS */
.uep-top-five-08211{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:10px!important;width:100%!important;overflow:hidden!important}.uep-top-five-08211>*{min-width:0!important;width:auto!important}.uep-work-grid-08210{grid-template-columns:repeat(3,minmax(0,1fr))!important}.uep-08211-modal .uep-admission-dialog{width:min(1040px,94vw)!important;max-height:88vh}.uep-flow section,.uep-type-tabs section,.uep-uni-summary section{margin:0 0 18px}.uep-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.uep-two article,.uep-type-tabs article,.uep-uni-summary article{border:1px solid #dbe4ee;border-radius:12px;padding:12px;margin:8px 0}.uep-chiprow{display:flex;flex-wrap:wrap;gap:8px}.uep-chiprow span{border:1px solid #ccd8e5;border-radius:999px;padding:6px 10px}.uep-type-tabs{display:grid;grid-template-columns:1fr 1fr;gap:14px}.uep-type-tabs section:first-child{grid-column:1/-1}.uep-uni-summary{display:grid;grid-template-columns:1.15fr 1fr;gap:18px}.uep-uni-summary section:last-child{grid-column:1/-1}@media(max-width:1000px){.uep-top-five-08211{gap:6px!important}.uep-type-tabs,.uep-uni-summary{grid-template-columns:1fr}.uep-type-tabs section:first-child,.uep-uni-summary section:last-child{grid-column:auto}}
`;
fs.writeFileSync(gPath,g);fs.writeFileSync(cssPath,css);fs.writeFileSync(mainPath,main);
console.log('UEP 0.82.11 patch applied');