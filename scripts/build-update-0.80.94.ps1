$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$css='app/resources/app/gyomuon.css'
$main='app/resources/app/electron/main.cjs'
$pre='app/resources/app/electron/preload.cjs'
$google='app/resources/app/electron/google-data.cjs'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$c=Get-Content $css -Raw -Encoding UTF8
$m=Get-Content $main -Raw -Encoding UTF8
$p=Get-Content $pre -Raw -Encoding UTF8
$d=Get-Content $google -Raw -Encoding UTF8

# Version: build from stable 0.80.92, publish as 0.80.94.
$g=$g.Replace('const APP_VERSION = "0.80.92";','const APP_VERSION = "0.80.94";').Replace('v0.80.92','v0.80.94')

# 1) SELECTION HISTORY: merge all 06_선택과목이력 representations instead of choosing only one source.
$oldSel='const selectedSubjectRows = normalizedSubjectRows.length ? normalizedSubjectRows : (fallbackSubjectRows.length ? fallbackSubjectRows : legacySelectedSubjectRows);'
$newSel=@'
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
if(-not $d.Contains($oldSel)){throw 'selectedSubjectRows source selector not found'}
$d=$d.Replace($oldSel,$newSel.Trim())

# Mark current mixed-track validation and add current duplicate/science hierarchy validation.
$d=$d.Replace("status:'미처리'});","status:'미처리',source:'현재 본신청 자동검증'});")
$anchor='  selectionSubjectErrors.push(...inferredSelectionErrors.filter(err=>!selectionSubjectErrors.some(x=>x.studentId===err.studentId&&x.type===err.type)));'
$validation=@'
  subjectsByStudent.forEach((rows,key)=>{
    const first=rows[0]||{};
    const bySubject=new Map();
    rows.forEach(r=>{const s=String(r.standardSubject||r.subject||'').trim();if(!s)return;if(!bySubject.has(s))bySubject.set(s,[]);bySubject.get(s).push(r);});
    bySubject.forEach((list,subject)=>{
      const terms=[...new Set(list.map(r=>String(r.term||r.semester||'')).filter(Boolean))];
      if(terms.length>1) inferredSelectionErrors.push({id:`selection-duplicate-${key}-${subject}`,studentId:first.studentId,studentNo:first.studentNo,name:first.name,type:'학기간 중복 신청',severity:'확인 필요',subject,terms:terms.join(', '),detail:`${subject}: ${terms.join(' · ')} 중복 선택`,status:'미처리',source:'현재 본신청 자동검증'});
    });
    const prereq={
      '역학과 에너지':['물리학'],'전자기와 양자':['물리학'],
      '물질과 에너지':['화학'],'화학 반응의 세계':['화학'],
      '세포와 물질대사':['생명과학'],'생물의 유전':['생명과학'],
      '지구시스템과학':['지구과학'],'행성우주과학':['지구과학']
    };
    const order=t=>({'2학년 1학기':1,'2학년 2학기':2,'3학년 1학기':3,'3학년 2학기':4}[String(t||'')]||99);
    rows.forEach(r=>{
      const subject=String(r.standardSubject||r.subject||'').trim(), need=prereq[subject];if(!need)return;
      const currentOrder=order(r.term||r.semester);
      const ok=rows.some(base=>need.includes(String(base.standardSubject||base.subject||'').trim())&&order(base.term||base.semester)<currentOrder);
      if(!ok) inferredSelectionErrors.push({id:`selection-hierarchy-${key}-${subject}`,studentId:first.studentId,studentNo:first.studentNo,name:first.name,type:'과학계열 과목 위계 위반',severity:'확인 필요',subject,terms:String(r.term||r.semester||''),detail:`${subject} 선택 전 ${need.join(' 또는 ')} 이수 여부 확인 필요`,status:'미처리',source:'현재 본신청 자동검증'});
    });
  });
  selectionSubjectErrors.push(...inferredSelectionErrors.filter(err=>!selectionSubjectErrors.some(x=>String(x.studentId||x.studentNo)===String(err.studentId||err.studentNo)&&x.type===err.type&&String(x.subject||'')===String(err.subject||''))));
