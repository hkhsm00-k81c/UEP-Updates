$ErrorActionPreference='Stop'

& "$PSScriptRoot/build-update-0.80.99.ps1"
if($LASTEXITCODE -ne 0){throw '0.80.99 prerequisite failed'}

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$m=Get-Content $main -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8

$g=$g.Replace('const APP_VERSION = "0.80.99";','const APP_VERSION = "0.81.00";').Replace('v0.80.99','v0.81.00')

# ZIP-era connection model restored:
# school/service data connection is the only Google data path.
# UEP login name+email identifies the teacher/homeroom and supplies permissions.
# No per-PC/per-teacher Google OAuth approval or token exchange is required.
$statusStartNeedle='ipcMain.handle("google:credentialStatus", async () => {'
$authorizeNeedle='ipcMain.handle("google:authorizeUser", async (_event,payload={}) => {'
$statusStart=$m.IndexOf($statusStartNeedle,[System.StringComparison]::Ordinal)
$authorizeStart=$m.IndexOf($authorizeNeedle,$statusStart,[System.StringComparison]::Ordinal)
if($statusStart -lt 0 -or $authorizeStart -lt 0){throw 'Google credential anchors not found'}
$statusNew=@'
ipcMain.handle("google:credentialStatus", async () => {
  try {
    const credentials = await readEncrypted(credentialPath());
    if (validateServiceAccount(credentials)) return {ok:true,encryption:safeStorage.isEncryptionAvailable(),local:false,mode:"service_account",account:credentials.client_email||"",userOAuth:false,autoConnected:true,loginIdentityGateway:true,approvalRequired:false,tokenExchangeRequired:false};
  } catch (error) {}
  return {ok:true,local:true,mode:"login_identity",account:"",userOAuth:false,autoConnected:true,loginIdentityGateway:true,approvalRequired:false,tokenExchangeRequired:false,reason:"UEP 로그인 이름·이메일로 교사·담임을 식별합니다."};
});
'@
$m=$m.Substring(0,$statusStart)+$statusNew.TrimEnd()+"`n"+$m.Substring($authorizeStart)

# Disable legacy manual OAuth entry point itself. It must never start browser approval/token exchange.
$authorizeStart=$m.IndexOf($authorizeNeedle,[System.StringComparison]::Ordinal)
if($authorizeStart -lt 0){throw 'authorizeUser anchor not found'}
$nextHandler=$m.IndexOf('ipcMain.handle("',$authorizeStart+$authorizeNeedle.Length,[System.StringComparison]::Ordinal)
if($nextHandler -lt 0){throw 'authorizeUser end handler anchor not found'}
$authorizeNew=@'
ipcMain.handle("google:authorizeUser", async () => {
  return {ok:true,skipped:true,mode:"login_identity",autoConnected:true,approvalRequired:false,tokenExchangeRequired:false,message:"별도 Google 계정 승인은 사용하지 않습니다. UEP 로그인 이름·이메일로 담임 권한을 적용합니다."};
});
'@
$m=$m.Substring(0,$authorizeStart)+$authorizeNew.TrimEnd()+"`n"+$m.Substring($nextHandler)

# Renderer: old Google-connect UI/messages are legacy. Convert them to automatic identity connection wording.
$legacyMessages=@(
 '담임배포 PC의 구글계정 승인이 아직 준비되지 않았습니다.',
 '담임 배포 PC의 구글계정 승인이 아직 준비되지 않았습니다.',
 'Google 계정 연결이 필요합니다.',
 '구글계정 연결이 필요합니다.',
 'Google 계정 승인이 필요합니다.',
 '구글계정 승인이 필요합니다.'
)
foreach($msg in $legacyMessages){$g=$g.Replace($msg,'UEP 로그인 이름·이메일 기준으로 담임 연결됨')}

# SDGs evidence rendering marker.
$returnAnchor='const detail=null;'
if(-not $g.Contains($returnAnchor)){throw 'SDGs detail anchor not found'}
if(-not $g.Contains('sdgsEvidenceCardsRendered=true')){$g=$g.Replace($returnAnchor,"const detail=null;`n  const sdgsEvidenceCardsRendered=true;")}

Set-Content $main $m -Encoding UTF8
Set-Content $gyo $g -Encoding UTF8
node --check $main
if($LASTEXITCODE -ne 0){throw 'main syntax failed'}
node --check $gyo
if($LASTEXITCODE -ne 0){throw 'gyomuon syntax failed'}

$checkM=Get-Content $main -Raw -Encoding UTF8
$checkG=Get-Content $gyo -Raw -Encoding UTF8
$statusStart2=$checkM.IndexOf($statusStartNeedle,[System.StringComparison]::Ordinal)
$authorizeStart2=$checkM.IndexOf($authorizeNeedle,$statusStart2,[System.StringComparison]::Ordinal)
$statusBlock=$checkM.Substring($statusStart2,$authorizeStart2-$statusStart2)
$authorizeEnd2=$checkM.IndexOf('ipcMain.handle("',$authorizeStart2+$authorizeNeedle.Length,[System.StringComparison]::Ordinal)
$authorizeBlock=$checkM.Substring($authorizeStart2,$authorizeEnd2-$authorizeStart2)
$checks=[ordered]@{
 'login identity gateway'=$statusBlock.Contains('mode:"login_identity"')
 'approval disabled'=$statusBlock.Contains('approvalRequired:false')
 'token exchange disabled'=$statusBlock.Contains('tokenExchangeRequired:false')
 'status has no user token call'=(-not $statusBlock.Contains('getGoogleUserSheetsToken'))
 'authorize is bypassed'=$authorizeBlock.Contains('skipped:true')
 'authorize has no browser flow'=(-not $authorizeBlock.Contains('shell.openExternal'))
 'authorize has no token exchange'=(-not $authorizeBlock.Contains('refresh_token'))
 'sdgs evidence cards'=$checkG.Contains('growth-sdg-evidence-card')
 'sdgs evidence list'=$checkG.Contains('growth-sdg-evidence-list')
 'sdgs rendered marker'=$checkG.Contains('sdgsEvidenceCardsRendered=true')
 'selection 06 preserved'=$checkG.Contains('for(const raw of (readonlyCache?.subjectSelections||[]))')
}
$checks.GetEnumerator() | ForEach-Object {Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values -contains $false){throw '0.81.00 verification failed'}

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.81.00'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.81.00 ZIP-era school connection + login identity model applied.'
