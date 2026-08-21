$ErrorActionPreference='Stop'
$main='app/resources/app/electron/main.cjs';$data='app/resources/app/electron/google-data.cjs';$gyo='app/resources/app/gyomuon.js';$css='app/resources/app/gyomuon.css';$index='app/resources/app/index.html';$pkg='app/resources/app/package.json'
$m=Get-Content $main -Raw -Encoding UTF8;$d=Get-Content $data -Raw -Encoding UTF8;$g=Get-Content $gyo -Raw -Encoding UTF8;$c=Get-Content $css -Raw -Encoding UTF8;$i=Get-Content $index -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.81.05";','const APP_VERSION = "0.81.06";').Replace('v0.81.05','v0.81.06')
$d=[regex]::Replace($d,'(?m)^\s*"06(?:_선택과목이력|A_학생별선택과목)"\s*:\s*[^\r\n]+\r?\n?','')
$rangeAnchor='  "05_대학적성데이터": "''05_대학적성데이터''!A1:Z1000",'
if(-not $d.Contains($rangeAnchor)){throw '05 range anchor not found'}
$d=$d.Replace($rangeAnchor,$rangeAnchor+"`r`n"+'  "06_선택과목이력": "''06_선택과목이력''!A1:AI1000",')
$d=$d.Replace('selectionStudentRows: rowsFrom("06A_학생별선택과목")','selectionStudentRows: rowsFrom("06_선택과목이력")')
$start=$d.IndexOf('  const legacySelectedSubjectRows = rowsFrom("06_선택과목이력")')
$end=$d.IndexOf('  const selectionSubjectErrors = [];',$start)
if($start-lt 0-or $end-lt 0){throw 'legacy selection parser block not found'}
$wide=@'
  const selectionStudentRows = rowsFrom("06_선택과목이력");
  const selectionTerms = ["2-1","2-2","3-1","3-2"];
  const legacySelectedSubjectRows = selectionStudentRows.flatMap((row,index)=>{
    const studentId=String(valueByHeader(row,"학생ID","학생 ID")||"").trim(),studentNo=String(valueByHeader(row,"학번")||"").replace(/\.0$/,"").trim(),name=String(valueByHeader(row,"이름","성명","학생명")||"").trim();
    const master=students.find(s=>String(s.id)===studentId||String(s.studentNo)===studentNo)||{};
    let seq=0;const out=[];
    selectionTerms.forEach(term=>Object.keys(row).filter(key=>key.startsWith(term+" ")&&/선택\d+|정보·외국어|예술/.test(key)).forEach(key=>{const subject=String(row[key]||"").trim();if(!subject)return;seq+=1;out.push({id:`subject-${studentNo||index}-${seq}`,studentId:studentId||String(master.id||""),studentNo,name:name||String(master.name||""),schoolYear:"2026",semester:term,term,group:/예술/.test(key)?"예술":/정보·외국어/.test(key)?"정보·외국어":"선택",subject,standardSubject:subject.replace(/\*|\(성\)/g,"").replace(/\s+/g,""),type:"선택과목",credit:"",status:String(row["제출상태"]||"신청"),final:"Y",round:"",note:String(row["비고"]||""),source:"06_선택과목이력"});}));
    return out;
  }).filter(row=>(row.studentId||row.studentNo)&&row.subject);
  const selectedSubjectRows = legacySelectedSubjectRows;
'@
$d=$d.Substring(0,$start)+$wide+"`r`n"+$d.Substring($end)
if(-not $g.Contains('__UEP_CURRICULUM_FINAL_08106__')){$g+="`r`n"+(Get-Content './patches/uep-0.81.06-curriculum-final.js' -Raw -Encoding UTF8)}
if(-not $g.Contains('__UEP_RECORDBOOK_FILTER_DECISION_REPORT_08106__')){$g+="`r`n"+(Get-Content './patches/uep-0.81.06-recordcheck.js' -Raw -Encoding UTF8)}
if(-not $c.Contains('__UEP_FINAL_WORKFLOW_STYLE_08106__')){$c+="`r`n"+(Get-Content './patches/uep-0.81.06-final.css' -Raw -Encoding UTF8)}
Set-Content $main $m -Encoding UTF8;Set-Content $data $d -Encoding UTF8;Set-Content $gyo $g -Encoding UTF8;Set-Content $css $c -Encoding UTF8;Set-Content $index $i -Encoding UTF8
node --check $main;if($LASTEXITCODE-ne 0){throw 'main syntax failed'};node --check $data;if($LASTEXITCODE-ne 0){throw 'data syntax failed'};node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}
$checks=[ordered]@{
 'version 0.81.06'=$g.Contains('const APP_VERSION = "0.81.06";');'single 06 range'=$d.Contains('"06_선택과목이력": "''06_선택과목이력''!A1:AI1000"');'no 06A'=(-not $d.Contains('06A_학생별선택과목'));'wide parser'=$d.Contains('const selectionStudentRows = rowsFrom("06_선택과목이력")');'student application'=$g.Contains('function uepStudentApplicationView');'subject cards'=$g.Contains('function uepSubjectApplicationView');'privacy'=$g.Contains('privacyModeEnabled()');'SDGs bridge'=$g.Contains('function uepSdgsEvidenceBridge');'SDGs supplement bottom'=$g.Contains("uepSdgsEvidenceBridge()+supplement");'record filters'=$g.Contains('data-neis-class');'record decisions'=$g.Contains('data-neis-dismiss');'record report'=$g.Contains('data-neis-print')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)};if($checks.Values-contains $false){throw 'UEP 0.81.06 verification failed'}
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.06';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.81.06 final workflow applied.'
