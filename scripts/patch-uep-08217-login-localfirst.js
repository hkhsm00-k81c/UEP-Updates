const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root)throw new Error('usage: node patch-uep-08217-login-localfirst.js <app-root>');
const app=path.join(root,'resources','app');
const gPath=path.join(app,'gyomuon.js');
const pkgPath=path.join(app,'package.json');
let g=fs.readFileSync(gPath,'utf8');
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
const must=(v,m)=>{if(!v)throw new Error(m)};

must(g.includes('const APP_VERSION = "0.82.16";'),'0.82.16 version missing');
g=g.replace('const APP_VERSION = "0.82.16";','const APP_VERSION = "0.82.17";');
pkg.version='0.82.17';

const replacement=`async function initializeUserSessionGate(){
  const remembered=state?.auth?.rememberUser?state?.auth?.rememberedUser:null;
  const saved=state?.auth?.user;
  // 0.82.17: local identity first. School Read API 장애가 UEP 진입을 막지 않도록 한다.
  if(remembered?.name&&remembered?.email&&saved?.name&&saved?.email){
    const sameName=String(saved.name).trim()===String(remembered.name).trim();
    const sameEmail=String(saved.email).trim().toLowerCase()===String(remembered.email).trim().toLowerCase();
    if(sameName&&sameEmail){hideUserAuthGate();authSessionReady=true;state.auth.locked=false;return true;}
  }
  if(remembered){
    try{
      const account=findUserAccount(remembered.name,remembered.email);
      if(account){state.auth.user=accountToSession(account);hideUserAuthGate();authSessionReady=true;state.auth.locked=false;save().catch(()=>{});return true;}
    }catch{}
  }
  state.auth.user=null;
  renderUserAuthGate({switchUser:true});
  authGateMessage('교사 이름과 이메일로 UEP를 시작하세요. 학교 데이터 연결은 로그인 후 별도로 확인합니다.');
  return false;
}`;
const rx=/async function initializeUserSessionGate\(\)\{[\s\S]*?\n\}\s*(?=async function lockCurrentUser\()/;
must(rx.test(g),'initializeUserSessionGate block not found');
g=g.replace(rx,replacement+'\n');

if(!g.includes('__UEP_08217_LOGIN_WATCHDOG__')){
  g+=`\n\n// __UEP_08217_LOGIN_WATCHDOG__\n(function(){\n  const started=Date.now();\n  const timer=setInterval(()=>{\n    try{\n      const gate=document.getElementById('userAuthGate');\n      if(!gate||gate.classList.contains('hidden')){clearInterval(timer);return;}\n      if(Date.now()-started<2400)return;\n      if(state?.auth?.rememberUser&&state?.auth?.user){\n        hideUserAuthGate();authSessionReady=true;state.auth.locked=false;\n        try{navigate(state.activePage||'dashboard');}catch{}\n        clearInterval(timer);\n      }\n    }catch{clearInterval(timer);}\n  },300);\n  setTimeout(()=>clearInterval(timer),10000);\n})();\n`;
}

fs.writeFileSync(gPath,g,'utf8');
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP 0.82.17 local-first login hotfix applied');
