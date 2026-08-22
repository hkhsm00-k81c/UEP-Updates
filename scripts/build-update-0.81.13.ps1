$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js';$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8

$g=$g.Replace('const APP_VERSION = "0.81.12";','const APP_VERSION = "0.81.13";').Replace('v0.81.12','v0.81.13')

# Remove 0.81.02 promoteSdgs global watcher hooks one statement at a time so CRLF/LF/spacing do not matter.
$g=[regex]::Replace($g,'(?s)const\s+observer\s*=\s*new\s+MutationObserver\s*\(\s*\(\)\s*=>\s*requestAnimationFrame\s*\(\s*promoteSdgs\s*\)\s*\)\s*;?','')
$g=[regex]::Replace($g,'(?s)observer\.observe\s*\(\s*document\.documentElement\s*,\s*\{\s*subtree\s*:\s*true\s*,\s*childList\s*:\s*true\s*\}\s*\)\s*;?','')
$g=[regex]::Replace($g,'(?s)document\.addEventListener\s*\(\s*["'']DOMContentLoaded["'']\s*,\s*promoteSdgs\s*\)\s*;?','')
$g=[regex]::Replace($g,'(?s)setTimeout\s*\(\s*promoteSdgs\s*,\s*300\s*\)\s*;?','')

# Remove only the 0.81.07 wrapper that performs a full section scan. Preserve the previous canonical recordsView body.
$g=[regex]::Replace($g,'(?s)const\s+__uepRecordsBefore08107\s*=\s*recordsView\s*;\s*recordsView\s*=\s*function\s*\(\s*\)\s*\{\s*const\s+html\s*=\s*__uepRecordsBefore08107\s*\(\s*\)\s*;\s*if\s*\(\s*recordMode\s*===\s*["'']sdgs["'']\s*\)\s*queueMicrotask\s*\(\s*\(\)\s*=>\s*document\.querySelectorAll\s*\(\s*["'']section["'']\s*\)\.forEach\s*\(.*?\)\s*\)\s*;?\s*return\s+html\s*;\s*\}\s*;','')

$g=$g.Replace('    selection: recordsView,','').Replace('    sdgs: recordsView,','')
$g=$g.Replace('06A · LIVE APPLICATION','06 · LIVE APPLICATION').Replace('06A 학생별 선택과목','06 선택과목 이력')

if(-not $g.Contains('__UEP_SELECTION_CACHE_08113__')){
$cache=@'

// __UEP_SELECTION_CACHE_08113__
let __uepSelectionCache08113={students:null,rows:null,scores:null,dorm:null,value:null};
const __uepSelectionDatasetRaw08113=uepSelectionDataset;
uepSelectionDataset=function(){
  const students=readonlyCache?.students||[],rows=readonlyCache?.selectionStudentRows||[],scores=readonlyCache?.scoreRecords||[],dorm=readonlyCache?.dormStudents||[];
  const c=__uepSelectionCache08113;
  if(c.value&&c.students===students&&c.rows===rows&&c.scores===scores&&c.dorm===dorm)return c.value;
  const value=__uepSelectionDatasetRaw08113();
  __uepSelectionCache08113={students,rows,scores,dorm,value};
  return value;
};
'@
$g+="`r`n"+$cache
}

Set-Content $gyo $g -Encoding UTF8
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.13';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}

$checks=[ordered]@{
 'version 0.81.13'=$g.Contains('const APP_VERSION = "0.81.13";')
 'no 06A source text'=(-not $g.Contains('06A 학생별 선택과목'))
 'no document-wide mutation observer'=(-not [regex]::IsMatch($g,'observer\.observe\s*\(\s*document\.documentElement'))
 'no promoteSdgs mutation observer'=(-not [regex]::IsMatch($g,'new\s+MutationObserver[^\r\n]*promoteSdgs'))
 'no SDGs full-section microtask scan'=(-not [regex]::IsMatch($g,'queueMicrotask[\s\S]{0,500}querySelectorAll\s*\(\s*["'']section["'']'))
 'selection dataset cache'=$g.Contains('__UEP_SELECTION_CACHE_08113__')
 'curriculum body exists'=$g.Contains('function uepCurriculumTabs') -and $g.Contains('function uepSelectionDataset')
 'SDGs body exists'=$g.Contains('function uepSdgsSupplementPanel')
 'recordcheck mount exists'=$g.Contains('window.uepMountRecordbookValidator')
 'recordcheck page exists'=$g.Contains('standaloneRecordcheckMount')
 'selection source current'=$g.Contains('readonlyCache?.selectionStudentRows')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.13 integrated recovery verification failed'}
Write-Host 'UEP 0.81.13 integrated recovery applied.'
