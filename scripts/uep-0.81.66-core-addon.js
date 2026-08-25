// __UEP_08166_CORE_RUNTIME__
function uepSharedSettingValue08166(key){
  const rows=Array.isArray(readonlyCache?.settings)?readonlyCache.settings:[];
  const hit=rows.find(r=>String(r?.key||r?.settingKey||r?.['설정키']||'').trim()===String(key));
  return String(hit?.value||hit?.settingValue||hit?.['설정값']||'').trim();
}
function uepUpsertLocalSharedSetting08166(key,value,description=''){
  if(!readonlyCache)readonlyCache={};
  if(!Array.isArray(readonlyCache.settings))readonlyCache.settings=[];
  const rows=readonlyCache.settings;
  const hit=rows.find(r=>String(r?.key||r?.settingKey||r?.['설정키']||'').trim()===String(key));
  const entry={key:String(key),value:String(value),description:String(description),settingKey:String(key),settingValue:String(value),'설정키':String(key),'설정값':String(value),'설명':String(description)};
  if(hit)Object.assign(hit,entry);else rows.push(entry);
}
async function uepSaveSharedSecurity08166(key,value,description){
  if(!window.schoolBoard?.saveSharedSecurityConfig)throw new Error('공용 보안설정 저장 기능을 사용할 수 없습니다.');
  const result=await window.schoolBoard.saveSharedSecurityConfig({key,value,description,editor:currentLoginTeacherName?.()||''});
  if(!result?.ok)throw new Error(result?.reason||'공용 보안설정을 저장하지 못했습니다.');
  uepUpsertLocalSharedSetting08166(key,value,description);
  return true;
}

// 민감정보: 관리자/학년부장이 공용 시트에 설정, 담임은 동일 비밀번호 입력 후 열람.
const __uepSensitiveSecurityConfig08166=sensitiveSecurityConfig;
sensitiveSecurityConfig=function(){
  const shared=uepSharedSettingValue08166('SENSITIVE_PIN_HASH');
  if(shared)return {passwordHash:shared,shared:true};
  return __uepSensitiveSecurityConfig08166();
};
sensitivePasswordConfigured=function(){return !!sensitiveSecurityConfig().passwordHash;};
setSensitivePasswordFlow=async function(){
  if(!canConfigureSensitivePassword())return toast('관리자·학년부장만 민감정보 비밀번호를 설정·변경할 수 있습니다.');
  const configured=sensitivePasswordConfigured();
  const result=await sensitivePasswordModal({mode:'set',configured});if(!result)return;
  if(configured&&await sensitiveHash(result.current)!==sensitiveSecurityConfig().passwordHash)return toast('현재 비밀번호가 일치하지 않습니다.');
  const passwordHash=await sensitiveHash(result.first);
  try{
    await uepSaveSharedSecurity08166('SENSITIVE_PIN_HASH',passwordHash,'민감정보 열람 공용 비밀번호 SHA-256 해시');
    localStorage.setItem(UEP_SENSITIVE_SECURITY_KEY,JSON.stringify({passwordHash,updatedAt:new Date().toISOString(),migrated:true}));
    lockSensitiveSession();toast('민감정보 공용 비밀번호를 저장했습니다.');if(state.activePage==='settings')render('settings');
  }catch(error){toast(error?.message||'민감정보 공용 비밀번호 저장 실패');}
};

// 선택과목 대외비: 공용 시트에 단일 해시를 저장하여 모든 담임이 같은 비밀번호로 인증.
subjectConfidentialSharedHash=function(){return uepSharedSettingValue08166('SUBJECT_CONFIDENTIAL_PIN_HASH');};
subjectConfidentialPasswordHash=function(){return subjectConfidentialSharedHash()||String(localStorage.getItem(UEP_SUBJECT_CONFIDENTIAL_PIN_KEY)||'');};
subjectConfidentialPasswordConfigured=function(){return !!subjectConfidentialPasswordHash();};
setSubjectConfidentialPassword=async function(){
  if(!subjectConfidentialAllowed()){toast('관리자·학년부장 권한에서 설정할 수 있습니다.');return false;}
  const configured=subjectConfidentialPasswordConfigured();
  const result=await sensitivePasswordModal({mode:'set',configured});if(!result)return false;
  if(configured&&await subjectConfidentialDigest(result.current)!==subjectConfidentialPasswordHash()){toast('현재 선택과목 비밀번호가 일치하지 않습니다.');return false;}
  const passwordHash=await subjectConfidentialDigest(result.first);
  try{
    await uepSaveSharedSecurity08166('SUBJECT_CONFIDENTIAL_PIN_HASH',passwordHash,'선택과목 대외비 공용 비밀번호 SHA-256 해시');
    localStorage.setItem(UEP_SUBJECT_CONFIDENTIAL_PIN_KEY,passwordHash);lockSubjectConfidential();toast('선택과목 공용 비밀번호를 저장했습니다.');if(state.activePage==='settings')render('settings');return true;
  }catch(error){toast(error?.message||'선택과목 공용 비밀번호 저장 실패');return false;}
};

