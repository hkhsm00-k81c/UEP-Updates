$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8

# UEP 0.80.80 - SchoolBoard-inspired connection separation.
# IMPORTANT: Google OAuth token implementation inherited from 0.80.78 is untouched.
# Goal: teacher Google connection failure must never block UEP startup or reopen setup wizard.

# 1) Replace startup gate: setup wizard is controlled only by setupCompleted.
$old=@'
  if(!googleConnectionStatus?.ok){
    // 인증정보가 없거나 복호화/유효성 검증에 실패한 경우에는 기존 setupCompleted 값과 무관하게
    // 데이터 연결 단계에서 멈춘다. 학생정보 화면을 먼저 열어 권한부여를 건너뛰지 않는다.
    setTimeout(()=>openSetupWizard(3),50);
  }else if(!state.settings.setupCompleted){
    setTimeout(()=>openSetupWizard(0),50);
  }else{
    setSetupWizardLock(false);
  }
'@
$new=@'
  // Google 연결과 UEP 사용 자격을 분리한다.
  // 설정마법사는 최초 설정 완료 여부만으로 판단하며, Google 연결 오류 때문에 다시 열지 않는다.
  if(!state.settings.setupCompleted){
    setTimeout(()=>openSetupWizard(0),50);
  }else{
    setSetupWizardLock(false);
  }
  // Google이 끊겨도 마지막 정상 캐시로 계속 사용한다. 연결 상태는 상단/자료연결 상태에서만 안내한다.
  if(!googleConnectionStatus?.ok){
    googleConnectionError = googleConnectionError || 'Google 최신 동기화가 일시 중지되었습니다. 마지막 저장 자료로 UEP를 계속 사용할 수 있습니다.';
    try{ updateTopSyncStatus(); }catch{}
  }
'@
if($g.Contains($old)){
  $g=$g.Replace($old,$new)
}else{
  # Resilient regex for small source-layout differences.
  $pattern='(?s)\s*if\(!googleConnectionStatus\?\.ok\)\{.*?openSetupWizard\(3\).*?\}\s*else if\(!state\.settings\.setupCompleted\)\{\s*setTimeout\(\(\)=>openSetupWizard\(0\),50\);\s*\}\s*else\{\s*setSetupWizardLock\(false\);\s*\}'
  if([regex]::IsMatch($g,$pattern)){
    $g=[regex]::Replace($g,$pattern,"`n"+$new.TrimEnd(),1)
  }elseif(-not $g.Contains('Google 연결과 UEP 사용 자격을 분리한다.')){
    throw 'startup Google/setup gate not found'
  }
}

# 2) Make connection UI wording explicitly non-blocking.
$g=$g.Replace('담임용 Google 시트 연결 승인이 필요합니다. 로그인과 NEIS 기능은 정상 사용 가능합니다.','담임용 Google 최신 동기화 연결이 필요합니다. 연결 전에도 마지막 저장 자료와 NEIS 기능으로 UEP를 계속 사용할 수 있습니다.')
$g=$g.Replace('UEP 구글시트 연결을 확인하세요.','Google 최신 동기화를 확인하세요. 마지막 저장 자료는 계속 사용할 수 있습니다.')

# 3) Teacher guidance in connection drawer.
$g=$g.Replace('Google 계정 연결','Google 계정 연결')
if($g -notmatch 'UEP_GOOGLE_NONBLOCKING_08080'){
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
$g=$g.Replace('v0.80.79','v0.80.80')
$g=$g.Replace('v0.80.78','v0.80.80')

Set-Content $gyo $g -Encoding UTF8 -NoNewline
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.80'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check 'app/resources/app/electron/main.cjs'
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo

$verify=Get-Content $gyo -Raw -Encoding UTF8
if(-not $verify.Contains('0.80.80')){throw 'visible 0.80.80 version missing'}
if($verify.Contains('setTimeout(()=>openSetupWizard(3),50)')){throw 'Google failure still forces setup wizard'}
if(-not $verify.Contains('__UEP_GOOGLE_NONBLOCKING_08080__')){throw 'non-blocking Google UI marker missing'}
Write-Host 'UEP 0.80.80 non-blocking Google connection architecture applied. OAuth token code untouched.'
