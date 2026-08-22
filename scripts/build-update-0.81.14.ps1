$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js';$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.81.13";','const APP_VERSION = "0.81.14";').Replace('v0.81.13','v0.81.14')

# 1) Restore direct entry to 생활기록부 main tabs with one delegated handler.
# This survives recordsView rerenders and avoids repeatedly binding every tab button.
if(-not $g.Contains('__UEP_RECORD_MAIN_TAB_BIND_08114__')){
$tabBind=@'

// __UEP_RECORD_MAIN_TAB_BIND_08114__
if(!window.__UEP_RECORD_MAIN_TAB_BIND_08114__){
  window.__UEP_RECORD_MAIN_TAB_BIND_08114__=true;
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-record-mode]');
    if(!button)return;
    const mode=String(button.dataset.recordMode||'').trim();
    if(!['activities','sdgs','curriculum','final'].includes(mode))return;
    recordMode=mode;
    render('records');
  });
}
'@
$g+="`r`n"+$tabBind
}

# 2) Replace the NEIS record parser with a stronger fixed-layout parser.
# Prefer a real 4-digit student number for grade/class/number, refresh merged grade/class
# headings, and accept subject names only from plausible subject cells/sheet names.
$parser=(Get-Content './patches/uep-0.81.14-record-parser.jsfrag' -Raw -Encoding UTF8).Trim()
$parserStart=$g.IndexOf('const makeRecords=sheets=>')
$parserEnd=$g.IndexOf('  const key=(record,issue)=>',$parserStart)
if($parserStart -lt 0 -or $parserEnd -lt 0){throw '0.81.14 NEIS parser anchors not found'}
$g=$g.Substring(0,$parserStart)+$parser+"`r`n  "+$g.Substring($parserEnd)

Set-Content $gyo $g -Encoding UTF8
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.14';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}

$checks=[ordered]@{
 'version 0.81.14'=$g.Contains('const APP_VERSION = "0.81.14";')
 'record main tab delegate'=$g.Contains('__UEP_RECORD_MAIN_TAB_BIND_08114__') -and $g.Contains("['activities','sdgs','curriculum','final']")
 'curriculum body retained'=$g.Contains('function uepCurriculumFinalView()') -and $g.Contains('function uepStudentApplicationView()') -and $g.Contains('function uepSubjectApplicationView()')
 'SDGs body retained'=$g.Contains('function uepSdgsEvidenceBridge()')
 'record parser 4-digit priority'=$g.Contains('fourDigitCell') -and $g.Contains('studentNo.slice(1,2)')
 'record parser number field'=$g.Contains('studentNo,name,grade,classNo,number,subject,text,issues')
 'record parser subject guard'=$g.Contains('validSubject') -and $g.Contains('cleanSheetSubject')
 'recordcheck retained'=$g.Contains('window.uepMountRecordbookValidator') -and $g.Contains('standaloneRecordcheckMount')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.14 interaction/parser verification failed'}
Write-Host 'UEP 0.81.14 records tab navigation and NEIS parsing refinement applied.'
