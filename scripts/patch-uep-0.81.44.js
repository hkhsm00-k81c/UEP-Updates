const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(rendererFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.44";');

// 선택과목 신청현황 탭은 기본 click 동작보다 먼저 잠가야 합니다.
// 기존 코드는 await 이후에야 화면 전환 여부를 결정하여 비밀번호 창과 동시에 내용이 열릴 수 있었습니다.
const gateRx=/(subject\.addEventListener\(['"]click['"],\s*async\s+e\s*=>\s*\{)(\s*if\s*\(!privileged\(\)\))/;
assert(gateRx.test(g),'subject confidential tab gate not found');
g=g.replace(gateRx,"$1\n      // 0.81.44: 기본 탭 전환을 동기적으로 먼저 차단한 뒤 인증 성공 시에만 기존 보안 흐름으로 엽니다.\n      e.preventDefault(); e.stopImmediatePropagation();$2");

// 현재 버전 배지는 그대로 두되, 향후 새 버전이 배포되면 최상단에서 바로 알아볼 수 있게 표시합니다.
const updateNotice=`\n// 0.81.44: 상단 버전 배지에 새 업데이트 알림을 표시합니다. 재시작 자동 적용 동작은 그대로 유지합니다.\n(()=>{\n  const UPDATE_MANIFEST='https://raw.githubusercontent.com/hkhsm00-k81c/UEP-Updates/main/uep-version.json';\n  const versionParts=v=>String(v||'').replace(/^v/i,'').split('.').map(n=>Number(n)||0);\n  const newer=(a,b)=>{const x=versionParts(a),y=versionParts(b);for(let i=0;i<Math.max(x.length,y.length);i++){if((x[i]||0)!==(y[i]||0))return (x[i]||0)>(y[i]||0);}return false;};\n  const decorate=latest=>{\n    if(!newer(latest,APP_VERSION))return;\n    [...document.querySelectorAll('button,span,div')].filter(el=>el.children.length===0&&el.textContent.trim()===\`v\${APP_VERSION}\`).forEach(el=>{\n      el.textContent=\`v\${APP_VERSION} · 업데이트 v\${latest}\`;\n      el.title=\`새 버전 v\${latest}이 있습니다. UEP를 다시 시작하면 자동 적용됩니다.\`;\n      el.style.boxShadow='0 0 0 2px rgba(245,158,11,.45)';\n      el.style.background='#fff3cd'; el.style.color='#8a5200';\n    });\n  };\n  const check=async()=>{try{const r=await fetch(UPDATE_MANIFEST,{cache:'no-store'});if(!r.ok)return;const m=await r.json();decorate(m.version||m.latestVersion);}catch(_){}};\n  addEventListener('DOMContentLoaded',()=>setTimeout(check,1200),{once:true});\n  setInterval(check,10*60*1000);\n})();\n`;
assert(!g.includes("const UPDATE_MANIFEST='https://raw.githubusercontent.com/hkhsm00-k81c/UEP-Updates/main/uep-version.json'"),'update notice already installed');
g+=updateNotice;

for(const marker of [
  'const APP_VERSION = "0.81.44";',
  'e.preventDefault(); e.stopImmediatePropagation();',
  '업데이트 v${latest}',
  'setInterval(check,10*60*1000)'
])assert(g.includes(marker),'missing 0.81.44 marker: '+marker);

fs.writeFileSync(rendererFile,g,'utf8');
console.log('UEP 0.81.44 security gate and update badge notice applied');
