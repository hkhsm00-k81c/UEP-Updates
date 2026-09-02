const fs=require('fs');
const path=require('path');

const root=process.argv[2];
if(!root)throw new Error('usage: node patch-uep-08216-popup-fourcards.js <app-root>');
const app=path.join(root,'resources','app');
const gPath=path.join(app,'gyomuon.js');
const cssPath=path.join(app,'gyomuon.css');
const pkgPath=path.join(app,'package.json');
let g=fs.readFileSync(gPath,'utf8');
let css=fs.readFileSync(cssPath,'utf8');
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
const must=(v,m)=>{if(!v)throw new Error(m)};

must(g.includes('const APP_VERSION = "0.82.15";'),'0.82.15 version missing');
g=g.replace('const APP_VERSION = "0.82.15";','const APP_VERSION = "0.82.16";');
pkg.version='0.82.16';

const popupMarker='/* UEP_08216_CHANGELOG_POPUP */';
must(!g.includes(popupMarker),'0.82.16 popup already applied');
g+=String.raw`

/* UEP_08216_CHANGELOG_POPUP */
(function uep08216ReleaseNotes(){
  const VERSION='0.82.16';
  const STORAGE_KEY='uep:release-notes:'+VERSION;
  function show(){
    try{if(localStorage.getItem(STORAGE_KEY)==='shown')return;}catch{}
    if(document.querySelector('[data-uep-release-notes="'+VERSION+'"]'))return;
    const layer=document.createElement('div');
    layer.className='uep-release-notes-layer';
    layer.dataset.uepReleaseNotes=VERSION;
    layer.innerHTML='<section class="uep-release-notes-dialog" role="dialog" aria-modal="true" aria-labelledby="uep-release-notes-title"><header><div><small>UEP UPDATE</small><h2 id="uep-release-notes-title">v0.82.16 업데이트</h2></div><button type="button" aria-label="닫기" data-uep-release-notes-close>×</button></header><div class="uep-release-notes-body"><article><b>대입 상담 데이터 확장</b><p>2028 시행계획·학종 안내·전형 구조·수능최저·운호고 입결 연결 자료를 오늘의 대학과 전형 이해에 반영했습니다.</p></article><article><b>대학 카드 정보 강화</b><p>대학 카드를 열지 않아도 상담에 필요한 핵심 전형·학종·과목선택·입결 정보를 바로 읽을 수 있도록 데이터 연결 기반을 확장했습니다.</p></article><article><b>공결·지각 팝업 상단 정리</b><p>학교 공결대장 · 기준일 · 학생 수 · 조회 범위 4개 카드를 한 줄로 배치했습니다.</p></article><article><b>업데이트 수정내역 1회 안내</b><p>새 버전 설치 후 최초 실행 시에만 이 안내가 표시됩니다.</p></article></div><footer><button type="button" data-uep-release-notes-confirm>확인</button></footer></section>';
    const close=()=>{try{localStorage.setItem(STORAGE_KEY,'shown');}catch{}layer.remove();};
    layer.querySelector('[data-uep-release-notes-close]')?.addEventListener('click',close);
    layer.querySelector('[data-uep-release-notes-confirm]')?.addEventListener('click',close);
    layer.addEventListener('click',e=>{if(e.target===layer)close();});
    document.body.appendChild(layer);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,350),{once:true});
  else setTimeout(show,350);
})();
`;

css+=String.raw`

/* UEP_08216_FOUR_STATUS_CARDS */
.dashboard-official-ledger-card{display:inline-flex!important;vertical-align:top!important;width:calc(25% - 8px)!important;min-height:74px!important;margin:0 8px 14px 0!important;padding:11px 12px!important;box-sizing:border-box!important;}
.dashboard-official-ledger-card span{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-content:center!important;min-width:0!important;gap:2px 6px!important;}
.dashboard-official-ledger-card small{font-size:9px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}
.dashboard-official-ledger-card b{font-size:11px!important;line-height:1.25!important;white-space:normal!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;}
.dashboard-official-ledger-card em{font-size:9px!important;white-space:nowrap!important;}
.dashboard-official-ledger-card + .history-summary{display:inline-grid!important;vertical-align:top!important;width:calc(75% - 4px)!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;margin:0 0 14px!important;box-sizing:border-box!important;}
.dashboard-official-ledger-card + .history-summary>div,.dashboard-official-ledger-card + .history-summary>article{min-width:0!important;min-height:74px!important;box-sizing:border-box!important;}
@media(max-width:980px){.dashboard-official-ledger-card{width:calc(25% - 6px)!important;margin-right:6px!important}.dashboard-official-ledger-card + .history-summary{width:75%!important;gap:6px!important}.dashboard-official-ledger-card em{display:none!important}}

/* UEP_08216_CHANGELOG_POPUP_CSS */
.uep-release-notes-layer{position:fixed;inset:0;z-index:2147483500;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(24,34,31,.34);backdrop-filter:blur(2px)}
.uep-release-notes-dialog{width:min(680px,92vw);max-height:86vh;overflow:auto;border:1px solid #dce8e4;border-radius:20px;background:#fff;box-shadow:0 26px 70px rgba(0,0,0,.22)}
.uep-release-notes-dialog>header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid #e7eeeb}.uep-release-notes-dialog header small{font-size:9px;font-weight:900;letter-spacing:.12em;color:#1e8a73}.uep-release-notes-dialog h2{margin:3px 0 0;font-size:20px}.uep-release-notes-dialog header button{width:34px;height:34px;border:0;border-radius:50%;background:#f2f6f5;font-size:22px;cursor:pointer}
.uep-release-notes-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:16px 20px}.uep-release-notes-body article{border:1px solid #e3ebe8;border-radius:12px;background:#fafcfb;padding:12px}.uep-release-notes-body b{font-size:12px;color:#204f43}.uep-release-notes-body p{margin:5px 0 0;font-size:10px;line-height:1.55;color:#61736d}.uep-release-notes-dialog footer{display:flex;justify-content:flex-end;padding:0 20px 18px}.uep-release-notes-dialog footer button{min-width:92px;border:0;border-radius:10px;background:#1f7d69;color:#fff;padding:10px 16px;font-weight:850;cursor:pointer}
@media(max-width:720px){.uep-release-notes-body{grid-template-columns:1fr}.uep-release-notes-layer{padding:12px}}
`;

fs.writeFileSync(gPath,g);
fs.writeFileSync(cssPath,css);
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP 0.82.16 one-time release notes + four status cards patch applied');
