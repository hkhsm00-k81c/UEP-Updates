$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$idx='app/resources/app/index.html'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$h=Get-Content $idx -Raw -Encoding UTF8

# UEP 0.80.84 - the visible stuck splash is the static userAuthGate in index.html.
# Root cause: startup awaited window.schoolBoard.loadState() with no timeout before the JS could release the gate.

# 1) Local persisted-state IPC must never block application boot forever.
$old=@'
    const saved = window.schoolBoard?.loadState
      ? await window.schoolBoard.loadState()
      : JSON.parse(localStorage.getItem("gyomuon-state") || "null");
'@
$new=@'
    // 0.80.84: local IPC state read is important but never allowed to hold the whole app indefinitely.
    // If it times out, continue with base/localStorage state and let the normal login screen recover the user.
    const saved = window.schoolBoard?.loadState
      ? await withStartupTimeout(window.schoolBoard.loadState(), 1800, null)
      : JSON.parse(localStorage.getItem("gyomuon-state") || "null");
'@
if($g.Contains($old)){$g=$g.Replace($old,$new)}else{throw 'startup loadState block not found'}

# 2) Restore-remembered animation itself must be short and non-blocking.
$g=$g.Replace('await new Promise(resolve=>setTimeout(resolve,650));','await new Promise(resolve=>setTimeout(resolve,220));')

# 3) Static HTML startup gate gets an independent fail-safe.
# This runs before gyomuon.js and prevents an eternal blank/auth splash even if an early renderer error occurs.
if($h -notmatch '__UEP_BOOT_FAILSAFE_08084__'){
$needle='<body><div id="userAuthGate" class="user-auth-gate">'
$replacement=@'
<body><div id="userAuthGate" class="user-auth-gate">
'@
if(-not $h.Contains($needle)){throw 'index userAuthGate opening not found'}
$h=$h.Replace($needle,$replacement.TrimEnd())
$script=@'
<script>
// __UEP_BOOT_FAILSAFE_08084__
// The real app should replace/hide this gate almost immediately. If startup IPC or renderer initialization stalls,
// release the static splash so users are never trapped on "자동 로그인 중" forever.
window.__uepBootFailsafe=setTimeout(function(){
  try{
    var gate=document.getElementById('userAuthGate');
    if(!gate||gate.classList.contains('hidden')) return;
    var card=gate.querySelector('.user-auth-card');
    if(card){
      card.innerHTML='<div class="user-auth-brand"><span>U</span><div><small>UNHO EDUCATION PLATFORM</small><h2>UEP 시작 복구</h2><p>저장된 사용자 확인이 지연되어 UEP 화면을 먼저 엽니다.</p></div></div><button id="uepBootContinue" class="btn primary" type="button" style="margin-top:14px;width:100%">UEP 먼저 시작</button>';
      var b=document.getElementById('uepBootContinue');
      if(b)b.onclick=function(){gate.classList.add('hidden');document.body.classList.remove('uep-auth-locked');};
    }
    setTimeout(function(){try{if(gate&&!gate.classList.contains('hidden'))gate.classList.add('hidden');}catch(e){}},1800);
  }catch(e){}
},3200);
</script>
'@
$h=$h.Replace('</body>',$script+"`n</body>")
}

# 4) Visible version markers.
$g=$g.Replace('const APP_VERSION = "0.80.83";','const APP_VERSION = "0.80.84";')
$g=$g.Replace('const APP_VERSION = "0.80.82";','const APP_VERSION = "0.80.84";')
$g=$g.Replace('v0.80.83','v0.80.84')
$g=$g.Replace('v0.80.82','v0.80.84')
$h=$h.Replace('v0.80.83','v0.80.84').Replace('v0.80.82','v0.80.84')

Set-Content $gyo $g -Encoding UTF8 -NoNewline
Set-Content $idx $h -Encoding UTF8 -NoNewline
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.84'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check 'app/resources/app/electron/main.cjs'
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo

$verifyG=Get-Content $gyo -Raw -Encoding UTF8
$verifyH=Get-Content $idx -Raw -Encoding UTF8
if(-not $verifyG.Contains('withStartupTimeout(window.schoolBoard.loadState(), 1800, null)')){throw 'loadState startup timeout missing'}
if(-not $verifyH.Contains('__UEP_BOOT_FAILSAFE_08084__')){throw 'HTML boot failsafe missing'}
if(-not $verifyG.Contains('0.80.84')){throw 'visible 0.80.84 version missing'}
Write-Host 'UEP 0.80.84 startup recovery applied: loadState timeout + static auth splash failsafe.'
