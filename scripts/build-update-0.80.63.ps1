$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

# 0.80.62: 선택과목 원본을 보조 탭과 독립적으로 조회
$m=Get-Content $main -Raw -Encoding UTF8
if($m -notmatch 'const curriculumSpreadsheetId = "1fevlAWQZqWQkiYl-eGRCdzidBj59Z8NqOxfCrGvwlHI"'){
  $pattern='(?s)try\s*\{\s*const curriculumRanges = await readSheetBatch\(.*?matrices\["__CURRICULUM_STUDENTS"\] = \[\];\s*\}'
  $replacement=@'
const curriculumSpreadsheetId = "1fevlAWQZqWQkiYl-eGRCdzidBj59Z8NqOxfCrGvwlHI";
const curriculumReads = [
  ["__CURRICULUM_09", "'09_수강신청결과'!A1:AG1200"],
  ["__CURRICULUM_ERRORS", "'05_오류검토'!A11:Z1200"],
  ["__CURRICULUM_STUDENTS", "'02_학생마스터'!A1:AA1200"]
];
for (const [logicalName, range] of curriculumReads) {
  try {
    const one = await readSheetBatch(token, curriculumSpreadsheetId, [range]);
    matrices[logicalName] = one?.[0]?.values || [];
  } catch (error) {
    matrices[logicalName] = [];
    console.warn(`[UEP] 선택과목 원본 조회 실패: ${logicalName}`, error?.message || error);
  }
}
'@
  $patched=[regex]::Replace($m,$pattern,$replacement.Trim(),1)
  if($patched -eq $m){throw 'Curriculum source-read block patch failed'}
  Set-Content $main $patched -Encoding UTF8 -NoNewline
}

# 0.80.63: 학생ID 불일치 시에도 학번으로 fallback 매칭
$g=Get-Content $gyo -Raw -Encoding UTF8
$before=$g

# 기존의 "학생ID가 있으면 ID만 비교하고 즉시 반환" 조건을 제거/완화
$g=[regex]::Replace(
  $g,
  'if\s*\(\s*itemStudentId\s*\)\s*return\s+Boolean\s*\(\s*studentId\s*\)\s*&&\s*itemStudentId\s*===\s*studentId\s*;?',
  'if(studentId && itemStudentId && itemStudentId===studentId)return true;',
  1
)

# 전입 여부만으로 학번 fallback을 차단하던 조기 return 제거
$g=[regex]::Replace(
  $g,
  'if\s*\(\s*/전입/\.test\s*\(\s*String\s*\(\s*student\?\.status\s*\|\|\s*student\?\.enrollmentStatus\s*\|\|\s*["'']{2}\s*\)\s*\)\s*\)\s*return\s+false\s*;?',
  '',
  1
)

# 학번 비교는 숫자형 시트 값(1101.0 등)도 동일 학번으로 처리
$g=[regex]::Replace(
  $g,
  'const\s+no\s*=\s*String\s*\(\s*student\?\.studentNo\s*\|\|\s*["'']{2}\s*\)\.trim\(\)\s*;?',
  'const no=String(student?.studentNo||"").replace(/\\.0$/,"" ).trim();',
  1
)
$g=[regex]::Replace(
  $g,
  'return\s+Boolean\s*\(\s*no\s*\)\s*&&\s*String\s*\(\s*item\?\.studentNo\s*\|\|\s*item\?\.학번\s*\|\|\s*item\?\.number\s*\|\|\s*["'']{2}\s*\)\.trim\(\)\s*===\s*no\s*;?',
  'const itemNo=String(item?.studentNo||item?.학번||item?.number||"").replace(/\\.0$/,"" ).trim(); return Boolean(no)&&Boolean(itemNo)&&itemNo===no;',
  1
)

if($g -eq $before){
  throw 'studentMatches logic was not changed; expected matching statements were not found'
}

$g=$g.Replace('const APP_VERSION = "0.80.61";','const APP_VERSION = "0.80.63";')
$g=$g.Replace('const APP_VERSION = "0.80.62";','const APP_VERSION = "0.80.63";')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8
$p=[regex]::Replace($p,'"version"\s*:\s*"0\.80\.(61|62)"','"version": "0.80.63"',1)
Set-Content $pkg $p -Encoding UTF8 -NoNewline

node --check $main
node --check $gyo
