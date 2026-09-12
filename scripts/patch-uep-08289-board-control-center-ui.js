const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const rendererPath=path.join(root,'gyomuon.js');
const indexPath=path.join(root,'index.html');
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
let index=read(indexPath);
const pkg=JSON.parse(read(packagePath));
must(pkg.version==='0.82.88',`baseline package version mismatch: ${pkg.version}`);
pkg.version='0.82.89';
renderer=replaceOnce(
  renderer,
  'const APP_VERSION="0.82.88"; /* UEP_08288_BOARD_LIVE_CONNECT */',
  'const APP_VERSION="0.82.89"; /* UEP_08289_BOARD_CONTROL_CENTER_UI */',
  'runtime version'
);

const oldView=`function electronicBoardView(){
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

const newView=`const UEP_BOARD_NOTICE_TYPES=["일반","조회(아침)","종례(하교)","긴급","제출","행사","준비물","일정변경","시간표","생활지도","프로그램","기타"];

function selectElectronicBoardTool(tool){
  document.querySelectorAll('.board-tool-panel').forEach(el=>el.hidden=el.dataset.boardTool!==tool);
  document.querySelectorAll('.board-action-card').forEach(el=>el.classList.toggle('is-active',el.dataset.boardTool===tool));
}

function previewBoardNotice(){
  const title=document.getElementById('boardNoticeTitle');
  const body=document.getElementById('boardNoticeBody');
  const big=document.getElementById('boardNoticePreviewBig');
  const small=document.getElementById('boardNoticePreviewSmall');
  if(big)big.textContent=(title&&title.value.trim())||'큰글씨 제목이 여기에 표시됩니다.';
  if(small)small.textContent=(body&&body.value.trim())||'작은글씨 내용이 여기에 표시됩니다.';
}

