$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js';$css='app/resources/app/gyomuon.css';$main='app/resources/app/electron/main.cjs';$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8;$c=Get-Content $css -Raw -Encoding UTF8;$m=Get-Content $main -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.81.07";','const APP_VERSION = "0.81.08";').Replace('v0.81.07','v0.81.08')

# 1) Replace the row-only NEIS parser with the fixed-layout/merged-cell parser.
$parser=(Get-Content './patches/uep-0.81.08-record-parser.jsfrag' -Raw -Encoding UTF8).Trim()
$parserStart=$g.IndexOf('const makeRecords=sheets=>')
$parserEnd=$g.IndexOf('  const key=(record,issue)=>',$parserStart)
if($parserStart -lt 0 -or $parserEnd -lt 0){throw 'NEIS parser anchors not found'}
$g=$g.Substring(0,$parserStart)+$parser+"`r`n  "+$g.Substring($parserEnd)
$g=$g.Replace('let session={fileName:"",records:[],scope:"all",classNo:"all",subject:"all",decisions:{},includeDismissed:false};','let session={fileName:"",records:[],scope:"all",classNo:"all",subject:"all",student:"all",decisions:{},includeDismissed:false};')
$g=$g.Replace('session={fileName:result.fileName||''나이스 엑셀'',sourceSheets:result.sheets,records:makeRecords(result.sheets),scope:''all'',classNo:''all'',subject:''all'',decisions:{},includeDismissed:false};','session={fileName:result.fileName||''나이스 엑셀'',sourceSheets:result.sheets,records:makeRecords(result.sheets),scope:''all'',classNo:''all'',subject:''all'',student:''all'',decisions:{},includeDismissed:false};')
$g=$g.Replace('session={fileName:'''',records:[],scope:''all'',classNo:''all'',subject:''all'',decisions:{},includeDismissed:false};','session={fileName:'''',records:[],scope:''all'',classNo:''all'',subject:''all'',student:''all'',decisions:{},includeDismissed:false};')
$oldFiltered='const filtered=()=>session.records.filter(r=>(session.classNo==="all"||r.classNo===session.classNo)&&(session.subject==="all"||r.subject===session.subject)&&(session.scope!=="issues"||activeIssues(r).length));'
$newFiltered='const filtered=()=>session.records.filter(r=>(session.classNo==="all"||r.classNo===session.classNo)&&(session.subject==="all"||r.subject===session.subject)&&(session.student==="all"||r.studentNo===session.student)&&(session.scope!=="issues"||activeIssues(r).length));'
if(-not $g.Contains($oldFiltered)){throw 'NEIS filtered anchor not found'};$g=$g.Replace($oldFiltered,$newFiltered)
$oldRender='const render=root=>{const records=filtered(),attention=records.filter(r=>activeIssues(r).length),classes=[...new Set(session.records.map(r=>r.classNo))].sort(),subjects=[...new Set(session.records.map(r=>r.subject))].sort((a,b)=>a.localeCompare(b,"ko")),box=root.querySelector(''[data-neis-results]'');'
$newRender='const render=root=>{const records=filtered(),attention=records.filter(r=>activeIssues(r).length),classes=[...new Set(session.records.map(r=>r.classNo))].sort(),subjects=[...new Set(session.records.map(r=>r.subject))].sort((a,b)=>a.localeCompare(b,"ko")),students=[...new Map(session.records.filter(r=>r.studentNo).map(r=>[r.studentNo,{studentNo:r.studentNo,name:r.name}])).values()].sort((a,b)=>String(a.studentNo).localeCompare(String(b.studentNo))),box=root.querySelector(''[data-neis-results]'');'
if(-not $g.Contains($oldRender)){throw 'NEIS render anchor not found'};$g=$g.Replace($oldRender,$newRender)
$oldSubject=@'
</select></label><button class="btn ${session.scope==='issues'?'primary':'secondary'}" data-neis-errors-only>오류 표시만</button>
'@
$newSubject=@'
</select></label><label class="neis-student-filter">개인별<select data-neis-student><option value="all">전체 학생</option>${students.map(x=>`<option value="${esc(x.studentNo)}" ${session.student===x.studentNo?'selected':''}>${esc(x.studentNo)} ${esc(x.name)}</option>`).join('')}</select></label><button class="btn ${session.scope==='issues'?'primary':'secondary'}" data-neis-errors-only>오류 표시만</button>
'@
if(-not $g.Contains($oldSubject)){throw 'NEIS subject filter anchor not found'};$g=$g.Replace($oldSubject,$newSubject)
$oldBind='box.querySelector(''[data-neis-subject]'').onchange=e=>{session.subject=e.target.value;render(root);};box.querySelector(''[data-neis-errors-only]'')'
$newBind='box.querySelector(''[data-neis-subject]'').onchange=e=>{session.subject=e.target.value;render(root);};box.querySelector(''[data-neis-student]'').onchange=e=>{session.student=e.target.value;render(root);};box.querySelector(''[data-neis-errors-only]'')'
if(-not $g.Contains($oldBind)){throw 'NEIS filter binding anchor not found'};$g=$g.Replace($oldBind,$newBind)

