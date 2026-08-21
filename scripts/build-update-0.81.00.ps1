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
  return {ok:true,local:true,mode:"login_identity",account:"",userOAuth:false,autoConnected:true,loginIdentityGateway:true,reason:"UEP 로그인 이름·이메일을 기준으로 담임 권한을 적용합니다. 별도 Google 계정 연결은 필요하지 않습니다."};
});
'@
$m=$m.Substring(0,$statusStart)+$statusNew.TrimEnd()+"`n"+$m.Substring($statusEnd)

# Manual OAuth handlers remain only as legacy/recovery code; credentialStatus no longer invokes token exchange.

# SDGs evidence rendering marker.
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
$statusStart2=$checkM.IndexOf($statusStartNeedle,[System.StringComparison]::Ordinal)
$statusEnd2=$checkM.IndexOf($statusEndNeedle,$statusStart2,[System.StringComparison]::Ordinal)
$statusBlock=$checkM.Substring($statusStart2,$statusEnd2-$statusStart2)
$checks=[ordered]@{
  'login identity gateway'=$statusBlock.Contains('mode:"login_identity"')
  'oauth no longer required'=(-not $statusBlock.Contains('getGoogleUserSheetsToken'))
  'automatic connection marker'=$statusBlock.Contains('loginIdentityGateway:true')
  'no oauth token exchange in status'=(-not $statusBlock.Contains('refresh_token'))
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
