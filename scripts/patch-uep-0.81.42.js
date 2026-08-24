const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(rendererFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}
function replaceOnce(oldText,newText,label){assert(g.includes(oldText),label+' source not found');g=g.replace(oldText,newText);assert(!g.includes(oldText),label+' source remains');}
const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.42";');
replaceOnce(`function currentTeacherHomeroomClass(){
  const name=currentLoginTeacherName();
  const row=(SOURCE_REFERENCE_DATA?.homeroom||[]).find(item=>String(item?.[0])==='1'&&String(item?.[2]||'').trim()===name);
  return row?\`${'${normalizeTimetableGradeClass(row).grade}-${normalizeTimetableGradeClass(row).classNo}'}\`:'';
}
function currentUserIsGradeHead(){
  const name=currentLoginTeacherName();
  return (DUTY_ASSIGNMENTS||[]).some(row=>String(row?.department||'').trim()==='1학년부'&&String(row?.role||'').trim()==='부장'&&String(row?.person||'').trim()===name);
}`,`function currentTeacherHomeroomClass(){
  // 0.81.42: 로그인 계정표의 담당학년·담임반을 최우선으로 사용합니다.
  const profile=currentUserProfile();
  const grade=String(profile.grade||'').replace(/\\D/g,'');
  const classNo=String(profile.classNo||'').replace(/\\D/g,'');
  if(grade&&classNo)return \`${'${grade}-${classNo}'}\`;
  const name=currentLoginTeacherName();
  const row=(SOURCE_REFERENCE_DATA?.homeroom||[]).find(item=>String(item?.[0])===String(grade||'1')&&String(item?.[2]||'').trim()===name);
  return row?\`${'${normalizeTimetableGradeClass(row).grade}-${normalizeTimetableGradeClass(row).classNo}'}\`:'';
}
function currentUserIsGradeHead(){
  const role=currentRoleId();
  if(role==='admin'||role==='grade_head'||role==='grade_manager')return true;
  const name=currentLoginTeacherName();
  return (DUTY_ASSIGNMENTS||[]).some(row=>String(row?.department||'').trim()==='1학년부'&&String(row?.role||'').trim()==='부장'&&String(row?.person||'').trim()===name);
}`,'homeroom and grade operation scope');
replaceOnce(`<button type="button" class="btn primary" onclick="setSubjectConfidentialPassword()" \${subjectConfidentialAllowed()?'':'disabled'}>\${subjectConfidentialPasswordConfigured()?'비밀번호 변경':'비밀번호 설정'}</button><button type="button" class="btn secondary" onclick="lockSubjectConfidential();render('settings');toast('과목별 신청현황을 잠갔습니다.')" \${subjectConfidentialAllowed()?'':'disabled'}>즉시 잠금</button>`,`<button type="button" class="btn primary" data-subject-confidential-password-set \${subjectConfidentialAllowed()?'':'disabled'}>\${subjectConfidentialPasswordConfigured()?'비밀번호 변경':'비밀번호 설정'}</button><button type="button" class="btn secondary" data-subject-confidential-lock \${subjectConfidentialAllowed()?'':'disabled'}>즉시 잠금</button>`,'subject confidential button markup');
const eventAnchor=`window.addEventListener('beforeunload',lockSensitiveSession);`;
assert(g.includes(eventAnchor),'sensitive security event anchor not found');
g=g.replace(eventAnchor,`${eventAnchor}
// 0.81.42: 재렌더링과 Electron 인라인 이벤트 제한에 영향받지 않는 보안 버튼 처리
document.addEventListener('click',async event=>{
  const sensitiveSet=event.target.closest?.('[data-sensitive-password-set]');
  if(sensitiveSet){event.preventDefault();event.stopImmediatePropagation();await setSensitivePasswordFlow();return;}
  const sensitiveLock=event.target.closest?.('[data-sensitive-lock]');
  if(sensitiveLock){event.preventDefault();event.stopImmediatePropagation();lockSensitiveSession();toast('민감정보를 잠갔습니다.');if(state.activePage==='settings')render('settings');return;}
  const subjectSet=event.target.closest?.('[data-subject-confidential-password-set]');
  if(subjectSet&&!subjectSet.disabled){event.preventDefault();event.stopImmediatePropagation();await setSubjectConfidentialPassword();return;}
  const subjectLock=event.target.closest?.('[data-subject-confidential-lock]');
  if(subjectLock&&!subjectLock.disabled){event.preventDefault();event.stopImmediatePropagation();lockSubjectConfidential();render('settings');toast('과목별 신청현황을 잠갔습니다.');}
},true);`);
for(const marker of ['const APP_VERSION = "0.81.42";',"if(grade&&classNo)return `${grade}-${classNo}`;", "if(role==='admin'||role==='grade_head'||role==='grade_manager')return true;",'data-subject-confidential-password-set',"document.addEventListener('click',async event=>{"])assert(g.includes(marker),'missing marker: '+marker);
fs.writeFileSync(rendererFile,g,'utf8');
console.log('UEP 0.81.42 role, homeroom, counsel and security repair applied');
