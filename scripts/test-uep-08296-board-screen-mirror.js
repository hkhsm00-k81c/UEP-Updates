const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const must=(c,m)=>{if(!c)throw new Error(m);};
const renderer=read('gyomuon.js');
const main=read('electron/main.cjs');
const preload=read('electron/preload.cjs');
const index=read('index.html');
const pkg=JSON.parse(read('package.json'));

must(pkg.version==='0.82.96','package version mismatch');
must(renderer.includes('UEP_08296_BOARD_SCREEN_MIRROR'),'runtime marker missing');

// Preserve existing Board surface and all write tools.
for(const tool of ['boards','notice','schedule','timetable','exam'])must(renderer.includes(`data-board-tool="${tool}"`),`Board tool missing: ${tool}`);
for(const kind of ['noticeCreate','scheduleCreate','timetableChange','examApply'])must(main.includes(`kind==='${kind}'`),`write path missing: ${kind}`);
must(renderer.includes('boardCurrentAuthor08293'),'author fix missing');
must(main.includes('boardVerifyAppend08293'),'author verification missing');
must(renderer.includes('function boardAdminUiAllowed'),'exam admin guard missing');
must(preload.includes('boardDbDetail: (payload)'),'detail preload bridge missing');

// Read-only Board mirror must follow the actual Board app data model.
must(main.includes('async function boardDbDetail08296'),'0.82.96 detail reader missing');
must(main.includes("boardSheetObjects08296(ctx.token,'05_학급시간표'"),'physical Board timetable source missing');
must(main.includes("boardSheetObjects08296(ctx.token,'09_일정'"),'physical Board schedule source missing');
must(main.includes("boardSheetObjects08296(ctx.token,'22_시험운영'"),'exam operation source missing');
must(main.includes("boardSheetObjects08296(ctx.token,'23_시험시간표'"),'today exam timetable source missing');
must(main.includes("const displayMode=exam.active?'EXAM'"),'Board display mode precedence missing');
must(main.includes('screenScheduleCount:exam.active?exam.timetable.length:schedules.length'),'screen schedule count must use exam timetable in exam mode');
must(main.includes("const start=boardDate08296(r['일자']),end=boardDate08296(r['종료일'])||start;if(!start||end<today)return false;"),'Board-style upcoming schedule filter missing');

// Query is a preview, not an edit-navigation hub.
must(renderer.includes('현재 전자칠판 화면 조회'),'mirror heading missing');
must(renderer.includes('선택하여 화면 조회 ›'),'card preview affordance missing');
must(renderer.includes('실제 전자칠판에 표시되는 현재 화면 내용을 조회합니다.'),'preview mount guidance missing');
must(renderer.includes("row('시험일정'"),'exam timetable rendering missing');
must(renderer.includes('화면 일정 <b>'),'screen schedule count UI missing');
must(!renderer.includes('이 반 공지'),'preview still contains notice navigation button');
must(!renderer.includes('이 반 일정'),'preview still contains schedule navigation button');
must(!renderer.includes('이 반 시간표 변경'),'preview still contains timetable navigation button');
must(!renderer.includes('이 반 시험모드'),'preview still contains exam navigation button');
must(!renderer.includes("boardBindSelected08295(tool);"),'query still auto-binds edit tool');
must(index.includes('uep08296BoardMirrorStyle'),'mirror CSS missing');

// Keep authorization and do not reintroduce out-of-scope notice manager.
must(main.includes('UEP_BOARD_NOT_VISIBLE'),'Board authorization check missing');
must(!renderer.includes('board-notice-manager-shell'),'unrequested notice manager reintroduced');
console.log('UEP 0.82.96 Board screen mirror regression checks passed');
