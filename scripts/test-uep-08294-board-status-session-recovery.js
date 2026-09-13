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

must(pkg.version==='0.82.94','package version mismatch');
must(renderer.includes('UEP_08294_BOARD_STATUS_SESSION_RECOVERY'),'runtime marker missing');

// Existing five Board tools must remain in source. The lookup tool key has always been "boards".
for(const tool of ['boards','notice','schedule','timetable','exam']){
  must(renderer.includes(`data-board-tool="${tool}"`),`Board tool missing: ${tool}`);
}
must(renderer.includes('function boardAdminUiAllowed()'),'exam admin UI guard missing');
must(renderer.includes('profile?.isAdmin||authUser?.isAdmin'),'exam guard does not use authenticated profile');
must(renderer.includes('시험모드'),'exam mode label missing');

// 0.82.93 author verification stays intact.
must(renderer.includes('author:boardCurrentAuthor08293()'),'renderer author capture missing');
must(main.includes('boardVerifyAppend08293'),'notice append verification missing');
must(main.includes('ctx.displayAuthor'),'display author path missing');

// Unrequested visible notice-manager expansion is removed.
must(!renderer.includes('board-notice-manager-shell'),'visible notice manager still present');
must(!index.includes('uep08293BoardNoticeManageStyle'),'notice manager CSS still present');

// Board lookup advanced with safe fallback: fallback cannot become admin.
must(main.includes('function boardDbReadContext08294'),'read-only Board context missing');
must(main.includes('isAdmin:false'),'fallback user must not inherit admin');
must(main.includes('const isAdmin=verified&&'),'admin must require verified session');
must(main.includes('boardDbStatus08291(payload?.user||{})'),'Board status IPC does not accept UI context');
must(preload.includes('boardDbStatus: (payload)'),'preload status payload bridge missing');
must(renderer.includes('function boardStatusUser08294'),'renderer Board status context missing');
must(renderer.includes("window.schoolBoard.boardDbStatus({user:boardStatusUser08294()})"),'Board status call does not pass current UI context');
must(renderer.includes('조회 Board')&&renderer.includes('사용중')&&renderer.includes('마지막 접속'),'advanced Board cards missing');
must(index.includes('uep08294BoardStatusStyle'),'Board status style missing');

// Existing write paths must remain.
for(const kind of ['noticeCreate','scheduleCreate','timetableChange','examApply'])must(main.includes(`kind==='${kind}'`),`write path missing: ${kind}`);
console.log('UEP 0.82.94 regression checks passed');
