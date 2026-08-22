$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$main='app/resources/app/electron/main.cjs'
$data='app/resources/app/electron/google-data.cjs'
$index='app/resources/app/index.html'
$css='app/resources/app/gyomuon.css'
$g=Get-Content $gyo -Raw -Encoding UTF8
$m=Get-Content $main -Raw -Encoding UTF8
$d=Get-Content $data -Raw -Encoding UTF8
$i=Get-Content $index -Raw -Encoding UTF8
$c=Get-Content $css -Raw -Encoding UTF8

$report = New-Object System.Collections.Generic.List[string]
function Add-Line([string]$s=''){ $report.Add($s) }
function Count-Rx($text,$pattern){ return ([regex]::Matches($text,$pattern,[Text.RegularExpressions.RegexOptions]::Multiline)).Count }
function Bool([bool]$v){ if($v){'OK'}else{'MISSING'} }

Add-Line '# UEP 0.81.16 Full Integrity Audit'
Add-Line ('Generated: '+(Get-Date).ToString('yyyy-MM-dd HH:mm:ss K'))
Add-Line ''
Add-Line '## 1. Build / syntax'
node --check $gyo | Out-Null; Add-Line '- gyomuon.js syntax: OK'
node --check $main | Out-Null; Add-Line '- main.cjs syntax: OK'
node --check $data | Out-Null; Add-Line '- google-data.cjs syntax: OK'
Add-Line ('- visible version: '+($(if($g.Contains('const APP_VERSION = "0.81.16";')){'0.81.16'}else{'NOT 0.81.16'})))

Add-Line ''
Add-Line '## 2. Menu / major feature preservation'
$features=[ordered]@{
 'Dashboard' = ($g -match 'dashboardView|function\s+dashboard')
 'Student info' = ($g -match 'studentsView|studentDashboard|학생정보')
 'Attendance' = ($g -match 'attendance|출결')
 'Grades' = ($g -match 'grade|성적')
 'Admissions' = ($g -match 'admission|입시')
 'Records main' = ($g -match 'recordsView')
 'Records activities' = ($g -match 'activities')
 'Records SDGs live' = $g.Contains('function uepSdgsEvidenceBridge()')
 'Records SDGs supplement' = $g.Contains('function uepSdgsSupplementPanel()')
 'Records curriculum final' = $g.Contains('function uepCurriculumFinalView()')
 'Curriculum student view' = $g.Contains('function uepStudentApplicationView()')
 'Curriculum subject view' = $g.Contains('function uepSubjectApplicationView()')
 'Selection active rows' = $g.Contains('function uepActiveSelectionRows()')
 'Selection term subjects' = $g.Contains('function uepSelectionTermSubjects(')
 'Selection validation' = $g.Contains('function uepSelectionErrors(')
 'Selection SMS' = $g.Contains('function uepSelectionSms(')
 'Standalone recordcheck' = ($g.Contains('window.uepMountRecordbookValidator') -and $g.Contains('standaloneRecordcheckMount'))
 'Programs' = ($g -match 'program|프로그램')
 'Timetable' = ($g -match 'timetable|시간표')
 'Input center' = ($g -match 'inputCenter|입력센터')
 'Output/alert center' = ($g -match '출력센터|알림')
 'Privacy mode' = ($g -match 'privacyMode|개인정보')
 'Dorm/outing' = ($g -match 'dorm|학사외출')
 'Supervisor grouped report' = ($g -match 'supervisor.*report|grouped.*report')
 'School resolver' = $m.Contains('resolveSchoolServiceAccount')
}
foreach($kv in $features.GetEnumerator()){ Add-Line ('- '+$kv.Key+': '+(Bool $kv.Value)) }

Add-Line ''
Add-Line '## 3. View registry / obsolete routes'
$legacy=[ordered]@{
 'standalone selectionView declaration'=(Count-Rx $g 'function\s+selectionView\s*\(')
 'standalone sdgsView declaration'=(Count-Rx $g 'function\s+sdgsView\s*\(')
 'selection page registry refs'=(Count-Rx $g '\bselection\s*:\s*(selectionView|recordsView)')
 'sdgs page registry refs'=(Count-Rx $g '\bsdgs\s*:\s*(sdgsView|recordsView)')
 'records main tab delegates'=(Count-Rx $g '__UEP_RECORD_MAIN_TAB_BIND_08114__')
}
foreach($kv in $legacy.GetEnumerator()){ Add-Line ('- '+$kv.Key+': '+$kv.Value) }

Add-Line ''
Add-Line '## 4. Duplicate declarations / overrides'
$fnMatches=[regex]::Matches($g,'(?m)\bfunction\s+([A-Za-z_$][\w$]*)\s*\(')
$fnGroups=$fnMatches | ForEach-Object {$_.Groups[1].Value} | Group-Object | Where-Object Count -gt 1 | Sort-Object Count -Descending
if(!$fnGroups){ Add-Line '- duplicate function declarations: none' } else { foreach($x in $fnGroups){ Add-Line ('- function '+$x.Name+': '+$x.Count+' declarations') } }
$targets=@('recordsView','dashboardView','studentsView','bindSelectionAnalysis','uepSelectionDataset','render')
foreach($name in $targets){
  $decl=Count-Rx $g ('(?m)\bfunction\s+'+[regex]::Escape($name)+'\s*\(')
  $assign=Count-Rx $g ('(?m)\b'+[regex]::Escape($name)+'\s*=\s*function\b')
  Add-Line ('- '+$name+': declarations='+$decl+', function-overrides='+$assign)
}
Add-Line ('- __uep* captured-wrapper variables: '+(Count-Rx $g '(?m)\b(const|let|var)\s+__uep[A-Za-z0-9_]*\s*=\s*[A-Za-z_$][\w$]*\s*;'))