'@
if(-not $d.Contains($anchor)){throw 'selection error anchor not found'}
$d=$d.Replace($anchor,$validation.TrimEnd())

# 2) RECORD CURRICULUM: current applications only; pre-application is shown as error history only.
$oldBundle='const selected=(readonlyCache?.selectedSubjects||[]).filter(item=>studentMatches(item,student)&&studentRecordWithinEnrollment(item,student));'
$newBundle=@'
const selected=(()=>{const out=[],seen=new Set();for(const raw of [...(readonlyCache?.selectedSubjects||[]),...(readonlyCache?.subjectSelections||[])]){if(!studentMatches(raw,student)||!studentRecordWithinEnrollment(raw,student))continue;const item={...raw,term:raw.term||raw.semester||raw.학기||raw.이수학기||'',semester:raw.semester||raw.term||raw.학기||raw.이수학기||'',subject:raw.subject||raw.standardSubject||raw.course||raw.과목명||raw.선택과목||'',status:raw.status||raw.신청상태||'본신청'};const key=[item.term,item.subject].join('|');if(!item.subject||seen.has(key))continue;seen.add(key);out.push(item);}return out;})();
'@
if(-not $g.Contains($oldBundle)){throw 'studentRecordBundle selected source not found'}
$g=$g.Replace($oldBundle,$newBundle.Trim())

$oldErrors='function selectionErrorsForStudent(student){const rows=readonlyCache?.selectionSubjectErrors||[];return rows.filter(x=>(x.studentId&&x.studentId===student?.id)||(x.studentNo&&String(x.studentNo)===String(student?.studentNo)));}'
$newErrors=@'
function selectionErrorsForStudent(student){
  const rows=readonlyCache?.selectionSubjectErrors||[];
  return rows.filter(x=>((x.studentId&&x.studentId===student?.id)||(x.studentNo&&String(x.studentNo)===String(student?.studentNo)))&&String(x.source||'').includes('현재 본신청 자동검증'));
}
'@
if(-not $g.Contains($oldErrors)){throw 'selectionErrorsForStudent not found'}
$g=$g.Replace($oldErrors,$newErrors.Trim())

# Remove the old pre-vs-main comparison panel from curriculum workspace.
$oldCurr='${profilePanel}${selectionComparisonMarkup(student)}${selectionErrorHistoryMarkup(student)}${errorPanel}'
$newCurr='${profilePanel}${selectionErrorHistoryMarkup(student)}${errorPanel}'
if(-not $g.Contains($oldCurr)){throw 'curriculum panel composition not found'}
$g=$g.Replace($oldCurr,$newCurr)
$g=$g.Replace('<h3>사전신청 오류 → 본신청 재검증</h3>','<h3>사전신청 오류 이력</h3>')
$g=$g.Replace('사전 Google Form에서 발견된 문이과 혼합·과학 위계·학기간 중복 오류를 본신청과 연결해 추적합니다.','사전 Google Form 신청 당시 발견된 문·이과 혼합·과학 위계·학기간 중복 오류 이력입니다.')
$g=$g.Replace('<h3>선택과목 오류검토</h3>','<h3>현재 본신청 오류검토</h3>')
$g=$g.Replace('현재 학기간 동일과목 중복 및 문·이과 교차 오류가 없습니다.','현재 본신청 기준 문·이과 혼합·과학 위계·학기간 중복 오류가 없습니다.')

