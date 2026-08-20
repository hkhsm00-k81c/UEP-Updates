$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8

# UEP 0.80.93 - bundled operational refinements over stable 0.80.92.
$g=$g.Replace('const APP_VERSION = "0.80.92";','const APP_VERSION = "0.80.93";')
$g=$g.Replace('v0.80.92','v0.80.93')

$patch=@'

// __UEP_BUNDLE_08093__
(function(){
  const txt=n=>String(n?.textContent||'').trim();
  function unmaskStatistics(){
    document.querySelectorAll('table').forEach(table=>{
      const heads=[...table.querySelectorAll('thead th')]; if(!heads.length)return;
      if(!heads.some(h=>/순위|총점|평균등급|표준점수|백분위|성취도|등급산출/.test(txt(h))))return;
      const ids=new Set(); heads.forEach((h,i)=>{if(/^(학생|이름|성명|학번|번호)$/.test(txt(h)))ids.add(i);});
      table.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{
        if(ids.has(i))return;
        td.classList.remove('privacy-mask','masked','demo-mask','blurred');
        td.style.filter='none';td.style.opacity='1';td.style.color='';td.style.textShadow='none';
        [...td.querySelectorAll('*')].forEach(x=>{x.classList.remove('privacy-mask','masked','demo-mask','blurred');x.style.filter='none';x.style.opacity='1';x.style.textShadow='none';});
      }));
    });
  }
  function refineSelection(){
    document.querySelectorAll('.selection-validation-090').forEach(sec=>{
      const small=sec.querySelector('small');if(small)small.textContent='사전신청 오류 내역 · 현재 본신청 오류';
      sec.querySelectorAll('p,li,article,div').forEach(n=>{
        const t=txt(n);if(!t)return;
        if(/대조|비교 대기|재검증/.test(t)&&!/(문.?이과|과학.*위계|학기간.*중복|중복.*신청|오류)/.test(t))n.style.display='none';
      });
    });
    document.querySelectorAll('.selection-result-090 header b').forEach(n=>n.textContent='현재 선택과목 신청 현황');
  }
  function compactApprovalPopup(){
    document.querySelectorAll('[role="dialog"],.modal,.quick-modal,.popup').forEach(root=>{
      if(!/결재/.test(txt(root)))return;
      root.classList.add('uep-approval-compact-093');
    });
  }
  function mealPopupReadable(){
    document.querySelectorAll('[role="dialog"],.modal,.quick-modal,.popup').forEach(root=>{
      if(/급식지도/.test(txt(root)))root.classList.add('uep-meal-readable-093');
    });
  }
  const run=()=>{unmaskStatistics();refineSelection();compactApprovalPopup();mealPopupReadable();};
  new MutationObserver(()=>requestAnimationFrame(run)).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(run,0);
})();
'@
if($g -notmatch '__UEP_BUNDLE_08093__'){
  $load='load();';$at=$g.LastIndexOf($load);if($at -lt 0){throw 'main load() call not found'}
  $g=$g.Substring(0,$at)+$patch+"`n"+$g.Substring($at)
}

$css=@'
/* __UEP_BUNDLE_UI_08093__ */
.uep-approval-compact-093 [class*="list"] article,.uep-approval-compact-093 [class*="list"] [class*="card"]{min-height:0!important;padding:7px 10px!important;margin:3px 0!important;line-height:1.2!important}
.uep-approval-compact-093 [class*="detail"] [class*="card"]{min-height:0!important;padding:10px 12px!important;margin:6px 0!important}
.uep-approval-compact-093 [class*="detail"]{overflow:visible!important}
.uep-meal-readable-093 [class*="meal"]{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;max-height:none!important}
.uep-meal-readable-093 [class*="meal"] *{white-space:normal!important;text-overflow:clip!important}
'@
if($g -notmatch '__UEP_BUNDLE_UI_08093__'){$g += "`nconst __uepStyle093=document.createElement('style');__uepStyle093.textContent="+(ConvertTo-Json $css -Compress)+";document.head.appendChild(__uepStyle093);`n"}

Set-Content $gyo $g -Encoding UTF8
node --check $gyo
if($LASTEXITCODE -ne 0){throw 'gyomuon syntax check failed'}
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.93'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.80.93 bundled refinements applied.'