function electronicBoardView(){
  Promise.resolve().then(refreshElectronicBoardStatus);
  return \`<div class="module-page electronic-board-page board-control-center">
    <div class="board-hero">
      <div><small>UEP BOARD · CLASSROOM CONTROL CENTER</small><h2>UEP 전자칠판</h2><p>공지·일정·시간표 변경과 교실 화면을 한 곳에서 관리합니다.</p></div>
      <div class="board-api-pill"><span class="board-api-dot"></span><div><strong id="uepBoardApiStatus" data-state="loading">연결 확인 중</strong><small id="uepBoardApiTime"></small></div></div>
    </div>

    <div class="board-action-grid">
      <button type="button" class="board-action-card is-active" data-board-tool="boards" onclick="selectElectronicBoardTool('boards')"><span class="board-action-icon tone-blue">▣</span><span class="board-action-copy"><small>교실 화면 확인</small><strong>전자칠판 조회</strong><em>담임은 자기 반 · 관리자는 전체 반</em></span><span class="board-action-foot">Board 상태 <b>보기 ›</b></span></button>
      <button type="button" class="board-action-card" data-board-tool="notice" onclick="selectElectronicBoardTool('notice')"><span class="board-action-icon tone-mint">●</span><span class="board-action-copy"><small>조회·종례까지</small><strong>공지</strong><em>큰글씨 제목 + 작은글씨 내용</em></span><span class="board-action-foot">12개 유형 <b>등록 ›</b></span></button>
      <button type="button" class="board-action-card" data-board-tool="schedule" onclick="selectElectronicBoardTool('schedule')"><span class="board-action-icon tone-violet">▦</span><span class="board-action-copy"><small>학급·학년·전교</small><strong>일정</strong><em>날짜와 표시 대상을 선택해 안내</em></span><span class="board-action-foot">운영 일정 <b>등록 ›</b></span></button>
      <button type="button" class="board-action-card" data-board-tool="timetable" onclick="selectElectronicBoardTool('timetable')"><span class="board-action-icon tone-amber">↔</span><span class="board-action-copy"><small>원본 시간표 보존</small><strong>시간표 변경</strong><em>특정 날짜·교시만 임시 변경</em></span><span class="board-action-foot">05A 이력 <b>변경 ›</b></span></button>
      <button type="button" class="board-action-card" data-board-tool="message" onclick="selectElectronicBoardTool('message')"><span class="board-action-icon tone-rose">!</span><span class="board-action-copy"><small>즉시 강조 표시</small><strong>화면 알림</strong><em>긴급·즉시 확인 메시지</em></span><span class="board-action-foot">화면 메시지 <b>등록 ›</b></span></button>
    </div>

    <section class="board-tool-panel" data-board-tool="boards">
      <div class="board-section-head"><div><small>BOARD STATUS</small><h3>전자칠판 조회</h3><p>Board DB를 원본으로 조회합니다. 담임 계정은 자기 반만, 관리자 계정은 전체 반과 특별실을 조회하는 구조입니다.</p></div><div class="board-head-actions"><button class="btn secondary" type="button" onclick="refreshElectronicBoardStatus()">연결 새로고침</button><button class="btn primary" type="button" onclick="openElectronicBoardDb()">Board DB 열기</button></div></div>
      <div class="board-summary-grid">
        <div class="board-summary-card"><span>서비스</span><strong id="uepBoardApiDetail">UEP Board API 확인 중</strong><small>공식 Board API</small></div>
        <div class="board-summary-card"><span>조회 권한</span><strong>담임 · 관리자 분리</strong><small>다른 반 상세 조회 제한</small></div>
        <div class="board-summary-card"><span>운영 원본</span><strong>[UEP] UEP Board DB</strong><small>PC 중복 저장 없음</small></div>
        <div class="board-summary-card"><span>다음 연결</span><strong>반별 실시간 카드</strong><small>Board 목록·상태 읽기 API 연동 예정</small></div>
      </div>
      <div class="board-empty-state"><span class="board-empty-icon">▣</span><div><strong>반별 Board 카드 영역</strong><p>현재 0.82.89에서는 관리센터 UI와 권한·입력 구조를 먼저 고정합니다. PC가 전자칠판 기기로 가장하지 않도록 Board 목록 조회는 정식 관리자 읽기 API가 연결된 뒤 이 영역에 표시합니다.</p></div></div>
    </section>

    <section class="board-tool-panel" data-board-tool="notice" hidden>
      <div class="board-section-head"><div><small>NOTICE</small><h3>공지 등록</h3><p>공지와 조회·종례 안내를 같은 흐름에서 작성합니다. 제목은 큰글씨, 내용은 작은글씨로 전자칠판에 표시됩니다.</p></div></div>
      <div class="board-form-layout"><div class="board-form-card">
        <div class="board-form-row"><label>공지 유형<select id="boardNoticeType">${'${'}UEP_BOARD_NOTICE_TYPES.map(x=>\`<option>\${x}</option>\`).join('')}</select></label><label>표시 대상<select><option>내 반</option><option>특정 반</option><option>학년 전체</option><option>전교</option></select></label></div>
        <label><span class="board-field-title">큰글씨 — 제목</span><small>전자칠판에서 가장 크게 보이는 짧은 문구입니다.</small><input id="boardNoticeTitle" type="text" maxlength="60" placeholder="예: 체육복 착용 안내" oninput="previewBoardNotice()"></label>
        <label><span class="board-field-title">작은글씨 — 내용</span><small>제목 아래에 표시되는 상세 안내입니다.</small><textarea id="boardNoticeBody" rows="4" placeholder="예: 내일 5교시 체육수업은 운동장에서 진행됩니다." oninput="previewBoardNotice()"></textarea></label>
        <div class="board-form-row"><label>게시 시작<input type="date"></label><label>게시 종료<input type="date"></label></div>
        <div class="board-submit-row"><span>등록자는 본인 공지를, 담임은 자기 반 대상 공지를 관리할 수 있도록 연결합니다.</span><button class="btn primary" type="button" disabled title="0.82.90 쓰기 API 연결 예정">Board DB 저장 준비 중</button></div>
      </div><div class="board-preview-card"><small>전자칠판 미리보기</small><div class="board-preview-screen"><strong id="boardNoticePreviewBig">큰글씨 제목이 여기에 표시됩니다.</strong><p id="boardNoticePreviewSmall">작은글씨 내용이 여기에 표시됩니다.</p></div><p>조회(아침)·종례(하교)·긴급 등 유형에 따라 추후 강조 표현과 표시 시간대를 적용할 수 있습니다.</p></div></div>
    </section>

    <section class="board-tool-panel" data-board-tool="schedule" hidden>
      <div class="board-section-head"><div><small>SCHEDULE</small><h3>일정 등록</h3><p>특정 반부터 전교까지 표시 대상을 선택해 일정을 안내합니다.</p></div></div>
      <div class="board-form-card compact"><div class="board-form-row three"><label>일자<input type="date"></label><label>구분<select><option>학교일정</option><option>학년일정</option><option>학급일정</option><option>프로그램</option><option>기타</option></select></label><label>표시 대상<select><option>내 반</option><option>특정 반</option><option>학년 전체</option><option>전교</option></select></label></div><label><span class="board-field-title">일정 제목</span><input type="text" placeholder="예: 1학년 진로특강"></label><label><span class="board-field-title">안내 내용</span><textarea rows="3" placeholder="전자칠판에 함께 표시할 안내를 입력하세요."></textarea></label><div class="board-submit-row"><span>일정 등록은 교사에게 열어두고 표시 대상만 선택합니다.</span><button class="btn primary" type="button" disabled>Board DB 저장 준비 중</button></div></div>
    </section>

    <section class="board-tool-panel" data-board-tool="timetable" hidden>
      <div class="board-section-head"><div><small>TEMPORARY TIMETABLE</small><h3>시간표 변경</h3><p>정규 시간표는 그대로 보존하고 특정 날짜의 변경사항만 05A_임시시간표변경 이력으로 관리합니다.</p></div></div>
      <div class="board-form-card compact"><div class="board-form-row three"><label>날짜<input type="date"></label><label>학년·반<select><option>학년·반 선택</option><option>1학년 1반</option><option>1학년 2반</option><option>직접 선택</option></select></label><label>교시<select><option>1교시</option><option>2교시</option><option>3교시</option><option>4교시</option><option>5교시</option><option>6교시</option><option>7교시</option></select></label></div><div class="board-form-row"><label>기존 과목<input type="text" placeholder="원본 시간표에서 자동 표시 예정"></label><label>변경 과목<input type="text" placeholder="변경 과목"></label></div><div class="board-form-row three"><label>교사<input type="text" placeholder="담당교사"></label><label>교실<input type="text" placeholder="변경 교실"></label><label>사유<input type="text" placeholder="변경 사유"></label></div><div class="board-submit-row"><span>05_학급시간표는 수정하지 않습니다.</span><button class="btn primary" type="button" disabled>임시 변경 저장 준비 중</button></div></div>
    </section>

    <section class="board-tool-panel" data-board-tool="message" hidden>
      <div class="board-section-head"><div><small>SCREEN MESSAGE</small><h3>화면 알림</h3><p>일반 공지와 분리해 즉시 확인이 필요한 내용을 화면 메시지로 표시합니다.</p></div></div>
      <div class="board-form-card compact"><div class="board-form-row"><label>표시 대상<select><option>내 반</option><option>특정 반</option><option>학년 전체</option><option>전교</option></select></label><label>강조 수준<select><option>안내</option><option>중요</option><option>긴급</option></select></label></div><label><span class="board-field-title">화면 메시지</span><textarea rows="4" placeholder="즉시 표시할 내용을 입력하세요."></textarea></label><div class="board-submit-row"><span>13_화면메시지 원본과 연결합니다.</span><button class="btn primary" type="button" disabled>Board DB 저장 준비 중</button></div></div>
    </section>
  </div>\`;
}`;
renderer=replaceOnce(renderer,oldView,newView,'electronicBoardView control center');

const css=`
<style id="uep-08289-board-control-center-style">
.board-control-center{display:flex;flex-direction:column;gap:18px}.board-hero{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:24px 28px;border:1px solid #dbe8e5;border-radius:22px;background:linear-gradient(115deg,#f0fbf8 0%,#f6f8ff 55%,#faf5ff 100%)}.board-hero small,.board-section-head small{font-size:11px;font-weight:800;letter-spacing:.08em;color:#5aa898}.board-hero h2{margin:5px 0 6px;font-size:25px}.board-hero p,.board-section-head p{margin:0;color:#64748b}.board-api-pill{display:flex;align-items:center;gap:10px;min-width:190px;padding:11px 14px;border:1px solid #cfe8e1;border-radius:14px;background:rgba(255,255,255,.78)}.board-api-dot{width:9px;height:9px;border-radius:50%;background:#4cc5a5;box-shadow:0 0 0 5px rgba(76,197,165,.12)}.board-api-pill strong,.board-api-pill small{display:block}.board-api-pill small{margin-top:3px;color:#7b8794;letter-spacing:0}.board-action-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}.board-action-card{min-height:178px;padding:18px;border:1px solid #dce6eb;border-radius:21px;background:#fff;text-align:left;display:flex;flex-direction:column;cursor:pointer;transition:.16s ease;box-shadow:0 8px 22px rgba(15,23,42,.035)}.board-action-card:hover,.board-action-card.is-active{transform:translateY(-2px);border-color:#9ed8cc;box-shadow:0 12px 28px rgba(15,23,42,.07)}.board-action-icon{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-size:22px;font-weight:800;margin-bottom:13px}.tone-blue{background:#eaf2ff;color:#3977d5}.tone-mint{background:#e9f8f1;color:#2b9a6d}.tone-violet{background:#f0edff;color:#765fd4}.tone-amber{background:#fff3df;color:#b97713}.tone-rose{background:#fff0f1;color:#cc5b65}.board-action-copy small,.board-action-copy strong,.board-action-copy em{display:block}.board-action-copy small{font-size:12px;color:#64748b;font-weight:700}.board-action-copy strong{margin-top:4px;font-size:20px;color:#111827}.board-action-copy em{margin-top:7px;font-size:12px;color:#6b7280;font-style:normal;line-height:1.45}.board-action-foot{margin-top:auto;padding-top:14px;border-top:1px solid #edf1f3;font-size:12px;color:#6b7280;display:flex;justify-content:space-between}.board-action-foot b{color:#223b56}.board-tool-panel{padding:20px 22px;border:1px solid #dce6eb;border-radius:21px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.035)}.board-tool-panel[hidden]{display:none}.board-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.board-section-head h3{font-size:20px;margin:4px 0 5px}.board-head-actions{display:flex;gap:8px;flex-wrap:wrap}.board-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.board-summary-card{padding:15px 16px;border-radius:15px;background:#f8fafc;border:1px solid #e7edf0}.board-summary-card span,.board-summary-card strong,.board-summary-card small{display:block}.board-summary-card span{font-size:11px;color:#6b7280}.board-summary-card strong{margin:5px 0;font-size:15px;color:#172033}.board-summary-card small{color:#8793a0}.board-empty-state{display:flex;gap:14px;align-items:flex-start;margin-top:14px;padding:18px;border:1px dashed #cbd9dd;border-radius:15px;background:#fbfdfd}.board-empty-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#e9f8f1;color:#2b9a6d}.board-empty-state strong{font-size:14px}.board-empty-state p{margin:5px 0 0;color:#6b7280;line-height:1.55}.board-form-layout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr);gap:16px}.board-form-card,.board-preview-card{border:1px solid #e0e8ec;border-radius:17px;padding:18px;background:#fbfcfd}.board-form-card.compact{max-width:none}.board-form-card label{display:block;margin-bottom:14px;font-size:12px;font-weight:700;color:#44515f}.board-form-card input,.board-form-card select,.board-form-card textarea{width:100%;margin-top:7px;padding:10px 11px;border:1px solid #d4dfe4;border-radius:10px;background:#fff;color:#1f2937;box-sizing:border-box;font:inherit}.board-form-card label>small{display:block;margin-top:3px;color:#8a96a3;font-weight:500}.board-field-title{display:block;font-size:13px;color:#233044}.board-form-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.board-form-row.three{grid-template-columns:repeat(3,minmax(0,1fr))}.board-submit-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:12px;border-top:1px solid #e6ecef}.board-submit-row span{font-size:12px;color:#6b7280}.board-submit-row button:disabled{opacity:.58;cursor:not-allowed}.board-preview-card>small{font-weight:800;color:#5aa898}.board-preview-screen{min-height:165px;margin:12px 0;padding:24px;border-radius:18px;background:linear-gradient(140deg,#182235,#263653);color:#fff;display:flex;flex-direction:column;justify-content:center}.board-preview-screen strong{font-size:24px;line-height:1.25}.board-preview-screen p{font-size:14px;margin:10px 0 0;color:#dce6f2;line-height:1.5}.board-preview-card>p{font-size:12px;color:#74808c;line-height:1.5}.status-badge[data-state="ok"],#uepBoardApiStatus[data-state="ok"]{color:#168465}.status-badge[data-state="error"],#uepBoardApiStatus[data-state="error"]{color:#c34848}@media(max-width:1200px){.board-action-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.board-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:820px){.board-action-grid{grid-template-columns:1fr 1fr}.board-form-layout{grid-template-columns:1fr}.board-form-row,.board-form-row.three{grid-template-columns:1fr}.board-hero,.board-section-head,.board-submit-row{flex-direction:column}.board-api-pill{width:100%;box-sizing:border-box}}
</style>`;
must(!index.includes('uep-08289-board-control-center-style'),'08289 style already present');
index=replaceOnce(index,'</head>',css+'\n</head>','board control center static CSS');

write(rendererPath,renderer);
write(indexPath,index);
write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP v0.82.89 Board control center UI candidate patched');
