const fs=require('fs'),path=require('path');const root=path.resolve(process.argv[2]||'.');
const r=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8'),m=fs.readFileSync(path.join(root,'electron','main.cjs'),'utf8'),p=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
function must(c,msg){if(!c)throw new Error(msg)}
must(p.version==='0.82.98','version mismatch');
must(r.includes('UEP_08298_BOARD_MANAGE_VISIBILITY'),'renderer marker missing');
must(m.includes('UEP_08298_BOARD_MANAGE_VISIBILITY'),'main marker missing');
must(r.includes('function boardCanManageLive08298'),'UI authorization helper missing');
must(r.includes('boardAdminUiAllowed()'),'admin visibility missing');
must(r.includes("bg===ug&&bc===uc"),'homeroom visibility missing');
must(r.includes('me===author'),'owner visibility missing');
must(m.includes('boardManagedDelete08297'),'delete backend regression');
must(m.includes('boardHomeroomTarget08297'),'server homeroom authorization regression');
must(r.includes('boardLiveDelete08297'),'live delete action regression');
must(r.includes('boardMineList')&&r.includes('boardManagedUpdate')&&r.includes('boardManagedDelete'),'owner manage regression');
must(r.includes('refreshSelectedBoardPreview08297'),'live preview regression');
console.log('UEP 0.82.98 regression OK');
