$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js';$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8

$g=$g.Replace('const APP_VERSION = "0.81.12";','const APP_VERSION = "0.81.13";').Replace('v0.81.12','v0.81.13')

# Remove the 0.81.02 global SDGs watcher hooks. These created repeated work after every DOM mutation.
$g=[regex]::Replace($g,'(?s)const\s+observer\s*=\s*new\s+MutationObserver\s*\(\s*\(\)\s*=>\s*requestAnimationFrame\s*\(\s*promoteSdgs\s*\)\s*\)\s*;?','')
$g=[regex]::Replace($g,'(?s)observer\.observe\s*\(\s*document\.documentElement\s*,\s*\{\s*subtree\s*:\s*true\s*,\s*childList\s*:\s*true\s*\}\s*\)\s*;?','')
$g=[regex]::Replace($g,'(?s)document\.addEventListener\s*\(\s*["'']DOMContentLoaded["'']\s*,\s*promoteSdgs\s*\)\s*;?','')
$g=[regex]::Replace($g,'(?s)setTimeout\s*\(\s*promoteSdgs\s*,\s*300\s*\)\s*;?','')

# Remove only the 0.81.07 full-document section-scan wrapper.
$g=[regex]::Replace($g,'(?s)const\s+__uepRecordsBefore08107\s*=\s*recordsView\s*;\s*recordsView\s*=\s*function\s*\(\s*\)\s*\{\s*const\s+html\s*=\s*__uepRecordsBefore08107\s*\(\s*\)\s*;\s*if\s*\(\s*recordMode\s*===\s*["'']sdgs["'']\s*\)\s*queueMicrotask\s*\(\s*\(\)\s*=>\s*document\.querySelectorAll\s*\(\s*["'']section["'']\s*\)\.forEach\s*\(.*?\)\s*\)\s*;?\s*return\s+html\s*;\s*\}\s*;','')

$g=$g.Replace('    selection: recordsView,','').Replace('    sdgs: recordsView,','')
$g=$g.Replace('06A · LIVE APPLICATION','06 · LIVE APPLICATION').Replace('06A 학생별 선택과목','06 선택과목 이력')

# 0.81.09-0.81.12 recovery could leave the current curriculum/SDGs route bindings
# while the appended 0.81.05/0.81.06 body functions were no longer present.
# Restore only the data functions needed by the current 0.81.06 implementation;
# do NOT revive the obsolete standalone selectionView wrapper from 0.81.05.
if(-not $g.Contains('function uepSelectionDataset()')){
  $p05=Get-Content './patches/uep-0.81.05-curriculum-sdgs.js' -Raw -Encoding UTF8
  $s05=$p05.IndexOf('function uepSelectionDataset(){')
  $e05=$p05.IndexOf('function uepCurriculumTabs(){',$s05)
  if($s05 -lt 0 -or $e05 -lt 0){throw '0.81.05 selection dataset anchors missing'}
  $g+="`r`n// __UEP_08113_RESTORED_SELECTION_DATASET__`r`n"+$p05.Substring($s05,$e05-$s05).Trim()+"`r`n"
}

# Restore the canonical 0.81.06 integrated curriculum + SDGs implementation when absent.
if(-not ($g.Contains('function uepCurriculumFinalView()') -and $g.Contains('function uepSdgsEvidenceBridge()'))){
  $p06=Get-Content './patches/uep-0.81.06-curriculum-final.js' -Raw -Encoding UTF8
  if(-not $p06.Contains('function uepCurriculumFinalView()') -or -not $p06.Contains('function uepSdgsEvidenceBridge()')){throw '0.81.06 curriculum/SDGs body patch invalid'}
  $g+="`r`n// __UEP_08113_RESTORED_CURRICULUM_SDGS_BODY__`r`n"+$p06.Trim()+"`r`n"
}

# Memoize the derived selection dataset after the canonical data function exists.
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
 'selection dataset body'=$g.Contains('function uepSelectionDataset()')
 'selection dataset cache'=$g.Contains('__UEP_SELECTION_CACHE_08113__')
 'curriculum final body'=$g.Contains('function uepCurriculumFinalView()')
 'curriculum student body'=$g.Contains('function uepStudentApplicationView()')
 'curriculum subject body'=$g.Contains('function uepSubjectApplicationView()')
 'SDGs live body'=$g.Contains('function uepSdgsEvidenceBridge()')
 'recordcheck mount exists'=$g.Contains('window.uepMountRecordbookValidator')
 'recordcheck page exists'=$g.Contains('standaloneRecordcheckMount')
 'selection source current'=$g.Contains('readonlyCache?.selectionStudentRows')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.13 integrated recovery verification failed'}
Write-Host 'UEP 0.81.13 integrated recovery applied with canonical curriculum/SDGs bodies restored.'
