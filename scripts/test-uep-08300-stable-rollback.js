const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'.');
const r=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const m=fs.readFileSync(path.join(root,'electron','main.cjs'),'utf8');
const p=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
function must(c,msg){if(!c)throw new Error(msg)}
must(p.version==='0.83.00','version mismatch');
must(r.includes('APP_VERSION="0.83.00"'),'renderer version mismatch');
must(r.includes('UEP_08300_STABLE_ROLLBACK'),'rollback marker missing');
must(!m.includes('__UEP_08299_BOARD_SCHOOL_READ__'),'faulty 0.82.99 Board School Read patch leaked into rollback');
must(m.includes('async function boardWriteContext08291'),'Board write path missing');
must(m.includes('boardManagedDelete08297'),'0.82.97 managed delete regression');
must(r.includes('boardCanManageLive08298'),'0.82.98 visibility regression');
must(r.includes('refreshSelectedBoardPreview08297'),'0.82.97 preview regression');
console.log('UEP 0.83.00 stable rollback regression OK');
