$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js';$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.81.14";','const APP_VERSION = "0.81.15";').Replace('v0.81.14','v0.81.15')

# Restore dependencies accidentally omitted when 0.81.13 restored only the dataset/body functions.
$p04=Get-Content './patches/uep-0.81.04-features.js' -Raw -Encoding UTF8
if(-not $g.Contains('function uepActiveSelectionRows()')){
  $s=$p04.IndexOf('function uepActiveSelectionRows(){')
  $e=$p04.IndexOf('function uepSelectionDataset(){',$s)
  if($s -lt 0 -or $e -lt 0){throw '0.81.04 selection helper anchors missing'}
  $g+="`r`n// __UEP_08115_SELECTION_HELPERS__`r`n"+$p04.Substring($s,$e-$s).Trim()+"`r`n"
}

$p05=Get-Content './patches/uep-0.81.05-curriculum-sdgs.js' -Raw -Encoding UTF8
if(-not $g.Contains('function uepSdgsSupplementPanel()')){
  $s=$p05.IndexOf('function uepSdgsSupplementPanel(){')
  $e=$p05.IndexOf('function bindSelectionAnalysis(){',$s)
  if($s -lt 0 -or $e -lt 0){throw '0.81.05 SDGs supplement anchors missing'}
  $g+="`r`n// __UEP_08115_SDGS_SUPPLEMENT__`r`n"+$p05.Substring($s,$e-$s).Trim()+"`r`n"
}

Set-Content $gyo $g -Encoding UTF8
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.15';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}
$checks=[ordered]@{
 'version 0.81.15'=$g.Contains('const APP_VERSION = "0.81.15";')
 'active selection rows helper'=$g.Contains('function uepActiveSelectionRows()')
 'dorm helper'=$g.Contains('function uepDormStudentIds()')
 'term subjects helper'=$g.Contains('function uepSelectionTermSubjects(')
 'grade average helper'=$g.Contains('function uepStudentGradeAverage(')
 'expected grade helper'=$g.Contains('function uepExpectedGrade(')
 'selection errors helper'=$g.Contains('function uepSelectionErrors(')
 'SDGs supplement helper'=$g.Contains('function uepSdgsSupplementPanel()')
 'curriculum body'=$g.Contains('function uepCurriculumFinalView()')
 'SDGs body'=$g.Contains('function uepSdgsEvidenceBridge()')
 'tab delegate'=$g.Contains('__UEP_RECORD_MAIN_TAB_BIND_08114__')
 'record parser refined'=$g.Contains('fourDigitCell') -and $g.Contains('validSubject')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.15 dependency recovery verification failed'}
Write-Host 'UEP 0.81.15 restored missing curriculum/SDGs runtime dependencies.'
