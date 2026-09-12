const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const indexPath=path.join(root,'index.html');
const rendererPath=path.join(root,'gyomuon.js');
const packagePath=path.join(root,'package.json');
function read(p){return fs.readFileSync(p,'utf8');}
function write(p,s){fs.writeFileSync(p,s,'utf8');}
function must(c,m){if(!c)throw new Error(m);}
function replaceOnce(text,from,to,label){
  const first=text.indexOf(from); must(first>=0,label+' source pattern not found');
  must(text.indexOf(from,first+from.length)<0,label+' source pattern not unique');
  const next=text.replace(from,to); must(next!==text,label+' replacement failed'); return next;
}

let index=read(indexPath);
let renderer=read(rendererPath);
const pkg=JSON.parse(read(packagePath));

must(pkg.version==='0.82.86',`baseline package version mismatch: ${pkg.version}`);
pkg.version='0.82.87';
renderer=replaceOnce(
  renderer,
  'const APP_VERSION="0.82.86"; /* UEP_08286_ADMISSIONS_VERSION_POPUP */',
  'const APP_VERSION="0.82.87"; /* UEP_08287_ELECTRONIC_BOARD_MENU */',
  'runtime version'
);

// Add one canonical sidebar entry. It is a normal data-page route, not a DOM after-patch.
const menuAnchor='<button class="nav" data-page="communication"><span>◇</span><b>학부모·학교홍보</b></button>\n</nav>';
const menuReplacement='<button class="nav" data-page="communication"><span>◇</span><b>학부모·학교홍보</b></button>\n<p class="nav-label">교실 화면</p>\n<button class="nav" data-page="board"><span>▣</span><b>UEP 전자칠판</b></button>\n</nav>';
index=replaceOnce(index,menuAnchor,menuReplacement,'electronic board sidebar menu');

// Persisted navigation must recognize the new route.
renderer=replaceOnce(
  renderer,
  'const allowedPages = new Set(["dashboard","students","dorm","timetable","attendance","scores","admissions","records","programs","alerts","calendar","work","duties","forms","outputs","settings","help"]);',
  'const allowedPages = new Set(["dashboard","students","dorm","timetable","attendance","scores","admissions","records","programs","alerts","calendar","work","duties","forms","outputs","communication","board","settings","help"]);',
  'allowedPages board route'
);

// Add the canonical page title metadata.
renderer=replaceOnce(
  renderer,
  '    communication: ["학부모와 학교 밖으로 이어지는 UEP", "학부모·학교홍보"],\n    settings:',
  '    communication: ["학부모와 학교 밖으로 이어지는 UEP", "학부모·학교홍보"],\n    board: ["교실 화면과 UEP Board 연결", "UEP 전자칠판"],\n    settings:',
  'navigate board title'
);

// The route is intentionally self-contained until an official management URL/native launch target is verified.
// Do not guess or hard-code a deployment URL here.
const viewAnchor='function render(page) {\n  if(setupWizardActive){ renderSetupWizard(); return; }\n  const views = {';
const boardView=`function electronicBoardView(){\n  return \`<div class="module-page electronic-board-page">\n    <div class="standalone-feature-head"><small>UEP BOARD</small><h2>UEP 전자칠판</h2><p>UEP Board와 교실 전자칠판 운영을 연결하는 관리 화면입니다.</p></div>\n    <div class="setting-card"><h3>연결 준비 상태</h3><p>전자칠판 앱의 공식 실행 대상 또는 관리 웹앱 주소가 확인되면 이 화면의 연결 버튼을 활성화합니다.</p><p class="safe-note">현재 버전은 확인되지 않은 URL이나 실행 명령을 임의로 사용하지 않습니다.</p></div>\n  </div>\`;\n}\n\nfunction render(page) {\n  if(setupWizardActive){ renderSetupWizard(); return; }\n  const views = {`;
renderer=replaceOnce(renderer,viewAnchor,boardView,'electronicBoardView insertion');
renderer=replaceOnce(
  renderer,
  '    communication: communicationView,\n    settings: settingsView,',
  '    communication: communicationView,\n    board: electronicBoardView,\n    settings: settingsView,',
  'render board view mapping'
);

write(indexPath,index);
write(rendererPath,renderer);
write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP v0.82.87 electronic-board menu candidate patched');
