const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(rendererFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.43";');

const oldCounsel=`const isHead=currentUserIsGradeHead(), mine=String(currentTeacherHomeroomClass()||'').replace(/\\D/g,'');`;
const newCounsel=`// 0.81.43: "1-5"에서 학년 숫자까지 합치지 않고 마지막 반 번호(5)만 사용합니다.\n  const isHead=currentUserIsGradeHead(), mine=String(currentTeacherHomeroomClass()||'').split('-').pop().replace(/\\D/g,'');`;
assert(g.includes(oldCounsel),'counsel combined grade/class parser not found');
g=g.replace(oldCounsel,newCounsel);
assert(!g.includes(oldCounsel),'counsel combined grade/class parser remains');
assert(g.includes('const APP_VERSION = "0.81.43";'),'version marker missing');
assert(g.includes("split('-').pop().replace(/\\D/g,'')"),'counsel class parser repair missing');

fs.writeFileSync(rendererFile,g,'utf8');
console.log('UEP 0.81.43 counseling homeroom class parser repair applied');
