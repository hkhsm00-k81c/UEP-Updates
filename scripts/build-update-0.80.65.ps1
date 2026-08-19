$ErrorActionPreference='Stop'

$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$g=Get-Content $gyo -Raw -Encoding UTF8

$patch=@'

// UEP 0.80.65 - 빠른열기 결재라인 팝업 전용 UI 보정
(function(){
  if(window.__UEP_APPROVAL_POPUP_FIX_08065__) return;
  window.__UEP_APPROVAL_POPUP_FIX_08065__ = true;

  function findApprovalRoot(){
    const all=[...document.querySelectorAll('body *')];
    const title=all.find(el=>{
      const t=(el.textContent||'').trim();
      return t==='결재라인' || t.includes('결재라인 빠른열기') || t.includes('결재라인');
    });
    if(!title) return null;
    let n=title;
    for(let i=0;i<8 && n;i++,n=n.parentElement){
      const r=n.getBoundingClientRect?.();
      if(r && r.width>520 && r.height>260 && r.height<window.innerHeight*0.95) return n;
    }
    return title.closest('[role="dialog"],.modal,.popup,.dialog') || title.parentElement;
  }

  function applyApprovalPopupFix(){
    const root=findApprovalRoot();
    if(!root || root.dataset.uepApprovalFix==='1') return;
    root.dataset.uepApprovalFix='1';

    // 팝업 본문은 내용량에 맞게 표시하고 불필요한 내부 스크롤을 제거합니다.
    root.style.setProperty('overflow','visible','important');
    root.style.setProperty('max-height','none','important');

    const descendants=[...root.querySelectorAll('*')];
    descendants.forEach(el=>{
      const cs=getComputedStyle(el);
      const text=(el.textContent||'').trim();
      const r=el.getBoundingClientRect();

      // 카드/본문 내부의 고정 높이·스크롤 때문에 글자가 잘리는 현상 제거
      if((cs.overflowY==='auto'||cs.overflowY==='scroll') && r.height>120){
        el.style.setProperty('overflow-y','visible','important');
        el.style.setProperty('max-height','none','important');
      }

      // 결재 단계 설명 카드: 긴 문장은 카드 안에서 자연스럽게 줄바꿈
      if(text && r.width>120 && r.width<500 && r.height>42){
        el.style.setProperty('min-width','0','important');
        el.style.setProperty('overflow-wrap','anywhere','important');
        el.style.setProperty('word-break','keep-all','important');
        el.style.setProperty('white-space','normal','important');
      }

      // ellipsis / nowrap으로 카드 밖으로 나가는 텍스트 해제
      if(cs.whiteSpace==='nowrap' && text.length>12){
        el.style.setProperty('white-space','normal','important');
        el.style.setProperty('text-overflow','clip','important');
        el.style.setProperty('overflow','visible','important');
      }
    });

    // 팝업 자체가 너무 길어지지 않도록 화면 중앙과 적당한 최대폭 유지
    root.style.setProperty('max-width','980px','important');
    root.style.setProperty('width','min(94vw, 980px)','important');
  }

  const obs=new MutationObserver(()=>requestAnimationFrame(applyApprovalPopupFix));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('resize',applyApprovalPopupFix);
  setTimeout(applyApprovalPopupFix,300);
})();
'@

if($g -notmatch '__UEP_APPROVAL_POPUP_FIX_08065__'){
  $g += $patch
}
$g=$g.Replace('const APP_VERSION = "0.80.64";','const APP_VERSION = "0.80.65";')
$g=$g.Replace('const APP_VERSION = "0.80.63";','const APP_VERSION = "0.80.65";')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8
$p=[regex]::Replace($p,'"version"\s*:\s*"0\.80\.(63|64)"','"version": "0.80.65"',1)
Set-Content $pkg $p -Encoding UTF8 -NoNewline

node --check $gyo
