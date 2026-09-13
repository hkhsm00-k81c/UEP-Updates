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

must(pkg.version==='0.82.95','package version mismatch');
must(renderer.includes('UEP_08295_BOARD_CARD_OPERATION_CONNECT'),'runtime marker missing');

// Preserve the existing Board surface and write paths.
for(const tool of ['boards','notice','schedule','timetable','exam'])must(renderer.includes(`data-board-tool="${tool}"`),`Board tool missing: ${tool}`);
for(const kind of ['noticeCreate','scheduleCreate','timetableChange','examApply'])must(main.includes(`kind==='${kind}'`),`write path missing: ${kind}`);
must(renderer.includes('boardCurrentAuthor08293'),'author fix missing');
must(main.includes('boardVerifyAppend08293'),'author verification missing');
must(renderer.includes('function boardAdminUiAllowed'),'exam admin guard missing');

// Connection-only scope: actual Board card -> authorized detail -> existing tools.
must(main.includes('async function boardDbDetail08295'),'Board detail reader missing');
must(main.includes("'06_1학년공지'"),'1st grade notice read missing');
must(main.includes("'09_일정'!A3:T800"),'schedule read missing');
must(main.includes("'05A_임시시간표변경'!A3:R800"),'temporary timetable read missing');
must(main.includes("'22_시험운영'!A3:Q300"),'exam read missing');
must(main.includes("UEP_BOARD_NOT_VISIBLE"),'Board authorization check missing');
must(main.includes('const visible=ctx.isAdmin?all:all.filter'),'homeroom/admin visibility guard missing');
must(preload.includes('boardDbDetail: (payload)'),'detail preload bridge missing');
must(renderer.includes('selectBoardCard08295'),'card click connection missing');
must(renderer.includes('boardBindSelected08295'),'selected class binding missing');
must(renderer.includes('boardOperationDetail08295'),'detail mount missing');
must(renderer.includes('선택하여 운영 연결'),'card operation affordance missing');
must(renderer.includes("boardSetSelect08295('notice','표시 대상',label)"),'notice target auto-bind missing');
must(renderer.includes("boardSetSelect08295('schedule','표시 대상',label)"),'schedule target auto-bind missing');
must(renderer.includes("boardSetSelect08295('timetable','학년·반',label)"),'timetable target auto-bind missing');
must(renderer.includes("boardSetSelect08295('exam','적용 대상',label)"),'exam target auto-bind missing');
must(index.includes('uep08295BoardOperationStyle'),'connection UI style missing');

// Do not reintroduce the out-of-scope notice manager.
must(!renderer.includes('board-notice-manager-shell'),'unrequested notice manager reintroduced');
console.log('UEP 0.82.95 Board card operation connection regression checks passed');
