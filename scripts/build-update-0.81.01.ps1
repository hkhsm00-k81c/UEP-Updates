$ErrorActionPreference='Stop'

# Build from the last known-good prerequisite. Do not invoke 0.81.00 because its
# post-build Substring verification is the failed step this release repairs.
& "$PSScriptRoot/build-update-0.80.99.ps1"
if($LASTEXITCODE -ne 0){throw '0.80.99 prerequisite failed'}

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$m=Get-Content $main -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8

$g=$g.Replace('const APP_VERSION = "0.80.99";','const APP_VERSION = "0.81.01";').Replace('v0.80.99','v0.81.01')

# ZIP-era school/service connection remains the Google Sheet data path.
# UEP login name+email is used only for teacher/homeroom/role identification.
$statusStartNeedle='ipcMain.handle("google:credentialStatus", async () => {'
$authorizeNeedle='ipcMain.handle("google:authorizeUser", async (_event,payload={}) => {'
$handlerNeedle='ipcMain.handle("'

function Get-RequiredIndex {
  param(
    [string]$Text,
    [string]$Needle,
    [int]$StartIndex,
    [string]$Label
  )
  if($StartIndex -lt 0 -or $StartIndex -gt $Text.Length){
    throw "$Label start index out of range: $StartIndex / $($Text.Length)"
  }
  $index=$Text.IndexOf($Needle,$StartIndex,[System.StringComparison]::Ordinal)
  if($index -lt 0){
    throw "$Label anchor not found after index $StartIndex"
  }
  return $index
}

function Get-RequiredBlock {
  param(
    [string]$Text,
    [string]$StartNeedle,
    [string]$EndNeedle,
    [int]$SearchFrom,
    [string]$Label
  )
  $start=Get-RequiredIndex $Text $StartNeedle $SearchFrom "$Label start"
  $endSearchFrom=$start+$StartNeedle.Length
  $end=Get-RequiredIndex $Text $EndNeedle $endSearchFrom "$Label end"
  if($end -le $start){
    throw "$Label invalid bounds: start=$start end=$end"
  }
  return [pscustomobject]@{
    Start=$start
    End=$end
    Length=$end-$start
    Text=$Text.Substring($start,$end-$start)
  }
}

$statusOriginal=Get-RequiredBlock $m $statusStartNeedle $authorizeNeedle 0 'Google credentialStatus'
$statusNew=@'
ipcMain.handle("google:credentialStatus", async () => {
  try {
    const credentials = await readEncrypted(credentialPath());
    if (validateServiceAccount(credentials)) return {ok:true,encryption:safeStorage.isEncryptionAvailable(),local:false,mode:"service_account",account:credentials.client_email||"",userOAuth:false,autoConnected:true,loginIdentityGateway:true,approvalRequired:false,tokenExchangeRequired:false};
  } catch (error) {}
  return {ok:true,local:true,mode:"login_identity",account:"",userOAuth:false,autoConnected:true,loginIdentityGateway:true,approvalRequired:false,tokenExchangeRequired:false,reason:"UEP 로그인 이름·이메일로 교사·담임을 식별합니다."};
});
'@
$m=$m.Substring(0,$statusOriginal.Start)+$statusNew.TrimEnd()+"`n"+$m.Substring($statusOriginal.End)

# Disable the legacy manual OAuth entry point without starting browser approval,
# token exchange, or refresh-token flows.
$authorizeStart=Get-RequiredIndex $m $authorizeNeedle 0 'google:authorizeUser'
$authorizeEnd=Get-RequiredIndex $m $handlerNeedle ($authorizeStart+$authorizeNeedle.Length) 'google:authorizeUser next handler'
if($authorizeEnd -le $authorizeStart){
  throw "google:authorizeUser invalid bounds: start=$authorizeStart end=$authorizeEnd"
}
$authorizeNew=@'
ipcMain.handle("google:authorizeUser", async () => {
  return {ok:true,skipped:true,mode:"login_identity",autoConnected:true,approvalRequired:false,tokenExchangeRequired:false,message:"별도 Google 계정 승인은 사용하지 않습니다. UEP 로그인 이름·이메일로 담임 권한을 적용합니다."};
});
'@
$m=$m.Substring(0,$authorizeStart)+$authorizeNew.TrimEnd()+"`n"+$m.Substring($authorizeEnd)

