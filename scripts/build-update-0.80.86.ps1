$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$idx='app/resources/app/index.html'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$h=Get-Content $idx -Raw -Encoding UTF8

# UEP 0.80.86 - isolate startup stages so no auth/state exception can prevent dashboard rendering.

# 1) Version markers.
$g=$g.Replace('const APP_VERSION = "0.80.85";','const APP_VERSION = "0.80.86";')
$g=$g.Replace('v0.80.85','v0.80.86')
$h=$h.Replace('v0.80.85','v0.80.86')

# 2) normalizeSavedState must not abort boot.
$oldNorm='  normalizeSavedState();'
$newNorm=@'
  try {
    normalizeSavedState();
  } catch (normalizeError) {
    console.error('[UEP] 저장상태 정규화 실패 - 기본 상태로 복구', normalizeError);
    const authSnapshot=state?.auth ? structuredClone(state.auth) : structuredClone(baseState.auth);
    const settingsSnapshot=state?.settings ? structuredClone(state.settings) : structuredClone(baseState.settings);
    state=structuredClone(baseState);
    state.auth={...state.auth,...authSnapshot};
    state.settings={...state.settings,...settingsSnapshot};
    try { normalizeSavedState(); } catch (_) {}
  }
'@
if($g.Contains($oldNorm)){$g=$g.Replace($oldNorm,$newNorm.TrimEnd())}else{throw 'normalizeSavedState startup call not found'}

# 3) remembered session restore must not abort boot.
$oldRestore='  const resumedRememberedSession = await restoreRememberedSessionImmediately();'
$newRestore=@'
  let resumedRememberedSession=false;
  try {
    resumedRememberedSession=await withStartupTimeout(restoreRememberedSessionImmediately(),1200,false);
  } catch (rememberError) {
    console.warn('[UEP] 자동 사용자 복원 실패 - 화면을 먼저 엽니다.', rememberError);
    resumedRememberedSession=false;
  }
'@
if($g.Contains($oldRestore)){$g=$g.Replace($oldRestore,$newRestore.TrimEnd())}else{throw 'remembered session startup call not found'}

# 4) ensure the first render cannot be skipped even if earlier startup state was imperfect.
$marker='  refreshHeaderRoleBadge();'
$inject=@'
  refreshHeaderRoleBadge();
  try {
    const bootContent=document.getElementById('pageContent');
    if(bootContent && !String(bootContent.innerHTML||'').trim()){
      state.activePage='dashboard';
      navigate('dashboard');
    }
  } catch (bootRenderError) {
    console.error('[UEP] 부팅 대시보드 강제 복구 실패',bootRenderError);
  }
'@
if($g.Contains($marker)){$g=$g.Replace($marker,$inject.TrimEnd())}else{throw 'refreshHeaderRoleBadge startup marker not found'}

# 5) renderer-level hard watchdog. This is inside gyomuon.js, so it runs only after the app code itself loaded.
if($g -notmatch '__UEP_RENDER_HARD_RECOVERY_08086__'){
$watch=@'

// __UEP_RENDER_HARD_RECOVERY_08086__
(function(){
  let tries=0;
  const recover=()=>{
    tries++;
    try{
      const gate=document.getElementById('userAuthGate');
      if(gate && !gate.classList.contains('hidden')){
        gate.classList.add('hidden');
        document.body.classList.remove('uep-auth-locked');
      }
      const host=document.getElementById('pageContent');
      if(host && !String(host.innerHTML||'').trim()){
        try{ setupWizardActive=false; }catch{}
        try{ state.activePage='dashboard'; }catch{}
        try{ navigate('dashboard'); }catch(error){ console.error('[UEP] hard dashboard recovery',error); }
      }
      if(host && String(host.innerHTML||'').trim()) return;
    }catch(error){console.error('[UEP] render recovery watchdog',error);}
    if(tries<5)setTimeout(recover,900);
  };
  setTimeout(recover,700);
})();
'@
$g += $watch
}

Set-Content $gyo $g -Encoding UTF8 -NoNewline
Set-Content $idx $h -Encoding UTF8 -NoNewline
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.86'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check 'app/resources/app/electron/main.cjs'
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo

$vg=Get-Content $gyo -Raw -Encoding UTF8
if($vg -notmatch 'const APP_VERSION = "0\.80\.86"'){throw 'APP_VERSION 0.80.86 missing'}
if($vg -notmatch '__UEP_RENDER_HARD_RECOVERY_08086__'){throw 'hard render recovery missing'}
if($vg -notmatch 'withStartupTimeout\(restoreRememberedSessionImmediately\(\),1200,false\)'){throw 'remembered session timeout missing'}
Write-Host 'UEP 0.80.86 startup pipeline recovery applied.'
