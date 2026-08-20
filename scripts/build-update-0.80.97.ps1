$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$google='app/resources/app/electron/google-data.cjs'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$d=Get-Content $google -Raw -Encoding UTF8

# Version bump.
$g=$g.Replace('const APP_VERSION = "0.80.96";','const APP_VERSION = "0.80.97";').Replace('v0.80.96','v0.80.97')

# 06_선택과목이력 has 5,410 rows. Read the complete direct-migration table.
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
$newSelected="const selectedSubjectRows = legacySelectedSubjectRows.filter(row=>String(row.final||'').trim()==='Y');"
if(-not $d.Contains($oldSelected.Trim())){throw 'selectedSubjectRows merge block not found'}
$d=$d.Replace($oldSelected.Trim(),$newSelected)

# Remove historical 41_선택과목_오류검토 import by stable literal boundaries.
$errStartNeedle='const selectionSubjectErrors = rowsFrom("41_선택과목_오류검토")'
$errStart=$d.IndexOf($errStartNeedle,[System.StringComparison]::Ordinal)
if($errStart -lt 0){throw 'legacy selection error import start not found'}
$errEndNeedle='const scienceSubjectPattern'
$errEnd=$d.IndexOf($errEndNeedle,$errStart,[System.StringComparison]::Ordinal)
if($errEnd -lt 0){throw 'legacy selection error import end not found'}
$d=$d.Substring(0,$errStart)+'const selectionSubjectErrors = [];'+[Environment]::NewLine+'  '+$d.Substring($errEnd)

# selectedSubjects must be the exact same direct 06 final rows. Replace by stable section boundaries, not whitespace-sensitive text.
$displayStartNeedle='const confirmedSubjects = legacySelectedSubjectRows.filter'
$displayStart=$d.IndexOf($displayStartNeedle,[System.StringComparison]::Ordinal)
if($displayStart -lt 0){throw 'selectedSubjects fallback start not found'}
$displayEndNeedle='// 0.80.81:'
$displayEnd=$d.IndexOf($displayEndNeedle,$displayStart,[System.StringComparison]::Ordinal)
if($displayEnd -lt 0){throw 'selectedSubjects fallback end not found'}
$newDisplay=@'
const confirmedSubjects = selectedSubjectRows;
  const selectedSubjects = confirmedSubjects.map(row=>({...row}));

  
'@
$d=$d.Substring(0,$displayStart)+$newDisplay+$d.Substring($displayEnd)

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
  'no legacy error import'=(-not $checkD.Contains('rowsFrom("41_선택과목_오류검토")'))
  'direct selectedSubjects'=$checkD.Contains('const confirmedSubjects = selectedSubjectRows;')
  'subjectSelections export'=$checkD.Contains('subjectSelections:selectedSubjects')
  'no curriculum fallback'=(-not $checkD.Contains('confirmedSubjects.length ? confirmedSubjects : curriculumSubjects'))
}
$checks.GetEnumerator() | ForEach-Object { Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value) }
if($checks.Values -contains $false){throw '0.80.97 direct selection loader verification failed'}

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.97'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.80.97 direct 06 selection-history loader applied.'