# 3) MEAL: make monthly quick-open meal text a real multi-line menu.
$g=$g.Replace('<span>${escapeHtml((meal.menu||[]).join('' · ''))}</span>','<span class="duty-meal-menu-full">${(meal.menu||[]).map(item=>`<i>${escapeHtml(item)}</i>`).join('''')}</span>')

# 4) TEACHER-ADDED DORM OUTING: shared sheet write, same normalized 02_학사외출_일자별 source.
$mainAnchor='async function saveStudentGuidanceRecord(payload={}){'
$saveOuting=@'
async function saveDormOuting(payload={}){
  const allowedRoles=new Set(['admin','grade_head','grade_manager','homeroom']);
  if(payload.role&&!allowedRoles.has(String(payload.role))) throw new Error('학사외출 교사등록 권한이 없습니다.');
  const account=await readEncrypted(credentialPath()); if(!validateServiceAccount(account))throw new Error('학사외출 교사등록은 쓰기 연결이 필요합니다. 관리자 연결 상태를 확인하세요.');
  const token=await getSheetsToken(account),now=new Date().toISOString(),id=String(payload.id||`OUT-TEACHER-${crypto.randomUUID()}`);
  const category=String(payload.category||'외출'),home=/퇴소|귀가/.test(category);
  const row=[[
    id,'',String(payload.date||now.slice(0,10)),String(payload.studentId||''),String(payload.grade||'1'),String(payload.className||''),String(payload.number||''),String(payload.name||''),
    '교사등록',category,home?'귀가형':'복귀형',String(payload.outTime||''),home?'':String(payload.returnTime||''),home?String(payload.returnTime||''):'',
    String(payload.reason||''),String(payload.destination||''),String(payload.guardian||''),String(payload.note||''),String(payload.status||'확인'),now,now,'UEP반영',now,'','','',
    'Y','교사 직접등록','담임·관리자 직접 확인',now
  ]];
  await appendSheetValues(token,UEP_SPREADSHEET_ID,"'02_학사외출_일자별'!A:AD",row);
  liveDataCache=null;liveDataFetchedAt=0;const data=await fetchLiveData({force:true});return {ok:true,id,data};
}

'@
if(-not $m.Contains($mainAnchor)){throw 'main outing insertion anchor not found'}
$m=$m.Replace($mainAnchor,$saveOuting+$mainAnchor)
$m=$m.Replace('ipcMain.handle("studentGuidance:save", async (_event, payload={}) => saveStudentGuidanceRecord(payload));','ipcMain.handle("studentGuidance:save", async (_event, payload={}) => saveStudentGuidanceRecord(payload));`n  ipcMain.handle("dormOuting:save", async (_event, payload={}) => saveDormOuting(payload));')
$p=$p.Replace('saveStudentGuidanceRecord: (payload) => ipcRenderer.invoke("studentGuidance:save", payload),','saveStudentGuidanceRecord: (payload) => ipcRenderer.invoke("studentGuidance:save", payload),`n  saveDormOuting: (payload) => ipcRenderer.invoke("dormOuting:save", payload),')

$outingAnchor='function openDormOutingDrawer() {'
$outingEditor=@'
function openDormOutingTeacherEditor(){
  const all=readonlyCache?.students||[], dorm=readonlyCache?.dormStudents||[];
  const ids=new Set(dorm.flatMap(x=>[String(x.studentId||''),String(x.studentNo||'')]).filter(Boolean));
  const students=(ids.size?all.filter(s=>ids.has(String(s.id||''))||ids.has(String(s.studentNo||''))):all).filter(s=>String(s.status||'재학')==='재학').sort((a,b)=>String(a.studentNo||'').localeCompare(String(b.studentNo||''),'ko'));
  const layer=document.createElement('div');layer.className='issue-layer';layer.id='dormOutingTeacherLayer';
  layer.innerHTML=`<div class="issue-dialog dorm-outing-teacher-dialog"><header><div><small>DORMITORY · TEACHER ENTRY</small><h3>학사외출 교사 추가</h3><p>갑작스러운 병원 진료 등 학생 폼 제출이 어려운 경우 교사가 직접 기록합니다.</p></div><button type="button" data-outing-editor-close>×</button></header><form id="dormOutingTeacherForm"><div class="dorm-outing-editor-grid"><label>학생<select id="dormOutingTeacherStudent" required><option value="">학생 선택</option>${students.map(s=>`<option value="${escapeHtml(s.id||s.studentNo||'')}">${escapeHtml(`${s.studentNo||''} ${s.name||''}`)}</option>`).join('')}</select></label><label>날짜<input id="dormOutingTeacherDate" type="date" value="${escapeHtml(dateKey(outingViewDate))}" required></label><label>구분<select id="dormOutingTeacherCategory"><option>외출</option><option>병원외출</option><option>퇴소</option><option>늦은 입소</option></select></label><label>외출시간<input id="dormOutingTeacherOut" type="time"></label><label>복귀·귀가 예정<input id="dormOutingTeacherReturn" type="time"></label><label>사유<input id="dormOutingTeacherReason" placeholder="예: 복통으로 병원 진료" required></label><label>목적지<input id="dormOutingTeacherDestination" placeholder="병원·자택 등"></label><label class="wide">비고<input id="dormOutingTeacherNote" placeholder="보호자 연락 여부 등"></label></div><div class="modal-actions"><button type="button" class="btn secondary" data-outing-editor-close>취소</button><button class="btn primary" type="submit">교사등록 저장</button></div></form></div>`;
  document.body.appendChild(layer);const close=()=>layer.remove();layer.querySelectorAll('[data-outing-editor-close]').forEach(b=>b.onclick=close);
  layer.querySelector('#dormOutingTeacherForm').onsubmit=async e=>{e.preventDefault();const id=layer.querySelector('#dormOutingTeacherStudent').value,student=students.find(s=>String(s.id||s.studentNo||'')===String(id));if(!student)return toast('학생을 선택하세요.');const payload={role:currentRoleId(),studentId:String(student.id||''),studentNo:String(student.studentNo||''),name:String(student.name||''),grade:String(student.grade||'1'),className:String(classNumberOf(student)||''),number:String(student.number||''),date:layer.querySelector('#dormOutingTeacherDate').value,category:layer.querySelector('#dormOutingTeacherCategory').value,outTime:layer.querySelector('#dormOutingTeacherOut').value,returnTime:layer.querySelector('#dormOutingTeacherReturn').value,reason:layer.querySelector('#dormOutingTeacherReason').value.trim(),destination:layer.querySelector('#dormOutingTeacherDestination').value.trim(),note:layer.querySelector('#dormOutingTeacherNote').value.trim(),status:'확인',writer:currentLoginTeacherName()||''};const btn=e.submitter;btn.disabled=true;btn.textContent='저장 중…';try{const result=await window.schoolBoard?.saveDormOuting?.(payload);if(!result?.ok)throw new Error(result?.reason||'저장 실패');readonlyCache=result.data||readonlyCache;close();openDormOutingDrawer();updateDormOutingCount();toast('학사외출을 교사등록으로 저장했습니다.');}catch(err){btn.disabled=false;btn.textContent='교사등록 저장';toast(err?.message||'학사외출 저장 실패');}};
}

'@
if(-not $g.Contains($outingAnchor)){throw 'openDormOutingDrawer anchor not found'}
$g=$g.Replace($outingAnchor,$outingEditor+$outingAnchor)
$g=$g.Replace('<button class="btn primary" data-outing-print>오늘 명단 출력</button>','<button class="btn primary" data-outing-teacher-add>+ 외출 추가</button><button class="btn primary" data-outing-print>오늘 명단 출력</button>')
$printBind='  $("[data-outing-print]")?.addEventListener("click",()=>{'
if(-not $g.Contains($printBind)){throw 'outing action bind anchor not found'}
$g=$g.Replace($printBind,'  $("[data-outing-teacher-add]")?.addEventListener("click",openDormOutingTeacherEditor);`n'+$printBind)

# 5) Exact CSS source fixes.
# Privacy: remove broad score-statistic blur; keep only student number/name inside the student button masked.
$c=$c.Replace('.privacy-demo-mode .internal-ranking-row span,`n.privacy-demo-mode .internal-ranking-row b,`n.privacy-demo-mode .internal-ranking-row strong,','')
$extraCss=@'

/* __UEP_SOURCE_FIX_08094__ */
.privacy-demo-mode .internal-ranking-row .score-stat-student b,
.privacy-demo-mode .internal-ranking-row .score-stat-student span{filter:blur(7px)!important;user-select:none!important}
.privacy-demo-mode .internal-ranking-row>strong,
.privacy-demo-mode .internal-ranking-row>span:not(.score-stat-student),
.privacy-demo-mode .internal-ranking-row>em,
.privacy-demo-mode .internal-ranking-row>small{filter:none!important;opacity:1!important;text-shadow:none!important}
.duty-calendar-meal-list article{display:grid!important;grid-template-columns:78px minmax(0,1fr) auto!important;align-items:start!important;gap:10px!important;height:auto!important;min-height:0!important}
.duty-calendar-meal-list .duty-meal-menu-full{display:flex!important;flex-wrap:wrap!important;gap:5px 10px!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.55!important}
.duty-calendar-meal-list .duty-meal-menu-full i{font-style:normal!important;white-space:normal!important}
.approval-explorer{min-height:0!important;grid-template-columns:minmax(280px,.72fr) minmax(420px,1.28fr)!important}
.approval-nav{gap:4px!important;max-height:calc(100vh - 185px)!important}
.approval-nav-row{gap:2px!important;padding:8px 11px!important;border-radius:10px!important;min-height:0!important}
#drawer .approval-nav-row b{font-size:14px!important;line-height:1.25!important}
#drawer .approval-nav-row span{font-size:11px!important;line-height:1.35!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
.approval-detail{gap:8px!important;min-height:0!important;padding:17px!important}
.approval-detail section{padding:11px 13px!important}
#drawer .approval-detail section b{font-size:13px!important}
#drawer .approval-detail section p{margin:5px 0 0!important;font-size:15px!important;line-height:1.55!important}
.dorm-outing-teacher-dialog{max-width:760px!important}.dorm-outing-editor-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.dorm-outing-editor-grid label{display:grid;gap:6px}.dorm-outing-editor-grid .wide{grid-column:1/-1}@media(max-width:760px){.dorm-outing-editor-grid{grid-template-columns:1fr}.dorm-outing-editor-grid .wide{grid-column:auto}}
'@
if($c -notmatch '__UEP_SOURCE_FIX_08094__'){$c += $extraCss}

Set-Content $gyo $g -Encoding UTF8 -NoNewline
Set-Content $css $c -Encoding UTF8 -NoNewline
Set-Content $main $m -Encoding UTF8 -NoNewline
Set-Content $pre $p -Encoding UTF8 -NoNewline
Set-Content $google $d -Encoding UTF8 -NoNewline
$jp=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$jp.version='0.80.94';$jp|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8

node --check $gyo;if($LASTEXITCODE-ne 0){throw 'gyomuon syntax failed'}
node --check $main;if($LASTEXITCODE-ne 0){throw 'main syntax failed'}
node --check $pre;if($LASTEXITCODE-ne 0){throw 'preload syntax failed'}
node --check $google;if($LASTEXITCODE-ne 0){throw 'google-data syntax failed'}
$vg=Get-Content $gyo -Raw;$vd=Get-Content $google -Raw;$vm=Get-Content $main -Raw;$vp=Get-Content $pre -Raw
if($vd -notmatch 'legacySelectedSubjectRows'){throw 'selection merge missing'}
if($vd -notmatch '학기간 중복 신청'){throw 'duplicate validator missing'}
if($vd -notmatch '과학계열 과목 위계 위반'){throw 'science hierarchy validator missing'}
if($vg -notmatch 'openDormOutingTeacherEditor'){throw 'outing teacher UI missing'}
if($vm -notmatch 'saveDormOuting'){throw 'outing writer missing'}
if($vp -notmatch 'dormOuting:save'){throw 'outing preload bridge missing'}
if((Get-Content $css -Raw)-notmatch '__UEP_SOURCE_FIX_08094__'){throw 'source CSS fixes missing'}
Write-Host 'UEP 0.80.94 source-level fixes applied.'
