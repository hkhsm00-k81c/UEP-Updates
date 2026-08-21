$ErrorActionPreference='Stop'

# Build from shipped 0.80.97. First apply the corrected SDGs refinement.
& "$PSScriptRoot/build-update-0.80.98.ps1"
if($LASTEXITCODE -ne 0){throw '0.80.98 SDGs prerequisite failed'}

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$m=Get-Content $main -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8

# Version: 0.80.98 -> 0.80.99.
$g=$g.Replace('const APP_VERSION = "0.80.98";','const APP_VERSION = "0.80.99";').Replace('v0.80.98','v0.80.99')

# Google OAuth token exchange/refresh: explicitly serialize URLSearchParams.
# Electron net.fetch can otherwise hand the token endpoint a body that is not encoded as expected.
$tokenRequest="const response=await net.fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});"
$tokenRequestFixed="const response=await net.fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:body.toString()});"
$tokenCount=([regex]::Matches($m,[regex]::Escape($tokenRequest))).Count
if($tokenCount -lt 1){throw 'Google OAuth token request anchor not found'}
$m=$m.Replace($tokenRequest,$tokenRequestFixed)

# Persisted user OAuth must be validated/refreshed automatically when UEP checks connection status.
# This makes a successful first approval survive later UEP logins without pressing Google account connect again.
$statusStartNeedle='ipcMain.handle("google:credentialStatus", async () => {'
$statusEndNeedle='ipcMain.handle("google:authorizeUser", async (_event,payload={}) => {'
$statusStart=$m.IndexOf($statusStartNeedle,[System.StringComparison]::Ordinal)
$statusEnd=$m.IndexOf($statusEndNeedle,$statusStart,[System.StringComparison]::Ordinal)
if($statusStart -lt 0 -or $statusEnd -lt 0){throw 'Google credentialStatus handler anchors not found'}
$statusNew=@'
ipcMain.handle("google:credentialStatus", async () => {
  try {
    const credentials = await readEncrypted(credentialPath());
    if (validateServiceAccount(credentials)) return {ok:true,encryption:safeStorage.isEncryptionAvailable(),local:false,mode:"service_account",account:credentials.client_email||""};
  } catch (error) {}
  try {
    const userOAuth=await readGoogleUserOAuth();
    if(userOAuth && (userOAuth.refresh_token || (userOAuth.access_token && Number(userOAuth.expires_at||0)>Date.now()+60000))){
      try{
        await getGoogleUserSheetsToken();
        const refreshed=await readGoogleUserOAuth();
        return {ok:true,encryption:safeStorage.isEncryptionAvailable(),local:true,mode:"user_oauth",account:String(refreshed?.email||userOAuth.email||""),userOAuth:true,autoConnected:true};
      }catch(error){
        return {ok:false,setupRequired:true,userOAuth:true,code:error?.code||"",reason:error?.message||"저장된 Google 계정 연결을 자동 복구하지 못했습니다."};
      }
    }
  } catch (error) {}
  return {ok:false,setupRequired:true,missing:true,userOAuth:true,reason:"최초 1회 Google 계정 연결이 필요합니다. 연결 성공 후에는 다음 로그인부터 자동 연결됩니다."};
});
'@
$m=$m.Substring(0,$statusStart)+$statusNew.TrimEnd()+"`n"+$m.Substring($statusEnd)

# Improve token-exchange diagnosis while retaining the existing recovery behavior.
$oldTokenMessage='Google OAuth 클라이언트가 승인되지 않았습니다. UEP 연결설정을 새로 읽은 뒤 다시 연결해 주세요.'
$newTokenMessage='Google OAuth 토큰 교환이 거부되었습니다. UEP의 Desktop OAuth Client ID와 Google 승인 설정을 확인한 뒤 다시 연결해 주세요.'
$m=$m.Replace($oldTokenMessage,$newTokenMessage)

Set-Content $main $m -Encoding UTF8
Set-Content $gyo $g -Encoding UTF8
node --check $main
if($LASTEXITCODE -ne 0){throw 'main syntax failed'}
node --check $gyo
if($LASTEXITCODE -ne 0){throw 'gyomuon syntax failed'}

# Gates: SDGs + selection preservation + OAuth persistence.
$checkM=Get-Content $main -Raw -Encoding UTF8
$checkG=Get-Content $gyo -Raw -Encoding UTF8
$checks=[ordered]@{
  'oauth form serialization'=$checkM.Contains('body:body.toString()')
  'oauth auto refresh'=$checkM.Contains('await getGoogleUserSheetsToken();')
  'oauth auto connected marker'=$checkM.Contains('autoConnected:true')
  'sdgs evidence cards'=$checkG.Contains('growth-sdg-evidence-card')
  'sdgs evidence lists'=$checkG.Contains('growth-sdg-evidence-list')
  'selection 06 connection preserved'=$checkG.Contains('for(const raw of (readonlyCache?.subjectSelections||[]))')
}
$checks.GetEnumerator() | ForEach-Object { Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value) }
if($checks.Values -contains $false){throw '0.80.99 verification failed'}

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.99'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.80.99 SDGs + Google OAuth token persistence fix applied.'
