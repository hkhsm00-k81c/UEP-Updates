const fs=require('fs'),path=require('path');const root=path.resolve(process.argv[2]||'.');
const r=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8'),m=fs.readFileSync(path.join(root,'electron','main.cjs'),'utf8'),p=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
function must(c,msg){if(!c)throw new Error(msg)}
must(p.version==='0.82.99','version mismatch');
must(r.includes('APP_VERSION="0.82.99"'),'renderer version mismatch');
must(m.includes('__UEP_08299_BOARD_SCHOOL_READ__'),'School Read marker missing');
must(m.includes("UEP_BOARD_SCHOOL_READ_TOKEN_08299='__UEP_BOARD_SCHOOL_READ_08299__'"),'School Read token missing');
must(m.includes('schoolReadBatchRead(UEP_BOARD_DB_ID_08291,group)'),'Board School Read batch call missing');
must(m.includes("readMode:'school_read_api'"),'verified School Read context missing');
must(m.includes('if(verified){')&&m.includes('return {token:UEP_BOARD_SCHOOL_READ_TOKEN_08299'),'verified session does not select shared read path');
must(m.includes('boardSchoolReadPrime08299([...noticeRanges'),'Board detail batch prime missing');
must(m.includes('UEP_BOARD_SCHOOL_READ_REGISTRY_REQUIRED'),'registry error handling missing');
// Write path must remain server-session checked and use the established authenticated Sheets writer.
must(m.includes('async function boardWriteContext08291')&&m.includes('const credentials=await resolveSchoolServiceAccount();'),'existing Board write path changed unexpectedly');
must(m.includes('boardManagedDelete08297'),'0.82.97 managed delete regression');
must(r.includes('boardCanManageLive08298'),'0.82.98 visibility regression');
must(r.includes('refreshSelectedBoardPreview08297'),'live preview refresh regression');
console.log('UEP 0.82.99 regression OK');
