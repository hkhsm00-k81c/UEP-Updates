const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.39["'];/.test(g),'0.82.39 base not found');
must(g.includes('function uep08223TodayNav(university){'),'today nav missing');
must(g.includes('setTimeout(uep08223BindUniversityNavigation,0);'),'broken native binder call missing');
must(g.includes('/* UEP_08239_UNIVERSITY_NAV_BINDINGS */'),'0.82.39 wrapper marker missing');

// Version bump only after the exact 0.82.39 base has been validated.
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.39["'];/,()=> 'const APP_VERSION = "0.82.40";')
   .replace(/const CURRENT='0\.82\.39';/g,()=>"const CURRENT='0.82.40';");
if(fs.existsSync(pp)){
  const p=JSON.parse(fs.readFileSync(pp,'utf8'));
  p.version='0.82.40';
  fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');
}

// Remove the 0.82.39 post-render wrapper completely. Navigation must live in the native renderer.
const wrapperStart=g.indexOf('/* UEP_08239_UNIVERSITY_NAV_BINDINGS */');
const wrapperEnd=g.indexOf('/* UEP_08239_RELEASE_NOTES */',wrapperStart);
must(wrapperStart>=0&&wrapperEnd>wrapperStart,'0.82.39 wrapper block boundaries not found');
g=g.slice(0,wrapperStart)+g.slice(wrapperEnd);

const broken=`  openDashboardAdmissionDialogBase(name,body);\n  setTimeout(uep08223BindUniversityNavigation,0);\n}`;
const fixed=`  openDashboardAdmissionDialogBase(name,body);\n  const layer=document.querySelector('.dashboard-admission-layer');\n  if(!layer)return;\n  const openByName=targetName=>{\n    targetName=String(targetName||'').trim();\n    if(!targetName)return;\n    const all=dashboardAdmissionUniversities();\n    const row=all.find(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===dashboardAdmissionNormalizeUniversity(targetName));\n    if(row)openDashboardUniversityDetail(row);\n  };\n  layer.querySelectorAll('[data-uep-region]').forEach(button=>{\n    button.onclick=event=>{\n      event.preventDefault();event.stopPropagation();\n      const region=String(button.dataset.uepRegion||'').trim();\n      if(!region)return;\n      window.__uepAdmissionRegion=region;\n      const first=dashboardAdmissionUniversities().find(r=>uep08223UniversityRegions(r).includes(region));\n      if(first)openDashboardUniversityDetail(first);\n    };\n  });\n  layer.querySelectorAll('[data-uep-university]').forEach(button=>{\n    button.onclick=event=>{event.preventDefault();event.stopPropagation();openByName(button.dataset.uepUniversity);};\n  });\n  layer.querySelectorAll('[data-uep-prev]').forEach(button=>{\n    button.onclick=event=>{event.preventDefault();event.stopPropagation();openByName(button.dataset.uepPrev);};\n  });\n  layer.querySelectorAll('[data-uep-next]').forEach(button=>{\n    button.onclick=event=>{event.preventDefault();event.stopPropagation();openByName(button.dataset.uepNext);};\n  });\n}`;
must(g.includes(broken),'native detail tail not found exactly');
g=g.replace(broken,fixed);

// Keep the release note self-contained and do not add any wrapper/observer/global click handler.
g += `\n/* UEP_08240_RELEASE_NOTES */\n(function(){const VERSION='0.82.40',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08240'))return;const o=document.createElement('div');o.id='uep-release-08240';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.40 수정사항</h2><ul><li>오늘의 대학 상세의 지역·대학·이전·다음 탐색을 네이티브 상세 렌더러에서 직접 연결했습니다.</li><li>존재하지 않는 이전 binder 호출과 0.82.39 후처리 wrapper를 제거했습니다.</li><li>MutationObserver·전역 클릭 감지·DOM 텍스트 탐색 없이 실제 상세 팝업 버튼만 바인딩합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900);})();\n`;

must(!g.includes('setTimeout(uep08223BindUniversityNavigation,0);'),'broken binder call still present');
must(!g.includes('/* UEP_08239_UNIVERSITY_NAV_BINDINGS */'),'0.82.39 wrapper still present');
must(g.includes("layer.querySelectorAll('[data-uep-region]')"),'native region binding missing');
must(g.includes("layer.querySelectorAll('[data-uep-university]')"),'native university binding missing');
must(g.includes("layer.querySelectorAll('[data-uep-prev]')"),'native prev binding missing');
must(g.includes("layer.querySelectorAll('[data-uep-next]')"),'native next binding missing');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.40 native university navigation patched');
