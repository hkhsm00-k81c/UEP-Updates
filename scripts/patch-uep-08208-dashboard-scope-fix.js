const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root) throw new Error('usage: node patch-uep-08208-dashboard-scope-fix.js <app-root>');
const gPath=path.join(root,'resources','app','gyomuon.js');
const cssPath=path.join(root,'resources','app','gyomuon.css');
let g=fs.readFileSync(gPath,'utf8');
let css=fs.readFileSync(cssPath,'utf8');
if(!g.includes('const APP_VERSION = "0.82.07";')) throw new Error('APP_VERSION 0.82.07 marker missing');

// Remove the 0.82.07 overlay that could select an ancestor containing the whole dashboard.
g=g.replace(/\n?\/\* UEP_08207_DASHBOARD_PANELS_START \*\/[\s\S]*?\/\* UEP_08207_DASHBOARD_PANELS_END \*\/\n?/g,'\n');
css=css.replace(/\n?\/\* UEP_08207_DASHBOARD_PANELS_CSS \*\/[\s\S]*?(?=\n\/\*|$)/g,'\n');
g=g.replace('const APP_VERSION = "0.82.07";','const APP_VERSION = "0.82.08";');

const injected=[
'/* UEP_08208_DASHBOARD_SCOPE_FIX_START */',
'(function(){',
" if(typeof window==='undefined'||window.__UEP08208DashboardScopeFix)return;window.__UEP08208DashboardScopeFix=true;",
" const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[m]));",
" const arr=(...xs)=>xs.find(Array.isArray)||[];",
" const cache=()=>window.readonlyCache||globalThis.readonlyCache||{};",
" const order=x=>Number(x?.['노출순서']??x?.order??9999)||9999;",
" function rows52(){const c=cache();return arr(c.admissionBasics,c.admissionBasic,c['52_대입기초'],c.collegeBasics).filter(x=>String(x?.['사용여부']??x?.use??'Y').toUpperCase()!=='N');}",
" function rows53(){const c=cache();return arr(c.admissionTypes,c.admissionUnderstanding,c['53_전형이해'],c.collegeTypes).filter(x=>String(x?.['사용여부']??x?.use??'Y').toUpperCase()!=='N');}",
" function rows56(){const c=cache();return arr(c.universityAdmissions,c.admissionUniversities,c['56_대학입시마스터'],c.collegeMaster).filter(x=>String(x?.['사용여부']??x?.use??'Y').toUpperCase()==='Y');}",
" function dayIndex(n){if(!n)return 0;const d=new Date(),start=new Date(d.getFullYear(),0,0);return Math.floor((d-start)/86400000)%n;}",
" function modal(title,body){document.getElementById('uepAdmissionModal08208')?.remove();const m=document.createElement('div');m.id='uepAdmissionModal08208';m.className='uep-admission-modal';m.innerHTML='<div class=\"uep-admission-dialog\"><header><div><small>UEP 상담 참고</small><h2>'+esc(title)+'</h2></div><button type=\"button\" aria-label=\"닫기\">×</button></header><div class=\"uep-admission-body\">'+body+'</div></div>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.closest('header button'))m.remove()});}",
" function basicDetail(){const rows=rows52().slice().sort((a,b)=>order(a)-order(b));modal('대입 기초',rows.length?rows.map(r=>'<article><h3>'+esc(r['주제']||r.topic||'')+'</h3><p>'+esc(r['상세설명']||r.detail||r['카드요약']||'')+'</p><small>'+esc(r['상담포인트']||'')+'</small></article>').join(''):'<p>52_대입기초 데이터를 불러오는 중입니다.</p>');}",
" function typeDetail(){const rows=rows53().slice().sort((a,b)=>order(a)-order(b));modal('전형 이해',rows.length?rows.map(r=>'<article><h3>'+esc(r['전형유형']||r.type||'')+'</h3><p>'+esc(r['한줄요약']||'')+'</p><small>'+esc(r['고1준비포인트']||r['상담체크']||'')+'</small></article>').join(''):'<p>53_전형이해 데이터를 불러오는 중입니다.</p>');}",
" function uniDetail(u){if(!u)return modal('오늘의 대학','<p>56_대학입시마스터 데이터를 불러오는 중입니다.</p>');const status=esc(u['자료상태']||''),min=esc(u['수능최저요약']||'');modal(u['대학명']||'오늘의 대학','<article><h3>'+esc(u['카드한줄']||'')+'</h3><p>'+esc(u['수시핵심']||'')+'</p><p>'+esc(u['과목선택/교과포인트']||'')+'</p><small>'+status+(status&&min?' · ':'')+min+'</small></article>');}",
" function admissionDefs(){const b=rows52().slice().sort((a,b)=>order(a)-order(b))[0],t=rows53().slice().sort((a,b)=>order(a)-order(b))[0],us=rows56().slice().sort((a,b)=>order(a)-order(b)),u=us[dayIndex(us.length)];return [['대입 기초',b?.['주제']||'1학년 대입 기본',b?.['카드요약']||'과목선택·내신·모의 흐름을 함께 봅니다.',basicDetail],['전형 이해',t?.['전형유형']||'교과·종합·정시',t?.['한줄요약']||'전형별 평가방식을 구분해 봅니다.',typeDetail],['오늘의 대학',u?.['대학명']||'대학 정보',u?.['카드한줄']||'공식 시행계획 기준 상담 참고',()=>uniDetail(u)]];}",
" function ensureAdmissions(){const labels=['제출완료','제출중','미제출'],defs=admissionDefs();const nodes=[...document.querySelectorAll('article,section,div,button')],picked=[];for(const label of labels){const candidates=nodes.filter(el=>{const t=(el.innerText||'').trim();return t.includes(label)&&t.length<180&&!picked.includes(el);}).sort((a,b)=>a.children.length-b.children.length);if(candidates[0])picked.push(candidates[0]);}if(picked.length!==3)return false;picked.forEach((el,i)=>{el.dataset.uepAdmission08208='1';el.classList.add('uep-admission-kpi');el.innerHTML='<small>'+esc(defs[i][0])+'</small><strong>'+esc(defs[i][1])+'</strong><span>'+esc(defs[i][2])+'</span>';el.onclick=defs[i][3];});return true;}",
" function currentRole(){const c=cache();return String(window.currentUser?.role||window.currentUserRole||c.currentUser?.role||'');}",
" function currentClass(){const c=cache();return Number(window.currentUser?.classNo||window.currentUser?.homeroomClass||c.currentUser?.classNo||0)||0;}",
" function isHomeroom(){return /담임/.test(currentRole())&&currentClass()>0;}",
" function reportRows(){try{return typeof dashboardReportStatusRows==='function'?(dashboardReportStatusRows()||[]):[];}catch{return [];}}",
" function missingRows(){return reportRows().filter(r=>String(r?.state??r?.status??r?.제출상태??'').toLowerCase().includes('missing')||/미제출/.test(String(r?.state??r?.status??r?.제출상태??'')));}",
" function missingByClass(){const map=new Map();for(let i=1;i<=9;i++)map.set(i,new Set());for(const r of missingRows()){const cn=Number(r?.classNo??r?.class??r?.반??0)||0,nm=String(r?.studentName??r?.name??r?.학생명??r?.성명??'').trim();if(cn>=1&&cn<=9&&nm)map.get(cn).add(nm);}return map;}",
" function consultationByClass(){const out=new Map();for(let i=1;i<=9;i++)out.set(i,0);const c=cache(),rows=arr(c.consultationCandidates,c.studentReviewCandidates,c.counselCandidates,c.discoveryStudents);for(const r of rows){const cn=Number(r?.반??r?.classNo??r?.class??0)||0;if(cn>=1&&cn<=9)out.set(cn,(out.get(cn)||0)+1);}return out;}",
" function noticeHtml(){return '<div class=\"uep-panel-empty\"><strong>학년 공지</strong><span>게시 중 직접공지와 자동 마감공지를 함께 확인합니다.</span></div>';}",
" function reviewHtml(){const cn=currentClass(),map=consultationByClass();if(isHomeroom())return '<div class=\"uep-panel-empty\"><strong>'+cn+'반 학생 점검</strong><span>데이터 기반 점검 후보를 담임이 판단해 상담대상으로 확인합니다.</span></div>';return '<div class=\"uep-class-grid\">'+[1,2,3,4,5,6,7,8,9].map(i=>'<button type=\"button\"><b>'+i+'반</b><span>점검 참고 '+(map.get(i)||0)+'명</span></button>').join('')+'</div>';}",
" function missingHtml(){const cn=currentClass(),map=missingByClass();if(isHomeroom()){const names=[...(map.get(cn)||new Set())];return names.length?'<div class=\"uep-student-mini-list\">'+names.map(n=>'<button type=\"button\">'+esc(n)+'</button>').join('')+'</div>':'<div class=\"uep-panel-empty\">현재 확인된 미제출 학생이 없습니다.</div>';}return '<div class=\"uep-class-grid\">'+[1,2,3,4,5,6,7,8,9].map(i=>'<button type=\"button\"><b>'+i+'반</b><span>미제출 '+((map.get(i)||new Set()).size)+'명</span></button>').join('')+'</div>';}",
" function directText(el){return [...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent||'').join(' ').trim();}",
" function safeWorkPanel(){const all=[...document.querySelectorAll('section,article,div')];const titleNodes=all.filter(el=>{const own=directText(el),txt=(el.innerText||'').trim();return own==='학교업무공지·마감'||txt==='학교업무공지·마감';});const candidates=[];for(const title of titleNodes){let p=title;for(let i=0;i<5&&p;i++,p=p.parentElement){const t=(p.innerText||'').trim();if(!t.includes('게시 중 직접공지')||!t.includes('자동 마감공지')||!t.includes('상담 필요')||!t.includes('내 체크리스트'))continue;if(/오늘의 프로그램|내 주간시간표|학교 캘린더|링크 메뉴|실행 메뉴/.test(t))continue;if(t.length>5000)continue;candidates.push(p);break;}}return candidates.sort((a,b)=>(a.innerText||'').length-(b.innerText||'').length)[0]||null;}",
" function ensurePanels(){let host=document.querySelector('[data-uep-dashboard-panels-08208=\"1\"]');if(!host){host=safeWorkPanel();if(!host)return false;host.dataset.uepDashboardPanels08208='1';host.innerHTML='<div class=\"uep-dashboard-panels-head\"><strong>학년업무 · 학생점검</strong></div><div class=\"uep-dashboard-panels-grid\"><section><h3>학년공지</h3>'+noticeHtml()+'</section><section><h3>학생상담/점검</h3>'+reviewHtml()+'</section><section><h3>보고서 미제출 현황</h3>'+missingHtml()+'</section></div>';return true;}return true;}",
" let scheduled=false;function sync(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;ensureAdmissions();ensurePanels();},100);}",
" const mo=new MutationObserver(sync);mo.observe(document.documentElement,{childList:true,subtree:true});sync();setInterval(sync,2500);",
'})();',
'/* UEP_08208_DASHBOARD_SCOPE_FIX_END */'
].join('\n');
g+='\n'+injected+'\n';

