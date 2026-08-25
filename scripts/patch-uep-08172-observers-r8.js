const fs=require('fs');
const path='app/resources/app/gyomuon.js';
let g=fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const rep=(from,to,label)=>{must(g.includes(from),'missing '+label);must(g.indexOf(from)===g.lastIndexOf(from),'non-unique '+label);g=g.replace(from,to)};

// 1) Run legacy visual refinements only after canonical render instead of watching the entire document forever.
rep(
`  const obs=new MutationObserver(()=>requestAnimationFrame(refineGrowthProfile));\n  obs.observe(document.documentElement,{childList:true,subtree:true});\n  setTimeout(refineGrowthProfile,0);`,
`  window.__uepRefineGrowth089=refineGrowthProfile;`,
'089 growth observer');
rep(
`  const run=()=>{refineGrowth090();refineStatsPrivacy090();};\n  const obs=new MutationObserver(()=>requestAnimationFrame(run));obs.observe(document.documentElement,{childList:true,subtree:true});setTimeout(run,0);`,
`  const run=()=>{refineGrowth090();refineStatsPrivacy090();};\n  window.__uepFinalRefinement090=run;`,
'090 final observer');
rep(
`  const enhance=()=>{document.querySelectorAll('h1,h2,h3').forEach(h=>{if(/프로그램추천|프로그램 추천/.test(h.textContent||'')){const root=h.closest('section,main,div');if(root&&!root.querySelector('[data-growth-program-guide]')){const n=document.createElement('div');n.dataset.growthProgramGuide='1';n.className='growth-program-guide';n.innerHTML='<b>학생 성장 근거 기반 프로그램 추천</b><span>단순히 SDG 빈칸을 채우는 추천이 아닙니다. 학생들의 진로·탐구·공동체·사회문제 경험과 유네스코 지속가능발전교육의 관점을 함께 분석하여 학교교육과정에서 보완할 경험을 제안합니다.</span>';root.insertBefore(n,h.nextSibling);}}});};new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.documentElement,{subtree:true,childList:true});setTimeout(enhance,500);`,
`  const enhance=()=>{document.querySelectorAll('h1,h2,h3').forEach(h=>{if(/프로그램추천|프로그램 추천/.test(h.textContent||'')){const root=h.closest('section,main,div');if(root&&!root.querySelector('[data-growth-program-guide]')){const n=document.createElement('div');n.dataset.growthProgramGuide='1';n.className='growth-program-guide';n.innerHTML='<b>학생 성장 근거 기반 프로그램 추천</b><span>단순히 SDG 빈칸을 채우는 추천이 아닙니다. 학생들의 진로·탐구·공동체·사회문제 경험과 유네스코 지속가능발전교육의 관점을 함께 분석하여 학교교육과정에서 보완할 경험을 제안합니다.</span>';root.insertBefore(n,h.nextSibling);}}});};window.__uepGrowthProgramGuide082=enhance;`,
'082 growth program observer');

// 2) Canonical post-render hook. It preserves prior UI behavior without document-wide observers.
rep(
`    bindPage(page);\n    queueMicrotask(()=>syncSchoolReadAuthBadgeFromState());`,
`    bindPage(page);\n    queueMicrotask(()=>{\n      try{window.__uepRefineGrowth089?.();window.__uepFinalRefinement090?.();window.__uepGrowthProgramGuide082?.();}catch(error){console.warn('[UEP render refine]',error);}\n      syncSchoolReadAuthBadgeFromState();\n    });`,
'canonical render post hook');

// 3) Drawer-only legacy observers: same behavior, dramatically smaller observation scope.
const documentObserver=`obs.observe(document.documentElement,{childList:true,subtree:true});`;
const drawerObserver=`{const target=document.querySelector('#drawerBody');if(target)obs.observe(target,{childList:true,subtree:true});}`;
let idx=g.indexOf(`const obs=new MutationObserver(()=>requestAnimationFrame(apply));\n  ${documentObserver}`);
must(idx>=0,'approval 08068 observer missing');
g=g.slice(0,idx)+g.slice(idx).replace(`const obs=new MutationObserver(()=>requestAnimationFrame(apply));\n  ${documentObserver}`,`const obs=new MutationObserver(()=>requestAnimationFrame(apply));\n  ${drawerObserver}`);
rep(
`  const obs=new MutationObserver(()=>requestAnimationFrame(normalizeGoogleConnectionError));\n  obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true});`,
`  const obs=new MutationObserver(()=>requestAnimationFrame(normalizeGoogleConnectionError));\n  {const target=document.querySelector('#drawerBody');if(target)obs.observe(target,{childList:true,subtree:true,characterData:true});}`,
'google status observer');
rep(
`  const obs=new MutationObserver(()=>requestAnimationFrame(enhance));obs.observe(document.documentElement,{childList:true,subtree:true});`,
`  const obs=new MutationObserver(()=>requestAnimationFrame(enhance));{const target=document.querySelector('#drawerBody');if(target)obs.observe(target,{childList:true,subtree:true});}`,
'google oauth observer');
rep(
`  const obs=new MutationObserver(()=>requestAnimationFrame(annotateGoogleConnection));\n  obs.observe(document.documentElement,{childList:true,subtree:true});`,
`  const obs=new MutationObserver(()=>requestAnimationFrame(annotateGoogleConnection));\n  {const target=document.querySelector('#drawerBody');if(target)obs.observe(target,{childList:true,subtree:true});}`,
'google nonblocking observer');

must(!g.includes('observe(document.documentElement'),'document-wide MutationObserver remains');
fs.writeFileSync(path,g,'utf8');
console.log('UEP 0.81.72 R8 observer/render refactor applied');
