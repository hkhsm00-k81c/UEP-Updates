const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const renderer=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
function must(c,m){if(!c)throw new Error(m);}
function count(text,needle){return text.split(needle).length-1;}

must(pkg.version==='0.82.87',`package version mismatch: ${pkg.version}`);
must(renderer.includes('const APP_VERSION="0.82.87"; /* UEP_08287_ELECTRONIC_BOARD_MENU */'),'runtime version marker missing');
must(count(index,'data-page="board"')===1,`board menu count mismatch: ${count(index,'data-page="board"')}`);
must(index.includes('<b>UEP 전자칠판</b>'),'electronic board menu label missing');
must(renderer.includes('"communication","board","settings"'),'board missing from allowedPages sequence');
must(renderer.includes('board: ["교실 화면과 UEP Board 연결", "UEP 전자칠판"]'),'board navigate title missing');
must(renderer.includes('function electronicBoardView(){'),'electronicBoardView missing');
must(renderer.includes('board: electronicBoardView'),'board render mapping missing');

// Existing primary routes must remain intact.
for(const page of ['dashboard','students','attendance','scores','admissions','records','programs','calendar','work','settings']){
  must(index.includes(`data-page="${page}"`) || renderer.includes(`${page}:`),`existing route missing: ${page}`);
}

// This candidate must not invent an external deployment target or introduce forbidden DOM-patch techniques.
const marker='/* UEP_08287_ELECTRONIC_BOARD_MENU */';
const markerAt=renderer.indexOf(marker);
must(markerAt>=0,'candidate marker missing');
must(!index.includes('script.google.com/macros/s/'),'index unexpectedly hard-codes Apps Script deployment URL');
const viewStart=renderer.indexOf('function electronicBoardView(){');
const viewEnd=renderer.indexOf('\nfunction render(page)',viewStart);
const boardBlock=renderer.slice(viewStart,viewEnd);
for(const forbidden of ['MutationObserver','setTimeout(','document.body.innerHTML','addEventListener("click"','addEventListener(\'click\'']){
  must(!boardBlock.includes(forbidden),`forbidden board implementation pattern: ${forbidden}`);
}
console.log('UEP 0.82.87 electronic-board menu regression OK');
