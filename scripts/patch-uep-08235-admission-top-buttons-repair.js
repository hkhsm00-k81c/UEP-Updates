const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.34["'];/.test(g),'0.82.34 renderer base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.34["'];/,'const APP_VERSION = "0.82.35";').replace(/const CURRENT='0\.82\.34';/g,"const CURRENT='0.82.35';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.35';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// 0.82.34's document-capture matcher could treat the whole admissions quick-card group as '오늘의 대학'
// and swallow clicks for 대입기초/전형이해 as well. Break the literal matcher invisibly, then bind today's card directly.
g += `\n/* UEP_08235_ADMISSION_TOP_BUTTONS_REPAIR */\n(function(){
  const WJ='\u2060';
  const clean=t=>String(t||'').replace(/\u2060/g,'').replace(/\s+/g,' ').trim();
  const disguiseTodayLabel=()=>{
    const walker=document.createTreeWalker(document.body||document.documentElement,NodeFilter.SHOW_TEXT);
    let n; while((n=walker.nextNode())){
      if(!n.nodeValue||n.nodeValue.includes(WJ))continue;
      if(n.nodeValue.includes('오늘의 대학'))n.nodeValue=n.nodeValue.replace(/오늘의 대학/g,'오늘의 '+WJ+'대학');
    }
  };
  const smallestCard=(node,label)=>{
    let el=node&&node.parentElement; let best=null;
    for(let i=0;el&&i<8;i++,el=el.parentElement){
      const t=clean(el.textContent); if(!t.includes(label))continue;
      if(t.length<=120)best=el;
    }
    return best;
  };
  const bindToday=()=>{
    disguiseTodayLabel();
    const all=[...document.querySelectorAll('body *')];
    const labelEl=all.find(el=>{const t=clean(el.textContent);return t.includes('오늘의 대학')&&t.length<70;});
    if(!labelEl)return;
    const card=smallestCard(labelEl,'오늘의 대학')||labelEl;
    if(card.dataset.uep08235TodayBound==='1')return;
    card.dataset.uep08235TodayBound='1'; card.style.cursor='pointer';
    card.addEventListener('click',ev=>{
      ev.preventDefault(); ev.stopPropagation();
      try{
        const u=typeof dashboardAdmissionTodayUniversity==='function'?dashboardAdmissionTodayUniversity():null;
        if(u&&typeof openDashboardUniversityDetail==='function')return openDashboardUniversityDetail(u);
        if(typeof openDashboardAdmissionDialog==='function')return openDashboardAdmissionDialog('오늘의 대학','<p>56_대학입시마스터 자료를 읽지 못했습니다.</p>');
      }catch(err){console.error('[UEP 0.82.35] today university direct bind failed',err);}
    },false);
  };
  const repair=()=>{try{bindToday();}catch(e){console.error('[UEP 0.82.35] admissions top repair',e);}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(repair,200),{once:true}); else setTimeout(repair,200);
  new MutationObserver(()=>{clearTimeout(window.__uep08235AdmissionRepair);window.__uep08235AdmissionRepair=setTimeout(repair,80);}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
})();\n`;

g += `\n/* UEP_08235_RELEASE_NOTES */\n(function(){const VERSION='0.82.35',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08235'))return;const o=document.createElement('div');o.id='uep-release-08235';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.35 수정사항</h2><ul><li>0.82.34의 오늘의 대학 전역 클릭 감지가 대입기초·전형이해 클릭까지 막던 문제를 제거했습니다.</li><li>대입기초와 전형이해는 기존 고유 클릭 이벤트를 그대로 사용하도록 복구했습니다.</li><li>오늘의 대학은 해당 카드에만 직접 클릭 이벤트를 연결했습니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900);})();\n`;

must(g.includes('UEP_08235_ADMISSION_TOP_BUTTONS_REPAIR'),'repair marker missing');
must(g.includes("오늘의 '+WJ+'대학"),'literal matcher break missing');
must(g.includes('uep08235TodayBound'),'direct today bind missing');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.35 admissions top buttons repaired');
