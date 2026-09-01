const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root) throw new Error('usage: node patch-uep-08206-admission-dashboard.js <app-root>');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const gPath=path.join(root,'resources','app','gyomuon.js');
const cssPath=path.join(root,'resources','app','gyomuon.css');
let g=fs.readFileSync(gPath,'utf8');
let css=fs.readFileSync(cssPath,'utf8');
must(g.includes('const APP_VERSION = "0.82.05";'),'APP_VERSION 0.82.05 marker missing');
g=g.replace('const APP_VERSION = "0.82.05";','const APP_VERSION = "0.82.06";');

// Admissions dashboard overlay: keep the current dashboard layout, replace only the three report KPI cards.
// Build the injected source as plain lines so runtime template expressions are never evaluated by this patch script.
const injected=[
'/* UEP_08206_ADMISSION_DASHBOARD_START */',
'(function(){',
" if(typeof window==='undefined'||window.__UEP08206AdmissionDashboard)return;window.__UEP08206AdmissionDashboard=true;",
" const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[m]));",
" const arr=(...xs)=>xs.find(Array.isArray)||[];",
" function cache(){return window.readonlyCache||globalThis.readonlyCache||{};}",
" function rows52(){const c=cache();return arr(c.admissionBasics,c.admissionBasic,c['52_대입기초'],c.collegeBasics).filter(x=>String(x['사용여부']??x.use??'Y').toUpperCase()!=='N');}",
" function rows53(){const c=cache();return arr(c.admissionTypes,c.admissionUnderstanding,c['53_전형이해'],c.collegeTypes).filter(x=>String(x['사용여부']??x.use??'Y').toUpperCase()!=='N');}",
" function rows56(){const c=cache();return arr(c.universityAdmissions,c.admissionUniversities,c['56_대학입시마스터'],c.collegeMaster).filter(x=>String(x['사용여부']??x.use??'Y').toUpperCase()==='Y');}",
" function order(x){return Number(x['노출순서']??x.order??9999)||9999;}",
" function dayIndex(n){if(!n)return 0;const d=new Date(),start=new Date(d.getFullYear(),0,0);return Math.floor((d-start)/86400000)%n;}",
" function findCards(){return [...document.querySelectorAll('article,section,div,button')].filter(el=>{const t=(el.innerText||'').trim();return /제출완료|제출중|미제출/.test(t)&&t.length<180;}).sort((a,b)=>a.children.length-b.children.length);}",
" function modal(title,body){document.getElementById('uepAdmissionModal08206')?.remove();const m=document.createElement('div');m.id='uepAdmissionModal08206';m.className='uep-admission-modal';m.innerHTML='<div class=\"uep-admission-dialog\"><header><div><small>UEP 대입상담 참고</small><h2>'+esc(title)+'</h2></div><button type=\"button\" aria-label=\"닫기\">×</button></header><div class=\"uep-admission-body\">'+body+'</div></div>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.closest('header button'))m.remove()});}",
" function detailBasic(){const rows=rows52().slice().sort((a,b)=>order(a)-order(b));modal('대입 기초',rows.length?rows.map(r=>'<article><h3>'+esc(r['주제']||r.topic)+'</h3><p>'+esc(r['상세설명']||r.detail||r['카드요약']||'')+'</p><small>'+esc(r['상담포인트']||'')+'</small></article>').join(''):'<p>52_대입기초 연결 데이터를 불러오는 중입니다.</p>');}",
" function detailType(){const rows=rows53().slice().sort((a,b)=>order(a)-order(b));modal('전형 이해',rows.length?rows.map(r=>'<article><h3>'+esc(r['전형유형']||r.type)+'</h3><p>'+esc(r['한줄요약']||'')+'</p><small>'+esc(r['고1준비포인트']||r['상담체크']||'')+'</small></article>').join(''):'<p>53_전형이해 연결 데이터를 불러오는 중입니다.</p>');}",
" function detailUni(u){if(!u)return modal('오늘의 대학','<p>56_대학입시마스터 연결 데이터를 불러오는 중입니다.</p>');const status=esc(u['자료상태']||'');const min=esc(u['수능최저요약']||'');modal(u['대학명']||'오늘의 대학','<article><h3>'+esc(u['카드한줄']||'')+'</h3><p>'+esc(u['수시핵심']||'')+'</p><p>'+esc(u['과목선택/교과포인트']||'')+'</p><small>'+status+(status&&min?' · ':'')+min+'</small></article>');}",
" function install(){const candidates=findCards(),labels=['제출완료','제출중','미제출'];const picked=[];for(const label of labels){const el=candidates.find(x=>(x.innerText||'').includes(label)&&!picked.includes(x));if(el)picked.push(el);}if(picked.length!==3)return false;const b=rows52().slice().sort((a,b)=>order(a)-order(b))[0],t=rows53().slice().sort((a,b)=>order(a)-order(b))[0],us=rows56().slice().sort((a,b)=>order(a)-order(b)),u=us[dayIndex(us.length)];const defs=[['대입 기초',b?.['주제']||'1학년 대입 기본',b?.['카드요약']||'과목선택·내신·모의 흐름을 함께 봅니다.',detailBasic],['전형 이해',t?.['전형유형']||'교과·종합·정시',t?.['한줄요약']||'전형별 평가방식을 구분해 봅니다.',detailType],['오늘의 대학',u?.['대학명']||'대학 정보',u?.['카드한줄']||'공식 시행계획 기준 상담 참고',()=>detailUni(u)]];picked.forEach((el,i)=>{if(el.dataset.uepAdmission08206)return;el.dataset.uepAdmission08206='1';el.classList.add('uep-admission-kpi');el.innerHTML='<small>'+esc(defs[i][0])+'</small><strong>'+esc(defs[i][1])+'</strong><span>'+esc(defs[i][2])+'</span>';el.onclick=defs[i][3];});return true;}",
" let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(timer)},500);",
" document.addEventListener('click',()=>setTimeout(install,80));",
'})();',
'/* UEP_08206_ADMISSION_DASHBOARD_END */'
].join('\n');
g+='\n'+injected+'\n';
css+='\n/* UEP_08206_ADMISSION_DASHBOARD_CSS */\n.uep-admission-kpi{cursor:pointer!important}.uep-admission-kpi small,.uep-admission-kpi strong,.uep-admission-kpi span{display:block}.uep-admission-kpi strong{font-size:15px;margin:4px 0}.uep-admission-kpi span{font-size:11px;line-height:1.35;opacity:.78}.uep-admission-modal{position:fixed;inset:0;z-index:2147483020;background:rgba(20,31,35,.42);display:flex;align-items:center;justify-content:center;padding:24px}.uep-admission-dialog{width:min(760px,94vw);max-height:82vh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 28px 80px rgba(0,0,0,.24)}.uep-admission-dialog header{position:sticky;top:0;background:#fff;display:flex;justify-content:space-between;align-items:center;padding:20px 22px;border-bottom:1px solid #e5ecea;z-index:1}.uep-admission-dialog header h2{margin:3px 0 0}.uep-admission-dialog header small{color:#71827d}.uep-admission-dialog header button{border:0;background:#eef4f2;border-radius:50%;width:36px;height:36px;font-size:22px;cursor:pointer}.uep-admission-body{padding:18px 22px;display:grid;gap:10px}.uep-admission-body article{border:1px solid #e3ebe8;border-radius:14px;padding:14px 16px}.uep-admission-body h3{margin:0 0 7px}.uep-admission-body p{margin:5px 0;line-height:1.55}.uep-admission-body small{display:block;margin-top:8px;color:#667873;line-height:1.45}\n';
for(const p of [path.join(root,'resources','app','package.json'),path.join(root,'package.json')]){if(fs.existsSync(p)){try{const j=JSON.parse(fs.readFileSync(p,'utf8'));if(j.version==='0.82.05'){j.version='0.82.06';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n','utf8')}}catch{}}}
fs.writeFileSync(gPath,g,'utf8');
fs.writeFileSync(cssPath,css,'utf8');
console.log('UEP 0.82.06 admissions dashboard patch applied');
