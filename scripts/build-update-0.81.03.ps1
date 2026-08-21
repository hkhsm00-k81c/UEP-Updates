$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$m=Get-Content $main -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8

$g=$g.Replace('const APP_VERSION = "0.81.02";','const APP_VERSION = "0.81.03";').Replace('v0.81.02','v0.81.03')

if(-not $m.Contains('__UEP_SCHOOL_CONNECTION_RECOVERY_08103__')){
$helper=@'

// __UEP_SCHOOL_CONNECTION_RECOVERY_08103__
// Recover only credentials already provisioned on this Windows user/PC.
// Nothing is embedded in the app and no personal Google OAuth token is required.
function schoolConnectionLegacyRoots(){
  const appData=process.env.APPDATA||app.getPath("appData");
  return [...new Set([
    stableUserDataRoot(),legacyUserDataRoot(),
    path.join(appData,"UNHO Education Platform"),
    path.join(appData,"unho-education-platform"),
    path.join(appData,"UEP"),
    path.join(appData,"UEP School Board"),
    path.join(appData,"School Board")
  ].filter(Boolean).map(value=>path.resolve(value)))];
}
async function readCredentialRecoveryFrom(filePath){
  const payload=JSON.parse(await fs.readFile(filePath,"utf8"));
  if(!payload||payload.version!==1||payload.algorithm!=="aes-256-gcm")throw new Error("invalid recovery credential");
  const salt=Buffer.from(payload.salt,"base64"),iv=Buffer.from(payload.iv,"base64"),tag=Buffer.from(payload.tag,"base64"),data=Buffer.from(payload.data,"base64");
  const decipher=crypto.createDecipheriv("aes-256-gcm",recoveryKey(salt),iv);decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(data),decipher.final()]).toString("utf8"));
}
async function resolveSchoolServiceAccount(){
  try{const current=await readEncrypted(credentialPath());if(validateServiceAccount(current))return current;}catch{}
  for(const root of schoolConnectionLegacyRoots()){
    for(const fileName of ["google-service-account.recovery.json","google-service-account.json"]){
      const candidate=path.join(root,fileName);
      try{
        const recovered=fileName.endsWith("recovery.json")?await readCredentialRecoveryFrom(candidate):JSON.parse(await fs.readFile(candidate,"utf8"));
        if(!validateServiceAccount(recovered))continue;
        await saveEncrypted(credentialPath(),recovered);
        console.log(`[UEP] 학교 공용 Google 연결을 기존 UEP 저장소에서 복구했습니다: ${path.basename(root)}`);
        return recovered;
      }catch{}
    }
  }
  const error=new Error("이 PC에서 기존 학교 공용 Google 연결을 찾지 못했습니다. 관리자 배포본의 공용 연결 복구 상태를 확인해 주세요.");
  error.code="UEP_SCHOOL_CONNECTION_NOT_PROVISIONED";throw error;
}
'@
$m+="`r`n"+$helper
}

$fetchOld='const account = credentials || await readEncrypted(credentialPath());'
$fetchNew='const account = credentials || await resolveSchoolServiceAccount();'
if(-not $m.Contains($fetchOld) -and -not $m.Contains($fetchNew)){throw 'fetchLiveData credential anchor not found'}
$m=$m.Replace($fetchOld,$fetchNew)

$statusOld='const credentials = await readEncrypted(credentialPath());'
$statusNew='const credentials = await resolveSchoolServiceAccount();'
if(-not $m.Contains($statusOld) -and -not $m.Contains($statusNew)){throw 'credential status anchor not found'}
$m=$m.Replace($statusOld,$statusNew)

# The renderer must not present per-PC OAuth as the recovery action.
$g=$g.Replace('Google 계정 연결','학교 공용 연결 확인').Replace('Google 계정 읽기 승인','학교 공용 읽기 연결')

Set-Content $main $m -Encoding UTF8
Set-Content $gyo $g -Encoding UTF8
node --check $main;if($LASTEXITCODE -ne 0){throw 'main syntax failed'}
node --check $gyo;if($LASTEXITCODE -ne 0){throw 'gyomuon syntax failed'}

$checks=[ordered]@{
  'version 0.81.03'=$g.Contains('const APP_VERSION = "0.81.03";')
  'school recovery marker'=$m.Contains('__UEP_SCHOOL_CONNECTION_RECOVERY_08103__')
  'legacy roots'=$m.Contains('schoolConnectionLegacyRoots')
  'same-PC recovery'=$m.Contains('readCredentialRecoveryFrom')
  'fetch uses school resolver'=$m.Contains('credentials || await resolveSchoolServiceAccount()')
  'credential status uses school resolver'=$m.Contains('const credentials = await resolveSchoolServiceAccount();')
  'no embedded private key'=(-not $m.Contains('-----BEGIN PRIVATE KEY-----\\n'))
  'selection 06 preserved'=$g.Contains('for(const raw of (readonlyCache?.subjectSelections||[]))')
  'privacy preserved'=$g.Contains('privacyModeButton')
  'meal preserved'=$g.Contains('saveLunchDuty')
  'dorm outing preserved'=$g.Contains('dormOutings')
  'recordbook preserved'=$g.Contains('__UEP_RECORDBOOK_LOCAL_VALIDATOR_08102__')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values -contains $false){throw 'UEP 0.81.03 verification failed'}

$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json
$package.version='0.81.03'
$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.81.03 school connection recovery applied.'
