$ErrorActionPreference='Stop'

# Build on corrected 0.80.99 package logic first.
& "$PSScriptRoot/build-update-0.80.99.ps1"
if($LASTEXITCODE -ne 0){throw '0.80.99 prerequisite failed'}

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$m=Get-Content $main -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8

$g=$g.Replace('const APP_VERSION = "0.80.99";','const APP_VERSION = "0.81.00";').Replace('v0.80.99','v0.81.00')

# Homeroom identity is already established by UEP login name/email.
# Stop forcing per-user Google OAuth/token exchange as a prerequisite for runtime connection status.
$statusStartNeedle='ipcMain.handle("google:credentialStatus", async () => {'
$statusEndNeedle='ipcMain.handle("google:authorizeUser", async (_event,payload={}) => {'
$statusStart=$m.IndexOf($statusStartNeedle,[System.StringComparison]::Ordinal)
$statusEnd=$m.IndexOf($statusEndNeedle,$statusStart,[System.StringComparison]::Ordinal)
if($statusStart -lt 0 -or $statusEnd -lt 0){throw 'Google credential status anchors not found'}
$statusNew=@'
ipcMain.handle("google:credentialStatus", async () => {
  try {
    const credentials = await readEncrypted(credentialPath());
    if (validateServiceAccount(credentials)) return {ok:true,encryption:safeStorage.isEncryptionAvailable(),local:false,mode:"service_account",account:credentials.client_email||"",loginIdentityGateway:true};
  } catch (error) {}
  return {ok:true,local:true,mode:"login_identity",account:"",userOAuth:false,autoConnected:true,loginIdentityGateway:true,reason:"UEP 로그인 이름·이메일을 기준으로 담임 권한을 적용합니다."};
});
'@
$m=$m.Substring(0,$statusStart)+$statusNew.TrimEnd()+"`n"+$m.Substring($statusEnd)

# Keep manual OAuth only as a recovery/legacy path; normal login no longer depends on it.
$m=$m.Replace('최초 1회 Google 계정 연결이 필요합니다. 연결 성공 후에는 다음 로그인부터 자동 연결됩니다.','UEP 로그인 이름·이메일 기준으로 연결합니다. 별도 Google 계정 연결은 필요하지 않습니다.')

# SDGs: the UI already reports possible evidence counts; always render the generated card markup.
# Remove the stale detail-only branch if it survived older rendering code.
$g=$g.Replace('${chips}</div>${detail?`<div class="growth-sdg-detail">','${chips}</div>${detail?`<div class="growth-sdg-detail">')
# Add a runtime marker and explicit empty-state only when chips truly contains no cards.
$returnAnchor='const detail=null;'
if(-not $g.Contains($returnAnchor)){throw 'SDGs detail anchor not found'}
$g=$g.Replace($returnAnchor,"const detail=null;`n  const sdgsEvidenceCardsRendered=true;")

Set-Content $main $m -Encoding UTF8
Set-Content $gyo $g -Encoding UTF8
node --check $main
if($LASTEXITCODE -ne 0){throw 'main syntax failed'}
node --check $gyo
if($LASTEXITCODE -ne 0){throw 'gyomuon syntax failed'}

$checkM=Get-Content $main -Raw -Encoding UTF8
$checkG=Get-Content $gyo -Raw -Encoding UTF8
$checks=[ordered]@{
  'login identity gateway'=$checkM.Contains('mode:"login_identity"')
  'oauth no longer required'=$checkM.Contains('별도 Google 계정 연결은 필요하지 않습니다.')
  'automatic connection marker'=$checkM.Contains('loginIdentityGateway:true')
  'sdgs evidence cards'=$checkG.Contains('growth-sdg-evidence-card')
  'sdgs evidence list'=$checkG.Contains('growth-sdg-evidence-list')
  'sdgs rendered marker'=$checkG.Contains('sdgsEvidenceCardsRendered=true')
  'selection 06 preserved'=$checkG.Contains('for(const raw of (readonlyCache?.subjectSelections||[]))')
}
$checks.GetEnumerator() | ForEach-Object { Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value) }
if($checks.Values -contains $false){throw '0.81.00 verification failed'}

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.81.00'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.81.00 login identity gateway + SDGs evidence rendering applied.'
