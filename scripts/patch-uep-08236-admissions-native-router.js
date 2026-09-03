const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.33["'];/.test(g),'0.82.33 clean base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.33["'];/,'const APP_VERSION = "0.82.36";').replace(/const CURRENT='0\.82\.33';/g,"const CURRENT='0.82.36';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.36';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// Remove only the 0.82.33 temporary global capture listener for '오늘의 대학'.
// Keep the track-first renderer itself.
const bad=/\n\s*\/\/ Repair the dashboard '오늘의 대학' card[\s\S]*?document\.addEventListener\('click',function\(e\)\{[\s\S]*?\n\s*\},true\);/;
must(bad.test(g),'0.82.33 temporary today-university capture listener not found');
g=g.replace(bad,'\n  // UEP 0.82.36: temporary global capture listener removed; native router handles all three cards.');

// Replace the native shared admission-card binding with one explicit router.
const old="$$('[data-dashboard-admission]').forEach(button=>button.onclick=event=>{event.preventDefault();event.stopPropagation();({basics:openDashboardAdmissionBasics,types:openDashboardAdmissionTypes,university:()=>openDashboardUniversityDetail()}[button.dataset.dashboardAdmission])?.();});";
must(g.includes(old),'native dashboard admission binding not found');
const native="$$('[data-dashboard-admission]').forEach(button=>button.onclick=event=>{event.preventDefault();event.stopPropagation();const key=button.dataset.dashboardAdmission;if(key==='basics')return openDashboardAdmissionBasics();if(key==='types')return openDashboardAdmissionTypes();if(key==='university'){window.__uepAdmissionReturn='today';window.__uepAdmissionRegion='';const u=dashboardAdmissionTodayUniversity();if(u)return openDashboardUniversityDetail(u);return openDashboardAdmissionDialog('오늘의 대학','<p>56_대학입시마스터 자료를 읽지 못했습니다.</p>');}});";
g=g.replace(old,native);

g += `\n/* UEP_08236_NATIVE_ADMISSIONS_ROUTER */\n// No document-wide click interception, no MutationObserver, no text-node rewriting.\n`;
g += `\n/* UEP_08236_RELEASE_NOTES */\n(function(){const VERSION='0.82.36',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08236'))return;const o=document.createElement('div');o.id='uep-release-08236';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.36 수정사항</h2><ul><li>대입기초·전형이해·오늘의 대학 3개 카드를 원래 data-dashboard-admission 네이티브 라우터 하나로 통합했습니다.</li><li>0.82.33~0.82.35에서 추가된 오늘의 대학 전역 클릭 감지·DOM 문자 변형·MutationObserver 방식은 사용하지 않습니다.</li><li>오늘의 대학은 56_대학입시마스터에서 오늘 대학 행을 직접 넘겨 대학 상세를 엽니다.</li><li>전형 이해의 대학명 · 실제 전형명 구조는 유지합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900);})();\n`;

must(g.includes('UEP_08236_NATIVE_ADMISSIONS_ROUTER'),'native router marker missing');
must(g.includes("if(key==='university'){window.__uepAdmissionReturn='today'"),'explicit university native route missing');
must(!g.includes("Repair the dashboard '오늘의 대학' card even if its old inline binding was lost."),'temporary global capture comment remains');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.36 native admissions router patched');