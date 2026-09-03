const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.33["'];/.test(g),'0.82.33 clean base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.33["'];/,()=> 'const APP_VERSION = "0.82.37";')
   .replace(/const CURRENT='0\.82\.33';/g,()=>"const CURRENT='0.82.37';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.37';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// Remove the temporary 0.82.33 document-wide today-university capture listener only.
const bad=/\n\s*\/\/ Repair the dashboard '오늘의 대학' card[\s\S]*?document\.addEventListener\('click',function\(e\)\{[\s\S]*?\n\s*\},true\);/;
must(bad.test(g),'0.82.33 temporary today-university capture listener not found');
g=g.replace(bad,()=>"\n  // UEP 0.82.37: temporary global capture listener removed; native router handles all three cards.");

// Replace the one native shared admissions binding. IMPORTANT: function replacer preserves literal $$.
const old="$$('[data-dashboard-admission]').forEach(button=>button.onclick=event=>{event.preventDefault();event.stopPropagation();({basics:openDashboardAdmissionBasics,types:openDashboardAdmissionTypes,university:()=>openDashboardUniversityDetail()}[button.dataset.dashboardAdmission])?.();});";
must(g.includes(old),'native dashboard admission binding not found');
const native="$$('[data-dashboard-admission]').forEach(button=>button.onclick=event=>{event.preventDefault();event.stopPropagation();const key=button.dataset.dashboardAdmission;if(key==='basics')return openDashboardAdmissionBasics();if(key==='types')return openDashboardAdmissionTypes();if(key==='university'){window.__uepAdmissionReturn='today';window.__uepAdmissionRegion='';const u=dashboardAdmissionTodayUniversity();if(u)return openDashboardUniversityDetail(u);return openDashboardAdmissionDialog('오늘의 대학','<p>56_대학입시마스터 자료를 읽지 못했습니다.</p>');}});";
g=g.replace(old,()=>native);

// Runtime safety checks: require the literal $$ helper and reject only a standalone single-$ call.
must(g.includes("$$('[data-dashboard-admission]').forEach"),'literal $$ admissions selector missing after replacement');
must(!/(?<!\$)\$\('\[data-dashboard-admission\]'\)\.forEach/.test(g),'standalone single-$ admissions selector regression detected');

g += `\n/* UEP_08237_NATIVE_ADMISSIONS_ROUTER_CLEAN */\n// Clean rebuild from v0.82.33. One native data-dashboard-admission router; no DOM-wide click patch.\n`;
g += `\n/* UEP_08237_RELEASE_NOTES */\n(function(){const VERSION='0.82.37',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08237'))return;const o=document.createElement('div');o.id='uep-release-08237';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.37 수정사항</h2><ul><li>0.82.36의 대시보드 로딩 오류($ selector 회귀)를 수정했습니다.</li><li>v0.82.33 clean 기준으로 입시 상단 3카드를 네이티브 data-dashboard-admission 라우터 하나에 연결했습니다.</li><li>대입기초·전형이해는 기존 동작을 유지하고, 오늘의 대학만 56_대학입시마스터의 오늘 대학 행을 직접 전달합니다.</li><li>전역 클릭 감지·MutationObserver·텍스트 변형 방식은 포함하지 않습니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900);})();\n`;

fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.37 clean native admissions router patched');
