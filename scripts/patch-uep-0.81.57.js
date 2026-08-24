const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const gFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}
g=g.replace(/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/,'const APP_VERSION = "0.81.57";');

// 대시보드에는 공지 삭제 버튼이 없으므로 단일 선택자($)는 null을 반환합니다.
// 전체 선택자($$)로 복구해 빈 배열에도 안전하게 forEach가 동작하도록 합니다.
const fixed=`  $$('[data-notice-delete]').forEach(button=>button.onclick=async(event)=>`;
const brokenLine=/^  \$\('\[data-notice-delete\]'\)\.forEach\(button=>button\.onclick=async\(event\)=>/m;
assert(brokenLine.test(g),'broken notice delete selector not found');
g=g.replace(brokenLine,()=>fixed);

assert(g.includes('const APP_VERSION = "0.81.57";'),'version marker');
assert(g.includes(fixed),'dashboard null.forEach repair marker');
assert(!brokenLine.test(g),'broken selector remains');
fs.writeFileSync(gFile,g,'utf8');
console.log('UEP 0.81.57 dashboard null.forEach hotfix applied');
