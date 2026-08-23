const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
let text=fs.readFileSync(file,'utf8');

function replaceFunction(source,name,replacement){
  const sig=`async function ${name}(`;
  const start=source.indexOf(sig);
  if(start<0) throw new Error(`function not found: ${name}`);
  const brace=source.indexOf('{',start);
  if(brace<0) throw new Error(`opening brace not found: ${name}`);
  let depth=0, quote='', template=false, escape=false;
  for(let i=brace;i<source.length;i++){
    const c=source[i], prev=source[i-1];
    if(escape){escape=false;continue;}
    if(quote){
      if(c==='\\'){escape=true;continue;}
      if(c===quote){quote='';template=false;}
      continue;
    }
    if(c==='"'||c==="'"||c==='`'){quote=c;template=c==='`';continue;}
    if(c==='{') depth++;
    else if(c==='}'){
      depth--;
      if(depth===0) return source.slice(0,start)+replacement+source.slice(i+1);
    }
  }
  throw new Error(`closing brace not found: ${name}`);
}

const sessionToAccount=`const a=status.user||{};const account={id:String(a.userId||remembered?.id||savedUser?.id||''),email:String(a.email||remembered?.email||savedUser?.email||'').trim(),name:String(a.name||remembered?.name||savedUser?.name||'').trim(),role:String(a.role||''),admin:a.isAdmin?'Y':'N',grade:String(a.grade||'1'),classNo:String(a.homeroom||''),department:String(a.department||((a.grade||1)+'학년부')),active:true,activeRaw:'Y'};state.auth.user=accountToSession(account);state.settings.userProfile={...state.settings.userProfile,...state.auth.user};state.settings.loginUserName=state.auth.user.name;googleConnectionStatus={ok:true,encryption:true,mode:'school_read_api'};`;

const restore=`async function restoreRememberedSessionImmediately(){
  const remembered=state?.auth?.rememberUser?state?.auth?.rememberedUser:null;
  const savedUser=state?.auth?.user;
  if(!remembered?.name||!remembered?.email||!savedUser?.name||!savedUser?.email)return false;
  const sameName=String(savedUser.name).trim()===String(remembered.name).trim();
  const sameEmail=String(savedUser.email).trim().toLowerCase()===String(remembered.email).trim().toLowerCase();
  if(!sameName||!sameEmail)return false;
  if(!window.schoolBoard?.schoolReadSessionStatus)return false;
  const status=await window.schoolBoard.schoolReadSessionStatus({verify:true});
  if(!status?.authenticated)return false;
  ${sessionToAccount}
  const gate=document.getElementById('userAuthGate');
  if(gate){
    document.body.classList.add('uep-auth-locked');gate.classList.remove('hidden');
    gate.innerHTML=\`<section class="user-auth-card auto-login-transition"><div class="user-auth-brand"><span>U</span><div><small>UNHO EDUCATION PLATFORM</small><h2>자동 로그인 중…</h2><p>\${escapeHtml(state.auth.user.name)} · \${escapeHtml(maskEmail(state.auth.user.email))}</p></div></div><div class="auto-login-progress"><i></i></div><footer>승인된 UEP 세션을 확인했습니다.</footer></section>\`;
    await new Promise(resolve=>setTimeout(resolve,220));
  }
  await save();
  hideUserAuthGate();
  return true;
}`;

const init=`async function initializeUserSessionGate(){
  const remembered=state?.auth?.rememberUser?state?.auth?.rememberedUser:null;
  const savedUser=state?.auth?.user;
  if(remembered?.name&&remembered?.email&&window.schoolBoard?.schoolReadSessionStatus){
    try{
      const status=await window.schoolBoard.schoolReadSessionStatus({verify:true});
      if(status?.authenticated){
        ${sessionToAccount}
        await save();
        hideUserAuthGate();
        return true;
      }
    }catch(error){console.warn('[UEP] 저장된 School Read 세션 확인 실패',error);}
  }
  state.auth.user=null;
  authSessionReady=false;
  state.auth.locked=true;
  renderUserAuthGate({switchUser:true});
  authGateMessage('교사 이름과 이메일로 UEP를 시작하세요.');
  return false;
}`;

text=replaceFunction(text,'restoreRememberedSessionImmediately',restore);
text=replaceFunction(text,'initializeUserSessionGate',init);

// Never unlock a remembered local user merely because the network verification timed out.
const oldTimeout=`if(state?.auth?.rememberUser&&state?.auth?.user){hideUserAuthGate();authSessionReady=true;state.auth.locked=false;}`;
if(text.includes(oldTimeout)) text=text.replace(oldTimeout,`/* 0.81.20: local remembered state never bypasses School Read session verification */`);

if(/async function initializeUserSessionGate\(\)[\s\S]{0,2200}findUserAccount\(/.test(text)) throw new Error('initializeUserSessionGate still depends on readonly account cache');
if(/async function restoreRememberedSessionImmediately\(\)[\s\S]{0,2600}hideUserAuthGate\(\)[\s\S]{0,100}return true/.test(text) && !/restoreRememberedSessionImmediately\(\)[\s\S]{0,2200}schoolReadSessionStatus/.test(text)) throw new Error('remembered login still bypasses School Read verification');
fs.writeFileSync(file,text,'utf8');
console.log('0.81.20 School Read auth gate hardened.');
