$ErrorActionPreference='Stop'

$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$g=Get-Content $gyo -Raw -Encoding UTF8

$patch=@'

// UEP 0.80.66 - 빠른열기 결재라인 팝업 안전 범위 UI 보정
(function(){
  if(window.__UEP_APPROVAL_POPUP_FIX_08066__) return;
  window.__UEP_APPROVAL_POPUP_FIX_08066__ = true;

  function exactTitleNode(){
    return [...document.querySelectorAll('h1,h2,h3,h4,div,span')].find(el =>
      (el.textContent||'').trim()==='주요 업무 결재라인' && el.children.length<=3
    ) || null;
  }

  function findPopupRoot(){
    const title=exactTitleNode();
    if(!title) return null;
    let n=title;
    for(let i=0;i<8 && n;i++,n=n.parentElement){
      const r=n.getBoundingClientRect?.();
      if(!r || r.width<700 || r.height<350) continue;
      const buttons=[...n.querySelectorAll('button,[role="button"]')];
      const hasClose=buttons.some(b=>{
        const a=(b.getAttribute('aria-label')||'').toLowerCase();
        const t=(b.textContent||'').trim();
        return a.includes('close') || a.includes('닫기') || t==='×' || t==='✕' || t==='X';
      });
      if(hasClose) return n;
    }
    return title.closest('[role="dialog"],.modal,.popup,.dialog');
  }

  function applyFix(){
    const root=findPopupRoot();
    if(!root) return;

    // 팝업 전체 width/height는 절대 변경하지 않습니다.
    // 결재선 화살표가 들어있는 실제 텍스트 카드만 줄바꿈 허용.
    const textNodes=[...root.querySelectorAll('div,span,p,strong')].filter(el=>{
      const t=(el.textContent||'').trim();
      return t.includes('→') && t.length>=8 && el.children.length<=4;
    });

    textNodes.forEach(el=>{
      el.style.setProperty('white-space','normal','important');
      el.style.setProperty('overflow-wrap','break-word','important');
      el.style.setProperty('word-break','keep-all','important');
      el.style.setProperty('text-overflow','clip','important');
      el.style.setProperty('max-width','100%','important');
      el.style.setProperty('min-width','0','important');

      // 텍스트가 들어있는 가까운 카드만 높이를 내용에 맞춤.
      let card=el.parentElement;
      for(let i=0;i<3 && card && card!==root;i++,card=card.parentElement){
        const cs=getComputedStyle(card);
        const rr=card.getBoundingClientRect();
        if(rr.width>180 && rr.width<650 && (cs.borderRadius!=='0px' || cs.borderTopWidth!=='0px')){
          card.style.setProperty('height','auto','important');
          card.style.setProperty('min-height','0','important');
          card.style.setProperty('overflow','visible','important');
          break;
        }
      }
    });

    // 실제로 내용이 넘치지 않는 내부 목록에만 불필요한 세로 스크롤 제거.
    [...root.querySelectorAll('*')].forEach(el=>{
      const cs=getComputedStyle(el);
      if(cs.overflowY!=='auto' && cs.overflowY!=='scroll') return;
      const rr=el.getBoundingClientRect();
      if(rr.width<250 || rr.height<180) return;
      if(el.scrollHeight <= el.clientHeight + 24){
        el.style.setProperty('overflow-y','visible','important');
      }
    });
  }

  const obs=new MutationObserver(()=>requestAnimationFrame(applyFix));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('resize',applyFix);
  setTimeout(applyFix,250);
})();
'@

if($g -notmatch '__UEP_APPROVAL_POPUP_FIX_08066__'){
  $g += $patch
}
$g=$g.Replace('const APP_VERSION = "0.80.64";','const APP_VERSION = "0.80.66";')
$g=$g.Replace('const APP_VERSION = "0.80.63";','const APP_VERSION = "0.80.66";')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8
$p=[regex]::Replace($p,'"version"\s*:\s*"0\.80\.(63|64)"','"version": "0.80.66"',1)
Set-Content $pkg $p -Encoding UTF8 -NoNewline

node --check $gyo
