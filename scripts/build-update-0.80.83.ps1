$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8

# UEP 0.80.83: local user login must never wait for Google/readonly sync.
$newGate=@'
async function initializeUserSessionGate(){
  const remembered=state?.auth?.rememberUser?state?.auth?.rememberedUser:null;
  const saved=state?.auth?.user;
  if(remembered?.name&&remembered?.email&&saved?.name&&saved?.email){
    const sameName=String(saved.name).trim()===String(remembered.name).trim();
    const sameEmail=String(saved.email).trim().toLowerCase()===String(remembered.email).trim().toLowerCase();
    if(sameName&&sameEmail){hideUserAuthGate();return true;}
  }
  if(remembered){
    try{
      const account=findUserAccount(remembered.name,remembered.email);
      if(account){state.auth.user=accountToSession(account);hideUserAuthGate();save().catch(()=>{});return true;}
    }catch{}
  }
  state.auth.user=null;
  renderUserAuthGate({switchUser:true});
  authGateMessage('교사 이름과 이메일로 UEP를 시작하세요. Google 최신 동기화는 로그인 후 별도로 확인합니다.');
  return false;
}
'@
$pattern='(?s)async function initializeUserSessionGate\(\)\{.*?\n\}\s*(?=async function lockCurrentUser\()'
if([regex]::IsMatch($g,$pattern)){$g=[regex]::Replace($g,$pattern,$newGate+"`n",1)}else{throw 'initializeUserSessionGate block not found'}

$old='await initializeUserSessionGate();'
$new=@'
await Promise.race([
    initializeUserSessionGate(),
    new Promise(resolve=>setTimeout(()=>{
      try{
        if(state?.auth?.rememberUser&&state?.auth?.user){hideUserAuthGate();authSessionReady=true;state.auth.locked=false;}
      }catch{}
      resolve(true);
    },1800))
  ]);
'@
if($g.Contains($old)){$g=$g.Replace($old,$new.TrimEnd())}

# Preserve any existing if/else chain. Disable only the Google-disconnected admin condition.
$legacyCond='if(!googleConnectionStatus?.ok && currentRoleId()==="admin")'
if($g.Contains($legacyCond)){
  $g=$g.Replace($legacyCond,'if(false && !googleConnectionStatus?.ok && currentRoleId()==="admin")')
}

if($g -notmatch '__UEP_AUTOLOGIN_WATCHDOG_08083__'){
$watch=@'

// __UEP_AUTOLOGIN_WATCHDOG_08083__
(function(){
  const started=Date.now();
  const timer=setInterval(()=>{
    try{
      const gate=document.getElementById('userAuthGate');
      const text=String(gate?.textContent||'');
      if(!gate||gate.classList.contains('hidden')){clearInterval(timer);return;}
      if(Date.now()-started<2800)return;
      if(/자동 로그인/.test(text)&&state?.auth?.rememberUser&&state?.auth?.user){
        hideUserAuthGate();authSessionReady=true;state.auth.locked=false;
        try{navigate(state.activePage||'dashboard');}catch{}
        clearInterval(timer);
      }
    }catch{clearInterval(timer);}
  },350);
  setTimeout(()=>clearInterval(timer),12000);
})();
'@
$g += $watch
}

$g=$g.Replace('const APP_VERSION = "0.80.82";','const APP_VERSION = "0.80.83";')
$g=$g.Replace('const APP_VERSION = "0.80.81";','const APP_VERSION = "0.80.83";')
$g=$g.Replace('v0.80.82','v0.80.83')
$g=$g.Replace('v0.80.81','v0.80.83')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.83'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check 'app/resources/app/electron/main.cjs'
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo
$verify=Get-Content $gyo -Raw -Encoding UTF8
if(-not $verify.Contains('0.80.83')){throw 'visible 0.80.83 version missing'}
if(-not $verify.Contains('__UEP_AUTOLOGIN_WATCHDOG_08083__')){throw 'auto-login watchdog missing'}
if($verify -match '먼저 PC 데이터 연결 인증을 완료해 주세요'){throw 'legacy Google-first login gate still present'}
Write-Host 'UEP 0.80.83 local-first auto-login recovery applied. Google sync is non-blocking and startup if/else structure is preserved.'
