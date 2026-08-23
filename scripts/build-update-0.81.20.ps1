$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$main='app/resources/app/electron/main.cjs'
$preload='app/resources/app/electron/preload.cjs'
$google='app/resources/app/electron/google-data.cjs'
$pkg='app/resources/app/package.json'
$utf8NoBom=New-Object System.Text.UTF8Encoding($false)

$g=[System.IO.File]::ReadAllText($gyo,$utf8NoBom)
if($g -match 'const APP_VERSION\s*=\s*"0\.81\.1[89]";'){
  $g=[regex]::Replace($g,'const APP_VERSION\s*=\s*"0\.81\.1[89]";','const APP_VERSION = "0.81.20";',1)
}elseif(-not $g.Contains('const APP_VERSION = "0.81.20";')){throw '0.81.19 base version marker missing'}
$g=$g.Replace('v0.81.19','v0.81.20').Replace('v0.81.18','v0.81.20')
[System.IO.File]::WriteAllText($gyo,$g,$utf8NoBom)

node ./tools/apply-school-read-api-0.81.20.js app
if($LASTEXITCODE-ne 0){throw '0.81.20 School Read API integration failed'}

node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}
node --check $main;if($LASTEXITCODE-ne 0){throw 'main syntax failed'}
node --check $preload;if($LASTEXITCODE-ne 0){throw 'preload syntax failed'}
node --check $google;if($LASTEXITCODE-ne 0){throw 'google-data syntax failed'}

$m=Get-Content $main -Raw -Encoding UTF8
$p=Get-Content $preload -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8
$checks=[ordered]@{
  'version 0.81.20'=$g.Contains('const APP_VERSION = "0.81.20";')
  'school api marker'=$m.Contains('__UEP_SCHOOL_READ_API_PRIMARY_08120__')
  'stable device id'=$m.Contains('getOrCreateSchoolReadDeviceId')
  'encrypted UEP session'=$m.Contains('uep-school-read-session.bin')
  'policy endpoint'=$m.Contains('schoolReadApiUrl')
  'login IPC'=$m.Contains('uep:schoolReadLogin') -and $p.Contains('schoolReadLogin:')
  'session status IPC'=$m.Contains('uep:schoolReadSessionStatus') -and $p.Contains('schoolReadSessionStatus:')
  'logout IPC'=$m.Contains('uep:schoolReadLogout') -and $p.Contains('schoolReadLogout:')
  'read path school api'=$m.Contains("startsWith('UEP_SCHOOL_READ:')") -and $m.Contains('schoolReadBatchRead(spreadsheetId,ranges)')
  'no readonly oauth fallback'=(-not $m.Contains("const saved=await readGoogleUserOAuth();`n  const token=await getGoogleUserSheetsToken();`n  return {token,mode:'user_oauth'"))
  'renderer login school api'=$g.Contains('window.schoolBoard.schoolReadLogin({name,email})')
  'startup school session'=$g.Contains('window.schoolBoard?.schoolReadSessionStatus')
  'teacher switch clears api token'=$g.Contains('await window.schoolBoard?.schoolReadLogout?.()')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.20 School Read API verification failed'}

$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json
$package.version='0.81.20'
$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.81.20 School Read API primary authentication/read path applied.'