css+='\n/* UEP_08208_DASHBOARD_SCOPE_FIX_CSS */\n.uep-dashboard-panels-head{display:flex;align-items:center;padding:8px 12px;border-bottom:1px solid #e4ece9}.uep-dashboard-panels-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));min-height:190px}.uep-dashboard-panels-grid>section{padding:12px;border-right:1px solid #e6eeeb;overflow:auto}.uep-dashboard-panels-grid>section:last-child{border-right:0}.uep-dashboard-panels-grid h3{margin:0 0 10px;font-size:13px}.uep-class-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.uep-class-grid button,.uep-student-mini-list button{border:1px solid #e1ebe7;background:#fff;border-radius:9px;padding:7px;cursor:pointer;text-align:left}.uep-class-grid button b,.uep-class-grid button span{display:block}.uep-class-grid button span{font-size:10px;margin-top:2px;color:#6c7d78}.uep-student-mini-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.uep-panel-empty{display:grid;gap:5px;padding:12px;border-radius:10px;background:#f7faf9;color:#6b7a76;font-size:11px}.uep-admission-kpi{cursor:pointer!important}\n';

for(const p of [path.join(root,'resources','app','package.json'),path.join(root,'package.json')]){if(!fs.existsSync(p))continue;try{const j=JSON.parse(fs.readFileSync(p,'utf8'));if(j.version==='0.82.07'){j.version='0.82.08';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n','utf8');}}catch{}}
fs.writeFileSync(gPath,g,'utf8');fs.writeFileSync(cssPath,css,'utf8');
console.log('UEP 0.82.08 dashboard scope fix applied');
