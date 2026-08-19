$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$idx='app/resources/app/index.html'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$h=Get-Content $idx -Raw -Encoding UTF8

# UEP 0.80.87 - bridge the renderer and static recovery layer.
# 0.80.86 proved the update package is applied, but index recovery cannot call module-scoped navigate().

# 1) Version markers.
$g=$g.Replace('const APP_VERSION = "0.80.86";','const APP_VERSION = "0.80.87";')
$g=$g.Replace('v0.80.86','v0.80.87')
$h=$h.Replace('v0.80.86','v0.80.87')

# 2) gyomuon has no module import/export dependency; load it as a deferred classic script so
#    function declarations such as navigate/render are visible to the independent HTML failsafe.
$oldScript='<script src="gyomuon.js" type="module"></script>'
$newScript='<script src="gyomuon.js" defer></script>'
if($h.Contains($oldScript)){$h=$h.Replace($oldScript,$newScript)}else{throw 'gyomuon module script tag not found'}

# 3) Explicitly bridge critical renderer functions as an extra guarantee.
$bridge=@'

// __UEP_GLOBAL_RENDER_BRIDGE_08087__
try {
  window.__uepNavigate = navigate;
  window.__uepRender = render;
  window.__uepBootLoad = load;
} catch (bridgeError) {
  console.error('[UEP] global renderer bridge failed', bridgeError);
}
'@
$loadCall='load();'
$idxLoad=$g.LastIndexOf($loadCall)
if($idxLoad -lt 0){throw 'main load() call not found'}
if($g -notmatch '__UEP_GLOBAL_RENDER_BRIDGE_08087__'){
  $insertAt=$idxLoad
  $g=$g.Substring(0,$insertAt)+$bridge+"`n"+$g.Substring($insertAt)
}

# 4) Replace the old module-blind HTML watchdog with a renderer-aware recovery loop.
$oldWatchPattern='(?s)<script>\s*// __UEP_RENDER_WATCHDOG_08085__.*?</script>'
$newWatch=@'
<script>
// __UEP_RENDER_WATCHDOG_08087__
(function(){
  var attempts=0;
  function recover(){
    attempts++;
    try{
      var gate=document.getElementById('userAuthGate');
      if(gate&&!gate.classList.contains('hidden')){
        gate.classList.add('hidden');
        document.body.classList.remove('uep-auth-locked');
      }
      var content=document.getElementById('pageContent');
      if(content && !String(content.innerHTML||'').trim()){
        var nav=window.__uepNavigate || window.navigate;
        var ren=window.__uepRender || window.render;
        if(typeof nav==='function') nav('dashboard');
        else if(typeof ren==='function') ren('dashboard');
      }
      if(content && String(content.innerHTML||'').trim()) return;
    }catch(e){ console.error('[UEP] html render watchdog',e); }
    if(attempts<10)setTimeout(recover,700);
  }
  setTimeout(recover,500);
})();
</script>
'@
if([regex]::IsMatch($h,$oldWatchPattern)){$h=[regex]::Replace($h,$oldWatchPattern,$newWatch,1)}else{
  if($h.Contains('</body>')){$h=$h.Replace('</body>',$newWatch+"`n</body>")}else{throw 'index closing body not found'}
}

# 5) Add a visible independent runtime error surface only if dashboard stays blank.
$errorSurface=@'
<script>
// __UEP_BOOT_ERROR_SURFACE_08087__
window.addEventListener('error',function(ev){
  try{
    var host=document.getElementById('pageContent');
    if(!host || String(host.innerHTML||'').trim()) return;
    host.innerHTML='<div style="margin:24px;padding:20px;border:1px solid #e0c8a5;border-radius:14px;background:#fff9ef;color:#5b4930"><b>UEP 시작 복구 중</b><p style="margin:8px 0 0">화면 구성요소를 다시 불러오고 있습니다.</p></div>';
  }catch(_){}
});
</script>
'@
if($h -notmatch '__UEP_BOOT_ERROR_SURFACE_08087__'){$h=$h.Replace('</body>',$errorSurface+"`n</body>")}

Set-Content $gyo $g -Encoding UTF8 -NoNewline
Set-Content $idx $h -Encoding UTF8 -NoNewline
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.87'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check 'app/resources/app/electron/main.cjs'
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo

$vg=Get-Content $gyo -Raw -Encoding UTF8
$vh=Get-Content $idx -Raw -Encoding UTF8
if($vg -notmatch 'const APP_VERSION = "0\.80\.87"'){throw 'APP_VERSION 0.80.87 missing'}
if($vh -notmatch '<script src="gyomuon\.js" defer></script>'){throw 'classic defer gyomuon tag missing'}
if($vg -notmatch '__UEP_GLOBAL_RENDER_BRIDGE_08087__'){throw 'global renderer bridge missing'}
if($vh -notmatch '__UEP_RENDER_WATCHDOG_08087__'){throw 'renderer-aware watchdog missing'}
Write-Host 'UEP 0.80.87 renderer bridge recovery applied.'
