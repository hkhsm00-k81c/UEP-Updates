$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

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

$g=Get-Content $gyo -Raw -Encoding UTF8
$old=@'
function studentMatches(item, student) {
  const studentId=String(student?.id||"").trim();
  const itemStudentId=String(item?.studentId||item?.학생ID||"").trim();
  if(itemStudentId)return Boolean(studentId)&&itemStudentId===studentId;
  if(/전입/.test(String(student?.status||student?.enrollmentStatus||"")))return false;
  const no=String(student?.studentNo||"").trim();
  return Boolean(no)&&String(item?.studentNo||item?.학번||item?.number||"").trim()===no;
}
'@
$new=@'
function studentMatches(item, student) {
  const studentId=String(student?.id||"").trim();
  const itemStudentId=String(item?.studentId||item?.학생ID||"").trim();
  if(studentId && itemStudentId && itemStudentId===studentId)return true;
  const no=String(student?.studentNo||"").replace(/\.0$/,"" ).trim();
  const itemNo=String(item?.studentNo||item?.학번||item?.number||"").replace(/\.0$/,"" ).trim();
  if(no && itemNo && no===itemNo)return true;
  return false;
}
'@
if(-not $g.Contains($old.Trim())){throw 'studentMatches block not found'}
$g=$g.Replace($old.Trim(),$new.Trim())
$g=$g.Replace('const APP_VERSION = "0.80.61";','const APP_VERSION = "0.80.63";')
$g=$g.Replace('const APP_VERSION = "0.80.62";','const APP_VERSION = "0.80.63";')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8
$p=[regex]::Replace($p,'"version"\s*:\s*"0\.80\.(61|62)"','"version": "0.80.63"',1)
Set-Content $pkg $p -Encoding UTF8 -NoNewline

node --check $main
node --check $gyo
