$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8

# 0.80.79 intentionally does NOT alter Google OAuth. 0.80.78 remains the auth baseline for tomorrow's teacher-PC verification.

# Visible version.
$g=$g.Replace('const APP_VERSION = "0.80.78";','const APP_VERSION = "0.80.79";')
$g=$g.Replace('const APP_VERSION = "0.80.77";','const APP_VERSION = "0.80.79";')
$g=$g.Replace('v0.80.78','v0.80.79')
$g=$g.Replace('v0.80.77','v0.80.79')

# SDGs wording: this is a growth/story lens, not completion counting.
$g=$g.Replace('SDGs 이수현황 - 17개 목표별 포트폴리오','생활기록부 핵심 성장 프로파일 · SDGs 연계')
$g=$g.Replace('SDGs 이수현황','SDGs 연계 성장 프로파일')
$g=$g.Replace('17개 목표별 포트폴리오','진로·전공·탐구주제·사회적 가치 연계')

# Add concise teacher guidance near SDGs headings when the stable heading text is present.
$guide='<div class="uep-sdgs-guide"><b>왜 SDGs와 연결하나요?</b> 우리 학교의 유네스코 교육 방향과 학교교육과정(자율·진로·동아리·봉사), 선택활동, 교과·탐구·보고서를 함께 살펴 학생이 무엇에 관심을 가지고 어떤 문제를 바라보며 생각을 확장해 왔는지 하나의 성장 스토리로 읽기 위한 관점입니다. 17개 목표를 채우는 것이 목적이 아니라 진로·전공 관심, 탐구주제, 공동체·세계시민·지속가능성 등 학생 기록에 나타난 가치와 문제의식을 발견하여 상담과 기록 지도에 활용합니다.</div>'
if(($g -notmatch 'uep-sdgs-guide') -and ($g -match '생활기록부 핵심 성장 프로파일 · SDGs 연계')){
  $g=$g.Replace('생활기록부 핵심 성장 프로파일 · SDGs 연계','생활기록부 핵심 성장 프로파일 · SDGs 연계'+$guide)
}

# Student report guidance: move beyond activity summaries without forcing SDG numbers.
$old='활동을 통해 새롭게 알게 된 점'
$new='활동을 통해 새롭게 알게 된 점과 함께, 이 경험이 자신의 진로·전공 및 사회·공동체·환경·미래의 어떤 문제와 연결되는지, 활동 전후 자신의 생각이나 관점이 어떻게 달라졌는지 구체적으로 작성해 보세요.'
$g=$g.Replace($old,$new)

# Selection-course comparison helpers. Stable key is studentId first, student number second; never row position.
if($g -notmatch 'function uepSelectionStableStudentKey'){
$helpers=@'

// UEP 0.80.79 selection-course identity/comparison helpers.
function uepSelectionStableStudentKey(row={}){
  const sid=String(row.studentId??row.studentID??row['학생ID']??'').trim();
  if(sid) return `ID:${sid}`;
  const sno=String(row.studentNo??row.studentNumber??row['학번']??'').trim();
  return sno?`NO:${sno}`:'';
}
function uepSelectionNormalizeCourse(row={}){
  return String(row.course??row.subject??row['과목']??row['선택과목']??row['과목명']??'').trim();
}
function uepSelectionSemester(row={}){
  return String(row.semester??row['학기']??row['신청학기']??'').trim();
}
function uepSelectionRound(row={}){
  return String(row.round??row['신청차수']??row['신청구분']??'').trim();
}
function uepCompareSelectionHistory(rows=[]){
  const byStudent=new Map();
  for(const row of rows){
    const key=uepSelectionStableStudentKey(row); if(!key) continue;
    if(!byStudent.has(key)) byStudent.set(key,[]);
    byStudent.get(key).push(row);
  }
  const out=[];
  for(const [studentKey,list] of byStudent){
    const semesters=[...new Set(list.map(uepSelectionSemester).filter(Boolean))];
    for(const semester of semesters){
      const semRows=list.filter(r=>uepSelectionSemester(r)===semester);
      const pre=new Set(semRows.filter(r=>/사전|상담|구글폼|google/i.test(uepSelectionRound(r)+' '+String(r['원본시트']??''))).map(uepSelectionNormalizeCourse).filter(Boolean));
      const main=new Set(semRows.filter(r=>/본신청|리로|수강신청/i.test(uepSelectionRound(r)+' '+String(r['원본시트']??''))).map(uepSelectionNormalizeCourse).filter(Boolean));
      if(!pre.size && !main.size) continue;
      const kept=[...pre].filter(x=>main.has(x));
      const removed=[...pre].filter(x=>!main.has(x));
      const added=[...main].filter(x=>!pre.has(x));
      const status=!removed.length&&!added.length?'일치':(removed.length&&added.length?'변경':(added.length?'추가':'삭제'));
      out.push({studentKey,semester,status,kept,removed,added});
    }
  }
  return out;
}
'@
$g += $helpers
}

Set-Content $gyo $g -Encoding UTF8 -NoNewline
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.79'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check 'app/resources/app/electron/main.cjs'
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo
$verify=Get-Content $gyo -Raw -Encoding UTF8
if(-not $verify.Contains('0.80.79')){throw 'visible 0.80.79 version missing'}
if(-not $verify.Contains('uepSelectionStableStudentKey')){throw 'stable selection student key helper missing'}
if(-not $verify.Contains('uepCompareSelectionHistory')){throw 'selection comparison helper missing'}
Write-Host 'UEP 0.80.79 student growth profile + selection-course comparison patch applied. OAuth unchanged.'
