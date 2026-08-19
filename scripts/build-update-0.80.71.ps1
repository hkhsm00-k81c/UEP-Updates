$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$m=Get-Content $main -Raw -Encoding UTF8

# 0.80.71: keep OAuth authorization success separate from first Sheets sync result.
$old=@'
    await saveEncrypted(googleUserOAuthPath(),saved);
    liveDataCache=null;liveDataFetchedAt=0;
    const data=await fetchLiveData({force:true});
    return {ok:true,mode:'user_oauth',account:saved.email,sourceName:data?.sourceName||UEP_SPREADSHEET_NAME,preview:data?.summary||null,syncedAt:data?.syncedAt||''};
'@
$new=@'
    await saveEncrypted(googleUserOAuthPath(),saved);
    liveDataCache=null;liveDataFetchedAt=0;
    let syncOk=false, syncError='', syncCode='', data=null;
    try {
      data=await fetchLiveData({force:true});
      syncOk=true;
    } catch(error) {
      syncError=String(error?.message||error||'Google 시트 조회 실패');
      syncCode=String(error?.code||'');
    }
    return {ok:true,authorized:true,mode:'user_oauth',account:saved.email,sourceName:data?.sourceName||UEP_SPREADSHEET_NAME,preview:data?.summary||null,syncedAt:data?.syncedAt||'',syncOk,syncError,syncCode};
'@
if(-not $m.Contains($old)){throw '0.80.70 authorizeGoogleUser completion block not found'}
$m=$m.Replace($old,$new)

# Return explicit OAuth state and preserve it even when Sheets sync has not succeeded yet.
$oldStatus=@'
      return {ok:true,encryption:safeStorage.isEncryptionAvailable(),local:true,mode:"user_oauth",account:String(userOAuth.email||""),userOAuth:true};
'@
$newStatus=@'
      return {ok:true,authorized:true,encryption:safeStorage.isEncryptionAvailable(),local:true,mode:"user_oauth",account:String(userOAuth.email||""),userOAuth:true,connectionState:"authorized"};
'@
if($m.Contains($oldStatus)){$m=$m.Replace($oldStatus,$newStatus)}

# Add an explicit diagnostic IPC that verifies token + Sheets separately.
$needle='ipcMain.handle("google:disconnectUser", async () => {'
if($m.Contains($needle) -and $m -notmatch 'google:diagnoseUserOAuth'){
$diag=@'
ipcMain.handle("google:diagnoseUserOAuth", async () => {
  const result={authorized:false,account:"",tokenOk:false,sheetsOk:false,reason:"",status:0};
  try {
    const saved=await readGoogleUserOAuth();
    if(!saved){result.reason="Google 계정 연결 정보가 없습니다.";return result;}
    result.authorized=true;result.account=String(saved.email||"");
    const token=await getGoogleUserSheetsToken();
    result.tokenOk=Boolean(token);
    try {
      await readSheetBatch(token,UEP_SPREADSHEET_ID,["'01_사용자계정'!A1:B2"]);
      result.sheetsOk=true;
    } catch(error) {
      result.reason=String(error?.message||error||"Google 시트 조회 실패");
      const match=result.reason.match(/\((\d{3})\)/);result.status=match?Number(match[1]):0;
    }
    return result;
  } catch(error) {result.reason=String(error?.message||error||"Google OAuth 진단 실패");return result;}
});
'@
  $m=$m.Replace($needle,$diag+$needle)
}

Set-Content $main $m -Encoding UTF8 -NoNewline

# Renderer: after authorization, show connection success even if first Sheets read fails, with actionable reason.
$g=Get-Content $gyo -Raw -Encoding UTF8
$oldUi=@'
      if(!result?.ok){if(typeof toast==='function')toast(result?.reason||'Google 계정 연결에 실패했습니다.');return;}
      const status=await window.schoolBoard?.googleCredentialStatus?.();if(status)googleConnectionStatus=status;
      googleConnectionError='';
'@
$newUi=@'
      if(!result?.ok){if(typeof toast==='function')toast(result?.reason||'Google 계정 연결에 실패했습니다.');return;}
      const status=await window.schoolBoard?.googleCredentialStatus?.();if(status)googleConnectionStatus=status;
      if(result.syncOk===false){
        googleConnectionError=result.syncError||'Google 계정 승인은 완료되었지만 학교 시트 조회에 실패했습니다.';
        if(typeof toast==='function')toast(`Google 계정 연결 완료 · 시트 조회 확인 필요: ${googleConnectionError}`);
      } else {
        googleConnectionError='';
        if(typeof toast==='function')toast('Google 계정 연결 및 학교 시트 동기화가 완료되었습니다.');
      }
'@
if(-not $g.Contains($oldUi)){throw '0.80.70 OAuth renderer result block not found'}
$g=$g.Replace($oldUi,$newUi)
Set-Content $gyo $g -Encoding UTF8 -NoNewline

# Version metadata.
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.71'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

# Syntax validation.
node --check $main
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo
Write-Host 'UEP 0.80.71 OAuth state/sync diagnostics patch applied.'
