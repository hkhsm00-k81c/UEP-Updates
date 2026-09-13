const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const renderer=read('gyomuon.js'),main=read('electron/main.cjs'),preload=read('electron/preload.cjs'),index=read('index.html');
const pkg=JSON.parse(read('package.json'));
function ok(c,m){if(!c)throw new Error(m);}
ok(pkg.version==='0.82.93','version mismatch');
ok(renderer.includes('const APP_VERSION="0.82.93"; /* UEP_08293_BOARD_AUTHOR_NOTICE_MANAGE */'),'renderer version marker missing');
ok(main.includes('__UEP_08293_BOARD_AUTHOR_NOTICE_MANAGE__'),'main marker missing');
ok(renderer.includes('__UEP_08293_BOARD_AUTHOR_NOTICE_MANAGE_RENDERER__'),'renderer helper marker missing');
ok(main.includes('boardDisplayAuthor08293'),'author resolver missing');
ok(main.includes('boardVerifyAppend08293'),'append verification missing');
ok(main.includes('boardNoticeList08293'),'notice list missing');
ok(main.includes('boardNoticeDelete08293'),'notice delete missing');
ok(main.includes("'공지삭제','SUCCESS'"),'notice delete audit missing');
ok(preload.includes('boardNoticeList:'),'preload notice list missing');
ok(preload.includes('boardNoticeDelete:'),'preload notice delete missing');
ok(renderer.includes('현재 공지 관리'),'notice management UI missing');
ok(renderer.includes('refreshBoardNoticeManager08293'),'notice refresh UI missing');
ok(renderer.includes('deleteBoardNotice08293'),'notice delete UI missing');
ok(renderer.includes("author:boardCurrentAuthor08293()")||renderer.includes("author: boardCurrentAuthor08293()")||renderer.includes("author:boardCurrentAuthor08293"),'author payload helper not wired');
ok(index.includes('uep08293BoardNoticeManageStyle'),'notice management CSS missing');
// Preserve 0.82.92 academic recovery and 0.82.91 Board write functions.
ok(renderer.includes('uep08292AcademicRowsReady'),'academic stage recovery missing');
ok(renderer.includes('uep08292EnsureAcademicForPage'),'academic route guard missing');
ok(main.includes('__UEP_08292_BOARD_TARGET_FIX__'),'board target fix missing');
ok(main.includes('boardDbWrite08291'),'board write missing');
ok(renderer.includes('saveBoardTimetable08291'),'timetable write missing');
ok(renderer.includes('applyBoardExam08291'),'exam write missing');
// No disallowed patch patterns introduced.
ok(!renderer.includes('MutationObserver'),'MutationObserver introduced');
console.log('UEP 0.82.93 regression PASS');