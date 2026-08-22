$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js';$pkg='app/resources/app/package.json';$css='app/resources/app/gyomuon.css'
$g=Get-Content $gyo -Raw -Encoding UTF8
if(-not $g.Contains('const APP_VERSION = "0.81.16";')){throw '0.81.16 base version marker missing'}
$g=$g.Replace('const APP_VERSION = "0.81.16";','const APP_VERSION = "0.81.17";').Replace('v0.81.16','v0.81.17')
Set-Content $gyo $g -Encoding UTF8
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.17';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8

node ./scripts/apply-css-cleanup-0.81.17.js app
if($LASTEXITCODE-ne 0){throw '0.81.17 CSS cleanup failed'}
node --check $gyo
if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}

$g=Get-Content $gyo -Raw -Encoding UTF8
$c=Get-Content $css -Raw -Encoding UTF8
$checks=[ordered]@{
 'version 0.81.17'=$g.Contains('const APP_VERSION = "0.81.17";')
 'curriculum body'=$g.Contains('function uepCurriculumFinalView()')
 'curriculum dependencies'=$g.Contains('function uepActiveSelectionRows()') -and $g.Contains('function uepSelectionErrors(') -and $g.Contains('function uepSelectionTermSubjects(')
 'SDGs body'=$g.Contains('function uepSdgsEvidenceBridge()') -and $g.Contains('function uepSdgsSupplementPanel()')
 'selection SMS helper'=$g.Contains('function uepSelectionSms(')
 'recordcheck retained'=$g.Contains('window.uepMountRecordbookValidator') -and $g.Contains('standaloneRecordcheckMount')
 'strict class header'=$g.Contains('classIndex=findIndex(/^반$|^학급$|^반명$/)')
 'class range guard'=$g.Contains('if(!/^([1-9]|1[0-4])$/.test(String(classNo||"")))classNo=""')
 'clean CSS size'=($c.Length -eq 35884)
 'removed unused selection hero'=(-not $c.Contains('.selection-hero'))
 'protected input method row'=$c.Contains('.input-method-row')
 'protected curriculum filter'=$c.Contains('.curriculum-filter-bar .record-class-cards')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.17 candidate verification failed'}
Write-Host 'UEP 0.81.17 CSS cleanup candidate applied without deployment.'
