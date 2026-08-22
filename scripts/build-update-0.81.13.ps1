$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js';$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8

# 0.81.13 candidate: flatten late recovery wrappers and remove global DOM watchers
$g=$g.Replace('const APP_VERSION = "0.81.12";','const APP_VERSION = "0.81.13";').Replace('v0.81.12','v0.81.13')

# Remove the 0.81.02 document-wide observer and delayed SDGs promotion hooks.
$g=[regex]::Replace($g,'(?s)\s*const observer=new MutationObserver\(\(\)=>requestAnimationFrame\(promoteSdgs\)\);observer\.observe\(document\.documentElement,\{subtree:true,childList:true\}\);document\.addEventListener\("DOMContentLoaded",promoteSdgs\);setTimeout\(promoteSdgs,300\);','')

# Remove the 0.81.07 post-render full-section scan wrapper when still present.
$g=[regex]::Replace($g,'(?s)const __uepRecordsBefore08107=recordsView;\s*recordsView=function\(\)\{const html=__uepRecordsBefore08107\(\);if\(recordMode===\x27sdgs\x27\)queueMicrotask\(\(\)=>document\.querySelectorAll\(\x27section\x27\)\.forEach\(s=>\{.*?return html;\};','')

# Remove obsolete standalone selection/SDGs page registry targets. Current product structure is records internal tabs.
$g=$g.Replace('    selection: recordsView,','').Replace('    sdgs: recordsView,','')

# Normalize legacy 06A UI text remnants without touching current 06_ source identifiers.
$g=$g.Replace('06A · LIVE APPLICATION','06 · LIVE APPLICATION').Replace('06A 학생별 선택과목','06 선택과목 이력')

# Add memoized selection analysis: expensive score averages, applications, subjects and errors are rebuilt only when source references change.
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
 'no document-wide mutation observer'=(-not $g.Contains('observer.observe(document.documentElement,{subtree:true,childList:true})'))
 'no SDGs full-section microtask scan'=(-not $g.Contains("document.querySelectorAll('section').forEach"))
 'selection dataset cache'=$g.Contains('__UEP_SELECTION_CACHE_08113__')
 'curriculum body exists'=$g.Contains('function uepCurriculumFinalView')
 'SDGs body exists'=$g.Contains('function uepSdgsEvidenceBridge')
 'recordcheck mount exists'=$g.Contains('window.uepMountRecordbookValidator')
 'recordcheck page exists'=$g.Contains('standaloneRecordcheckMount')
 'selection source current'=$g.Contains('readonlyCache?.selectionStudentRows')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.13 integrated recovery verification failed'}
Write-Host 'UEP 0.81.13 integrated recovery candidate applied.'
