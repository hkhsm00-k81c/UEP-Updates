// __UEP_08167_PASSWORD_RESET_RUNTIME__
async function uepResetSharedPassword08167(kind){
  const isSensitive=kind==='sensitive';
  const key=isSensitive?'SENSITIVE_PIN_HASH':'SUBJECT_CONFIDENTIAL_PIN_HASH';
  const label=isSensitive?'민감정보':'선택과목';
  if(!(typeof canConfigureSensitivePassword==='function'&&canConfigureSensitivePassword())){
    toast('관리자·학년부장만 비밀번호를 초기화할 수 있습니다.');return false;
  }
  if(!confirm(`${label} 비밀번호를 초기화할까요?\n이 PC의 기존 비밀번호와 공용 설정값이 함께 삭제됩니다.`))return false;
  if(!window.schoolBoard?.resetSharedSecurityConfig){toast('공용 비밀번호 초기화 기능을 사용할 수 없습니다.');return false;}
  const result=await window.schoolBoard.resetSharedSecurityConfig({key,editor:currentLoginTeacherName?.()||''});
  if(!result?.ok){toast(result?.reason||`${label} 비밀번호 초기화 실패`);return false;}
  if(isSensitive){
    localStorage.removeItem(UEP_SENSITIVE_SECURITY_KEY);
    lockSensitiveSession?.();
    uepUpsertLocalSharedSetting08166?.(key,'',`${label} 비밀번호 초기화`);
  }else{
    localStorage.removeItem(UEP_SUBJECT_CONFIDENTIAL_PIN_KEY);
    lockSubjectConfidential?.();
    uepUpsertLocalSharedSetting08166?.(key,'',`${label} 비밀번호 초기화`);
  }
  toast(`${label} 비밀번호를 초기화했습니다. 새 비밀번호를 설정해 주세요.`);
  if(state.activePage==='settings')render('settings');
  setTimeout(uepInstallPasswordResetButtons08167,80);
  return true;
}
function uepInstallPasswordResetButtons08167(){
  if(state?.activePage!=='settings'||settingsPanel!=='security')return;
  const cards=[...document.querySelectorAll('.setting-card')];
  const targets=[
    {needle:'민감정보 보안',kind:'sensitive'},
    {needle:'선택과목 대외비 보안',kind:'subject'}
  ];
  for(const t of targets){
    const card=cards.find(c=>String(c.textContent||'').includes(t.needle));
    if(!card||card.querySelector(`[data-uep-reset-password08167="${t.kind}"]`))continue;
    const area=card.querySelector('.connection-actions,.modal-actions')||card;
    const btn=document.createElement('button');btn.type='button';btn.className='btn danger secondary';btn.textContent='비밀번호 초기화';btn.dataset.uepResetPassword08167=t.kind;
    area.appendChild(btn);
  }
}
document.addEventListener('click',event=>{
  const btn=event.target.closest?.('[data-uep-reset-password08167]');if(!btn)return;
  event.preventDefault();event.stopPropagation();uepResetSharedPassword08167(btn.dataset.uepResetPassword08167);
});
const __uepRender08167=render;
render=function(...args){const out=__uepRender08167.apply(this,args);setTimeout(uepInstallPasswordResetButtons08167,50);return out;};
setTimeout(uepInstallPasswordResetButtons08167,300);
