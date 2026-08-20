$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$google='app/resources/app/electron/google-data.cjs'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$d=Get-Content $google -Raw -Encoding UTF8

# Version bump.
$g=$g.Replace('const APP_VERSION = "0.80.96";','const APP_VERSION = "0.80.97";').Replace('v0.80.96','v0.80.97')

# 06_선택과목이력 currently has >5,000 rows. Read the whole direct-migration table.
$oldRange='"06_선택과목이력": "''06_선택과목이력''!A1:X2000"'
$newRange='"06_선택과목이력": "''06_선택과목이력''!A1:X6000"'
if(-not $d.Contains($oldRange)){throw '06 selection range anchor not found'}
$d=$d.Replace($oldRange,$newRange)

# Single source: final(Y) rows from 06_선택과목이력 only.
$oldSelected=@'
const selectedSubjectRows = (()=>{
    const out=[], seen=new Set();
    for(const row of [...normalizedSubjectRows,...fallbackSubjectRows,...legacySelectedSubjectRows]){
      const key=[String(row.studentId||row.studentNo||''),String(row.term||row.semester||''),String(row.standardSubject||row.subject||'')].join('|');
      if(!key.replace(/\|/g,'')||seen.has(key)) continue;
      seen.add(key);out.push(row);
    }
    return out;
  })();
'@
$newSelected=@'
const selectedSubjectRows = legacySelectedSubjectRows.filter(row=>String(row.final||'').trim()==='Y');
'@
if(-not $d.Contains($oldSelected.Trim())){throw 'selectedSubjectRows merge block not found'}
$d=$d.Replace($oldSelected.Trim(),$newSelected.Trim())

# Do not import historical error rows from another sheet. Recalculate only from the direct 06 rows.
$oldErrors=@'
const selectionSubjectErrors = rowsFrom("41_선택과목_오류검토").map((row,index)=>({
    id:String(row["오류ID"]||`selection-error-${index}`), studentId:String(valueByHeader(row, "학생ID", "학생 ID")||"").trim(), studentNo:String(valueByHeader(row, "학번")||"").replace(/\.0$/, ""), name:String(valueByHeader(row, "성명", "이름", "학생명")||"").trim(), type:String(row["오류유형"]||"").trim(), severity:String(row["심각도"]||"확인").trim(), subject:String(row["표준과목명"]||"").trim(), terms:String(row["관련학기"]||"").trim(), detail:String(row["상세내용"]||"").trim(), status:String(row["처리상태"]||"미처리").trim()
  })).filter(row=>(row.studentId||row.studentNo)&&row.type);
'@
$newErrors='const selectionSubjectErrors = [];'
if(-not $d.Contains($oldErrors.Trim())){throw 'legacy selection error import block not found'}
$d=$d.Replace($oldErrors.Trim(),$newErrors)

# selectedSubjects is also direct 06 final rows only. No curriculum/form fallback.
$oldDisplay=@'
const confirmedSubjects = legacySelectedSubjectRows.filter(row=>row.final==="Y"||row.status==="확정");
  const selectedSubjects = (confirmedSubjects.length ? confirmedSubjects : curriculumSubjects).map(row=>{
    const meta=selectionSubmissionMeta.get(String(row.studentNo||"").replace(/\.0$/,""))||{};
    return {...row,finalSubmittedAt:meta.finalSubmittedAt||row.finalSubmittedAt||row.submittedAt||"",submissionCount:meta.submissionCount||row.submissionCount||1,modifiedAfterNotice:Boolean(meta.modifiedAfterNotice||row.modifiedAfterNotice)};
  });
'@
$newDisplay=@'
const confirmedSubjects = selectedSubjectRows;
  const selectedSubjects = confirmedSubjects.map(row=>({...row}));
'@
if(-not $d.Contains($oldDisplay.Trim())){throw 'selectedSubjects fallback block not found'}
$d=$d.Replace($oldDisplay.Trim(),$newDisplay.Trim())

# Export the exact same rows under the key the 0.80.96 curriculum UI reads.
$oldReturn='    selectedSubjects,'
$newReturn="    selectedSubjects,`r`n    subjectSelections:selectedSubjects,"
if(-not $d.Contains($oldReturn)){throw 'selectedSubjects return anchor not found'}
$d=$d.Replace($oldReturn,$newReturn)

Set-Content $gyo $g -Encoding UTF8
Set-Content $google $d -Encoding UTF8
node --check $gyo
if($LASTEXITCODE -ne 0){throw 'gyomuon syntax failed'}
node --check $google
if($LASTEXITCODE -ne 0){throw 'google-data syntax failed'}

# Runtime gates.
$checkD=Get-Content $google -Raw -Encoding UTF8
$checks=[ordered]@{
  '06 range 6000'=$checkD.Contains('"06_선택과목이력": "''06_선택과목이력''!A1:X6000"')
  'direct final source'=$checkD.Contains("const selectedSubjectRows = legacySelectedSubjectRows.filter(row=>String(row.final||'').trim()==='Y');")
  'no legacy error import'=$checkD.Contains('const selectionSubjectErrors = [];')
  'subjectSelections export'=$checkD.Contains('subjectSelections:selectedSubjects')
  'no curriculum fallback'=(-not $checkD.Contains('confirmedSubjects.length ? confirmedSubjects : curriculumSubjects'))
}
$checks.GetEnumerator() | ForEach-Object { Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value) }
if($checks.Values -contains $false){throw '0.80.97 direct selection loader verification failed'}

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.97'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.80.97 direct 06 selection-history loader applied.'