$legacyMessages=@(
 '담임배포 PC의 구글계정 승인이 아직 준비되지 않았습니다.',
 '담임 배포 PC의 구글계정 승인이 아직 준비되지 않았습니다.',
 'Google 계정 연결이 필요합니다.',
 '구글계정 연결이 필요합니다.',
 'Google 계정 승인이 필요합니다.',
 '구글계정 승인이 필요합니다.'
)
foreach($msg in $legacyMessages){$g=$g.Replace($msg,'UEP 로그인 이름·이메일 기준으로 담임 연결됨')}

# Keep the evidence-only SDGs rendering marker. Do not activate explanation-only cards.
$returnAnchor='const detail=null;'
if(-not $g.Contains($returnAnchor)){throw 'SDGs detail anchor not found'}
if(-not $g.Contains('sdgsEvidenceCardsRendered=true')){
  $g=$g.Replace($returnAnchor,"const detail=null;`n  const sdgsEvidenceCardsRendered=true;")
}

Set-Content $main $m -Encoding UTF8
Set-Content $gyo $g -Encoding UTF8
node --check $main
if($LASTEXITCODE -ne 0){throw 'main syntax failed'}
node --check $gyo
if($LASTEXITCODE -ne 0){throw 'gyomuon syntax failed'}

# Bounds-safe post-build verification: every index is validated before Substring.
$checkM=Get-Content $main -Raw -Encoding UTF8
$checkG=Get-Content $gyo -Raw -Encoding UTF8
$statusBlockInfo=Get-RequiredBlock $checkM $statusStartNeedle 'ipcMain.handle("google:authorizeUser", async () => {' 0 'verified credentialStatus'
$verifiedAuthorizeStartNeedle='ipcMain.handle("google:authorizeUser", async () => {'
$verifiedAuthorizeStart=Get-RequiredIndex $checkM $verifiedAuthorizeStartNeedle 0 'verified authorizeUser'
$verifiedAuthorizeEnd=Get-RequiredIndex $checkM $handlerNeedle ($verifiedAuthorizeStart+$verifiedAuthorizeStartNeedle.Length) 'verified authorizeUser next handler'
if($verifiedAuthorizeEnd -le $verifiedAuthorizeStart){
  throw "verified authorizeUser invalid bounds: start=$verifiedAuthorizeStart end=$verifiedAuthorizeEnd"
}
$authorizeBlock=$checkM.Substring($verifiedAuthorizeStart,$verifiedAuthorizeEnd-$verifiedAuthorizeStart)
$statusBlock=$statusBlockInfo.Text

$checks=[ordered]@{
 'login identity gateway'=$statusBlock.Contains('mode:"login_identity"')
 'school service account preserved'=$statusBlock.Contains('mode:"service_account"')
 'approval disabled'=$statusBlock.Contains('approvalRequired:false')
 'token exchange disabled'=$statusBlock.Contains('tokenExchangeRequired:false')
 'status has no user token call'=(-not $statusBlock.Contains('getGoogleUserSheetsToken'))
 'authorize is bypassed'=$authorizeBlock.Contains('skipped:true')
 'authorize has no browser flow'=(-not $authorizeBlock.Contains('shell.openExternal'))
 'authorize has no token exchange'=(-not $authorizeBlock.Contains('refresh_token'))
 'sdgs evidence cards'=$checkG.Contains('growth-sdg-evidence-card')
 'sdgs evidence list'=$checkG.Contains('growth-sdg-evidence-list')
 'sdgs rendered marker'=$checkG.Contains('sdgsEvidenceCardsRendered=true')
 'selection 06 direct connection preserved'=$checkG.Contains('for(const raw of (readonlyCache?.subjectSelections||[]))')
}
$checks.GetEnumerator() | ForEach-Object {Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values -contains $false){throw '0.81.01 verification failed'}

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.81.01'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.81.01 bounds-safe ZIP-era school connection + login identity model applied.'
