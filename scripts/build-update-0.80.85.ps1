$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$idx='app/resources/app/index.html'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$h=Get-Content $idx -Raw -Encoding UTF8

# UEP 0.80.85 - render-first startup.
# 0.80.84 package inspection confirmed package identity is correct, while index.html still contains
# legacy v0.78.6 static text and boot can remain blank when startup work fails before/around navigate().

# 1) Remove legacy static identity markers from HTML.
$h=$h.Replace('id="headerVersionChip">v0.78.6<','id="headerVersionChip">v0.80.85<')
$h=$h.Replace('2026년 7월 20일 월요일','UEP 시작 중')

# 2) Version identity comes from this package only.
$g=$g.Replace('const APP_VERSION = "0.80.84";','const APP_VERSION = "0.80.85";')
$g=$g.Replace('v0.80.84','v0.80.85')
$h=$h.Replace('v0.80.84','v0.80.85')

# 3) Make the first normal render resilient. If the restored page render fails, dashboard gets a second chance.
$nav='navigate(state.activePage || "dashboard");'
$navSafe='try { navigate(state.activePage || "dashboard"); } catch (startupRenderError) { console.warn("[UEP] 초기 화면 복구", startupRenderError); state.activePage="dashboard"; try { navigate("dashboard"); } catch (dashboardRenderError) { console.error("[UEP] 대시보드 초기 렌더 실패", dashboardRenderError); } }'
$first=$g.IndexOf($nav)
if($first -ge 0){$g=$g.Substring(0,$first)+$navSafe+$g.Substring($first+$nav.Length)}else{throw 'initial navigate expression not found'}

# 4) Static fail-safe must never leave a blank shell: unlock and request dashboard render after gate release.
$old="gate.classList.add('hidden');document.body.classList.remove('uep-auth-locked');"
$new="gate.classList.add('hidden');document.body.classList.remove('uep-auth-locked');try{if(typeof navigate==='function'){navigate((window.state&&state.activePage)||'dashboard');}}catch(e){try{if(typeof navigate==='function')navigate('dashboard');}catch(_){}}"
$h=$h.Replace($old,$new)

# 5) Add an independent blank-content watchdog after scripts have loaded.
if($h -notmatch '__UEP_RENDER_WATCHDOG_08085__'){
$watch=@'
<script>
// __UEP_RENDER_WATCHDOG_08085__
setTimeout(function(){
  try{
    var gate=document.getElementById('userAuthGate');
    if(gate&&!gate.classList.contains('hidden')){gate.classList.add('hidden');document.body.classList.remove('uep-auth-locked');}
    var content=document.getElementById('pageContent');
    if(content && !String(content.innerHTML||'').trim()){
      try{ if(typeof navigate==='function') navigate('dashboard'); }catch(e){}
    }
  }catch(e){}
},4200);
</script>
'@
if($h.Contains('</body>')){$h=$h.Replace('</body>',$watch+"`n</body>")}else{throw 'index closing body not found'}
}

Set-Content $gyo $g -Encoding UTF8 -NoNewline
Set-Content $idx $h -Encoding UTF8 -NoNewline
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.85'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check 'app/resources/app/electron/main.cjs'
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo

$vg=Get-Content $gyo -Raw -Encoding UTF8
$vh=Get-Content $idx -Raw -Encoding UTF8
if($vh -match 'v0\.78\.6'){throw 'legacy v0.78.6 marker remains'}
if($vh -match '2026년 7월 20일 월요일'){throw 'legacy static date remains'}
if($vg -notmatch 'const APP_VERSION = "0\.80\.85"'){throw 'APP_VERSION 0.80.85 missing'}
if($vh -notmatch '__UEP_RENDER_WATCHDOG_08085__'){throw 'render watchdog missing'}
Write-Host 'UEP 0.80.85 render-first startup recovery applied.'
