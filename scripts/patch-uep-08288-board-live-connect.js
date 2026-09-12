const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const rendererPath=path.join(root,'gyomuon.js');
const packagePath=path.join(root,'package.json');
function read(p){return fs.readFileSync(p,'utf8');}
function write(p,s){fs.writeFileSync(p,s,'utf8');}
function must(c,m){if(!c)throw new Error(m);}
function replaceOnce(text,from,to,label){
  const first=text.indexOf(from); must(first>=0,label+' source pattern not found');
  must(text.indexOf(from,first+from.length)<0,label+' source pattern not unique');
  const next=text.replace(from,to); must(next!==text,label+' replacement failed'); return next;
}

let renderer=read(rendererPath);
const pkg=JSON.parse(read(packagePath));
must(pkg.version==='0.82.87',`baseline package version mismatch: ${pkg.version}`);
pkg.version='0.82.88';
renderer=replaceOnce(
  renderer,
  'const APP_VERSION="0.82.87"; /* UEP_08287_ELECTRONIC_BOARD_MENU */',
  'const APP_VERSION="0.82.88"; /* UEP_08288_BOARD_LIVE_CONNECT */',
  'runtime version'
);

const oldView=`function electronicBoardView(){
  return \`<div class="module-page electronic-board-page">
    <div class="standalone-feature-head"><small>UEP BOARD</small><h2>UEP 전자칠판</h2><p>UEP Board와 교실 전자칠판 운영을 연결하는 관리 화면입니다.</p></div>
    <div class="setting-card"><h3>연결 준비 상태</h3><p>전자칠판 앱의 공식 실행 대상 또는 관리 웹앱 주소가 확인되면 이 화면의 연결 버튼을 활성화합니다.</p><p class="safe-note">현재 버전은 확인되지 않은 URL이나 실행 명령을 임의로 사용하지 않습니다.</p></div>
  </div>\`;
}`;
const newView=`const UEP_BOARD_API_URL="https://script.google.com/macros/s/AKfycbxTyh5TG6e2uWvOJrKcY-jihOE_2dXZxhTCZWTvKF773Av9qgNAoHod_pwI8VI9885a/exec";
const UEP_BOARD_DB_URL="https://docs.google.com/spreadsheets/d/1KStE1tJq6LTA8KR8fe56r7OxO1k9Ae8-lIfWw9d4wng/edit";

async function refreshElectronicBoardStatus(){
  const status=document.getElementById("uepBoardApiStatus");
  const detail=document.getElementById("uepBoardApiDetail");
  const time=document.getElementById("uepBoardApiTime");
  if(status){status.textContent="연결 확인 중"; status.dataset.state="loading";}
  if(detail)detail.textContent="UEP Board API 응답을 확인하고 있습니다.";
  try{
    const response=await fetch(UEP_BOARD_API_URL,{method:"GET",cache:"no-store"});
    if(!response.ok)throw new Error("HTTP "+response.status);
    const data=await response.json();
    if(!data||data.ok!==true)throw new Error((data&&data.error)||"INVALID_BOARD_API_RESPONSE");
    if(status){status.textContent="연결 정상"; status.dataset.state="ok";}
    if(detail)detail.textContent="UEP Board API "+(data.version?"v"+data.version+" ":"")+"· 실시간 연결됨";
    if(time)time.textContent=data.now?"서버 시각 "+data.now:"";
  }catch(error){
    if(status){status.textContent="연결 확인 필요"; status.dataset.state="error";}
    if(detail)detail.textContent="UEP Board API에 연결하지 못했습니다. 네트워크 또는 API 배포 상태를 확인해 주세요.";
    if(time)time.textContent=String(error&&error.message?error.message:error||"");
  }
}

function openElectronicBoardDb(){
  window.open(UEP_BOARD_DB_URL,"_blank","noopener,noreferrer");
}

function electronicBoardView(){
  Promise.resolve().then(refreshElectronicBoardStatus);
  return \`<div class="module-page electronic-board-page">
    <div class="standalone-feature-head"><small>UEP BOARD</small><h2>UEP 전자칠판</h2><p>UEP PC와 실제 UEP Board 운영 서비스를 연결하는 관리 화면입니다.</p></div>
    <div class="setting-card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div><h3 style="margin-bottom:6px">UEP Board 서비스 연결</h3><p id="uepBoardApiDetail" style="margin:0">UEP Board API 응답을 확인하고 있습니다.</p><small id="uepBoardApiTime" style="display:block;margin-top:8px;opacity:.72"></small></div>
        <span class="status-badge" id="uepBoardApiStatus" data-state="loading">연결 확인 중</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px">
        <button class="btn secondary" type="button" onclick="refreshElectronicBoardStatus()">연결 새로고침</button>
        <button class="btn primary" type="button" onclick="openElectronicBoardDb()">UEP Board DB 열기</button>
      </div>
    </div>
    <div class="setting-card">
      <h3>운영 원본 연결</h3>
      <p>전자칠판의 BoardID, 설치 위치, 학급, NFC 사용 여부와 운영 설정은 <b>[UEP] UEP Board DB</b>를 원본으로 사용합니다.</p>
      <p class="safe-note">PC 화면에 별도 목록을 중복 저장하지 않고 실제 Board DB와 공식 Board API를 기준으로 연결합니다.</p>
    </div>
  </div>\`;
}`;
renderer=replaceOnce(renderer,oldView,newView,'electronicBoardView live connection');

write(rendererPath,renderer);
write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP v0.82.88 Board live connection candidate patched');
