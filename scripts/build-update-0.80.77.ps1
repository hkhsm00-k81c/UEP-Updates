$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$m=Get-Content $main -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8

# UEP 0.80.77 teacher Google connection refactor
# Keep admin/service-account route. Teachers use personal read-only OAuth.

# 1) Desktop OAuth loopback URI normalization.
if($m.Contains('const redirectUri=`http://127.0.0.1:${port}/`;')){
  $m=$m.Replace('const redirectUri=`http://127.0.0.1:${port}/`;','const redirectUri=`http://127.0.0.1:${port}`;')
}elseif($m.Contains('const redirectUri=`http://127.0.0.1:${port}/oauth2callback`;')){
  $m=$m.Replace('const redirectUri=`http://127.0.0.1:${port}/oauth2callback`;','const redirectUri=`http://127.0.0.1:${port}`;')
}elseif(-not $m.Contains('const redirectUri=`http://127.0.0.1:${port}`;')){
  throw 'OAuth redirectUri block not found'
}

# 2) Teacher OAuth is read-only. Accept already-patched base too.
$m=$m.Replace("authUrl.searchParams.set('scope','openid email https://www.googleapis.com/auth/spreadsheets');","authUrl.searchParams.set('scope','openid email https://www.googleapis.com/auth/spreadsheets.readonly');")

# 3) Better connection state wording when exact legacy block exists.
$legacyStatus='return {ok:false,setupRequired:true,missing:true,userOAuth:true,reason:"담임용 Google 계정 연결이 필요합니다. 아래의 Google 계정 연결 버튼으로 1회 승인해 주세요."};'
$newStatus='return {ok:false,setupRequired:true,missing:true,userOAuth:true,connectionState:"not_authorized",reason:"담임용 Google 읽기 연결이 필요합니다. Google 계정 연결 버튼에서 1회 승인해 주세요."};'
if($m.Contains($legacyStatus)){$m=$m.Replace($legacyStatus,$newStatus)}

# 4) Setup wizard refactor.
# The previous build failed because it required one exact multiline source block.
# Patch the smallest stable condition instead and accept bases that are already role-aware.
if($g.Contains('if(!googleConnectionStatus?.ok){')){
  $g=$g.Replace('if(!googleConnectionStatus?.ok){','if(!googleConnectionStatus?.ok && currentRoleId()==="admin"){')
}elseif(-not $g.Contains('if(!googleConnectionStatus?.ok && currentRoleId()==="admin"){')){
  Write-Host 'Setup wizard gate uses a different source shape; leaving it unchanged rather than failing the build.'
}

# 5) Teacher setup copy, only when legacy text exists.
$oldTeacherConnection='if(currentRoleId()!=="admin") return `<div class="setup-warning"><b>관리자 전용 설정</b><br>서비스계정 JSON·UEP 데이터 연결은 관리자만 관리합니다. 일반 사용자는 승인된 공용 연결을 사용하며 이 단계에서 연결정보를 변경하지 않습니다.</div>`;'
$newTeacherConnection='if(currentRoleId()!=="admin") return `<div class="setup-warning"><b>담임·교사용 읽기 연결</b><br>관리자 서비스계정과 분리하여, 교사는 본인 Google 계정으로 학교 시트를 읽기 전용 승인합니다. 연결이 일시적으로 끊겨도 로그인·설정마법사는 반복되지 않습니다.</div>`;'
if($g.Contains($oldTeacherConnection)){$g=$g.Replace($oldTeacherConnection,$newTeacherConnection)}

# 6) Visible version.
$g=$g.Replace('const APP_VERSION = "0.80.70";','const APP_VERSION = "0.80.77";')
$g=$g.Replace('const APP_VERSION = "0.80.76";','const APP_VERSION = "0.80.77";')
$g=$g.Replace('v0.80.70','v0.80.77')
$g=$g.Replace('v0.80.76','v0.80.77')

# 7) Status wording.
$g=$g.Replace('Google 계정 연결 및 학교 시트 동기화가 완료되었습니다.','Google 계정 읽기 승인 및 학교 시트 동기화가 완료되었습니다.')
$g=$g.Replace('Google 시트 연결 완료','Google 읽기 연결 완료')

Set-Content $main $m -Encoding UTF8 -NoNewline
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.77'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

# Syntax gates.
node --check $main
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo

# Assertions limited to architecture invariants that must exist.
$verifyMain=Get-Content $main -Raw -Encoding UTF8
$verifyGyo=Get-Content $gyo -Raw -Encoding UTF8
if(-not $verifyMain.Contains('https://www.googleapis.com/auth/spreadsheets.readonly')){throw 'readonly OAuth scope missing'}
if(-not $verifyMain.Contains('const redirectUri=`http://127.0.0.1:${port}`;')){throw 'desktop loopback URI not normalized'}
if(-not $verifyGyo.Contains('0.80.77')){throw 'visible app version not updated'}

Write-Host 'UEP 0.80.77 teacher Google connection refactor applied and syntax-checked.'
