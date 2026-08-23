const fs = require('fs');
const path = require('path');

const root = process.argv[2] || 'app';
const gyoPath = path.join(root, 'resources/app/gyomuon.js');
let js = fs.readFileSync(gyoPath, 'utf8');

js = js.replace(/const APP_VERSION\s*=\s*["'][^"']+["'];/, 'const APP_VERSION = "0.81.22";');

const marker = '__UEP_SCHOOL_READ_BADGE_08122__';
if (!js.includes(marker)) {
  js += `\n\n// ${marker}\n(function installSchoolReadAuthBadgeSync(){\n  async function syncSchoolReadAuthBadge(){\n    try{\n      if(!window.schoolBoard?.schoolReadSessionStatus)return;\n      const status=await window.schoolBoard.schoolReadSessionStatus({verify:false});\n      const authenticated=Boolean(status?.authenticated);\n      const nodes=[...document.querySelectorAll('button,span,div,a')];\n      for(const node of nodes){\n        const text=String(node.textContent||'').trim();\n        if(authenticated && text==='인증 필요'){\n          node.dataset.uepSchoolReadAuthBadge='1';\n          node.textContent='연결됨';\n          node.title='UEP School Read API 인증 정상';\n        }else if(!authenticated && node.dataset?.uepSchoolReadAuthBadge==='1' && text==='연결됨'){\n          node.textContent='인증 필요';\n          node.title='UEP 로그인이 필요합니다.';\n        }\n      }\n    }catch(error){console.warn('[UEP] School Read auth badge sync failed',error);}\n  }\n  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{syncSchoolReadAuthBadge();setInterval(syncSchoolReadAuthBadge,5000);},{once:true});\n  else {syncSchoolReadAuthBadge();setInterval(syncSchoolReadAuthBadge,5000);}\n})();\n`;
}

fs.writeFileSync(gyoPath, js, 'utf8');
console.log('Applied UEP 0.81.22 School Read auth badge patch');
