const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(rendererFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.48";');

const oldGate=`if(!(await unlockSubjectConfidential())){e.preventDefault();e.stopImmediatePropagation();return;}hideContent(false);setActive([planBtn,student,subject],subject);},true);`;
const newGate=`if(!(await unlockSubjectConfidential())){e.preventDefault();e.stopImmediatePropagation();return;}
      // 0.81.48: 인증 성공 후 실제 과목별 신청현황 상태로 전환하고 화면을 다시 그립니다.
      curriculumWorkspaceMode='subjects';hideContent(false);setActive([planBtn,student,subject],subject);render('records');},true);`;
assert(g.includes(oldGate),'subject authenticated navigation source not found');
g=g.replace(oldGate,newGate);
assert(!g.includes(oldGate),'subject authenticated navigation source remains');

for(const marker of [
  'const APP_VERSION = "0.81.48";',
  "curriculumWorkspaceMode='subjects'",
  "render('records');},true);",
  "sensitivePasswordModal({mode:'set',configured})",
  "[data-subject-confidential-password-set],[data-uep134-pin-btn]",
  '<b>게시 중 직접공지</b>',
  'function teacherTimetableMasterRows(teacher="")',
  "setInterval(check,10*60*1000)"
])assert(g.includes(marker),'0.81.48 regression marker missing: '+marker);

fs.writeFileSync(rendererFile,g,'utf8');
console.log('UEP 0.81.48 authenticated subject navigation repair applied');
