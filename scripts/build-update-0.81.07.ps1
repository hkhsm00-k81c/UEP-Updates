$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js';$css='app/resources/app/gyomuon.css';$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8;$c=Get-Content $css -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.81.06";','const APP_VERSION = "0.81.07";').Replace('v0.81.06','v0.81.07')
if(-not $g.Contains('__UEP_REFINEMENT_08107__')){$g+="`r`n"+(Get-Content './patches/uep-0.81.07-refinement.js' -Raw -Encoding UTF8)}
if(-not $c.Contains('__UEP_REFINEMENT_STYLE_08107__')){$c+="`r`n"+(Get-Content './patches/uep-0.81.07-refinement.css' -Raw -Encoding UTF8)}
Set-Content $gyo $g -Encoding UTF8;Set-Content $css $c -Encoding UTF8
node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}
$checks=[ordered]@{
 'version 0.81.07'=$g.Contains('const APP_VERSION = "0.81.07";')
 'all class first'=$g.Contains("classButton('all','전체')")
 'query switch top'=$g.Contains('curriculum-query-top')
 'student picker inside filter'=$g.Contains('${picker}</div>')
 'error first'=$g.Contains('selection-error-first')
 'error subject color'=$g.Contains('selection-subject-error')
 'four term row'=$g.Contains('curriculum-term-grid-four')
 'expected grade column'=$g.Contains('expected-grade-cell')
 'legacy SDGs map removed'=$g.Contains("textContent.trim()==='SDGs 근거 지도'")
 'record rule manager'=$g.Contains('오류규칙·금지어 관리')
 'record merged subject carry'=$g.Contains('currentSubject=by(/과목명|과\s*목/)||currentSubject')
 'record student number restore'=$g.Contains('String(rawNo).padStart(2,"0")')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.07 verification failed'}
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.07';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.81.07 refinement applied.'
