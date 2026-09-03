const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.33["'];/.test(g),'0.82.33 renderer base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.33["'];/,'const APP_VERSION = "0.82.34";').replace(/const CURRENT='0\.82\.33';/g,"const CURRENT='0.82.34';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.34';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

g += `\n/* UEP_08234_TODAY_UNIVERSITY_CLICK_HARD_FIX */\n(function(){
  const norm=t=>String(t||'').replace(/\\s+/g,' ').trim();
  const isBlocked=el=>!!(el&&el.closest&&el.closest('.uep-release-overlay,.admission-learning-flow,.uep-uni-detail-modal,.uep-university-detail,[role="dialog"]'));
  const openToday=()=>{try{const u=typeof dashboardAdmissionTodayUniversity==='function'?dashboardAdmissionTodayUniversity():null;if(u&&typeof openDashboardUniversityDetail==='function')return openDashboardUniversityDetail(u);if(typeof openDashboardAdmissionDialog==='function')return openDashboardAdmissionDialog('오늘의 대학','<p>56_대학입시마스터 자료를 읽지 못했습니다.</p>');}catch(err){console.error('[UEP 0.82.34] today university open failed',err);}};
  const findCard=start=>{
    let el=start&&start.nodeType===1?start:start&&start.parentElement;
    for(let i=0;el&&i<10;i++,el=el.parentElement){
      if(isBlocked(el))return null;
      const t=norm(el.textContent);
      if(t.includes('오늘의 대학')&&t.length<180)return el;
    }
    return null;
  };
  document.addEventListener('click',e=>{const card=findCard(e.target);if(!card)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openToday();},true);
  const bind=()=>{document.querySelectorAll('body *').forEach(el=>{if(el.dataset&&el.dataset.uepTodayUniversityBound==='1')return;const t=norm(el.textContent);if(!t.includes('오늘의 대학')||t.length>=180||isBlocked(el))return;const childMatch=[...el.children].some(ch=>{const ct=norm(ch.textContent);return ct.includes('오늘의 대학')&&ct.length<t.length;});if(childMatch)return;el.dataset.uepTodayUniversityBound='1';el.style.cursor='pointer';el.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();openToday();},true);});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,300),{once:true});else setTimeout(bind,300);
  new MutationObserver(()=>{clearTimeout(window.__uepTodayUniBindTimer);window.__uepTodayUniBindTimer=setTimeout(bind,100);}).observe(document.documentElement,{childList:true,subtree:true});
})();\n`;

g += `\n/* UEP_08234_RELEASE_NOTES */\n(function(){const VERSION='0.82.34',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08234'))return;const o=document.createElement('div');o.id='uep-release-08234';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.34 수정사항</h2><ul><li>대시보드 오늘의 대학 카드가 div/span 구조여도 클릭을 직접 감지하도록 수정했습니다.</li><li>대시보드가 다시 렌더링되어도 MutationObserver로 오늘의 대학 클릭 바인딩을 자동 복구합니다.</li><li>전형 이해의 대학명 · 실제 전형명 표시는 그대로 유지합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;

must(g.includes('UEP_08234_TODAY_UNIVERSITY_CLICK_HARD_FIX'),'hard fix marker missing');
must(g.includes("t.includes('오늘의 대학')&&t.length<180"),'ancestor click matcher missing');
must(g.includes('new MutationObserver'),'rebinding observer missing');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.34 today university click hard fix patched');