Add-Line ''
Add-Line '## 5. Event / timer / observer pressure'
Add-Line ('- addEventListener calls: '+(Count-Rx $g '\.addEventListener\s*\('))
Add-Line ('- onclick assignments: '+(Count-Rx $g '\.onclick\s*='))
Add-Line ('- requestAnimationFrame calls: '+(Count-Rx $g 'requestAnimationFrame\s*\('))
Add-Line ('- queueMicrotask calls: '+(Count-Rx $g 'queueMicrotask\s*\('))
Add-Line ('- setTimeout calls: '+(Count-Rx $g 'setTimeout\s*\('))
Add-Line ('- setInterval calls: '+(Count-Rx $g 'setInterval\s*\('))
Add-Line ('- MutationObserver constructions: '+(Count-Rx $g 'new\s+MutationObserver'))
Add-Line ('- documentElement observer attaches: '+(Count-Rx $g 'observer\.observe\s*\(\s*document\.documentElement'))
Add-Line ('- full section scans: '+(Count-Rx $g 'querySelectorAll\s*\(\s*["'']section["'']'))

Add-Line ''
Add-Line '## 6. Render pressure'
$renderCalls=[regex]::Matches($g,'render\s*\(\s*["'']([^"'']+)["'']\s*\)')
$renderGroups=$renderCalls | ForEach-Object {$_.Groups[1].Value} | Group-Object | Sort-Object Count -Descending
foreach($x in $renderGroups){ Add-Line ('- render("'+$x.Name+'"): '+$x.Count+' static call sites') }
Add-Line ('- total static render("page") call sites: '+$renderCalls.Count)

Add-Line ''
Add-Line '## 7. Selection / records regression indicators'
$signals=[ordered]@{
 'single 06 source in google-data' = ($d.Contains('"06_선택과목이력"') -and (-not $d.Contains('06A_학생별선택과목')))
 'selection cache present' = $g.Contains('__UEP_SELECTION_CACHE_08113__')
 'document-wide SDGs observer absent' = (-not [regex]::IsMatch($g,'observer\.observe\s*\(\s*document\.documentElement'))
 'full-section SDGs microtask scan absent' = (-not [regex]::IsMatch($g,'queueMicrotask[\s\S]{0,500}querySelectorAll\s*\(\s*["'']section["'']'))
 'strict record class parser present' = $g.Contains('classIndex=findIndex(/^반$|^학급$|^반명$/)')
 'old positional class fallback absent' = (-not $g.Contains('classIndex=indexOf(/^반$|학급|반명/,3)'))
}
foreach($kv in $signals.GetEnumerator()){ Add-Line ('- '+$kv.Key+': '+(Bool $kv.Value)) }

Add-Line ''
Add-Line '## 8. Patch-marker preservation inventory'
$patchFiles=Get-ChildItem patches -File -ErrorAction SilentlyContinue
$markers=New-Object System.Collections.Generic.HashSet[string]
foreach($f in $patchFiles){
  $txt=Get-Content $f.FullName -Raw -Encoding UTF8
  [regex]::Matches($txt,'__[A-Z0-9_]{8,}__') | ForEach-Object {[void]$markers.Add($_.Value)}
}
$present=0;$missing=0
foreach($marker in ($markers | Sort-Object)){
  if($g.Contains($marker) -or $m.Contains($marker) -or $d.Contains($marker) -or $i.Contains($marker) -or $c.Contains($marker)){ $present++ } else { $missing++ }
}
Add-Line ('- unique patch markers discovered: '+$markers.Count)
Add-Line ('- present in final assembled app: '+$present)
Add-Line ('- absent from final assembled app: '+$missing+' (manual classification required: intentionally superseded vs regression)')

Add-Line ''
Add-Line '## 9. Build-script feature-check inventory'
$scripts=Get-ChildItem scripts -Filter 'build-update-*.ps1' -File | Sort-Object Name
$checks=0
foreach($f in $scripts){
  $txt=Get-Content $f.FullName -Raw -Encoding UTF8
  $n=(Count-Rx $txt "'[^']+'\s*=")
  $checks += $n
}
Add-Line ('- build scripts scanned: '+$scripts.Count)
Add-Line ('- approximate historical named checks: '+$checks)
Add-Line '- NOTE: historical checks are not proof of current behavior; they are only an inventory source for the next manual regression pass.'

Add-Line ''
Add-Line '## 10. Audit conclusion rules'
Add-Line '- Do not publish or patch features from this audit.'
Add-Line '- Any duplicate function/override, missing major feature, legacy standalone route, or high-frequency global observer must be classified before the next functional change.'
Add-Line '- After classification, create one consolidated baseline instead of continuing the patch chain.'

$report | Set-Content 'UEP-0.81.16-FULL-AUDIT.md' -Encoding UTF8
Write-Host ($report -join "`n")
