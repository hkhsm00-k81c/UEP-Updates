$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$main='app/resources/app/electron/main.cjs'
$google='app/resources/app/electron/google-data.cjs'
$pkg='app/resources/app/package.json'
$css='app/resources/app/gyomuon.css'
$utf8NoBom=New-Object System.Text.UTF8Encoding($false)

$beforeCss=(Get-FileHash $css -Algorithm SHA256).Hash
$g=[System.IO.File]::ReadAllText($gyo,$utf8NoBom)
if(-not $g.Contains('const APP_VERSION = "0.81.17";')){throw '0.81.17 base version marker missing'}
$g=$g.Replace('const APP_VERSION = "0.81.17";','const APP_VERSION = "0.81.18";').Replace('v0.81.17','v0.81.18')
[System.IO.File]::WriteAllText($gyo,$g,$utf8NoBom)
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json
$package.version='0.81.18'
$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8

node ./tools/apply-js-cleanup1-0.81.18.js app
if($LASTEXITCODE-ne 0){throw '0.81.18 cleanup1 failed'}
node ./tools/apply-js-cleanup2-0.81.18.js app
if($LASTEXITCODE-ne 0){throw '0.81.18 cleanup2 failed'}

node --check $gyo
if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}
node --check $main
if($LASTEXITCODE-ne 0){throw 'main syntax failed'}
node --check $google
if($LASTEXITCODE-ne 0){throw 'google-data syntax failed'}

$r1=Get-Content cleanup1-output/cleanup1-report.json -Raw|ConvertFrom-Json
$r2=Get-Content cleanup2-output/cleanup2-report.json -Raw|ConvertFrom-Json
$removed1=@($r1|Where-Object {$_.status -eq 'REMOVED'})
$removed2=@($r2|Where-Object {$_.status -eq 'REMOVED'})
$skipped1=@($r1|Where-Object {$_.status -ne 'REMOVED'})
$skipped2=@($r2|Where-Object {$_.status -ne 'REMOVED'})
$totalRemoved=$removed1.Count+$removed2.Count
if($removed1.Count -lt 8){throw "cleanup1 removed too few functions: $($removed1.Count)"}
if($removed2.Count -lt 8){throw "cleanup2 removed too few functions: $($removed2.Count)"}
if($totalRemoved -lt 16){throw "cumulative cleanup removed too few functions: $totalRemoved"}

$all=(Get-Content $gyo -Raw)+(Get-Content $main -Raw)+(Get-Content $google -Raw)
foreach($r in @($removed1)+@($removed2)){
  if($all -match ('\b'+[regex]::Escape($r.name)+'\b')){throw "Residual removed function: $($r.name)"}
}

$g=Get-Content $gyo -Raw -Encoding UTF8
$anchors=@(
  'const APP_VERSION = "0.81.18";',
  'bindPage','bindInputCenter','sdgsDashboard','uepStudentApplicationView','uepSubjectApplicationView',
  'recordcheck','curriculum','openStudentTimetableDrawer','openStudentCounselEdit','retryGoogleConnection',
  'sendProgramEmailNotice','prepareProgramSmsNotice','openProgramAttendanceQr','openMealDutyDrawer',
  'uepCompareSelectionHistory','uepSchoolGrowthGapSummary'
)
foreach($a in $anchors){if(-not $g.Contains($a)){throw "Critical 0.81.18 anchor missing: $a"}}

$afterCss=(Get-FileHash $css -Algorithm SHA256).Hash
if($beforeCss -ne $afterCss){throw 'CSS changed during JS-only cleanup'}
Write-Host "UEP 0.81.18 cumulative JS cleanup applied: cleanup1 removed=$($removed1.Count) skipped=$($skipped1.Count); cleanup2 removed=$($removed2.Count) skipped=$($skipped2.Count); total removed=$totalRemoved"
