$ErrorActionPreference='Stop'
$main='app/resources/app/electron/main.cjs'
$data='app/resources/app/electron/google-data.cjs'
$preload='app/resources/app/electron/preload.cjs'
$gyo='app/resources/app/gyomuon.js'
$css='app/resources/app/gyomuon.css'
$index='app/resources/app/index.html'
$pkg='app/resources/app/package.json'
$m=Get-Content $main -Raw -Encoding UTF8
$d=Get-Content $data -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8
$c=Get-Content $css -Raw -Encoding UTF8
$i=Get-Content $index -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.81.03";','const APP_VERSION = "0.81.04";').Replace('v0.81.03','v0.81.04')

if(-not $d.Contains('"06A_학생별선택과목"')){
  $anchor='  "06_선택과목이력": "''06_선택과목이력''!A1:X6000",'
  if(-not $d.Contains($anchor)){throw '06 selection range anchor not found'}
  $d=$d.Replace($anchor,$anchor+"`r`n"+'  "06A_학생별선택과목": "''06A_학생별선택과목''!A1:AI1000",')
}
if(-not $d.Contains('selectionStudentRows: rowsFrom("06A_학생별선택과목")')){
  $anchor='    subjectSelections:selectedSubjects,'
  if(-not $d.Contains($anchor)){throw 'selection export anchor not found'}
  $d=$d.Replace($anchor,$anchor+"`r`n"+'    selectionStudentRows: rowsFrom("06A_학생별선택과목"),')
}
if(-not $g.Contains('__UEP_SELECTION_SDGS_RECORDCHECK_PAGES_08104__')){$g+="`r`n"+(Get-Content './patches/uep-0.81.04-features.js' -Raw -Encoding UTF8)}
if(-not $c.Contains('__UEP_SELECTION_SDGS_RECORDCHECK_STYLE_08104__')){$c+="`r`n"+(Get-Content './patches/uep-0.81.04-features.css' -Raw -Encoding UTF8)}

$viewsAnchor='    students: studentsView,'
if(-not $g.Contains('selection: selectionView,')){$g=$g.Replace($viewsAnchor,$viewsAnchor+"`r`n"+'    selection: selectionView,'+"`r`n"+'    sdgs: sdgsView,'+"`r`n"+'    recordcheck: recordcheckView,')}
$infoAnchor='    records: ["활동내역·교육과정·최종 기록", "생활기록부"],'
if(-not $g.Contains('selection: ["06A')){$g=$g.Replace($infoAnchor,$infoAnchor+"`r`n"+'    selection: ["06A 학생별 선택과목", "선택과목"],'+"`r`n"+'    sdgs: ["활동 근거와 보완", "SDGs 근거지도"],'+"`r`n"+'    recordcheck: ["나이스 로컬 사전검증", "세특 오류검증"],')}
$bindAnchor='  if(page==="inputs")bindInputCenter();'
if(-not $g.Contains('if(page==="selection")bindSelectionAnalysis();')){$g=$g.Replace($bindAnchor,$bindAnchor+"`r`n"+'  if(page==="selection")bindSelectionAnalysis();'+"`r`n"+'  if(page==="recordcheck")requestAnimationFrame(()=>{const mount=document.getElementById("standaloneRecordcheckMount");if(mount&&window.uepMountRecordbookValidator)window.uepMountRecordbookValidator(mount);});')}
$recordBind='  if (page === "records") {'
$g=$g.Replace($recordBind,'  if (page === "records" || page === "sdgs") {')
if(-not $g.Contains('window.uepMountRecordbookValidator=mountValidator;')){$g=$g.Replace('  const promoteSdgs=()=>{','  window.uepMountRecordbookValidator=mountValidator;'+"`r`n"+'  const promoteSdgs=()=>{')}
# 0.81.02에서는 세특 검증기가 SDGs 프로파일 아래에 자동으로 붙었습니다.
# 0.81.04부터는 별도 메뉴에서만 열리게 하여 두 기능을 완전히 분리합니다.
$g=$g.Replace('if(sdgs)sdgs.dataset.primaryEvidenceMap="1";mountValidator(profile);','if(sdgs)sdgs.dataset.primaryEvidenceMap="1";')

$navAnchor='<button class="nav" data-page="records"><span>▤</span><b>생활기록부</b></button>'
if(-not $i.Contains('data-page="selection"')){
  if(-not $i.Contains($navAnchor)){throw 'nav anchor not found'}
  $nav=$navAnchor+"`r`n"+'<button class="nav nav-child" data-page="selection"><span>↳</span><b>선택과목</b></button>'+"`r`n"+'<button class="nav nav-child" data-page="sdgs"><span>↳</span><b>SDGs 근거지도</b></button>'+"`r`n"+'<button class="nav nav-child" data-page="recordcheck"><span>↳</span><b>세특 오류검증</b></button>'
  $i=$i.Replace($navAnchor,$nav)
}

Set-Content $main $m -Encoding UTF8;Set-Content $data $d -Encoding UTF8;Set-Content $gyo $g -Encoding UTF8;Set-Content $css $c -Encoding UTF8;Set-Content $index $i -Encoding UTF8
node --check $main;if($LASTEXITCODE-ne 0){throw 'main syntax failed'}
node --check $data;if($LASTEXITCODE-ne 0){throw 'google-data syntax failed'}
node --check $preload;if($LASTEXITCODE-ne 0){throw 'preload syntax failed'}
node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}
$checks=[ordered]@{
 'version 0.81.04'=$g.Contains('const APP_VERSION = "0.81.04";')
 '06A range'=$d.Contains('"06A_학생별선택과목"')
 '06A export'=$d.Contains('selectionStudentRows: rowsFrom("06A_학생별선택과목")')
 'selection page'=$g.Contains('function selectionView()')
 'active enrollment filter'=$g.Contains('/전출|자퇴|퇴학|제적/')
 'dorm badge'=$g.Contains('dorm-badge')
 'science hierarchy'=$g.Contains('과학과목 위계오류')
 'language continuity'=$g.Contains('제2외국어 연계오류')
 'arts continuity'=$g.Contains('예술과목 연계오류')
 'rank and grade'=$g.Contains('expectedRank') -and $g.Contains('expectedGrade')
 'section estimate'=$g.Contains('sectionCount')
 'sms correction'=$g.Contains('보완 문자메시지')
 'sdgs page'=$g.Contains('function sdgsView()')
 'recordcheck page'=$g.Contains('function recordcheckView()')
 'recordcheck separated'=(-not $g.Contains('if(sdgs)sdgs.dataset.primaryEvidenceMap="1";mountValidator(profile);'))
 'no readonly gateway'=(-not $m.Contains('__UEP_SCHOOL_READ_API_08104__'))
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.04 feature verification failed'}
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.04';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.81.04 selection analysis, SDGs evidence and standalone record checker applied.'
