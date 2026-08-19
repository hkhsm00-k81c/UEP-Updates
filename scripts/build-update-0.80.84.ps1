$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$idx='app/resources/app/index.html'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$h=Get-Content $idx -Raw -Encoding UTF8

# UEP 0.80.84 - prevent the static startup auth splash from remaining forever.
# Root cause confirmed in 0.80.83: boot waits on window.schoolBoard.loadState() before the initial gate can be released.

# 1) Patch loadState by expression, not by exact whitespace/source layout.
if($g -notmatch 'withStartupTimeout\(window\.schoolBoard\.loadState\(\),\s*1800,\s*null\)'){
  $loadPattern='await\s+window\.schoolBoard\.loadState\(\)'
  if([regex]::IsMatch($g,$loadPattern)){
    $g=[regex]::Replace($g,$loadPattern,'await withStartupTimeout(window.schoolBoard.loadState(), 1800, null)',1)
  }else{
    throw 'window.schoolBoard.loadState await expression not found'
  }
}

# 2) Remembered-user transition should be brief. This replacement is optional across source variants.
$g=[regex]::Replace($g,'await\s+new\s+Promise\(resolve=>setTimeout\(resolve,\s*650\)\);','await new Promise(resolve=>setTimeout(resolve,220));',1)

# 3) Static HTML startup gate gets an independent fail-safe.
if($h -notmatch '__UEP_BOOT_FAILSAFE_08084__'){
  if($h -notmatch '<div\s+id=["'']userAuthGate["'']') { throw 'index userAuthGate not found' }
  $script=@'
<script>
// __UEP_BOOT_FAILSAFE_08084__
(function(){
  var started=Date.now();
  window.__uepBootFailsafe=setTimeout(function(){
    try{
      var gate=document.getElementById('userAuthGate');
      if(!gate||gate.classList.contains('hidden')) return;
      var text=String(gate.textContent||'');
      if(!/자동 로그인|저장된 사용자|연결 정보/.test(text)) return;
      var card=gate.querySelector('.user-auth-card');
      if(card){
        card.innerHTML='<div class="user-auth-brand"><span>U</span><div><small>UNHO EDUCATION PLATFORM</small><h2>UEP 시작 복구</h2><p>저장된 사용자 확인이 지연되어 UEP 화면을 먼저 엽니다.</p></div></div><button id="uepBootContinue" class="btn primary" type="button" style="margin-top:14px;width:100%">UEP 먼저 시작</button>';
        var b=document.getElementById('uepBootContinue');
        if(b)b.onclick=function(){gate.classList.add('hidden');document.body.classList.remove('uep-auth-locked');};
      }
      setTimeout(function(){
        try{
          if(gate&&!gate.classList.contains('hidden')){
            gate.classList.add('hidden');
            document.body.classList.remove('uep-auth-locked');
          }
        }catch(e){}
      },1600);
    }catch(e){}
  },3200);
})();
</script>
'@
  if($h.Contains('</body>')){$h=$h.Replace('</body>',$script+"`n</body>")}
  else{throw 'index closing body not found'}
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
if($verifyG -notmatch 'withStartupTimeout\(window\.schoolBoard\.loadState\(\),\s*1800,\s*null\)'){throw 'loadState startup timeout missing'}
if(-not $verifyH.Contains('__UEP_BOOT_FAILSAFE_08084__')){throw 'HTML boot failsafe missing'}
if(-not ($verifyG.Contains('0.80.84') -or $verifyH.Contains('0.80.84'))){throw 'visible 0.80.84 version missing'}
Write-Host 'UEP 0.80.84 startup recovery applied: tolerant loadState timeout patch + static auth splash failsafe.'
