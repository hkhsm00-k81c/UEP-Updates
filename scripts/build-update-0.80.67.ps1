$ErrorActionPreference='Stop'

$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$g=Get-Content $gyo -Raw -Encoding UTF8

$patch=@'

// UEP 0.80.67 - 빠른열기 결재라인 카드 높이/줄바꿈 보정
(function(){
  if(window.__UEP_APPROVAL_POPUP_FIX_08067__) return;
  window.__UEP_APPROVAL_POPUP_FIX_08067__ = true;

  function findPopupRoot(){
    const title=[...document.querySelectorAll('h1,h2,h3,h4,div,span')].find(el=>
      (el.textContent||'').trim()==='주요 업무 결재라인' && el.children.length<=3
    );
    if(!title) return null;
    let n=title;
    for(let i=0;i<9 && n;i++,n=n.parentElement){
      const r=n.getBoundingClientRect?.();
      if(!r || r.width<850 || r.height<500) continue;
      const text=(n.textContent||'');
      if(text.includes('업무 종류·결재선 검색') && text.includes('결재 순서')) return n;
    }
    return null;
  }

  function isCard(el){
    if(!el || el.children.length<1) return false;
    const r=el.getBoundingClientRect();
    if(r.width<300 || r.width>520 || r.height<36 || r.height>110) return false;
    const t=(el.textContent||'').trim();
    return t.length>3 && !t.includes('업무 종류·결재선 검색');
  }

  function applyFix(){
    const root=findPopupRoot();
    if(!root) return;

    const leftCandidates=[...root.querySelectorAll('div')].filter(el=>{
      const r=el.getBoundingClientRect();
      const cs=getComputedStyle(el);
      return r.width>=360 && r.width<=520 && r.height>=260 && (cs.overflowY==='auto'||cs.overflowY==='scroll');
    });
    const list=leftCandidates.sort((a,b)=>b.scrollHeight-a.scrollHeight)[0] || null;
    const scope=list || root;

    [...scope.querySelectorAll('div')].forEach(card=>{
      if(!isCard(card)) return;
      const texts=[...card.querySelectorAll('div,span,p,strong')].filter(el=>{
        const t=(el.textContent||'').trim();
        return t.includes('→') && t.length>=6;
      });
      if(!texts.length) return;

      card.style.setProperty('height','auto','important');
      card.style.setProperty('min-height','58px','important');
      card.style.setProperty('padding-top','10px','important');
      card.style.setProperty('padding-bottom','10px','important');
      card.style.setProperty('overflow','hidden','important');

      texts.forEach(el=>{
        el.style.setProperty('display','block','important');
        el.style.setProperty('white-space','normal','important');
        el.style.setProperty('overflow-wrap','break-word','important');
        el.style.setProperty('word-break','keep-all','important');
        el.style.setProperty('line-height','1.35','important');
        el.style.setProperty('max-width','100%','important');
        el.style.setProperty('text-overflow','clip','important');
        el.style.setProperty('overflow','visible','important');
      });
    });

    if(list){
      list.style.setProperty('overflow-x','hidden','important');
      const maxAvailable=Math.max(520, window.innerHeight - 300);
      list.style.setProperty('max-height', maxAvailable+'px','important');
      if(list.scrollHeight <= maxAvailable + 8){
        list.style.setProperty('overflow-y','visible','important');
      }else{
        list.style.setProperty('overflow-y','auto','important');
      }
    }
  }

  const obs=new MutationObserver(()=>requestAnimationFrame(applyFix));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('resize',applyFix);
  setTimeout(applyFix,250);
})();
'@

if($g -notmatch '__UEP_APPROVAL_POPUP_FIX_08067__'){
  $g += $patch
}
$g=$g.Replace('const APP_VERSION = "0.80.66";','const APP_VERSION = "0.80.67";')
$g=$g.Replace('const APP_VERSION = "0.80.64";','const APP_VERSION = "0.80.67";')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8
$p=[regex]::Replace($p,'"version"\s*:\s*"0\.80\.(64|66)"','"version": "0.80.67"',1)
Set-Content $pkg $p -Encoding UTF8 -NoNewline

node --check $gyo
