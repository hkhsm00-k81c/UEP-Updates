$ErrorActionPreference='Stop'

$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8

# 1) 로그인: 01_사용자계정 캐시가 아직 없을 때만 사용하는 배포용 fallback 계정
$fallback=@'

// UEP 0.80.68 - 배포 PC 초기 로그인 fallback
const UEP_DISTRIBUTION_USER_FALLBACK = [
  {id:'U001',email:'hkhsm00@gmail.com',name:'홍석민',role:'학년부장',admin:'Y',grade:'1',classNo:'',department:'1학년부',active:true,activeRaw:'Y'},
  {id:'U002',email:'wan9730@gmail.com',name:'천부성',role:'담임교사',admin:'N',grade:'1',classNo:'1',department:'1학년부',active:true,activeRaw:'Y'},
  {id:'U003',email:'chemileet@naver.com',name:'이은경',role:'담임교사',admin:'N',grade:'1',classNo:'2',department:'1학년부',active:true,activeRaw:'Y'},
  {id:'U004',email:'kht9153@gmail.com',name:'김현태',role:'담임교사',admin:'N',grade:'1',classNo:'3',department:'1학년부',active:true,activeRaw:'Y'},
  {id:'U005',email:'choie0820@gmail.com',name:'최혜선',role:'담임교사',admin:'N',grade:'1',classNo:'4',department:'1학년부',active:true,activeRaw:'Y'},
  {id:'U006',email:'lkkwww2@gmail.com',name:'이태연',role:'학년총무',admin:'N',grade:'1',classNo:'5',department:'1학년부',active:true,activeRaw:'Y'},
  {id:'U007',email:'wsseo0317@gmail.com',name:'서월산',role:'담임교사',admin:'N',grade:'1',classNo:'6',department:'1학년부',active:true,activeRaw:'Y'},
  {id:'U008',email:'99vivi77@gmail.com',name:'우순정',role:'담임교사',admin:'N',grade:'1',classNo:'7',department:'1학년부',active:true,activeRaw:'Y'},
  {id:'U009',email:'seo.ai.edu@gmail.com',name:'서진미',role:'담임교사',admin:'N',grade:'1',classNo:'8',department:'1학년부',active:true,activeRaw:'Y'},
  {id:'U010',email:'shoutkey1@gmail.com',name:'박은규',role:'담임교사',admin:'N',grade:'1',classNo:'9',department:'1학년부',active:true,activeRaw:'Y'},
  {id:'U011',email:'joonsikcha@gmail.com',name:'차준식',role:'교감',admin:'N',grade:'1',classNo:'',department:'교무실',active:true,activeRaw:'Y'},
  {id:'U012',email:'a01063913260@gmail.com',name:'설덕종',role:'교장',admin:'N',grade:'1',classNo:'',department:'교장실',active:true,activeRaw:'Y'}
];
'@

if($g -notmatch 'UEP_DISTRIBUTION_USER_FALLBACK'){
  $needle="function activeUserAccounts(){return (readonlyCache?.userAccounts||[]).filter(a=>a.active!==false&&String(a.activeRaw||'Y').toUpperCase()!=='N');}"
  $replacement=@'
function activeUserAccounts(){
  const sheetAccounts=(readonlyCache?.userAccounts||[]).filter(a=>a.active!==false&&String(a.activeRaw||'Y').toUpperCase()!=='N');
  // 정상 동기화된 계정표가 있으면 반드시 시트 값을 우선합니다.
  if(sheetAccounts.length) return sheetAccounts;
  // 신규 PC/초기 동기화 지연 때 로그인 화면이 막히지 않도록 배포 당시 승인 계정만 fallback으로 사용합니다.
  return UEP_DISTRIBUTION_USER_FALLBACK.filter(a=>a.active!==false&&String(a.activeRaw||'Y').toUpperCase()!=='N');
}
'@
  if(-not $g.Contains($needle)){throw 'activeUserAccounts function not found'}
  $g=$g.Replace($needle,$replacement.Trim())
  $pos=$g.IndexOf('function activeUserAccounts()')
  $g=$g.Insert($pos,$fallback.Trim()+"`r`n")
}

