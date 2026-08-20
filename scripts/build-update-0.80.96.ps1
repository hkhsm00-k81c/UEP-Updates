$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$google='app/resources/app/electron/google-data.cjs'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$d=Get-Content $google -Raw -Encoding UTF8

# One-point build: curriculum selection subjects only.
$g=$g.Replace('const APP_VERSION = "0.80.95";','const APP_VERSION = "0.80.96";').Replace('v0.80.95','v0.80.96')

# Single source of truth: 기본정보연결시트 06_선택과목이력 -> readonlyCache.subjectSelections.
$bundlePattern='const selected=\(\(\)=>\{const out=\[\],seen=new Set\(\);for\(const raw of \[\.\.\.\(readonlyCache\?\.selectedSubjects\|\|\[\]\),\.\.\.\(readonlyCache\?\.subjectSelections\|\|\[\]\)\]\)\{.*?return out;\}\)\(\);'
$bundleNew=@'
const selected=(()=>{
  const out=[],seen=new Set();
  for(const raw of (readonlyCache?.subjectSelections||[])){
    if(!studentMatches(raw,student)||!studentRecordWithinEnrollment(raw,student)) continue;
    const item={...raw,
      term:raw.term||raw.semester||raw.학기||raw.이수학기||'',
      semester:raw.semester||raw.term||raw.학기||raw.이수학기||'',
      subject:raw.subject||raw.standardSubject||raw.course||raw.과목명||raw.선택과목||'',
      status:raw.status||raw.신청상태||'현재 선택'
    };
    const key=[item.term,item.subject].join('|');
    if(!item.subject||seen.has(key)) continue;
    seen.add(key);out.push(item);
  }
  return out;
})();
'@
$next=[regex]::Replace($g,$bundlePattern,$bundleNew.Trim(),1,[System.Text.RegularExpressions.RegexOptions]::Singleline)
if($next -eq $g){throw 'curriculum selected bundle not replaced'}
$g=$next

# Remove all legacy comparison/history panels from curriculum composition. Keep only current subjects + current validation panel.
$g=$g.Replace('${profilePanel}${selectionErrorHistoryMarkup(student)}${errorPanel}','${profilePanel}${errorPanel}')
$g=$g.Replace('${profilePanel}${selectionComparisonMarkup(student)}${selectionErrorHistoryMarkup(student)}${errorPanel}','${profilePanel}${errorPanel}')

# Current validation only: three requested checks.
$errorPattern='function selectionErrorsForStudent\(student\)\{.*?\}'
$errorNew=@'
function selectionErrorsForStudent(student){
  const allowed=new Set(['문·이과 혼합 선택','문이과 혼합 선택','문이과 교차지원','문·이과 교차지원','과학계열 과목 위계 위반','과학과목 위계오류','학기간 중복 신청','학기간 중복과목 오류']);
  const rows=readonlyCache?.selectionSubjectErrors||[];
  return rows.filter(x=>((x.studentId&&x.studentId===student?.id)||(x.studentNo&&String(x.studentNo)===String(student?.studentNo)))&&allowed.has(String(x.type||'').trim()));
}
'@
$next=[regex]::Replace($g,$errorPattern,$errorNew.Trim(),1,[System.Text.RegularExpressions.RegexOptions]::Singleline)
if($next -eq $g){throw 'selectionErrorsForStudent not replaced'}
$g=$next
$g=$g.Replace('<h3>현재 본신청 오류검토</h3>','<h3>선택과목 오류검토</h3>')
$g=$g.Replace('현재 본신청 기준 문·이과 혼합·과학 위계·학기간 중복 오류가 없습니다.','현재 선택과목 기준 문·이과 교차지원·과학과목 위계·학기간 중복과목 오류가 없습니다.')

# Validation source must be the same 06_선택과목이력-derived selectedSubjectRows only.
# Existing validators run on selectedSubjectRows; keep only requested error families in exported selectionSubjectErrors.
$filterAnchor='selectionSubjectErrors.push(...inferredSelectionErrors.filter(err=>!selectionSubjectErrors.some('
if($d -notmatch [regex]::Escape($filterAnchor)){throw 'selection validation anchor missing'}
# Normalize labels to requested UI language.
$d=$d.Replace("type:'문·이과 혼합 선택'","type:'문이과 교차지원'")
$d=$d.Replace("type:'문이과 혼합 선택'","type:'문이과 교차지원'")
$d=$d.Replace("type:'과학계열 과목 위계 위반'","type:'과학과목 위계오류'")
$d=$d.Replace("type:'학기간 중복 신청'","type:'학기간 중복과목 오류'")

Set-Content $gyo $g -Encoding UTF8
Set-Content $google $d -Encoding UTF8
node --check $gyo
if($LASTEXITCODE -ne 0){throw 'gyomuon syntax failed'}
node --check $google
if($LASTEXITCODE -ne 0){throw 'google-data syntax failed'}

# Gate: one source only, no comparison panel in curriculum composition, three error labels present.
$checkG=Get-Content $gyo -Raw -Encoding UTF8
$checkD=Get-Content $google -Raw -Encoding UTF8
if($checkG -notmatch 'for\(const raw of \(readonlyCache\?\.subjectSelections\|\|\[\]\)\)'){throw 'subjectSelections-only gate failed'}
if($checkG -match '\$\{profilePanel\}\$\{selectionComparisonMarkup\(student\)\}'){throw 'legacy comparison still composed'}
if($checkG -match '\$\{profilePanel\}\$\{selectionErrorHistoryMarkup\(student\)\}'){throw 'legacy history still composed'}
foreach($label in @('문이과 교차지원','과학과목 위계오류','학기간 중복과목 오류')){if(($checkG+$checkD) -notmatch [regex]::Escape($label)){throw "missing validation label: $label"}}

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.96'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.80.96 one-point curriculum selection-history build applied.'
