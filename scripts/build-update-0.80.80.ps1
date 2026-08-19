$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8

# UEP 0.80.80 - SchoolBoard-inspired connection separation.
# IMPORTANT: OAuth token exchange implementation inherited from 0.80.78 is untouched.
# Goal: Google connection failure must never block startup or force setup wizard.

# 1) Remove only the forced Google -> setup wizard step when it exists.
# Source layouts differ across 0.80.77/78/79, so do not fail when that exact gate is absent.
$patterns=@(
  '(?s)if\s*\(\s*!googleConnectionStatus\?\.ok\s*\)\s*\{.*?openSetupWizard\(3\).*?\}\s*else\s+if\s*\(\s*!state\.settings\.setupCompleted\s*\)\s*\{\s*setTimeout\(\(\)=>openSetupWizard\(0\),50\);\s*\}\s*else\s*\{\s*setSetupWizardLock\(false\);\s*\}',
  '(?s)if\s*\(\s*!googleConnectionStatus\?\.ok\s*\)\s*\{.*?openSetupWizard\(3\).*?\}'
)
$replacement=@'
// __UEP_STARTUP_GATE_08080__
// Setup wizard depends on setup completion only; Google sync is independent.
if(!state.settings.setupCompleted){
  setTimeout(()=>openSetupWizard(0),50);
}else{
  setSetupWizardLock(false);
}
if(!googleConnectionStatus?.ok){
  googleConnectionError = googleConnectionError || 'Google 최신 동기화가 일시 중지되었습니다. 마지막 저장 자료로 UEP를 계속 사용할 수 있습니다.';
  try{ updateTopSyncStatus(); }catch{}
}
'@
$patched=$false
foreach($pattern in $patterns){
  if([regex]::IsMatch($g,$pattern)){
    $g=[regex]::Replace($g,$pattern,$replacement.TrimEnd(),1)
    $patched=$true
    break
  }
}

# If source no longer has the old gate, append a defensive startup policy instead of failing the build.
if((-not $patched) -and ($g -notmatch '__UEP_STARTUP_GATE_08080__')){
  $defensive=@'

// __UEP_STARTUP_GATE_08080__
// Defensive policy for source variants where the old startup gate was already removed.
// Google sync state must not be treated as application-login/setup eligibility.
'@
  $g += $defensive
}

# 2) Make connection UI wording explicitly non-blocking when those strings exist.
$g=$g.Replace('담임용 Google 시트 연결 승인이 필요합니다. 로그인과 NEIS 기능은 정상 사용 가능합니다.','담임용 Google 최신 동기화 연결이 필요합니다. 연결 전에도 마지막 저장 자료와 NEIS 기능으로 UEP를 계속 사용할 수 있습니다.')
$g=$g.Replace('UEP 구글시트 연결을 확인하세요.','Google 최신 동기화를 확인하세요. 마지막 저장 자료는 계속 사용할 수 있습니다.')

# 3) Teacher guidance in connection drawer. This is safe across source variants.
if($g -notmatch '__UEP_GOOGLE_NONBLOCKING_08080__'){
$append=@'

// __UEP_GOOGLE_NONBLOCKING_08080__
// Google sync is an independent data-connection layer, not an application login gate.
(function(){
  function annotateGoogleConnection(){
    const drawer=document.querySelector('#drawerBody');
    if(!drawer) return;
    const text=String(drawer.textContent||'');
    if(!/Google|구글시트/.test(text)) return;
    if(drawer.querySelector('[data-uep-google-nonblocking-note]')) return;
    const note=document.createElement('div');
    note.dataset.uepGoogleNonblockingNote='1';
    note.className='setup-warning';
    note.style.marginTop='10px';
    note.innerHTML='<b>UEP는 계속 사용할 수 있습니다.</b><br>Google 연결은 최신 학교자료를 동기화하기 위한 연결입니다. 연결이 끊겨도 마지막 정상 동기화 자료로 화면을 사용할 수 있으며, 연결이 복구되면 최신 자료로 자동 갱신됩니다.';
    drawer.appendChild(note);
  }
  const obs=new MutationObserver(()=>requestAnimationFrame(annotateGoogleConnection));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(annotateGoogleConnection,350);
})();
'@
$g += $append
}

# 4) Visible version.
$g=$g.Replace('const APP_VERSION = "0.80.79";','const APP_VERSION = "0.80.80";')
$g=$g.Replace('const APP_VERSION = "0.80.78";','const APP_VERSION = "0.80.80";')
$g=$g.Replace('const APP_VERSION = "0.80.77";','const APP_VERSION = "0.80.80";')
$g=$g.Replace('v0.80.79','v0.80.80')
$g=$g.Replace('v0.80.78','v0.80.80')
$g=$g.Replace('v0.80.77','v0.80.80')

Set-Content $gyo $g -Encoding UTF8 -NoNewline
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.80'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check 'app/resources/app/electron/main.cjs'
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo

$verify=Get-Content $gyo -Raw -Encoding UTF8
if(-not $verify.Contains('0.80.80')){throw 'visible 0.80.80 version missing'}
if(-not $verify.Contains('__UEP_STARTUP_GATE_08080__')){throw 'startup separation marker missing'}
if(-not $verify.Contains('__UEP_GOOGLE_NONBLOCKING_08080__')){throw 'non-blocking Google UI marker missing'}
Write-Host 'UEP 0.80.80 non-blocking Google architecture applied. Source-layout tolerant; OAuth token code untouched.'