# 2) 빠른열기 결재라인: 실제 왼쪽 목록의 직접 카드만 보정
$popup=@'

// UEP 0.80.68 - 빠른열기 결재라인 왼쪽 카드 직접 보정
(function(){
  if(window.__UEP_APPROVAL_POPUP_FIX_08068__) return;
  window.__UEP_APPROVAL_POPUP_FIX_08068__=true;

  function root(){
    const title=[...document.querySelectorAll('h1,h2,h3,h4,div,span')].find(el=>(el.textContent||'').trim()==='주요 업무 결재라인' && el.children.length<=3);
    if(!title) return null;
    let n=title;
    for(let i=0;i<10&&n;i++,n=n.parentElement){
      const r=n.getBoundingClientRect?.();
      const t=(n.textContent||'');
      if(r&&r.width>850&&r.height>500&&t.includes('업무 종류·결재선 검색')&&t.includes('결재 순서')&&t.includes('확인 사항'))return n;
    }
    return null;
  }

  function apply(){
    const r=root(); if(!r)return;
    const scrollers=[...r.querySelectorAll('div,section')].filter(el=>{
      const b=el.getBoundingClientRect(); const cs=getComputedStyle(el);
      return b.width>=360&&b.width<=520&&b.height>=350&&(cs.overflowY==='auto'||cs.overflowY==='scroll');
    });
    const list=scrollers.sort((a,b)=>b.scrollHeight-a.scrollHeight)[0];
    if(!list)return;

    const cards=[...list.children].filter(el=>{
      const b=el.getBoundingClientRect(); const t=(el.textContent||'').trim();
      return b.width>=list.clientWidth*.82&&t.length>3;
    });
    cards.forEach(card=>{
      card.style.setProperty('height','auto','important');
      card.style.setProperty('min-height','44px','important');
      card.style.setProperty('box-sizing','border-box','important');
      card.style.setProperty('padding-top','6px','important');
      card.style.setProperty('padding-bottom','6px','important');
      card.style.setProperty('overflow','hidden','important');
      [...card.querySelectorAll('*')].forEach(el=>{
        const t=(el.textContent||'').trim();
        if(!t)return;
        if(t.includes('→')){
          el.style.setProperty('white-space','normal','important');
          el.style.setProperty('word-break','keep-all','important');
          el.style.setProperty('overflow-wrap','break-word','important');
          el.style.setProperty('line-height','1.25','important');
          el.style.setProperty('max-width','100%','important');
          el.style.setProperty('overflow','visible','important');
          el.style.setProperty('text-overflow','clip','important');
        }
      });
    });
    list.style.setProperty('overflow-x','hidden','important');
    // 14개 카드가 현재 팝업 높이에 들어오면 스크롤을 제거하고, 실제 초과할 때만 유지합니다.
    if(list.scrollHeight<=list.clientHeight+18) list.style.setProperty('overflow-y','hidden','important');
    else list.style.setProperty('overflow-y','auto','important');
  }
  const obs=new MutationObserver(()=>requestAnimationFrame(apply));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('resize',apply);
  setTimeout(apply,200);
})();
'@
if($g -notmatch '__UEP_APPROVAL_POPUP_FIX_08068__'){$g += $popup}

$g=$g.Replace('const APP_VERSION = "0.80.67";','const APP_VERSION = "0.80.68";')
$g=$g.Replace('const APP_VERSION = "0.80.66";','const APP_VERSION = "0.80.68";')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8
$p=[regex]::Replace($p,'"version"\s*:\s*"0\.80\.(66|67)"','"version": "0.80.68"',1)
Set-Content $pkg $p -Encoding UTF8 -NoNewline
node --check $gyo
