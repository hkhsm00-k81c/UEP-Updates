const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(rendererFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}
function replaceOnce(oldText,newText,label){assert(g.includes(oldText),label+' source not found');g=g.replace(oldText,newText);assert(!g.includes(oldText),label+' source remains');}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.46";');

replaceOnce(
`function subjectConfidentialAllowed(){return ['관리자','학년부장'].includes(String(currentRoleDisplay?.()||''));}`,
`function subjectConfidentialAllowed(){
  const role=String(currentRoleId?.()||'');
  return ['admin','grade_head'].includes(role)||['관리자','학년부장'].includes(String(currentRoleDisplay?.()||''));
}`,
'subject security role check');

replaceOnce(
`async function setSubjectConfidentialPassword(){if(!subjectConfidentialAllowed())return false;const p=prompt('새 선택과목 대외비 비밀번호를 4자리 이상 입력하세요.');if(!p||p.length<4){if(p)alert('4자리 이상 입력해 주세요.');return false;}const p2=prompt('확인을 위해 같은 비밀번호를 다시 입력하세요.');if(p!==p2){alert('비밀번호가 일치하지 않습니다.');return false;}localStorage.setItem(UEP_SUBJECT_CONFIDENTIAL_PIN_KEY,await subjectConfidentialDigest(p));sessionStorage.removeItem(UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY);alert('선택과목 대외비 비밀번호가 저장되었습니다.');render('settings');return true;}`,
`async function setSubjectConfidentialPassword(){
  // 0.81.46: Electron에서 차단될 수 있는 prompt 대신 검증된 보안 전용 모달을 사용합니다.
  if(!subjectConfidentialAllowed()){toast('관리자·학년부장 권한에서 설정할 수 있습니다.');return false;}
  const configured=subjectConfidentialPasswordConfigured();
  const result=await sensitivePasswordModal({mode:'set',configured});
  if(!result)return false;
  if(configured&&await subjectConfidentialDigest(result.current)!==subjectConfidentialPasswordHash()){
    toast('현재 선택과목 비밀번호가 일치하지 않습니다.');return false;
  }
  localStorage.setItem(UEP_SUBJECT_CONFIDENTIAL_PIN_KEY,await subjectConfidentialDigest(result.first));
  lockSubjectConfidential();
  toast('선택과목 신청현황 비밀번호를 저장했습니다.');
  if(state.activePage==='settings')render('settings');
  return true;
}`,
'subject password modal flow');

replaceOnce(
`  const subjectSet=event.target.closest?.('[data-subject-confidential-password-set]');
  if(subjectSet&&!subjectSet.disabled){event.preventDefault();event.stopImmediatePropagation();await setSubjectConfidentialPassword();return;}`,
`  const subjectSet=event.target.closest?.('[data-subject-confidential-password-set],[data-uep134-pin-btn]');
  if(subjectSet&&!subjectSet.disabled){event.preventDefault();event.stopImmediatePropagation();await setSubjectConfidentialPassword();return;}`,
'all subject password buttons');

for(const marker of [
  'const APP_VERSION = "0.81.46";',
  "['admin','grade_head'].includes(role)",
  "sensitivePasswordModal({mode:'set',configured})",
  "[data-subject-confidential-password-set],[data-uep134-pin-btn]",
  '선택과목 신청현황 비밀번호를 저장했습니다.'
])assert(g.includes(marker),'missing 0.81.46 marker: '+marker);

fs.writeFileSync(rendererFile,g,'utf8');
console.log('UEP 0.81.46 subject confidential password modal repair applied');
