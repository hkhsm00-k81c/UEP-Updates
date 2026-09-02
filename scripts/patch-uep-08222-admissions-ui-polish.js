const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const cp=path.join(root,'resources','app','gyomuon.css');
let g=fs.readFileSync(gp,'utf8');
let c=fs.readFileSync(cp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.21["'];/.test(g),'0.82.21 base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.21["'];/,'const APP_VERSION = "0.82.22";');
must(g.includes('UEP_08220_ADMISSIONS_REAL_CONNECT'),'0.82.20 live admissions connection marker missing');

// Retire the 0.82.21 duplicate fixed version badge and old release popup boot.
g=g.replace(/function\s+uep08221EnsureVersionBadge\(\)\{[\s\S]*?\n\}/,
`function uep08221EnsureVersionBadge(){document.getElementById('uep-global-version-badge')?.remove();}`);
g=g.replace(/function\s+uep08221BootReleaseUx\(\)\{[^}]*\}/,
`function uep08221BootReleaseUx(){uep08221EnsureVersionBadge();}`);

// 0.82.21 used a floating back button. Keep route memory, but let the dialog own the back control.
g=g.replace(/function\s+uep08221OpenUniversityFromTypes\(name\)\{[\s\S]*?\n\}/,
`function uep08221OpenUniversityFromTypes(name){window.__uepAdmissionReturn='types';uep08221RemoveAdmissionBack();return openDashboardAdmissionUniversityByName(name);}`);

// Common dialog wrapper: widen admissions dialogs and add a route-aware native back button on university detail.
if(!g.includes('UEP_08222_DIALOG_WRAPPER')){
  const decl=/function\s+openDashboardAdmissionDialog\s*\(/;
  must(decl.test(g),'openDashboardAdmissionDialog not found');
  g=g.replace(decl,'function openDashboardAdmissionDialogBase(');
  g += `\n/* UEP_08222_DIALOG_WRAPPER */\nfunction uep08222ExpandAdmissionDialog(){\n const flow=document.querySelector('.admission-learning-flow,.uep-admission-university-detail');if(!flow)return;\n let node=flow.parentElement;for(let i=0;node&&i<6;i++,node=node.parentElement){const w=node.getBoundingClientRect().width;if(w>650&&w<window.innerWidth*.96){node.style.width='min(1460px, calc(100vw - 28px))';node.style.maxWidth='min(1460px, calc(100vw - 28px))';break;}}\n}\nfunction openDashboardAdmissionDialog(title,html){\n  const isUniversity=String(html||'').includes('주요 전형과 선발방식');\n  if(isUniversity){\n    const origin=window.__uepAdmissionReturn||'today';\n    const label=origin==='types'?'전형 이해로':'오늘의 대학으로';\n    const back=\`<div class="uep-admission-backbar"><button type="button" class="uep-admission-back" data-uep-admission-back="\${origin}">← \${label}</button></div>\`;\n    html=back+\`<div class="uep-admission-university-detail">\${html}</div>\`;\n  }\n  const result=openDashboardAdmissionDialogBase(title,html);\n  setTimeout(()=>{uep08222ExpandAdmissionDialog();document.querySelectorAll('[data-uep-admission-back]').forEach(btn=>btn.onclick=()=>{const o=btn.dataset.uepAdmissionBack;window.__uepAdmissionReturn='';if(o==='types')openDashboardAdmissionTypes();else if(typeof openDashboardTodayUniversity==='function')openDashboardTodayUniversity();else if(typeof openDashboardUniversity==='function')openDashboardUniversity();});},20);\n  return result;\n}\n`;
}

// New-version first-run notes. Independent of the old 0.82.21 hook.
if(!g.includes('UEP_08222_RELEASE_NOTES')){
  g += `\n/* UEP_08222_RELEASE_NOTES */\n(function(){\n const VERSION='0.82.22', KEY='uep:release-notes:'+VERSION;\n function show(){\n  try{if(localStorage.getItem(KEY))return;}catch(e){}\n  document.getElementById('uep-release-notes-overlay')?.remove();\n  const box=document.createElement('div');box.className='uep-release-overlay';\n  box.innerHTML=\`<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v\${VERSION} 수정사항</h2><ul><li>전형 이해 팝업을 넓히고 한 줄 3카드 구조로 개선</li><li>대학 상세 화면을 앞선 대입상담 카드 UI와 통일</li><li>전형 이해/오늘의 대학 진입경로에 맞는 돌아가기 추가</li><li>상단 버전 중복 표시 제거</li><li>새 업데이트가 있으면 현재 버전 → 최신 버전으로 강조 표시</li></ul><button type="button">확인</button></div>\`;\n  box.querySelector('button').onclick=()=>{try{localStorage.setItem(KEY,'1')}catch(e){}box.remove();};document.body.appendChild(box);\n }\n if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900);\n})();\n`;
}

// Header updater indicator. Reuse the existing center version pill; never create another version badge.
if(!g.includes('UEP_08222_VERSION_UPDATE_INDICATOR')){
 g += `\n/* UEP_08222_VERSION_UPDATE_INDICATOR */\n(function(){\n const CURRENT='0.82.22';\n const parse=v=>String(v||'').replace(/^v/i,'').split('.').map(n=>parseInt(n,10)||0);\n const newer=(a,b)=>{const A=parse(a),B=parse(b);for(let i=0;i<3;i++){if((A[i]||0)!==(B[i]||0))return (A[i]||0)>(B[i]||0)}return false};\n function versionPill(){return [...document.querySelectorAll('span,button,div')].find(el=>/^v\\d+\\.\\d+\\.\\d+$/.test((el.textContent||'').trim())&&el.children.length===0)}\n function removeDuplicate(){document.getElementById('uep-global-version-badge')?.remove();document.querySelectorAll('.uep-top-version-badge').forEach(el=>el.remove());[...document.querySelectorAll('span,button,div')].forEach(el=>{if(/^UEP v\\d+\\.\\d+\\.\\d+$/.test((el.textContent||'').trim())&&el.children.length===0)el.remove();});}\n async function check(){removeDuplicate();const pill=versionPill();if(!pill)return;try{const r=await fetch('https://raw.githubusercontent.com/hkhsm00-k81c/UEP-Updates/main/uep-policy.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)return;const p=await r.json();const latest=String(p.latestVersion||'').replace(/^v/i,'');if(newer(latest,CURRENT)){pill.textContent='v'+CURRENT+' → v'+latest;pill.classList.add('uep-version-update-available');pill.title='새 업데이트 '+latest+' 사용 가능';}else{pill.textContent='v'+CURRENT;pill.classList.remove('uep-version-update-available');}}catch(e){pill.textContent='v'+CURRENT;}}\n if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(check,1200),{once:true});else setTimeout(check,1200);setInterval(check,30*60*1000);\n})();\n`;
}

if(!c.includes('UEP_08222_ADMISSIONS_UI')){
 c += `\n/* UEP_08222_ADMISSIONS_UI */\n#uep-global-version-badge{display:none!important}\n.admission-learning-flow{font-size:16px;line-height:1.68}\n.admission-learning-flow>section{padding:20px 18px;margin-bottom:16px;border-radius:18px;background:#fff}\n.admission-learning-flow>section>h3{font-size:20px;margin:0 0 10px}\n.admission-explain-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important}\n.admission-explain-grid>article{min-width:0;padding:18px!important;border-radius:16px!important;box-shadow:0 2px 10px rgba(15,23,42,.045)}\n.admission-explain-grid>article>b{display:block;font-size:17px;margin-bottom:8px}\n.admission-explain-grid>article p{font-size:15px;line-height:1.6}\n.admission-explain-grid>article small{display:block;font-size:14px;line-height:1.55;margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(248,250,252,.92)}\n.admission-university-buttons{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;padding-top:11px;border-top:1px dashed #dbe4ee}\n.admission-university-buttons button{font-size:13px!important;font-weight:700!important;padding:7px 11px!important;border-radius:999px!important;cursor:pointer}\n.uep-admission-backbar{position:sticky;top:0;z-index:4;padding:6px 0 12px;background:linear-gradient(#fff 82%,rgba(255,255,255,0))}\n.uep-admission-back{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:9px 14px;font-weight:800;font-size:14px;cursor:pointer}\n.uep-admission-back:hover{background:#f1f5f9}\n.uep-admission-university-detail{font-size:16px;line-height:1.68}\n.uep-admission-university-detail>section{border-radius:18px!important;padding:18px!important;background:#fff!important;border:1px solid #dbe4ea!important;box-shadow:0 4px 16px rgba(15,23,42,.035)}\n.uep-admission-university-detail>section:first-child>div{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}\n.uep-admission-university-detail>section:first-child article,.uep-admission-university-detail>section:first-child>div>div{border:1px solid #dce5eb!important;border-radius:15px!important;padding:15px!important;background:linear-gradient(135deg,#fff,#f8fbff)!important;box-shadow:0 2px 8px rgba(15,23,42,.035)}\n.uep-admission-university-detail h3{font-size:19px!important}.uep-admission-university-detail b{font-size:15px}.uep-admission-university-detail p,.uep-admission-university-detail small{font-size:14px;line-height:1.6}\n.uep-release-overlay{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.38);display:flex;align-items:center;justify-content:center;padding:24px}\n.uep-release-card{width:min(560px,92vw);background:#fff;border-radius:22px;padding:26px 28px;box-shadow:0 24px 80px rgba(15,23,42,.22);font-size:15px;line-height:1.65}\n.uep-release-card h2{font-size:23px;margin:3px 0 12px}.uep-release-kicker{font-size:12px;font-weight:800;color:#2563eb}.uep-release-card li{margin:7px 0}.uep-release-card button{float:right;border:0;border-radius:10px;padding:9px 18px;background:#1d4ed8;color:#fff;font-weight:800;cursor:pointer}\n.uep-version-update-available{outline:3px solid rgba(245,158,11,.30)!important;border-color:#f59e0b!important;background:#fff7ed!important;color:#9a3412!important;font-weight:900!important;animation:uepVersionPulse 1.8s ease-in-out infinite}\n@keyframes uepVersionPulse{50%{box-shadow:0 0 0 5px rgba(245,158,11,.12)}}\n@media(max-width:1180px){.admission-explain-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}\n`;
}

must(g.includes('UEP_08222_DIALOG_WRAPPER'),'dialog wrapper missing');
must(g.includes('UEP_08222_RELEASE_NOTES'),'release notes marker missing');
must(g.includes("pill.textContent='v'+CURRENT+' → v'+latest"),'version arrow logic missing');
must(g.includes("window.__uepAdmissionReturn='types'"),'types return origin missing');
must(c.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'3-column UI missing');
must(c.includes('.uep-version-update-available'),'update highlight css missing');

fs.writeFileSync(gp,g,'utf8');fs.writeFileSync(cp,c,'utf8');
console.log('patched UEP 0.82.22 UI/update UX');