# 2) Professional dorm supervisor report: home-going students grouped by departure time.
$reportStart=$g.IndexOf('  const supervisorReportText=()=>')
$reportEnd=$g.IndexOf('  const smsCards=', $reportStart)
if($reportStart -lt 0 -or $reportEnd -lt 0){throw 'supervisor report anchors not found'}
$report=@'
  const supervisorReportText=()=>{const homeItems=items.filter(item=>/퇴소|귀가/.test(String(item.category||''))),groups=new Map();homeItems.forEach(item=>{const time=String(item.outTime||item.returnTime||'시간 미정');if(!groups.has(time))groups.set(time,[]);groups.get(time).push(item);});const body=[...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([time,list])=>`■ ${time} 귀가\n${list.sort((a,b)=>String(outingStudentNo(a)).localeCompare(String(outingStudentNo(b)))).map(item=>`${outingStudentNo(item)} ${item.name}`).join('\n')}`).join('\n\n');return `[오늘의 1학년 학사 귀가 학생]\n\n${body||'금일 귀가 학생 없음'}\n\n이상입니다.`;};
'@
$g=$g.Substring(0,$reportStart)+$report+$g.Substring($reportEnd)
$g=$g.Replace('<button class="btn secondary" data-outing-supervisor-copy>전문사감 보고문 확인</button>','<button class="btn secondary" data-outing-supervisor-copy>전문사감 보고문 확인</button><button class="btn secondary" data-outing-supervisor-email>전문사감 메일 작성</button>')
$mailAnchor='  $("[data-outing-copy-all]")?.addEventListener("click",()=>{'
$mail=@'
  $("[data-outing-supervisor-email]")?.addEventListener("click",()=>{
    const text=supervisorReportText(),subject=encodeURIComponent(`[운호고등학교] ${displayDate} 1학년 학사 귀가 학생`),body=encodeURIComponent(text);
    window.open(`mailto:?subject=${subject}&body=${body}`,'_self');
  });
'@
if(-not $g.Contains($mailAnchor)){throw 'supervisor email anchor not found'};$g=$g.Replace($mailAnchor,$mail+$mailAnchor)

