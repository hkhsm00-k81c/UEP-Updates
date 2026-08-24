const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(rendererFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}
function replaceOnce(oldText,newText,label){assert(g.includes(oldText),label+' source not found');g=g.replace(oldText,newText);assert(!g.includes(oldText),label+' source remains');}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.47";');

replaceOnce(
`  const notices=directNoticeRows().filter(item=>String(item.postDate||item.date||'').slice(0,10)===dateKey(today)||item.homeroomNotice||item.important).slice(0,3);`,
`  // 0.81.47: 게시일이 오늘인 공지만 보지 않고, 게시 시작~종료 기간 안의 모든 유효 공지를 표시합니다.
  const notices=directNoticeRows()
    .filter(item=>currentUserCanManageNotices()||!currentNoticeReceipt(item)?.dismissed)
    .slice(0,3);`,
'dashboard active notice filter');

g=g.replaceAll('<b>오늘의 직접공지</b>','<b>게시 중 직접공지</b>');
g=g.replaceAll('오늘 전달할 직접 공지가 없습니다.','현재 게시 중인 직접 공지가 없습니다.');

for(const marker of [
  'const APP_VERSION = "0.81.47";',
  'const notices=directNoticeRows()',
  "!currentNoticeReceipt(item)?.dismissed",
  '<b>게시 중 직접공지</b>',
  '현재 게시 중인 직접 공지가 없습니다.'
])assert(g.includes(marker),'missing 0.81.47 marker: '+marker);

fs.writeFileSync(rendererFile,g,'utf8');
console.log('UEP 0.81.47 dashboard active notice period repair applied');
