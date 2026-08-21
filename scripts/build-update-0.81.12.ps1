$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js';$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.81.11";','const APP_VERSION = "0.81.12";').Replace('v0.81.11','v0.81.12')

# The integrated curriculum/SDGs markup exists, but the removed legacy binder may not.
# Bind the current controls directly from the records page lifecycle.
$legacy='  if(page==="records"&&(recordMode==="curriculum"||recordMode==="sdgs"))bindSelectionAnalysis();'
$inline=@'
  if(page==="records"&&(recordMode==="curriculum"||recordMode==="sdgs"))requestAnimationFrame(()=>{
    $$('[data-curriculum-workspace]').forEach(b=>b.onclick=()=>{curriculumWorkspaceMode=b.dataset.curriculumWorkspace;render('records');});
    $$('[data-record-class]').forEach(b=>b.onclick=()=>{recordClassNo=b.dataset.recordClass;recordStudentId='';render('records');});
    $$('[data-record-query]').forEach(b=>b.onclick=()=>{recordQueryMode=b.dataset.recordQuery||'class';render('records');});
    $$('[data-record-student]').forEach(b=>b.onclick=()=>{recordStudentId=b.dataset.recordStudent;recordQueryMode='student';render('records');});
    $('[data-curriculum-error-only]')?.addEventListener('click',()=>{curriculumErrorOnly=!curriculumErrorOnly;render('records');});
    $('[data-curriculum-error-type]')?.addEventListener('change',e=>{curriculumErrorType=e.target.value;render('records');});
    $$('[data-curriculum-term]').forEach(b=>b.onclick=()=>{curriculumTermFilter=b.dataset.curriculumTerm;curriculumSubjectKey='';render('records');});
    $$('[data-curriculum-subject]').forEach(b=>b.onclick=()=>{curriculumSubjectKey=b.dataset.curriculumSubject;render('records');});
    $$('[data-roster-sort]').forEach(b=>b.onclick=()=>{curriculumRosterSort=b.dataset.rosterSort;render('records');});
    $('[data-copy-current-selection-sms]')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#currentSelectionSms')?.value||'');toast('보완 문자메시지를 복사했습니다.');}catch{toast('문자 복사에 실패했습니다.');}});
    $('[data-copy-sdgs-supplement]')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#sdgsSupplementText')?.value||'');toast('SDGs 근거 보완 질문을 복사했습니다.');}catch{toast('복사에 실패했습니다.');}});
  });
'@
if($g.Contains($legacy)){$g=$g.Replace($legacy,$inline.TrimEnd())}

# Record validation remains a standalone page. Provide its mount target without
# depending on the removed 0.81.04 recordcheckView symbol.
$old='    recordcheck: (...args)=>(typeof recordcheckView==="function"?recordcheckView(...args):recordsView(...args)),'
$view='    recordcheck: ()=>`<div class="module-page recordcheck-page"><div class="standalone-feature-head"><small>NEIS LOCAL CHECK</small><h2>세특 오류검증</h2><p>나이스 교과 세특 엑셀을 현재 PC에서만 읽어 학번·이름·과목과 검증 항목을 확인합니다.</p></div><div id="standaloneRecordcheckMount"></div></div>`,'
if($g.Contains($old)){$g=$g.Replace($old,$view)}

Set-Content $gyo $g -Encoding UTF8
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.12';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}
$checks=[ordered]@{
 'version 0.81.12'=$g.Contains('const APP_VERSION = "0.81.12";')
 'legacy binder call removed'=(-not $g.Contains('))bindSelectionAnalysis();'))
 'curriculum direct binding'=$g.Contains("$$('[data-curriculum-workspace]').forEach")
 'sdgs supplement binding'=$g.Contains("$('[data-copy-sdgs-supplement]')?.addEventListener")
 'recordcheck mount view'=$g.Contains('id="standaloneRecordcheckMount"')
 'recordcheck mount implementation'=$g.Contains('window.uepMountRecordbookValidator=mount')
 'NEIS fixed parser retained'=$g.Contains('const subjectIndex=indexOf')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.12 page interaction verification failed'}
Write-Host 'UEP 0.81.12 curriculum, SDGs and recordcheck interaction recovery applied.'