# 3) Teacher-added dorm outing: recover the existing school connection and preserve full student identity.
$saveStart=$m.IndexOf('async function saveDormOuting(payload={}){')
$saveEnd=$m.IndexOf('async function saveStudentGuidanceRecord(payload={}){',$saveStart)
if($saveStart -lt 0 -or $saveEnd -lt 0){throw 'saveDormOuting anchors not found'}
$save=@'
async function saveDormOuting(payload={}){
  const allowedRoles=new Set(['admin','grade_head','grade_manager','homeroom']);
  if(payload.role&&!allowedRoles.has(String(payload.role)))throw new Error('학사외출 교사등록 권한이 없습니다.');
  const date=String(payload.date||'').slice(0,10),category=String(payload.category||'외출'),studentNo=String(payload.studentNo||'').replace(/\D/g,''),name=String(payload.name||'').trim();
  if(!date||!studentNo||!name)throw new Error('학생·학번·날짜 정보를 확인해 주세요.');
  const home=/퇴소|귀가/.test(category),outTime=String(payload.outTime||''),returnTime=String(payload.returnTime||'');
  if(!outTime)throw new Error('외출·귀가 시간을 입력해 주세요.');
  if(!home&&!returnTime)throw new Error('복귀 예정시간을 입력해 주세요.');
  const account=await resolveSchoolServiceAccount();if(!validateServiceAccount(account))throw new Error('학교 공용 Google 쓰기 연결을 찾지 못했습니다.');
  const token=await getSheetsToken(account),now=new Date().toISOString(),id=String(payload.id||`OUT-TEACHER-${crypto.randomUUID()}`),grade=String(payload.grade||studentNo.slice(0,1)||'1'),className=String(payload.className||studentNo.slice(1,2)||''),number=String(payload.number||studentNo.slice(-2)).replace(/^0/,'');
  const existing=await readSheetBatch(token,UEP_SPREADSHEET_ID,["'02_학사외출_일자별'!A3:AD5000"]),matrix=existing?.[0]?.values||[],headers=(matrix[0]||[]).map(x=>String(x||'').trim()),col=(...names)=>names.map(n=>headers.indexOf(n)).find(i=>i>=0);
  const dcol=col('외출일자','신청일자','운영일','일자','날짜'),ncol=col('학번','학생학번'),idcol=col('학생ID','학생 ID'),ccol=col('외출구분','신청구분','구분'),tcol=col('외출시간','출발예정시간','출발시간');
  const duplicate=matrix.slice(1).some(r=>String(r[dcol]||'').slice(0,10)===date&&((ncol>=0&&String(r[ncol]||'').replace(/\.0$/,'')===studentNo)||(idcol>=0&&String(r[idcol]||'')===String(payload.studentId||'')))&&String(r[ccol]||'')===category&&String(r[tcol]||'')===outTime);
  if(duplicate)throw new Error('같은 학생의 동일한 학사외출 기록이 이미 있습니다.');
  const row=[[id,'',date,String(payload.studentId||''),grade,className,number,name,'교사등록',category,home?'귀가형':'복귀형',outTime,home?'':returnTime,home?returnTime:'',String(payload.reason||''),String(payload.destination||''),String(payload.guardian||''),String(payload.note||''),String(payload.status||'확인'),now,now,'UEP반영',now,String(payload.writer||''),'','','Y','교사 직접등록','담임·관리자 직접 확인',now]];
  await appendSheetValues(token,UEP_SPREADSHEET_ID,"'02_학사외출_일자별'!A:AD",row);
  liveDataCache=null;liveDataFetchedAt=0;const data=await fetchLiveData({force:true});return {ok:true,id,data,record:{id,studentId:String(payload.studentId||''),studentNo,name,date,className,number,category,outTime,returnTime,reason:String(payload.reason||''),destination:String(payload.destination||''),note:String(payload.note||''),confirmed:String(payload.writer||''),status:'확인'}};
}
'@
$m=$m.Substring(0,$saveStart)+$save+$m.Substring($saveEnd)

if(-not $g.Contains('__UEP_OPERATIONS_08108__')){$g+="`r`n"+(Get-Content './patches/uep-0.81.08-operations.js' -Raw -Encoding UTF8)}
if(-not $c.Contains('__UEP_OPERATIONS_STYLE_08108__')){$c+="`r`n"+(Get-Content './patches/uep-0.81.08-operations.css' -Raw -Encoding UTF8)}

Set-Content $gyo $g -Encoding UTF8;Set-Content $css $c -Encoding UTF8;Set-Content $main $m -Encoding UTF8
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.08';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'};node --check $main;if($LASTEXITCODE-ne 0){throw 'main syntax failed'}
$checks=[ordered]@{
 'version 0.81.08'=$g.Contains('const APP_VERSION = "0.81.08";')
 'dorm save recovery'=$m.Contains('const account=await resolveSchoolServiceAccount()')
 'dorm duplicate guard'=$m.Contains('동일한 학사외출 기록이 이미 있습니다')
 'supervisor grouped report'=$g.Contains('■ ${time} 귀가')
 'supervisor email same body'=$g.Contains('data-outing-supervisor-email')
 'attendance exact type'=$g.Contains('function uep08108AttendanceLabel')
 'homeroom student counsel cards'=$g.Contains('dashboard-counsel-student-grid')
 'NEIS fixed parser'=$g.Contains('const subjectIndex=indexOf')
 'NEIS merged carry'=$g.Contains('currentSubject=rawSubject')
 'NEIS student number'=$g.Contains('cleanNo.padStart(2,"0")')
 'NEIS deduplicate pages'=$g.Contains('seen.has(dedupe)')
 'NEIS individual filter'=$g.Contains('data-neis-student')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.08 verification failed'}
Write-Host 'UEP 0.81.08 operations and NEIS parser applied.'
