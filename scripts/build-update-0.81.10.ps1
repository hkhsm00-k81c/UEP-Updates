$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js';$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.81.09";','const APP_VERSION = "0.81.10";').Replace('v0.81.09','v0.81.10')

# The old standalone selection page was folded into 생활기록부 > 교육과정.
# Keep legacy navigation/sync callbacks from crashing the first render.
$legacyMap='    selection: selectionView,'
$safeMap='    selection: (...args)=>(typeof selectionView==="function"?selectionView(...args):typeof uepCurriculumFinalView==="function"?uepCurriculumFinalView(...args):recordsView(...args)),'
if($g.Contains($legacyMap)){$g=$g.Replace($legacyMap,$safeMap)}
$legacyCapture='const __uepSelectionView08104=selectionView;'
$safeCapture='const __uepSelectionView08104=(...args)=>(typeof selectionView==="function"?selectionView(...args):typeof uepCurriculumFinalView==="function"?uepCurriculumFinalView(...args):recordsView(...args));'
if($g.Contains($legacyCapture)){$g=$g.Replace($legacyCapture,$safeCapture)}

Set-Content $gyo $g -Encoding UTF8
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.10';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}
$checks=[ordered]@{
 'version 0.81.10'=$g.Contains('const APP_VERSION = "0.81.10";')
 'legacy selection map removed'=(-not $g.Contains('    selection: selectionView,'))
 'legacy capture removed'=(-not $g.Contains('const __uepSelectionView08104=selectionView;'))
 'curriculum fallback present'=$g.Contains('typeof uepCurriculumFinalView==="function"')
 'NEIS fixed parser retained'=$g.Contains('const subjectIndex=indexOf')
 'supervisor grouped report retained'=$g.Contains('■ ${time} 귀가')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.10 compatibility verification failed'}
Write-Host 'UEP 0.81.10 selection compatibility recovery applied.'
