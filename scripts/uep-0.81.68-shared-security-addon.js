// __UEP_08168_SHARED_SECURITY_READ_RUNTIME__
let __uepSharedSecurityLoading08168=null;
async function uepLoadSharedSecurity08168(force=false){
  if(!window.schoolBoard?.readSharedSecurityConfig)return false;
  if(!force&&uepSharedSettingValue08166?.('SENSITIVE_PIN_HASH')&&uepSharedSettingValue08166?.('SUBJECT_CONFIDENTIAL_PIN_HASH'))return true;
  if(__uepSharedSecurityLoading08168)return __uepSharedSecurityLoading08168;
  __uepSharedSecurityLoading08168=(async()=>{
    try{
      const result=await window.schoolBoard.readSharedSecurityConfig();
      if(!result?.ok)throw new Error(result?.reason||'공용 비밀번호 설정을 읽지 못했습니다.');
      for(const row of (result.settings||[])){
        const key=String(row.key||row['설정키']||'').trim();
        const value=String(row.value||row['설정값']||'').trim();
        if(key&&value)uepUpsertLocalSharedSetting08166?.(key,value,String(row.description||row['설명']||''));
      }
      return true;
    }catch(error){console.warn('[UEP 0.81.68 shared security read]',error);return false;}
    finally{__uepSharedSecurityLoading08168=null;}
  })();
  return __uepSharedSecurityLoading08168;
}

// 선택과목 비밀번호 게이트는 클릭 직전에 중앙값을 한 번 더 읽는다.
const __uepUnlockSubjectConfidential08168=unlockSubjectConfidential;
unlockSubjectConfidential=async function(){
  if(!subjectConfidentialPasswordConfigured?.())await uepLoadSharedSecurity08168(true);
  return __uepUnlockSubjectConfidential08168.apply(this,arguments);
};

// 민감정보도 화면 진입 전에 중앙 설정을 확보한다. 기존 게이트 함수는 그대로 사용한다.
const __uepSensitiveSecurityConfig08168=sensitiveSecurityConfig;
sensitiveSecurityConfig=function(){
  const shared=uepSharedSettingValue08166?.('SENSITIVE_PIN_HASH');
  if(shared)return {passwordHash:shared,shared:true};
  return __uepSensitiveSecurityConfig08168.apply(this,arguments);
};

// 로그인 직후/동기화 직후 중앙값 로드.
setTimeout(()=>uepLoadSharedSecurity08168(true),1200);
setInterval(()=>uepLoadSharedSecurity08168(true),10*60*1000);
