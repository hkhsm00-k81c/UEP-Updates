$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$m=Get-Content $main -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8

# -----------------------------------------------------------------------------
# 0.80.77 Google connection architecture refactor
# - Admin: existing service-account route remains unchanged.
# - Homeroom/teacher: OAuth requests read-only Sheets scope only.
# - Desktop OAuth loopback URI follows Google's documented host:port form exactly.
# - Google connection failure no longer forces non-admin users back into setup wizard.
# -----------------------------------------------------------------------------

# 1) Desktop OAuth: exact loopback host:port URI (no custom path, no trailing slash).
if($m.Contains('const redirectUri=`http://127.0.0.1:${port}/`;')){
  $m=$m.Replace('const redirectUri=`http://127.0.0.1:${port}/`;','const redirectUri=`http://127.0.0.1:${port}`;')
}elseif($m.Contains('const redirectUri=`http://127.0.0.1:${port}/oauth2callback`;')){
  $m=$m.Replace('const redirectUri=`http://127.0.0.1:${port}/oauth2callback`;','const redirectUri=`http://127.0.0.1:${port}`;')
}else{throw 'OAuth redirectUri block not found'}

# 2) Teacher OAuth is read-only. Admin/service-account write path is intentionally untouched.
$m=$m.Replace("authUrl.searchParams.set('scope','openid email https://www.googleapis.com/auth/spreadsheets');","authUrl.searchParams.set('scope','openid email https://www.googleapis.com/auth/spreadsheets.readonly');")

# 3) Credential status wording: distinguish local OAuth approval from sheet authorization.
$m=$m.Replace('return {ok:false,setupRequired:true,missing:true,userOAuth:true,reason:"담임용 Google 계정 연결이 필요합니다. 아래의 Google 계정 연결 버튼으로 1회 승인해 주세요."};','return {ok:false,setupRequired:true,missing:true,userOAuth:true,connectionState:"not_authorized",reason:"담임용 Google 읽기 연결이 필요합니다. Google 계정 연결 버튼에서 1회 승인해 주세요."};')

# 4) Setup wizard must not become a Google-auth lock screen for teachers.
$oldStartup=@'
  if(!googleConnectionStatus?.ok){
    // 인증정보가 없거나 복호화/유효성 검증에 실패한 경우에는 기존 setupCompleted 값과 무관하게
    // 데이터 연결 단계에서 멈춘다. 학생정보 화면을 먼저 열어 권한부여를 건너뛰지 않는다.
    setTimeout(()=>openSetupWizard(3),50);
  }else if(!state.settings.setupCompleted){
    setTimeout(()=>openSetupWizard(0),50);
  }else{
    setSetupWizardLock(false);
  }
'@
$newStartup=@'
  if(!googleConnectionStatus?.ok && currentRoleId()==="admin"){
    // 관리자만 서비스계정/데이터 연결 단계에서 설정마법사로 안내한다.
    setTimeout(()=>openSetupWizard(3),50);
  }else if(!state.settings.setupCompleted){
    // 일반 사용자는 최초 프로필 설정만 완료하면 Google 연결 실패로 마법사에 다시 갇히지 않는다.
    setTimeout(()=>openSetupWizard(0),50);
  }else{
    setSetupWizardLock(false);
  }
'@
if(-not $g.Contains($oldStartup)){throw 'setup wizard startup block not found'}
$g=$g.Replace($oldStartup,$newStartup)

# 5) Teacher setup copy now reflects actual architecture: personal read-only OAuth, not service-account editing.
$oldTeacherConnection='if(currentRoleId()!=="admin") return `<div class="setup-warning"><b>관리자 전용 설정</b><br>서비스계정 JSON·UEP 데이터 연결은 관리자만 관리합니다. 일반 사용자는 승인된 공용 연결을 사용하며 이 단계에서 연결정보를 변경하지 않습니다.</div>`;'
$newTeacherConnection='if(currentRoleId()!=="admin") return `<div class="setup-warning"><b>담임·교사용 읽기 연결</b><br>관리자 서비스계정과 분리하여, 교사는 본인 Google 계정으로 학교 시트를 읽기 전용 승인합니다. 연결이 일시적으로 끊겨도 로그인·설정마법사는 반복되지 않습니다.</div>`;'
if($g.Contains($oldTeacherConnection)){$g=$g.Replace($oldTeacherConnection,$newTeacherConnection)}

# 6) Version must reflect the actual running build in every visible chip.
$g=$g.Replace('const APP_VERSION = "0.80.70";','const APP_VERSION = "0.80.77";')
$g=$g.Replace('const APP_VERSION = "0.80.76";','const APP_VERSION = "0.80.77";')
$g=$g.Replace('v0.80.70','v0.80.77')
$g=$g.Replace('v0.80.76','v0.80.77')

# 7) Improve connection status wording so OAuth approval and Sheets sync are not conflated.
$g=$g.Replace('Google 계정 연결 및 학교 시트 동기화가 완료되었습니다.','Google 계정 읽기 승인 및 학교 시트 동기화가 완료되었습니다.')
$g=$g.Replace('Google 시트 연결 완료','Google 읽기 연결 완료')

Set-Content $main $m -Encoding UTF8 -NoNewline
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.77'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

# Build-time syntax gates: do not publish another broken Electron main/renderer script.
node --check $main
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo

# Structural assertions.
$verifyMain=Get-Content $main -Raw -Encoding UTF8
$verifyGyo=Get-Content $gyo -Raw -Encoding UTF8
if(-not $verifyMain.Contains('https://www.googleapis.com/auth/spreadsheets.readonly')){throw 'readonly OAuth scope missing'}
if(-not $verifyMain.Contains('const redirectUri=`http://127.0.0.1:${port}`;')){throw 'desktop loopback URI not normalized'}
if(-not $verifyGyo.Contains('const APP_VERSION = "0.80.77";')){throw 'visible app version not updated'}
if(-not $verifyGyo.Contains('currentRoleId()==="admin"')){throw 'role-aware setup wizard gate missing'}

Write-Host 'UEP 0.80.77 teacher Google connection architecture refactor applied and syntax-checked.'