// 기존 관리자 PC 로컬값이 있고 공용값이 비어 있으면 관리자 로그인에서 한 번만 중앙으로 승격.
async function uepMigrateLocalSecurity08166(){
  if(!(typeof canConfigureSensitivePassword==='function'&&canConfigureSensitivePassword()))return;
  try{
    const localSensitive=(()=>{try{return JSON.parse(localStorage.getItem(UEP_SENSITIVE_SECURITY_KEY)||'{}')?.passwordHash||'';}catch{return '';}})();
    if(localSensitive&&!uepSharedSettingValue08166('SENSITIVE_PIN_HASH'))await uepSaveSharedSecurity08166('SENSITIVE_PIN_HASH',localSensitive,'민감정보 열람 공용 비밀번호 SHA-256 해시');
    const localSubject=String(localStorage.getItem(UEP_SUBJECT_CONFIDENTIAL_PIN_KEY)||'');
    if(localSubject&&!uepSharedSettingValue08166('SUBJECT_CONFIDENTIAL_PIN_HASH'))await uepSaveSharedSecurity08166('SUBJECT_CONFIDENTIAL_PIN_HASH',localSubject,'선택과목 대외비 공용 비밀번호 SHA-256 해시');
  }catch(error){console.warn('[UEP security migration]',error);}
}

// Windows 시작 시 자동실행: 최초 0.81.66 적용 시 기본 ON, 사용자가 설정에서 끌 수 있음.
const UEP_AUTOSTART_PREF_08166='uep_windows_autostart_v1';
function uepAutoStartEnabled08166(){return localStorage.getItem(UEP_AUTOSTART_PREF_08166)!=='0';}
async function uepApplyAutoStart08166(enabled,quiet=false){
  if(!window.schoolBoard?.setAutoStart)return false;
  const result=await window.schoolBoard.setAutoStart(Boolean(enabled));
  if(result?.ok){localStorage.setItem(UEP_AUTOSTART_PREF_08166,enabled?'1':'0');if(!quiet&&typeof toast==='function')toast(enabled?'Windows 시작 시 UEP가 자동 실행됩니다.':'Windows 자동 실행을 해제했습니다.');return true;}
  if(!quiet&&typeof toast==='function')toast(result?.reason||'자동실행 설정을 저장하지 못했습니다.');return false;
}
async function uepInitAutoStart08166(){
  if(!window.schoolBoard?.setAutoStart)return;
  if(localStorage.getItem(UEP_AUTOSTART_PREF_08166)===null)await uepApplyAutoStart08166(true,true);
}

// 설정 > 시스템 관리 화면에 자동실행 카드 삽입.
const __uepSettingsView08166=settingsView;
settingsView=function(){
  let html=__uepSettingsView08166();
  if(settingsPanel==='system'&&typeof html==='string'&&!html.includes('data-uep-autostart08166')){
    const card=`<article class="setting-card"><div class="connection-title"><div><h3>Windows 시작 시 UEP 자동 실행</h3><p>PC 로그인 후 UEP를 자동으로 실행합니다. 담임 PC의 일상 사용을 위한 기본 설정입니다.</p></div><span class="state ${uepAutoStartEnabled08166()?'connected':''}">${uepAutoStartEnabled08166()?'사용':'해제'}</span></div><label class="setting-row"><span><b>자동 실행</b><small>Windows 시작프로그램을 직접 만들 필요가 없습니다.</small></span><input type="checkbox" data-uep-autostart08166 ${uepAutoStartEnabled08166()?'checked':''}></label></article>`;
    html=html.replace('<article class="setting-card update-settings-card">',card+'<article class="setting-card update-settings-card">');
  }
  if(settingsPanel==='security'&&typeof html==='string'){
    html=html.replace('비밀번호 원문은 저장하지 않고 해시값만 이 PC에 보관합니다.','비밀번호 원문은 저장하지 않고 해시값만 기본정보 연결시트의 공용 설정에 보관합니다.');
    html=html.replace('관리자·학년부장만 설정 및 열람할 수 있으며 담임은 비활성화됩니다.','관리자·학년부장만 설정·변경하며 담임은 동일 비밀번호를 입력한 뒤 열람합니다.');
  }
  return html;
};
document.addEventListener('change',event=>{
  const el=event.target.closest?.('[data-uep-autostart08166]');if(!el)return;uepApplyAutoStart08166(Boolean(el.checked));
});
setTimeout(()=>{uepMigrateLocalSecurity08166();uepInitAutoStart08166();},2200);
