const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const renderer=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
function must(c,m){if(!c)throw new Error(m);}

must(pkg.version==='0.82.89','package version must be 0.82.89');
must(renderer.includes('const APP_VERSION="0.82.89"; /* UEP_08289_BOARD_CONTROL_CENTER_UI */'),'runtime version marker missing');
must(index.includes('data-page="board"') && index.includes('UEP 전자칠판'),'existing Board menu missing');
must(renderer.includes('board: electronicBoardView'),'existing Board render mapping missing');
must(renderer.includes('UEP_BOARD_API_URL="https://script.google.com/macros/s/AKfycbxTyh5TG6e2uWvOJrKcY-jihOE_2dXZxhTCZWTvKF773Av9qgNAoHod_pwI8VI9885a/exec"'),'official Board API URL missing');
must(renderer.includes('UEP_BOARD_DB_URL="https://docs.google.com/spreadsheets/d/1KStE1tJq6LTA8KR8fe56r7OxO1k9Ae8-lIfWw9d4wng/edit"'),'Board DB URL missing');
must(renderer.includes('function selectElectronicBoardTool(tool)'),'Board tool selector missing');
must(renderer.includes('function previewBoardNotice()'),'notice preview missing');
must(renderer.includes('전자칠판 조회') && renderer.includes('공지 등록') && renderer.includes('일정 등록') && renderer.includes('시간표 변경') && renderer.includes('화면 알림'),'control center sections missing');
must(renderer.includes('조회(아침)') && renderer.includes('종례(하교)'),'homeroom notice types missing');
must(renderer.includes('큰글씨 — 제목') && renderer.includes('작은글씨 — 내용'),'large/small notice labels missing');
must(renderer.includes('05A_임시시간표변경'),'temporary timetable source missing');
must(renderer.includes('05_학급시간표는 수정하지 않습니다.'),'base timetable preservation note missing');
must(renderer.includes('13_화면메시지'),'screen-message source missing');
must(renderer.includes('담임은 자기 반') && renderer.includes('관리자는 전체 반'),'Board view permission guidance missing');
must(renderer.includes('Board DB 저장 준비 중') && renderer.includes('disabled'),'read-only/write-next-stage safeguard missing');
must(index.includes('id="uep-08289-board-control-center-style"'),'static Board UI CSS missing');

for(const page of ['dashboard','students','attendance','grades','admissions','records','recordsAudit','programs','timetable','classWork','input','alert','settings']){
  must(renderer.includes(page),`existing route marker missing: ${page}`);
}
const boardBlock=renderer.slice(renderer.indexOf('const UEP_BOARD_API_URL='),renderer.indexOf('function render(page)'));
must(!boardBlock.includes('MutationObserver'),'Board feature must not use MutationObserver');
must(!boardBlock.includes('setTimeout'),'Board feature must not use setTimeout');
must(!boardBlock.includes('document.addEventListener("click"'),'Board feature must not add global click delegation');
console.log('UEP 0.82.89 Board control center UI regression OK');
