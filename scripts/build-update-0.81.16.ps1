$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js';$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.81.15";','const APP_VERSION = "0.81.16";').Replace('v0.81.15','v0.81.16')

# Restore the missing selection SMS helper used by the current curriculum detail view.
if(-not $g.Contains('function uepSelectionSms(')){
  $p04=Get-Content './patches/uep-0.81.04-features.js' -Raw -Encoding UTF8
  $s=$p04.IndexOf('function uepSelectionSms(')
  $e=$p04.IndexOf('function selectionView()',$s)
  if($s -lt 0 -or $e -lt 0){throw '0.81.04 selection SMS helper anchors missing'}
  $g+="`r`n// __UEP_08116_SELECTION_SMS_HELPER__`r`n"+$p04.Substring($s,$e-$s).Trim()+"`r`n"
}

# Replace NEIS parser with strict class handling: no positional fallback for class column.
$parser=(Get-Content './patches/uep-0.81.16-record-parser.jsfrag' -Raw -Encoding UTF8).Trim()
$parserStart=$g.IndexOf('const makeRecords=sheets=>')
$parserEnd=$g.IndexOf('  const key=(record,issue)=>',$parserStart)
if($parserStart -lt 0 -or $parserEnd -lt 0){throw '0.81.16 NEIS parser anchors not found'}
$g=$g.Substring(0,$parserStart)+$parser+"`r`n  "+$g.Substring($parserEnd)

Set-Content $gyo $g -Encoding UTF8
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.16';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}
$checks=[ordered]@{
 'version 0.81.16'=$g.Contains('const APP_VERSION = "0.81.16";')
 'selection SMS helper'=$g.Contains('function uepSelectionSms(')
 'curriculum body'=$g.Contains('function uepCurriculumFinalView()')
 'curriculum dependencies'=$g.Contains('function uepActiveSelectionRows()') -and $g.Contains('function uepSelectionErrors(') -and $g.Contains('function uepSelectionTermSubjects(')
 'SDGs body'=$g.Contains('function uepSdgsEvidenceBridge()') -and $g.Contains('function uepSdgsSupplementPanel()')
 'strict class header'=$g.Contains('classIndex=findIndex(/^반$|^학급$|^반명$/)')
 'no positional class fallback'=(-not $g.Contains('classIndex=indexOf(/^반$|학급|반명/,3)'))
 'explicit section parse'=$g.Contains('([1-9]|1[0-4])\s*반')
 'class range guard'=$g.Contains('if(!/^([1-9]|1[0-4])$/.test(String(classNo||"")))classNo=""')
 'recordcheck retained'=$g.Contains('window.uepMountRecordbookValidator') -and $g.Contains('standaloneRecordcheckMount')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.16 curriculum/parser verification failed'}
Write-Host 'UEP 0.81.16 curriculum helper and strict NEIS class parser applied.'
