const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.38["'];/.test(g),'0.82.38 base not found');
must(/function\s+uep08223UniversityRegions\s*\(/.test(g),'0.82.38 region helper missing');
must(g.includes('function uep08223TodayNav(university){'),'today nav missing');
must(!g.includes('UEP_08239_UNIVERSITY_NAV_BINDINGS'),'0.82.39 patch already applied');

g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.38["'];/,()=> 'const APP_VERSION = "0.82.39";')
   .replace(/const CURRENT='0\.82\.38';/g,()=>"const CURRENT='0.82.39';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.39';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

const patch=`
/* UEP_08239_UNIVERSITY_NAV_BINDINGS */
function uep08239BindUniversityNavigation(){
  const layer=document.querySelector('.dashboard-admission-layer');
  if(!layer)return;
  const openByName=name=>{
    name=String(name||'').trim();
    if(!name)return;
    if(typeof openDashboardAdmissionUniversityByName==='function')return openDashboardAdmissionUniversityByName(name);
    const all=typeof dashboardAdmissionUniversities==='function'?dashboardAdmissionUniversities():[];
    const row=all.find(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===dashboardAdmissionNormalizeUniversity(name));
    if(row&&typeof openDashboardUniversityDetail==='function')return openDashboardUniversityDetail(row);
  };
  layer.querySelectorAll('[data-uep-university]').forEach(btn=>{
    btn.onclick=e=>{e.preventDefault();e.stopPropagation();openByName(btn.dataset.uepUniversity);};
  });
  layer.querySelectorAll('[data-uep-prev]').forEach(btn=>{
    btn.onclick=e=>{e.preventDefault();e.stopPropagation();openByName(btn.dataset.uepPrev);};
  });
  layer.querySelectorAll('[data-uep-next]').forEach(btn=>{
    btn.onclick=e=>{e.preventDefault();e.stopPropagation();openByName(btn.dataset.uepNext);};
  });
  layer.querySelectorAll('[data-uep-region]').forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();e.stopPropagation();
      const region=String(btn.dataset.uepRegion||'').trim();
      if(!region)return;
      window.__uepAdmissionRegion=region;
      const all=typeof dashboardAdmissionUniversities==='function'?dashboardAdmissionUniversities():[];
      const first=all.find(r=>uep08223UniversityRegions(r).includes(region));
      if(first)openByName(first['대학명']);
    };
  });
}
(function(){
  const original=typeof openDashboardUniversityDetail==='function'?openDashboardUniversityDetail:null;
  if(!original)return;
  openDashboardUniversityDetail=function(university=dashboardAdmissionTodayUniversity()){
    const ret=original(university);
    uep08239BindUniversityNavigation();
    return ret;
  };
})();
`;
g += '\n'+patch;

g += `\n/* UEP_08239_RELEASE_NOTES */\n(function(){const VERSION='0.82.39',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08239'))return;const o=document.createElement('div');o.id='uep-release-08239';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.39 수정사항</h2><ul><li>오늘의 대학 상세 상단의 지역·대학·이전·다음 버튼에 실제 클릭 동작을 연결했습니다.</li><li>0.82.38에서 복구한 지역 판별 함수와 실제 대학 탐색을 직접 연결했습니다.</li><li>전역 클릭 감지나 MutationObserver 없이 대학 상세 팝업 내부 버튼에만 이벤트를 연결합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900);})();\n`;

must(g.includes('function uep08239BindUniversityNavigation(){'),'binding function insertion failed');
must(g.includes("querySelectorAll('[data-uep-region]')"),'region binding missing');
must(g.includes("querySelectorAll('[data-uep-university]')"),'university binding missing');
must(g.includes("querySelectorAll('[data-uep-prev]')"),'prev binding missing');
must(g.includes("querySelectorAll('[data-uep-next]')"),'next binding missing');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.39 university detail navigation bindings restored');
