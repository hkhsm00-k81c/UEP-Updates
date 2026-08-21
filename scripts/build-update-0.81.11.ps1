$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js';$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.81.10";','const APP_VERSION = "0.81.11";').Replace('v0.81.10','v0.81.11')

# Standalone selection and SDGs pages were integrated into records/curriculum.
# Do not evaluate removed function identifiers while constructing the view map.
$g=$g.Replace('    selection: (...args)=>(typeof selectionView==="function"?selectionView(...args):typeof uepCurriculumFinalView==="function"?uepCurriculumFinalView(...args):recordsView(...args)),','    selection: recordsView,')
$g=$g.Replace('    selection: selectionView,','    selection: recordsView,')
$g=$g.Replace('    sdgs: sdgsView,','    sdgs: recordsView,')
$g=$g.Replace('    recordcheck: recordcheckView,','    recordcheck: (...args)=>(typeof recordcheckView==="function"?recordcheckView(...args):recordsView(...args)),')

Set-Content $gyo $g -Encoding UTF8
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.11';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}
$checks=[ordered]@{
 'version 0.81.11'=$g.Contains('const APP_VERSION = "0.81.11";')
 'selection integrated'=$g.Contains('    selection: recordsView,')
 'sdgs integrated'=$g.Contains('    sdgs: recordsView,')
 'recordcheck safe'=$g.Contains('typeof recordcheckView==="function"')
 'no direct legacy view refs'=(-not ($g.Contains('    selection: selectionView,') -or $g.Contains('    sdgs: sdgsView,') -or $g.Contains('    recordcheck: recordcheckView,')))
 'NEIS fixed parser retained'=$g.Contains('const subjectIndex=indexOf')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.11 integrated view verification failed'}
Write-Host 'UEP 0.81.11 integrated view registry recovery applied.'
