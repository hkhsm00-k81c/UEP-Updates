$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$google='app/resources/app/electron/google-data.cjs'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$d=Get-Content $google -Raw -Encoding UTF8

# One-point build only: 생활기록부 > 교육과정 선택과목.
$g=$g.Replace('const APP_VERSION = "0.80.95";','const APP_VERSION = "0.80.96";').Replace('v0.80.95','v0.80.96')

# 1) Single display source: 기본정보연결시트 06_선택과목이력 -> readonlyCache.subjectSelections only.
$startNeedle='const selected=(()=>{const out=[],seen=new Set();for(const raw of [...(readonlyCache?.selectedSubjects||[]),...(readonlyCache?.subjectSelections||[])]){'
$start=$g.IndexOf($startNeedle,[System.StringComparison]::Ordinal)
if($start -lt 0){throw 'curriculum selected bundle start not found'}
$endNeedle='return out;})();'
$end=$g.IndexOf($endNeedle,$start,[System.StringComparison]::Ordinal)
if($end -lt 0){throw 'curriculum selected bundle end not found'}
$end += $endNeedle.Length
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
$g=$g.Substring(0,$start)+$bundleNew.Trim()+$g.Substring($end)

# 2) Remove legacy pre-application comparison/history from curriculum UI.
$g=$g.Replace('${profilePanel}${selectionErrorHistoryMarkup(student)}${errorPanel}','${profilePanel}${errorPanel}')
$g=$g.Replace('${profilePanel}${selectionComparisonMarkup(student)}${selectionErrorHistoryMarkup(student)}${errorPanel}','${profilePanel}${errorPanel}')

# 3) Keep only the three requested current-selection validation families.
$oldErrors=@'
function selectionErrorsForStudent(student){
  const rows=readonlyCache?.selectionSubjectErrors||[];
  return rows.filter(x=>((x.studentId&&x.studentId===student?.id)||(x.studentNo&&String(x.studentNo)===String(student?.studentNo)))&&String(x.source||'').includes('현재 본신청 자동검증'));
}
'@
$newErrors=@'
function selectionErrorsForStudent(student){
  const allowed=new Set(['문·이과 혼합 선택','문이과 혼합 선택','문이과 교차지원','문·이과 교차지원','과학계열 과목 위계 위반','과학과목 위계오류','학기간 중복 신청','학기간 중복과목 오류']);
  const rows=readonlyCache?.selectionSubjectErrors||[];
  return rows.filter(x=>((x.studentId&&x.studentId===student?.id)||(x.studentNo&&String(x.studentNo)===String(student?.studentNo)))&&allowed.has(String(x.type||'').trim()));
}
'@
if(-not $g.Contains($oldErrors.Trim())){throw 'selectionErrorsForStudent exact block not found'}
$g=$g.Replace($oldErrors.Trim(),$newErrors.Trim())
$g=$g.Replace('<h3>현재 본신청 오류검토</h3>','<h3>선택과목 오류검토</h3>')
$g=$g.Replace('현재 본신청 기준 문·이과 혼합·과학 위계·학기간 중복 오류가 없습니다.','현재 선택과목 기준 문·이과 교차지원·과학과목 위계·학기간 중복과목 오류가 없습니다.')

# 4) Validation runs on selectedSubjectRows from 06_선택과목이력; normalize labels only.
$filterAnchor='selectionSubjectErrors.push(...inferredSelectionErrors.filter(err=>!selectionSubjectErrors.some('
if(-not $d.Contains($filterAnchor)){throw 'selection validation anchor missing'}
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

# One-point gates.
$checkG=Get-Content $gyo -Raw -Encoding UTF8
$checkD=Get-Content $google -Raw -Encoding UTF8
if(-not $checkG.Contains('for(const raw of (readonlyCache?.subjectSelections||[]))')){throw 'subjectSelections-only gate failed'}
if($checkG.Contains('${profilePanel}${selectionComparisonMarkup(student)}')){throw 'legacy comparison still composed'}
if($checkG.Contains('${profilePanel}${selectionErrorHistoryMarkup(student)}')){throw 'legacy history still composed'}
foreach($label in @('문이과 교차지원','과학과목 위계오류','학기간 중복과목 오류')){if(-not (($checkG+$checkD).Contains($label))){throw "missing validation label: $label"}}

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.96'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.80.96 one-point curriculum selection-history build applied.'
