# UEP 0.81.35 Structural Runtime Map — Owner Functions

Generated from the shipped `v0.81.35` runtime. This map is the required reference before 0.81.36 source-level repair.

## function calendarDayTone

```js
function calendarDayTone(key) {
  const date = new Date(`${key}T12:00:00`);
  const weekday = date.getDay();
  const holiday = attendanceIsSchoolHoliday(key);
  return {
    holiday,
    saturday: weekday === 6 && !holiday,
    sunday: weekday === 0 && !holiday,
    className: holiday ? "holiday" : weekday === 6 ? "saturday" : weekday === 0 ? "sunday" : "weekday",
  };
}
```

## function calendarMarkup

```js
function calendarMarkup(showMode = true) {
  if (state.calendarMode === "week") return weeklyCalendarMarkup(showMode);
  const anchor = new Date(`${calendarSelectedDate || dateKey(today)}T12:00:00`);
  const y = anchor.getFullYear(),
    m = anchor.getMonth(),
    first = new Date(y, m, 1),
    start = new Date(y, m, 1 - first.getDay());
  const filterButtons = `<div class="calendar-filters"><button class="${calendarFilter==="all"?"active":""}" data-calendar-filter="all">전체</button><button class="${calendarFilter==="school"?"active":""}" data-calendar-filter="school">학교</button><button class="${calendarFilter==="program"?"active":""}" data-calendar-filter="program">프로그램</button><button class="${calendarFilter==="personal"?"active":""}" data-calendar-filter="personal">개인</button><button class="${calendarFilter==="pending"?"active":""}" data-calendar-filter="pending">미확정</button></div>`;
  const weekdayHeads = ["일", "월", "화", "수", "목", "금", "토"];
  let html = `<div class="calendar-view-toolbar ${showMode ? "" : "mode-in-head"}">${showMode ? '<div class="calendar-mode"><button class="active" data-calendar-mode="month">월간</button><button data-calendar-mode="week">주간</button></div>' : ""}<div class="calendar-toolbar"><button data-calendar-month-shift="-1" aria-label="이전 달">‹</button><div><small>MONTHLY SCHOOL CALENDAR</small><h3>${y}년 ${m + 1}월</h3></div><button data-calendar-month-shift="1" aria-label="다음 달">›</button></div><button class="calendar-today-button" data-calendar-today>오늘</button></div>${filterButtons}<div class="calendar-month-layout"><div class="mini-calendar compact-month">${weekdayHeads.map((x, index) => `<div class="cal-cell cal-head ${index===0?"sunday":index===6?"saturday":""}">${x}</div>`).join("")}`;
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const day = d.getDate(),
      key = dateKey(d),
      events = schoolEventsForDate(key).filter(calendarEventMatchesFilter),
      selected = key === calendarSelectedDate;
    const tone = calendarDayTone(key);
    html += `<div class="cal-cell ${tone.className} ${key === dateKey(today) ? "today" : ""} ${selected ? "selected" : ""} ${d.getMonth() === m ? "current-month" : "outside-month"}"><button class="cal-day-button" data-calendar-date="${key}"><span>${day}</span>${tone.holiday?'<em>공휴일</em>':""}</button>${events.slice(0, 3).map((event) => {const kind=calendarEventVisualKind(event); return `<div class="cal-event-wrap"><button class="cal-event kind-${kind} ${calendarEventIsPending(event)?"pending":""}" data-school-event="${escapeHtml(event.id)}" title="${escapeHtml(event.detail)}"><time>${escapeHtml(event.time || "종일")}</time><span>${escapeHtml(calendarShortTitle(calendarDisplayTitle(event), 22))}</span></button></div>`;}).join("")}${events.length > 3 ? `<button class="cal-more" data-calendar-date="${key}">＋${events.length - 3}개 더보기</button>` : ""}</div>`;
  }
  return html + `</div>${showMode ? calendarSelectedDayMarkup() : ""}</div>`;
}
```

## function schoolEventsForDate

```js
function schoolEventsForDate(key) {
  return allSchoolEvents().filter((event) => {
    const start = String(event.date || "");
    const end = String(event.endDate || event.date || "");
    return start && key >= start && key <= end;
  });
}
```

## function allSchoolEvents

```js
function allSchoolEvents() {
  const manualRows = Array.isArray(state.settings?.manualCalendar) ? state.settings.manualCalendar : [];
  const manual = manualRows.map((row, index) => ({
    id: `manual-${index}`,
    date: row[0],
    target: row[1],
    time: row[2],
    place: row[3],
    title: row[4],
    owner: row[5],
    detail: `대상: ${row[1]} / 시간: ${row[2]} / 장소: ${row[3]} / 프로그램명: ${row[4]} / 부서·담당자: ${row[5]}`,
    source: "직접 붙여넣기",
    type: /마감|제출|입찰|종료/.test(row.join(" ")) ? "마감" : /시험|방학|수련|학력평가/.test(row.join(" ")) ? "학사" : "업무",
  }));
  const connected = Array.isArray(readonlyCache?.schoolCalendar) ? readonlyCache.schoolCalendar : [];
  const connectedKeys=new Set(connected.map(x=>`${x.date}|${x.title}|${x.time||""}`));
  return [...connected, ...manual.filter(x=>!connectedKeys.has(`${x.date}|${x.title}|${x.time||""}`))];
}
```

## function dashboardTimetableAutoMode

```js
function dashboardTimetableAutoMode(){
  if(dashboardTimetableMode)return dashboardTimetableMode;
  const now=new Date(),minute=now.getHours()*60+now.getMinutes();
  const end=(now.getDay()===3)?(14*60+30):(16*60+30);
  return minute>=end?"night":"day";
}
```

## function dashboardTimetableHeaderControlsMarkup

```js
function dashboardTimetableHeaderControlsMarkup(){
  const mode=dashboardTimetableAutoMode();
  const dates=dashboardNightWeekDates(),first=dates[0],last=dates[4];
  const range=first&&last?`${first.getMonth()+1}/${first.getDate()}~${last.getMonth()+1}/${last.getDate()}`:"이번 주";
  return `<nav class="dashboard-timetable-header-controls"><button class="${mode==='day'?'active':''}" data-dashboard-timetable-mode="day">정규시간</button><button class="${mode==='night'?'active':''}" data-dashboard-timetable-mode="night">야간시간</button><span class="dashboard-tt-week-nav"><button data-dashboard-tt-week-shift="-1" aria-label="이전 주">‹</button><b>${range}</b><button data-dashboard-tt-week-shift="1" aria-label="다음 주">›</button></span></nav>`;
}
```

## function dashboardTimetablePanelMarkup

```js
function dashboardTimetablePanelMarkup(){
  const mode=dashboardTimetableAutoMode();
  return mode==='night'?dashboardNightWeekMarkup():dashboardPersonalWeekMarkup();
}
```

## function dashboardPersonalWeekMarkup

```js
function dashboardPersonalWeekMarkup(){
  const {week,days}=personalTimetableData();
  const status=schoolPeriodStatus(new Date());
  const todayIndex=Math.max(0,Math.min(4,(today.getDay()+6)%7));
  const maxPeriods=Math.max(7,Array.isArray(week)?week.length:0);
  if(!Array.isArray(week)||!week.some(row=>Array.isArray(row)&&row.some(Boolean))){
    return `<div class="uep-week-timetable-empty"><span>◷</span><b>내 주간시간표 연결 준비</b><small>컴시간 교사시간표가 연결되면 월~금 수업이 이곳에 표시됩니다.</small><button data-page="timetable">시간표 연결 확인</button></div>`;
  }
  const heads=(days?.length?days:["월","화","수","목","금"]).slice(0,5);
  const cells=[];
  for(let period=1;period<=maxPeriods;period+=1){
    cells.push(`<div class="uep-week-period"><b>${period}</b><small>${escapeHtml(periodTimeLabel(period)||"")}</small></div>`);
    for(let d=0;d<5;d+=1){
      const raw=week[period-1]?.[d]||"";
      const [subject,room,flag]=String(raw).split("|");
      const current=d===todayIndex&&status.index===period-1;
      const classColor=timetableClassColorClass(room);
      cells.push(`<button class="uep-week-class personal-order ${raw?"has-class":"is-empty"} ${classColor} ${current?"is-current":""} ${flag==="changed"?"is-changed":""}" data-page="timetable"><b>${escapeHtml(room||"-")}</b><small>${escapeHtml(subject||"")}</small>${current?'<i aria-label="현재 교시"></i>':''}${flag==="changed"?'<em>변동</em>':''}</button>`);
    }
  }
  return `<div class="uep-week-timetable"><div class="uep-week-corner">교시</div>${heads.map((day,i)=>`<div class="uep-week-head ${i===todayIndex?"today":""}"><b>${escapeHtml(String(day).replace(/요일/g,""))}</b></div>`).join("")}${cells.join("")}</div>`;
}
```

## function dashboardNightWeekMarkup

```js
function dashboardNightWeekMarkup(){
  const dates=dashboardNightWeekDates(),days=["월","화","수","목","금"],slots=[
    {key:"오후자습",label:"오후자습",time:schoolHourRange("오후자습")||"17:00~18:00"},
    {key:"야자1",label:"야자1",time:schoolHourRange("야자1")||"19:00~20:10"},
    {key:"야자2",label:"야자2",time:schoolHourRange("야자2")||"20:20~21:30"}
  ];
  const cells=[];
  slots.forEach(slot=>{
    cells.push(`<div class="dashboard-night-period"><b>${escapeHtml(slot.label)}</b><small>${escapeHtml(slot.time)}</small></div>`);
    dates.forEach((date,i)=>{
      const key=dateKey(date),isWed=i===2,holiday=attendanceIsSchoolHoliday(key);
      if(holiday){cells.push(`<div class="dashboard-night-cell closed holiday"><b>미운영</b><small>공휴일</small></div>`);return;}
      if(isWed){cells.push(`<div class="dashboard-night-cell closed"><b>-</b><small>야간 미운영</small></div>`);return;}
      const rows=dashboardNightAttendanceRows(key,slot.key),students=new Set(rows.map(attendanceStudentKey).filter(Boolean));
      const programs=dashboardAfterProgramsForDay(key).filter(p=>dashboardProgramNightSlot(p)===slot.key);
      const programCards=programs.map(p=>`<button class="dashboard-night-program-chip" data-dashboard-night-program="${escapeHtml(p.id||p.programId||"")}" data-dashboard-night-program-day="${key}"><b>${/야간심화/.test(`${p.afterType||""} ${p.title||""}`)?"야간심화":"방과후"}</b><span>${escapeHtml(p.actualTitle||p.title||"프로그램")}</span></button>`).join("");
      cells.push(`<div class="dashboard-night-cell ${students.size||programs.length?'active':'empty'}"><button class="dashboard-night-roster" data-dashboard-night-day="${key}" data-dashboard-night-slot="${escapeHtml(slot.key)}"><b>${students.size?`${students.size}명`:'-'}</b><small>${students.size?'자습인원 보기':'자습 자료 없음'}</small></button>${programCards}</div>`);
    });
  });
  return `<div class="dashboard-night-week"><div class="dashboard-night-corner">시간대</div>${days.map((d,i)=>`<div class="dashboard-night-head"><b>${d}</b><small>${dates[i]?`${dates[i].getMonth()+1}/${dates[i].getDate()}`:""}</small></div>`).join("")}${cells.join("")}</div>`;
}
```

## function settingsView

```js
function settingsView() {
  const connected = Boolean(readonlyCache?.students?.length && !googleConnectionError);
  const credentialReady = Boolean(googleConnectionStatus?.ok);
  const googleStatus = connected ? ["구글시트 연결됨", ""] : googleConnectionError ? ["권한·연결 오류", "error"] : credentialReady ? ["권한 확인 필요", "warn"] : ["인증 필요", "warn"];
  const connectionRows = [
    ["학생정보", readonlyCache?.students?.length], ["학사생", readonlyCache?.dormStudents?.length], ["학사외출", readonlyCache?.dormOutings?.length],
    ["성적", readonlyCache?.scoreRecords?.length], ["수능최저", readonlyCache?.admissionMinimums?.length], ["대학입결", readonlyCache?.admissionCuts?.length],
  ];
  const neisStatus = neisData?.ok ? (neisData.offline ? ["저장자료 표시", "warn"] : ["실시간 연결됨", ""]) : neisLoading ? ["불러오는 중", "warn"] : ["연결 확인", "error"];
  const profile=currentUserProfile(), access=currentTeacherAccessScope();

  const header=(title,desc,badge)=>`${settingsTabsMarkup()}<section class="settings-section-head"><div><small>UEP SETTINGS</small><h2>${title}</h2><p>${desc}</p></div><span>${badge}</span></section>`;

  if(settingsPanel==="security") return `<div class="module-page settings-v064 settings-final">
    ${header("사용자·보안","계정 승인과 역할, 민감정보 보호를 관리합니다.","관리자·학년부장")}
    <article class="setting-card sensitive-security-settings"><div><small>PRIVACY · SECURITY</small><h3>🔒 민감정보 보안</h3><p>교육비지원 · 요보호학생 · 위기학생 상세정보의 열람 비밀번호를 관리합니다.</p><p class="settings-help">상세정보는 1차 블라인드 후 비밀번호 인증을 거쳐 확인하며 인증은 10분 동안 유지됩니다.</p></div><div class="sensitive-security-status"><b>${sensitivePasswordConfigured()?'비밀번호 설정됨':'비밀번호 설정 필요'}</b><button type="button" class="btn primary" data-sensitive-password-set>${sensitivePasswordConfigured()?'비밀번호 변경':'비밀번호 설정'}</button><button type="button" class="btn secondary" data-sensitive-lock>즉시 잠금</button></div></article>
    <article class="setting-card role-settings-card"><div class="connection-title"><div><h3>사용자·권한 프로필</h3><p>현재 로그인 사용자의 역할과 담당 범위를 확인합니다.</p></div><span class="state">${escapeHtml(currentRoleDisplay())}</span></div><div class="user-profile-summary"><div><small>사용자</small><b>${escapeHtml(profile.name||"미설정")}</b></div><div><small>부서</small><b>${escapeHtml(profile.department||"미설정")}</b></div><div><small>조회 범위</small><b>${escapeHtml(access.label)}</b></div></div><p class="safe-note">담임은 학년 자료를 조회할 수 있고 타반 연락정보는 기본 마스킹합니다. 성적·응답·정규화 원천자료는 UEP에서 직접 수정하지 않습니다.</p></article>
    <article class="setting-card access-control-card"><div class="connection-title"><div><h3>사용자·권한 승인</h3><p>01_사용자계정의 사용여부·역할·담당학년·담임반을 기준으로 로그인과 조회범위를 제어합니다.</p></div><span class="state connected">계정표 승인</span></div><div class="connection-actions"><button class="btn primary" type="button" data-access-control>권한 승인 제어판</button></div><p class="safe-note">신규 사용자 등록은 표준 구글시트에서 관리하고 UEP에서는 승인상태와 역할을 조정합니다.</p></article>
  </div>`;

  if(settingsPanel==="operations") return `<div class="module-page settings-v064 settings-final">
    ${header("알림·운영","실제 운영 중 필요한 알림과 오류 신고만 관리합니다.","운영 설정")}
    <article class="setting-card mail-alert-settings"><h3>메일 알림</h3><p>필요한 운영 알림만 선택합니다. 발송 기준 시각은 일과운영시간과 연동합니다.</p><div class="mail-alert-grid">${[["dormOuting","학사외출"],["afternoonStudy","오후자습 현황"],["night1","야자1 현황"],["night2","야자2 현황"],["nightException","야간 이상상황"],["nightSummary","야간 종료 종합"]].map(([key,label])=>`<label><input type="checkbox" data-mail-alert="${key}" ${state.settings.mailAlerts?.[key]?"checked":""}> ${label}</label>`).join("")}</div><small>※ 실제 자동메일 발송은 연결된 UEP 데이터처리 메일 트리거가 이 설정값을 읽도록 연동됩니다.</small></article>
    <article class="setting-card issue-admin-card"><div class="connection-title"><div><h3>오류 신고 관리</h3><p>사용자가 저장한 오류 신고를 확인하고 처리 상태와 수정 버전을 기록합니다.</p></div><span class="state">${(state.issueReports||[]).filter(r=>r.status!=='fixed').length}건 처리 중</span></div><div class="connection-actions"><button class="btn secondary" data-open-issue-report>새 신고 작성</button><button class="btn primary" data-open-issue-manager>신고 관리</button></div><p class="safe-note">현재는 PC 로컬 저장 방식이며 중앙 수집은 관리자 서버 또는 관리 시트 연결 단계에서 확장합니다.</p></article>
  </div>`;

  if(settingsPanel==="system") return `<div class="module-page settings-v064 settings-final">
    ${header("시스템 관리","연결상태·배포 준비·업데이트처럼 평소에는 건드리지 않는 관리 도구입니다.","관리자 점검")}
    <article class="setting-card health-check-card"><div class="connection-title"><div><h3>연결 진단</h3><p>필수 탭과 주요 데이터가 정상적으로 읽히는지 한 번에 확인합니다.</p></div><span class="state ${googleConnectionError?'error':'connected'}">${googleConnectionError?'확인 필요':'정상'}</span></div><div class="health-list">${connectionHealthRows().map(row=>`<div><span>${row.ok?'✓':'!'}</span><b>${row.name}</b><small>${row.ok?'인식':'확인 필요'}</small></div>`).join('')}</div>${googleConnectionError?`<div class="connection-error-detail"><b>최근 오류</b><span>${escapeHtml(googleConnectionError)}</span></div>`:''}<div class="connection-actions"><button class="btn primary" data-run-health-check>다시 진단</button></div></article>
    <article class="setting-card"><h3>조회 연결 상태</h3><p>UEP 기준 구글시트에 실제 자료가 있는 항목을 확인합니다.</p>${connectionRows.map(([label,count]) => `<div class="setting-row"><span><b>${label}</b><small>${Number(count || 0).toLocaleString()}건 인식</small></span><span>${count ? "연결" : "자료 확인"}</span></div>`).join("")}</article>
    <article class="setting-card release-readiness-card"><div class="connection-title"><div><h3>배포 준비 점검</h3><p>교사용 배포 전에 필수 연결·계정·권한·업데이트·API 보호 상태를 확인합니다.</p></div><span class="state ${releaseReadinessRows().every(row=>row.ok)?'connected':'warn'}">${releaseReadinessRows().every(row=>row.ok)?'배포 준비':'확인 필요'}</span></div><div class="health-list release-health-list">${releaseReadinessRows().map(row=>`<div><span>${row.ok?'✓':'!'}</span><b>${escapeHtml(row.name)}</b><small>${escapeHtml(row.note)}</small></div>`).join('')}</div><div class="connection-actions"><button class="btn primary" type="button" data-access-control>권한 점검</button><button class="btn secondary" data-run-health-check>연결 다시 진단</button></div><p class="safe-note">자동 설치·롤백은 현재 비활성화되어 있습니다.</p></article>
    <article class="setting-card update-settings-card"><div class="connection-title"><div><h3>UEP 업데이트</h3><p>현재 버전 ${APP_VERSION} · 담임 배포판부터는 앱 내부 업데이트 채널을 사용합니다.</p></div><span class="state connected">업데이트 확인 작동</span></div><form id="updateSettingsForm" class="update-settings-form"><input id="updateManifestUrl" type="url" value="${escapeHtml(state.settings.updateManifestUrl||'')}" placeholder="https://.../uep-update.json"><button class="btn secondary" type="submit">주소 저장</button><button class="btn primary" type="button" data-check-update>업데이트 확인</button></form><div class="update-roadmap"><span class="done">① 동일 빌드</span><span class="done">② 버전 확인</span><span class="done">③ 업데이트 채널</span><span class="done">④ 앱 내부 적용·롤백</span></div><div id="updateCheckResult" class="update-check-result"><small>새 버전 확인 → 무결성 검증 → 앱 내부 적용 → 실패 시 이전판 복구 방식입니다.</small></div></article>
    <article class="setting-card"><div class="connection-title"><div><h3>UEP 정보</h3><p>UNHO Education Platform · Connect Data. Grow Students.</p></div><span class="state">v${APP_VERSION}</span></div><div class="setting-row"><span><b>기준 데이터</b><small>표준 구글시트 연결</small></span><span>${escapeHtml(readonlyCache?.sourceName||'연결 확인')}</span></div></article>
  </div>`;

  // 01 기본·연결 — 초기 설치와 연결 문제가 있을 때만 사용하는 영역
  return `<div class="module-page settings-v064 settings-final">
    ${header("기본·연결","초기 설치와 데이터 연결, NEIS 연동을 관리합니다.","학교 공용")}
    <article class="setting-card setup-wizard-card"><div><small>UEP SETUP GUIDE</small><h3>초기 설정 마법사</h3><p>처음 설치하거나 학교·계정·연결 정보를 다시 잡을 때만 사용합니다. 기존 설정은 유지됩니다.</p></div><button class="btn primary" type="button" data-setup-wizard>설정 마법사 시작</button></article>
    <article class="setting-card connection-overview"><div class="connection-title"><div><h3>UEP 구글시트 연결</h3><p>표준 구글시트를 조회하고 허용된 운영정보만 안전하게 양방향 수정합니다.</p></div><span class="state ${googleStatus[1]}">${googleStatus[0]}</span></div><div class="readonly-rule"><b>현재 기준</b><span>${escapeHtml(readonlyCache?.sourceName || "2026_운호고_UEP_DB_v1.0_Dev")} · 학생ID 기준 결합</span></div>${googleConnectionError ? `<div class="connection-error-detail"><b>오류 내용</b><span>${escapeHtml(googleConnectionError)}</span></div>` : ""}<div class="connection-actions"><button class="btn secondary" data-oauth-guide>${credentialReady ? "서비스 계정 JSON 변경" : "서비스 계정 JSON 등록"}</button><button class="btn primary" data-readonly-sync>지금 새로고침</button></div><p class="safe-note">서비스 계정 JSON은 Windows 보안 저장소에 암호화하여 보관합니다.</p></article>
    <article class="setting-card neis-settings-card"><div class="connection-title"><div><h3>NEIS 급식·시간표</h3><p>학교명으로 학교코드를 찾아 급식과 학급 시간표를 자동 조회합니다.</p></div><span class="state ${neisStatus[1]}">${neisStatus[0]}</span></div><form id="neisSettingsForm" class="neis-settings-form"><label>학교명<input id="neisSchoolName" required value="${escapeHtml(state.settings.neis.schoolName)}"></label><label>학년<select id="neisGrade">${[1,2,3].map((value) => `<option ${String(value) === String(state.settings.neis.grade) ? "selected" : ""}>${value}</option>`).join("")}</select></label><label>반<select id="neisClass">${Array.from({length:9},(_,index)=>index+1).map((value) => `<option ${String(value) === String(state.settings.neis.classNo) ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="neis-key-label">인증키<input id="neisApiKey" type="password" autocomplete="off" placeholder="${state.settings.neis.apiKeyConfigured?"등록됨 · 변경할 때만 입력":"발급받은 인증키 입력"}"></label><label class="neis-key-toggle"><input id="neisUseApiKey" type="checkbox" ${state.settings.neis.useApiKey?"checked":""}> 인증키 사용</label><button class="btn primary">저장 후 불러오기</button></form>${neisError ? `<div class="connection-error-detail"><b>${neisData?.offline ? "저장자료 안내" : "연결 오류"}</b><span>${escapeHtml(neisError)}</span></div>` : ""}<div class="connection-actions"><button class="btn secondary" data-neis-refresh>NEIS 다시 불러오기</button><button class="btn secondary" data-neis-clear-cache>저장자료 지우기</button></div><p class="safe-note">실시간 연결이 실패하면 마지막 정상 조회자료를 저장자료로 구분해 표시합니다.</p></article>
  </div>`;
}
```

## function openDashboardStudentStatus

```js
function openDashboardStudentStatus(kind, selectedDate=""){
  const defaultDate=kind==='night'?(()=>{const d=new Date(today);d.setDate(today.getDate()-1);return dateKey(d);})():dateKey(today);
  const basisDate=selectedDate||defaultDate;
  const official=(readonlyCache?.officialAttendance||[]).filter(r=>String(r.date||r.day||'').slice(0,10)===basisDate).map(r=>({...r,dashboardStatusType:'공결'}));
  const late=(readonlyCache?.lateAttendance||[]).filter(r=>String(r.date||r.day||'').slice(0,10)===basisDate).map(r=>({...r,dashboardStatusType:'지각'}));
  const gradeReportRows=filterRowsForDashboardStatus(dashboardReportStatusRows());
  const allReportGroups=dashboardReportGroups(gradeReportRows);
  const reportGroupWithRows=(group,rows)=>({...group,rows,programs:[...new Set(rows.map(row=>String(row.programTitle||row.programName||row.title||row.activityName||'프로그램명 확인 필요').trim()).filter(Boolean))]});
  const submittedGroups=allReportGroups.filter(group=>dashboardReportGroupState(group).state==="complete").map(group=>reportGroupWithRows(group,group.rows));
  const progressGroups=allReportGroups.filter(group=>dashboardReportGroupState(group).state==="progress").map(group=>reportGroupWithRows(group,group.rows));
  const missingGroups=allReportGroups.filter(group=>dashboardReportGroupState(group).state==="missing").map(group=>reportGroupWithRows(group,group.rows));
  const configs={
    late:{title:'공결·지각 학생',page:'attendance',rows:[...official,...late],attendance:true,dateSelectable:true},
    night:{title:'야자 참여 학생',page:'attendance',rows:(readonlyCache?.nightAttendance||readonlyCache?.attendance||[]).filter(r=>String(r.date||r.day||'').slice(0,10)===basisDate&&nightRecordIsAttendance(r)),dateSelectable:true},
    submitted:{title:'선택활동 보고서 제출완료 학생',page:'programs',rows:submittedGroups,report:true,reportGrouped:true},
    progress:{title:'선택활동 보고서 제출중 학생',page:'programs',rows:progressGroups,report:true,reportGrouped:true},
    report:{title:'선택활동 보고서 미제출 학생',page:'programs',rows:missingGroups,report:true,reportGrouped:true},
    outing:{title:'오늘 학사 외출 학생',page:'attendance',rows:(readonlyCache?.dormOutings||readonlyCache?.outings||[]).filter(r=>String(r.date||r.day||'').slice(0,10)===basisDate)},
    absent:{title:'오늘 프로그램 불참 학생',page:'programs',rows:(readonlyCache?.programAttendance||[]).filter(r=>String(r.date||r.day||'').slice(0,10)===basisDate&&/불참|결석|미참여/.test(String(r.status||r.result||'')))}
  };
  const cfg=configs[kind]||configs.late;
  const scoped=cfg.reportGrouped?(cfg.rows||[]):filterRowsForDashboardStatus(cfg.rows||[]);
  const rows=cfg.reportGrouped?scoped:(cfg.report?dashboardReportGroups(scoped):scoped.map(normalizeDashboardStudentRow));
  const boardRows=cfg.report?rows:scoped;
  const studentGroups=dashboardStatusStudentGroups(boardRows,{report:Boolean(cfg.report),attendance:Boolean(cfg.attendance)});
  const scope=dashboardGradeScope();
  $('#drawerKicker').textContent='STUDENT STATUS';
  $('#drawerTitle').textContent=cfg.title;
  $('#drawer').classList.add('dashboard-status-expanded');
  const dateControl=cfg.dateSelectable?`<label class="dashboard-status-date-picker"><span>조회 날짜</span><input type="date" value="${escapeHtml(basisDate)}" data-dashboard-status-date></label>`:'';
  $('#drawerBody').innerHTML=`<div class="dashboard-student-status-popup dashboard-status-board-popup">${dateControl}<div class="history-summary ${studentGroups.length?'warn':''}"><span><small>기준일</small><b>${cfg.dateSelectable?basisDate:dateKey(today)}</b></span><span><small>학생 수</small><b>${studentGroups.length}명</b></span><span><small>조회 범위</small><b>${escapeHtml(scope.label)}</b></span></div><p class="dashboard-status-guide">1~9반을 한 화면에서 비교합니다. 담임반은 <b>내 반</b>으로 표시되며, 다른 반도 동일하게 조회할 수 있습니다.</p>${dashboardStatusBoardMarkup(boardRows,kind,{report:Boolean(cfg.report),attendance:Boolean(cfg.attendance)})}<div class="drawer-actions"><button class="btn primary" data-dashboard-status-page="${cfg.page}">해당 메뉴 전체조회</button></div></div>`;
  $('#drawer').classList.remove('hidden');$('#drawerBackdrop').classList.remove('hidden');
  $('#drawerBody [data-dashboard-status-date]')?.addEventListener('change',event=>openDashboardStudentStatus(kind,event.target.value||defaultDate));
  const byKey=new Map(studentGroups.map(row=>[String(row.key),row]));
  $$('#drawerBody [data-dashboard-board-student]').forEach(btn=>btn.onclick=()=>{
    const group=byKey.get(String(btn.dataset.dashboardBoardStudent));if(!group)return;
    if(cfg.report){
      const reportState=dashboardReportGroupState(group);
      const stateLabel=kind==='report'?'미제출':kind==='progress'?'제출중':'제출완료';
      $('#drawerTitle').textContent=`${group.studentNo||''} ${group.name} · ${stateLabel}`;
      const programRows=(group.rows||[]).map(row=>{
        const report=row.reportRef||((row.reportId)?findConnectedReport(row.reportId,group.studentRef):null);
        const canView=Boolean(row.submitted===true&&report);
        return `<div class="dashboard-report-program-row"><b>${escapeHtml(row.programTitle||row.programName||row.title||'프로그램')}</b><span class="${row.submitted===true?'state-positive':'state-warn'}">${row.submitted===true?'제출 완료':'제출 필요'}</span>${canView?`<button class="btn secondary compact" data-dashboard-report-view="${escapeHtml(report.id||row.reportId||'')}">보고서 보기</button>`:''}</div>`;
      }).join('');
      $('#drawerBody').innerHTML=`<div class="dashboard-report-student-detail"><div class="history-summary"><span><small>학번</small><b>${escapeHtml(group.studentNo||'-')}</b></span><span><small>학급</small><b>${escapeHtml(group.classLabel||'-')}</b></span><span><small>제출 진행</small><b>${reportState.submitted}/${reportState.total}</b></span></div><div class="drawer-section"><h4>보고서 대상 프로그램</h4><div class="dashboard-report-program-list">${programRows}</div></div><div class="drawer-actions"><button class="btn secondary" data-dashboard-status-back>반별 현황으로 돌아가기</button><button class="btn primary" data-dashboard-status-page="programs">프로그램 전체조회</button></div></div>`;
      $('#drawerBody [data-dashboard-status-back]').onclick=()=>openDashboardStudentStatus(kind,selectedDate);
      $('#drawerBody [data-dashboard-status-page]').onclick=()=>{closeDrawer();navigate('programs');};
      $$('#drawerBody [data-dashboard-report-view]').forEach(button=>button.onclick=()=>openSubmittedProgramReport(button.dataset.dashboardReportView,group.studentRef));
      return;
    }
    const student=group.studentRef||resolveDashboardStudent(group);
    const index=(readonlyCache?.students||[]).findIndex(item=>item===student||String(item.id||item.studentId||item.studentNo)===String(student?.id||student?.studentId||student?.studentNo));
    if(index>=0)openStudentDrawer(index);
  });
  $$('#drawerBody [data-dashboard-class-card]').forEach(card=>card.onclick=event=>{
    if(event.target.closest('[data-dashboard-board-student]'))return;
    const classNo=card.dataset.dashboardClassCard;
    $$('#drawerBody [data-dashboard-class-card]').forEach(item=>item.classList.toggle('is-focused',item.dataset.dashboardClassCard===classNo));
  });
  $$('#drawerBody [data-dashboard-status-page]').forEach(btn=>btn.onclick=()=>{closeDrawer();navigate(btn.dataset.dashboardStatusPage);});
}
```

## function attendanceView

```js
function attendanceView() {
  const officialRows = readonlyCache?.officialAttendance || [];
  const lateRows = readonlyCache?.lateAttendance || [];
  const nightRows = readonlyCache?.nightAttendance || readonlyCache?.attendance || [];
  if(attendanceMode==="night"&&!isNightOperatingDay(attendanceViewDate)){
    attendanceViewDate=nearestNightOperatingDay(attendanceViewDate);
    nightViewMonth=attendanceViewDate.slice(0,7);
  }
  const tabs = `<div class="attendance-tabs attendance-tabs-four"><button data-attendance-mode="official" class="${attendanceMode === "official" ? "active" : ""}">공결</button><button data-attendance-mode="late" class="${attendanceMode === "late" ? "active" : ""}">지각</button><button data-attendance-mode="night" class="${attendanceMode === "night" ? "active" : ""}">야자출결</button><button data-attendance-mode="statistics" class="${attendanceMode === "statistics" ? "active" : ""}">통계</button></div>`;
  if(attendanceMode === "statistics") return `<div class="module-page">${tabs}${attendancePersonalStatisticsView(officialRows,lateRows,nightRows)}</div>`;
  const genericRows = (rows, mode) => {
    if (!rows.length) return `<div class="empty-state data-card"><b>선택일에 ${mode} 기록이 없습니다.</b><span>${escapeHtml(attendanceViewDate)} 기준</span></div>`;
    return `<div class="data-card" id="attendanceRows"><div class="data-head attendance-detail-grid"><span>일자</span><span>학번</span><span>학생</span><span>구분</span><span>시간·교시</span><span>사유·상태</span><span>확인</span></div>${rows.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(row => `<div class="data-row attendance-detail-grid attendance-row" data-search="${escapeHtml([row.date,row.studentNo,row.name,row.className,row.type,row.detail,row.reason,row.result].join(" ").toLowerCase())}"><time>${escapeHtml(row.date || "-")}</time><b>${escapeHtml(row.studentNo || "-")}</b><span>${escapeHtml(row.name || "-")} · ${escapeHtml(row.className || "-")}반</span><span>${escapeHtml(row.type || mode)}</span><span>${escapeHtml(row.time || row.period || "-")}</span><span title="${escapeHtml(row.sourceTab?`출처: ${row.sourceTab}`:"")}">${escapeHtml(row.reason || row.detail || row.result || "-")}${row.sourceTab?`<small class="attendance-source-tab">${escapeHtml(row.sourceTab)}</small>`:""}</span><span class="state ${String(row.result || row.guidance).includes("필요") || /결석|미입실|미제출/.test(String(row.result)) ? "warn" : ""}">${escapeHtml(row.result || row.guidance || "확인")}</span></div>`).join("")}</div>`;
  };
  if (attendanceMode === "official") {
    const selectedDay = officialRows.filter(row => row.date === attendanceViewDate);
    const classes = Array.from({length:9},(_,i)=>String(i+1));
    const classSummary = classes.map(classNo=>{
      const rows=selectedDay.filter(row=>String(row.className||row.classNo||"")===classNo);
      return {classNo,records:rows.length,students:new Set(rows.map(attendanceStudentKey)).size};
    });
    const classFiltered = officialClassFilter === "all" ? selectedDay : selectedDay.filter(row=>String(row.className||row.classNo||"")===String(officialClassFilter));
    const rosterStudents=(readonlyCache?.students||[]).filter(student=>officialClassFilter==="all"||String(classNumberOf(student))===String(officialClassFilter)).sort((a,b)=>String(a.studentNo||"").localeCompare(String(b.studentNo||"")));
    const studentOptions=rosterStudents;
    if(officialStudentFilter!=="all"&&!studentOptions.some(row=>attendanceStudentKey(row)===officialStudentFilter))officialStudentFilter="all";
    const selected = officialStudentFilter === "all" ? classFiltered : classFiltered.filter(row=>attendanceStudentKey(row)===officialStudentFilter);
    const cumulativeRows=officialStudentFilter==="all"?[]:officialRows.filter(row=>attendanceStudentKey(row)===officialStudentFilter).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const classCards=`<div class="night-class-overview official-class-overview"><button data-official-class="all" class="${officialClassFilter==="all"?"active":""}"><small>전체</small><b>${selectedDay.length}<em>기록</em></b><span>${new Set(selectedDay.map(attendanceStudentKey)).size}명</span></button>${classSummary.map(item=>`<button data-official-class="${item.classNo}" class="${officialClassFilter===item.classNo?"active":""}"><small>${item.classNo}반</small><b>${item.records}<em>기록</em></b><span>${item.students}명</span></button>`).join("")}</div>`;
    const studentSelect=`<label class="official-student-filter">개인별 조회<select id="officialStudentFilter"><option value="all">${officialClassFilter==="all"?"전체 학생":"선택 반 전체"}</option>${studentOptions.map(row=>`<option value="${escapeHtml(attendanceStudentKey(row))}" ${officialStudentFilter===attendanceStudentKey(row)?"selected":""}>${escapeHtml(row.studentNo||"")} ${escapeHtml(row.name||"")}</option>`).join("")}</select></label>`;
    const canManageOfficial=currentRoleId()==="admin";
    const officialTable=(rows,emptyLabel="공결 기록이 없습니다.")=>rows.length?`<div class="data-card" id="attendanceRows"><div class="data-head attendance-detail-grid official-detail-grid${canManageOfficial?'':' readonly'}"><span>일자</span><span>학번</span><span>학생</span><span>구분</span><span>시간·교시</span><span>사유·상태</span>${canManageOfficial?'<span>관리</span>':''}</div>${rows.map(row=>`<div class="data-row attendance-detail-grid official-detail-grid attendance-row${canManageOfficial?'':' readonly'}" data-search="${escapeHtml([row.date,row.studentNo,row.name,row.className,row.type,row.reason,row.result].join(" ").toLowerCase())}"><time>${escapeHtml(row.date||"-")}</time><b>${escapeHtml(row.studentNo||"-")}</b><span>${escapeHtml(row.name||"-")} · ${escapeHtml(row.className||"-")}반</span><span>${escapeHtml(row.type||"공결")}</span><span>${escapeHtml(row.period||"하루 전체")}</span><span>${escapeHtml(row.reason||"-")}<small class="attendance-source-tab">${escapeHtml(row.sourceTab||"30_공결기록")}</small></span>${canManageOfficial?`<span class="official-row-actions"><button class="link-button" data-official-edit="${escapeHtml(row.id)}">수정</button><button class="link-button danger" data-official-delete="${escapeHtml(row.id)}">삭제</button></span>`:''}</div>`).join("")}</div>`:`<div class="empty-state data-card"><b>${escapeHtml(emptyLabel)}</b></div>`;
    const selectedStudent=officialStudentFilter==="all"?null:rosterStudents.find(row=>attendanceStudentKey(row)===officialStudentFilter);
    const cumulativeMarkup=officialStudentFilter!=="all"?`<div class="section-title-row official-cumulative-title"><div><small>CUMULATIVE · PERSONAL</small><h3>개인 누적 공결 현황</h3><p>${cumulativeRows.length}건 · ${escapeHtml(selectedStudent?.studentNo||cumulativeRows[0]?.studentNo||"")} ${escapeHtml(selectedStudent?.name||cumulativeRows[0]?.name||"")}</p></div></div>${officialTable(cumulativeRows,"누적 공결 기록이 없습니다.")}`:"";
    return `<div class="module-page">${tabs}${attendanceDateControls("공결 조회일",canManageOfficial?'<button class="btn primary" id="officialAttendanceAdd">＋ 공결 등록</button>':'')}<section class="attendance-dashboard-head"><div><small>OFFICIAL ATTENDANCE · ${attendanceViewDate}</small><h3>공결 현황</h3><p>날짜별 전체 현황에서 반별·개인별로 조회하며, 등록·수정·삭제 내용은 기본정보 연결시트에 즉시 반영합니다.</p></div><div class="attendance-head-metrics"><span><b>${selectedDay.length}</b>선택일 기록</span><span><b>${new Set(selectedDay.map(attendanceStudentKey)).size}</b>선택일 학생</span><span><b>${officialRows.length}</b>전체 기록</span><span><b>${selectedDay.filter(x=>String(x.evidence).includes("미")).length}</b>증빙 확인</span></div></section>${classCards}<div class="toolbar official-toolbar">${studentSelect}<input class="search" id="attendanceSearch" placeholder="학번·이름·공결구분·사유 검색"><button class="btn secondary" id="attendanceSearchReset">검색 지우기</button><span class="state">기본정보 연결시트 · 30_공결기록</span></div>${officialTable(selected)}${cumulativeMarkup}</div>`;
  }

  if (attendanceMode === "late") {
    const selectedKey = attendanceViewDate;
    const allSelectedRows = lateRows.filter(row => row.date === selectedKey).sort((a,b)=>String(a.time).localeCompare(String(b.time)));
    const byStudent = new Map();
    lateRows.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).forEach(row => {
      const key = attendanceStudentKey(row);
      const current = byStudent.get(key) || { ...row, recordCount:0, totalMinutes:0, studentKey:key };
      current.recordCount += 1; current.totalMinutes += Number(row.minutes || 0);
      if (!current.date || String(row.date) >= String(current.date)) Object.assign(current, row);
      current.cumulativeCount = Math.max(Number(current.cumulativeCount || 0), Number(row.cumulativeCount || 0), current.recordCount);
      current.cumulativeMinutes = Math.max(Number(current.cumulativeMinutes || 0), current.totalMinutes);
      current.studentKey = key; byStudent.set(key, current);
    });
    const allCumulative = [...byStudent.values()].sort((a,b)=>Number(b.cumulativeCount)-Number(a.cumulativeCount) || Number(b.cumulativeMinutes)-Number(a.cumulativeMinutes));
    const selectedRows = lateClassFilter === "all" ? allSelectedRows : allSelectedRows.filter(row=>String(row.className)===String(lateClassFilter));
    const cumulative = lateClassFilter === "all" ? allCumulative : allCumulative.filter(row=>String(row.className)===String(lateClassFilter));
    const classSummary = Array.from({length:9},(_,i)=>String(i+1)).map(classNo=>{ const rows=lateRows.filter(row=>String(row.className)===classNo); const selectedStudents=new Set(allSelectedRows.filter(row=>String(row.className)===classNo).map(attendanceStudentKey)).size; return {classNo,selectedStudents,records:rows.length,students:new Set(rows.map(attendanceStudentKey)).size}; });
    const classCards = `<div class="night-class-overview late-class-overview"><button data-late-class="all" class="${lateClassFilter==="all"?"active":""}"><small>전체</small><b>${allSelectedRows.length}<em>선택일</em></b><span>누적 ${lateRows.length}건</span></button>${classSummary.map(item=>`<button data-late-class="${item.classNo}" class="${lateClassFilter===item.classNo?"active":""}"><small>${item.classNo}반</small><b>${item.selectedStudents}<em>선택일</em></b><span>${item.students}명 · 누적 ${item.records}건</span></button>`).join("")}</div>`;
    const selectedMarkup = selectedRows.length ? `<div class="data-card"><div class="data-head late-today-grid"><span>제출시각</span><span>학번</span><span>학생</span><span>반</span><span>지각시간</span><span>사유</span><span>지도상태</span></div>${selectedRows.map(row=>`<button class="data-row late-today-grid attendance-row history-row" data-late-student="${escapeHtml(attendanceStudentKey(row))}" data-late-record-id="${escapeHtml(row.id||'')}" data-search="${escapeHtml([row.studentNo,row.name,row.className,row.reason,row.guidance].join(" ").toLowerCase())}"><time>${escapeHtml(row.time || "-")}</time><b>${escapeHtml(row.studentNo)}</b><span>${escapeHtml(row.name)}</span><span>${escapeHtml(row.className)}반</span><span>${Number(row.minutes||0)}분</span><span>${escapeHtml(row.reason||"-")}</span><span class="state ${String(row.guidance).includes("필요")?"warn":""}">${escapeHtml(row.guidance||"일반")}</span></button>`).join("")}</div>` : `<div class="empty-state compact-empty data-card"><b>${lateClassFilter==="all"?"선택일":`${lateClassFilter}반 선택일`} 지각 학생이 없습니다.</b><span>${selectedKey} 기준</span></div>`;
    const cumulativeMarkup = cumulative.length ? `<div class="data-card" id="attendanceRows"><div class="data-head late-cumulative-grid"><span>학번</span><span>학생</span><span>반</span><span>누적횟수</span><span>누적시간</span><span>최근 지각일</span><span>최근 사유</span><span>지도상태</span></div>${cumulative.map(row=>`<button class="data-row late-cumulative-grid attendance-row history-row" data-late-student="${escapeHtml(row.studentKey)}" data-search="${escapeHtml([row.studentNo,row.name,row.className,row.reason,row.guidance].join(" ").toLowerCase())}"><b>${escapeHtml(row.studentNo)}</b><span>${escapeHtml(row.name)}</span><span>${escapeHtml(row.className)}반</span><strong>${Number(row.cumulativeCount||0)}회</strong><span>${Number(row.cumulativeMinutes||0)}분</span><time>${escapeHtml(row.date||"-")}</time><span>${escapeHtml(row.reason||"-")}</span><span class="state ${String(row.guidance).includes("필요")?"warn":""}">${escapeHtml(row.guidance||"일반")}</span></button>`).join("")}</div>` : `<div class="empty-state compact-empty data-card"><b>누적 지각 기록이 없습니다.</b></div>`;
    return `<div class="module-page">${tabs}${attendanceDateControls("지각 조회일",currentRoleId()==="admin"?'<button class="btn primary" id="lateAttendanceAdd">＋ 지각 등록</button>':'')}<section class="attendance-dashboard-head"><div><small>SELECTED DAY · LATE</small><h3>${selectedKey} 지각</h3><p>날짜와 학급을 바꾸고, 학생을 눌러 이력을 확인합니다. 관리자는 기록을 직접 등록·수정할 수 있습니다.</p></div><div class="attendance-head-metrics"><span><b>${allSelectedRows.length}</b>선택일</span><span><b>${lateRows.length}</b>전체기록</span><span><b>${allCumulative.length}</b>누적학생</span><span><b>${allCumulative.filter(x=>String(x.guidance).includes("필요")).length}</b>지도필요</span></div></section>${classCards}${selectedMarkup}<div class="section-title-row"><div><small>CUMULATIVE · ${lateClassFilter==="all"?"전체":`${lateClassFilter}반`}</small><h3>누적 지각</h3></div><div class="toolbar inline-toolbar"><input class="search" id="attendanceSearch" placeholder="학번·이름·반·사유 검색"><button class="btn secondary" id="attendanceSearchReset">검색 지우기</button></div></div>${cumulativeMarkup}</div>`;
  }

  nightViewMonth = attendanceViewDate.slice(0,7);
  const classNo = nightClassFilter === "all" ? "1" : String(nightClassFilter || "1");
  const allStudents = readonlyCache?.students || [];
  const students = allStudents.filter(student=>classNumberOf(student)===classNo).sort((a,b)=>Number(a.number)-Number(b.number));
  const monthRows = nightRows.filter(row=>String(row.date||"").startsWith(nightViewMonth));
  const slots = ["오후자습","야자1","야자2"];
  const positive = new Set(["present","dorm","after","program"]);
  const currentDormIds=new Set((readonlyCache?.dormStudents||[]).flatMap(item=>[String(item.studentId||""),String(item.studentNo||"")]).filter(Boolean));
  const firstSemesterDormRows=(readonlyCache?.pastDormStudents||[]).filter(item=>String(item.year||"2026")==="2026"&&(/1/.test(String(item.semester||"1"))));
  const firstSemesterDormIds=new Set(firstSemesterDormRows.flatMap(item=>[String(item.studentId||""),String(item.studentNo||"")]).filter(Boolean));
  const isDormForDay=(student,day)=>{
    const ids=[String(student.id||student.studentId||""),String(student.studentNo||"")].filter(Boolean);
    if(!isNightOperatingDay(day)) return false;
    // 2026학년도 학사 운영 기준: 여름방학에도 운영하며 실제 미운영은 8/8~8/17 재입소 전까지입니다.
    if(day>="2026-08-08"&&day<="2026-08-17") return false;
    if(day>="2026-03-03"&&day<="2026-07-16"&&ids.some(id=>firstSemesterDormIds.has(id))) return true;
    const roster=(readonlyCache?.dormStudents||[]).find(item=>ids.includes(String(item.studentId||""))||ids.includes(String(item.studentNo||"")));
    if(!roster) return false;
    const entered=String(roster.entryDate||roster.startDate||roster.moveInDate||"2026-07-20").slice(0,10);
    const exited=String(roster.exitDate||roster.endDate||roster.moveOutDate||"").slice(0,10);
    return day>=entered && (!exited||day<=exited);
  };

  const rowIndex = new Map();
  monthRows.forEach(row=>{
    const slot=nightSlotName(row); if(!slots.includes(slot)||!row.date) return;
    const ids=[String(row.studentId||""),String(row.studentNo||""),attendanceStudentKey(row)].filter(Boolean);
    ids.forEach(id=>{const key=`${row.date}|${slot}|${id}`; if(!rowIndex.has(key)) rowIndex.set(key,row);});
  });
  const programIndex = new Map();
  const programs=[...(readonlyCache?.programs||[]).map(programWithOverride),...(typeof afterSchoolProgramGroups==="function"?afterSchoolProgramGroups():[])];
  const monthDateCandidates=[...new Set([...(readonlyCache?.nightCalendarDates||[]),...monthRows.map(row=>row.date),attendanceViewDate].filter(day=>String(day||"").startsWith(nightViewMonth)))].sort();
  const weekdayToken=day=>["일","월","화","수","목","금","토"][new Date(`${day}T12:00:00`).getDay()];
  const programRunsOn=(program,day)=>{
    const statusText=`${program.status||""} ${program.changeType||""} ${program.sessionStatus||""}`;
    if(/결강|휴강|취소|폐강|미운영/.test(statusText)) return false;
    const start=String(program.date||program.startDate||"").slice(0,10);
    const end=String(program.endDate||"").slice(0,10);
    const explicitDates=[...(Array.isArray(program.dates)?program.dates:[]),...(Array.isArray(program.sessionDates)?program.sessionDates:[])].map(value=>String(value||"").slice(0,10)).filter(Boolean);
    const days=String(program.weekdays||program.scheduleText||"");
    if(program.kind==="after"){
      if(explicitDates.length) return explicitDates.includes(day);
      if(start&&end&&end!==start){
        if(day<start||day>end) return false;
        if(days&&/[월화수목금토일]/.test(days)&&!days.includes(weekdayToken(day))) return false;
        return true;
      }
      return Boolean(start&&start===day);
    }
    if(start&&day<start) return false;
    if(end&&day>end) return false;
    if(days&&/[월화수목금토일]/.test(days) && !days.includes(weekdayToken(day))) return false;
    return start===day || (start&&end&&day>=start&&day<=end);
  };
  const seenPrograms=new Set();
  programs.filter(program=>program.affectsAttendance).forEach(program=>{
    const pKey=`${program.id||""}|${program.date||""}|${program.title||""}|${program.time||""}`;
    if(seenPrograms.has(pKey)) return; seenPrograms.add(pKey);
    monthDateCandidates.filter(day=>programRunsOn(program,day)).forEach(day=>{
      slots.filter(slot=>programOverlapsSlot(program,slot)).forEach(slot=>{
        (program.students||[]).forEach(target=>{
          const result=String(target.result||"대상");
          const confirmed=nightRecordIsAttendance(target)||/출석|정상|참여|입실|명단QR|학사|등록|수강|대상/.test(result);
          const pending=!confirmed&&!/결석|불참|취소/.test(result);
          const value={program,target,confirmed,pending};
          const ids=[String(target.studentId||""),String(target.studentNo||target.number||""),attendanceStudentKey(target)].filter(Boolean);
          ids.forEach(id=>{
            const key=`${day}|${slot}|${id}`, prev=programIndex.get(key);
            if(!prev||confirmed||(!prev.confirmed&&pending)) programIndex.set(key,value);
          });
        });
      });
    });
  });
  const resolveStatus=(student,day,slot)=>{
    const ids=[String(student.id||student.studentId||""),String(student.studentNo||""),attendanceStudentKey(student)].filter(Boolean);
    let participation=null,row=null;
    for(const id of ids){ participation=participation||programIndex.get(`${day}|${slot}|${id}`); row=row||rowIndex.get(`${day}|${slot}|${id}`); }
    if(participation?.confirmed){
      const display=nightProgramStatus(participation.program);
      const fullTitle=participation.program.actualTitle||participation.program.title||"프로그램";
      return {cls:display.cls,label:display.label,title:`${fullTitle} 참여 · ${participation.program.subject||"교과 미입력"} · ${participation.program.department||"부서 미입력"}`,programId:participation.program.id||"",programKind:display.kind};
    }
    if(participation?.pending) return {cls:"pending",label:"확인",title:`${participation.program.actualTitle||participation.program.title} 대상·출석·참여 중`};
    if(row){
      const rowText=`${row.result||""} ${row.type||""} ${row.affiliation||""} ${row.detail||""}`;
      if(row.recognizedByProgram||/프로그램 인정/.test(String(row.result))){const display=nightProgramStatus({kind:row.programKind,afterType:row.programType,type:row.type,actualTitle:row.programTitle,title:row.programTitle});return {cls:display.cls,label:display.label,title:`${row.programTitle||"프로그램"} 참여`,programId:row.programId||"",programKind:display.kind};}
      if(row.programPending||/프로그램 확인/.test(String(row.result))) return {cls:"pending",label:"확인",title:`${row.programTitle||"프로그램"} 참여 확인 필요`};
      if(/결석|미대상|명단외|미입실|미제출|불참/.test(rowText)) return {cls:"none",label:"-",title:"참여 기록 없음"};
      if(/방과후|야간모의|방학/.test(rowText) && nightRecordIsAttendance(row)) return {cls:"after",label:"방과후",title:String(row.type||row.result||"방과후 참여")};
      if(/프로그램/.test(rowText) && nightRecordIsAttendance(row)) return {cls:"program",label:"프로그램",title:String(row.type||row.result||"프로그램 참여")};
      if(/지각/.test(String(row.result))) return {cls:"late",label:"지각",title:String(row.result)};
      if(nightRecordIsAttendance(row)){
        const isDorm=/학사/.test(rowText)||isDormForDay(student,day);
        return isDorm?{cls:"dorm",label:"학사",title:"학사생 참여"}:{cls:"present",label:"출석",title:String(row.result||"출석")};
      }
    }
    if(isDormForDay(student,day)) return {cls:"dorm",label:"학사",title:day<="2026-07-16"?"1학기 학사생 자동 표시":"학사생 자동 표시"};
    return {cls:"none",label:"-",title:"기록 없음"};
  };

  const programDates=monthDateCandidates.filter(day=>programs.some(program=>program.affectsAttendance&&programRunsOn(program,day)));
  const legacyMonthDates=(readonlyCache?.nightCalendarDates||[]).filter(day=>String(day).startsWith(nightViewMonth));
  const firstSemesterDormDates=[];
  if(nightViewMonth>="2026-03"&&nightViewMonth<="2026-07"&&firstSemesterDormIds.size){
    const [yy,mm]=nightViewMonth.split("-").map(Number),start=new Date(yy,mm-1,1,12),end=new Date(yy,mm,0,12);
    for(const d=new Date(start);d<=end;d.setDate(d.getDate()+1)){const key=dateKey(d);if(key<="2026-07-16"&&isNightOperatingDay(key))firstSemesterDormDates.push(key);}
  }
  const dates=[...new Set([...monthRows.map(row=>row.date),...legacyMonthDates,...programDates,...firstSemesterDormDates,attendanceViewDate].filter(day=>String(day).startsWith(nightViewMonth)&&isNightOperatingDay(day)))].sort();
  const statusesFor=(student,day)=>slots.map(slot=>resolveStatus(student,day,slot));
  const classSummaries=Array.from({length:9},(_,i)=>String(i+1)).map(no=>{
    const roster=allStudents.filter(student=>classNumberOf(student)===no);
    const statusRows=roster.map(student=>statusesFor(student,attendanceViewDate));
    const participants=statusRows.filter(items=>items.some(status=>positive.has(status.cls))).length;
    const rosterIds=new Set(roster.flatMap(student=>[String(student.id||""),String(student.studentNo||"")]).filter(Boolean));
    const checks=nightRows.filter(row=>{
      if(row.date!==attendanceViewDate || !(nightRecordIsAttendance(row)||/지각/.test(String(row.result)))) return false;
      const found=allStudents.find(s=>String(s.id||"")===String(row.studentId||"")||String(s.studentNo||"")===String(row.studentNo||""));
      const rowClass=classNumberOf(found||{}) || (String(row.className||"").match(/(?:^|\D)(\d+)\s*반?\s*$/)?.[1] || String(row.className||"").match(/\d+/)?.[0] || "");
      return rowClass===no && ([String(row.studentId||""),String(row.studentNo||"")].some(id=>id&&rosterIds.has(id)) || Boolean(found));
    }).length;
    return {classNo:no,roster:roster.length,participants,checks};
  });
  const selectedSummary=classSummaries.find(item=>item.classNo===classNo)||{classNo,roster:students.length,participants:0,checks:0};
  const classCards=`<div class="night-class-overview daily-class-overview">${classSummaries.map(item=>`<button data-night-class="${item.classNo}" class="${classNo===item.classNo?"active":""}"><small>${item.classNo}반 · 재적 ${item.roster}명</small><b>${item.participants}<em>당일 참여</em></b><span>출석체크 ${item.checks}건</span></button>`).join("")}</div>`;

  const dateHead=dates.map(day=>`<th colspan="3" class="${day===attendanceViewDate?"selected-day":""}" data-night-date="${escapeHtml(day)}"><b>${escapeHtml(day.slice(5).replace("-","/"))}</b><small>${escapeHtml(weekdayLabelFromKey(day))}</small></th>`).join("");
  const slotHead=dates.map(day=>slots.map(slot=>`<th class="${day===attendanceViewDate?"selected-day-slot":""}">${escapeHtml(slot)}</th>`).join("")).join("");
  const bodyRows=students.map(student=>`<tr><th class="student-name-cell"><button data-night-student="${escapeHtml(attendanceStudentKey(student))}"><b>${escapeHtml(String(student.number||"").padStart(2,"0"))}번</b><span>${escapeHtml(student.name)}</span></button></th>${dates.map(day=>slots.map(slot=>{const status=resolveStatus(student,day,slot);const programAttrs=status.programId?` data-night-program="${escapeHtml(status.programId)}" data-night-program-kind="${escapeHtml(status.programKind||"general")}"`:"";return `<td class="${day===attendanceViewDate?"selected-day-cell":""}"><button class="night-status-cell ${status.cls}" title="${escapeHtml(status.title)}" data-night-student="${escapeHtml(attendanceStudentKey(student))}" data-night-day="${escapeHtml(day)}" data-night-slot="${escapeHtml(slot)}"${programAttrs}><span>${escapeHtml(status.label)}</span></button></td>`;}).join("")).join("")}</tr>`).join("");
  const matrix=dates.length?`<div class="night-month-scroll-hint">선택일 열은 강조 표시됩니다. 월간 운영일은 항상 유지됩니다. ← 좌우로 스크롤하여 월 전체 확인 →</div><div class="night-month-matrix"><table><thead><tr><th rowspan="2" class="student-name-head">학생</th>${dateHead}</tr><tr>${slotHead}</tr></thead><tbody>${bodyRows}</tbody></table></div>`:`<div class="empty-state compact-empty data-card"><b>${nightStudyOperationStatus(attendanceViewDate).operates?`${nightViewMonth} 야자출결 자료가 없습니다.`:`${attendanceViewDate} · ${escapeHtml(nightStudyOperationStatus(attendanceViewDate).reason)}`}</b><span>${nightStudyOperationStatus(attendanceViewDate).operates?'운영일인데 자료가 없다면 데이터 처리시트의 30_야자출결_정규화를 확인하세요.':'미운영일은 결석·미입력으로 집계하지 않습니다.'}</span></div>`;
  const gradeSummary=classSummaries.reduce((sum,item)=>({roster:sum.roster+item.roster,participants:sum.participants+item.participants,checks:sum.checks+item.checks}),{roster:0,participants:0,checks:0});
  return `<div class="module-page">${tabs}${attendanceDateControls("야자 조회일")}<section class="attendance-dashboard-head night"><div><small>NIGHT STUDY · ${attendanceViewDate} ${escapeHtml(weekdayLabelFromKey(attendanceViewDate,true))}</small><h3>1학년 선택일 참여현황</h3><p>1학년 전체 재적을 기준으로, 오후자습·야자1·야자2 중 출결 기록이 확인된 학생을 참여로 집계합니다.</p></div><div class="attendance-head-metrics"><span><b>${gradeSummary.roster}</b>1학년 재적인원</span><span><b>${gradeSummary.participants}</b>학년 참여인원</span><span><b>${gradeSummary.checks}</b>선택일 출석체크</span><span><b>${dates.length}</b>${nightViewMonth} 운영일</span></div></section>${classCards}<div class="section-title-row monthly-night-title"><div><small>MONTHLY · ${nightViewMonth}</small><h3>${classNo}반 월간 참여현황</h3></div><span class="state">${attendanceViewDate} ${escapeHtml(weekdayLabelFromKey(attendanceViewDate,true))} 선택</span></div><div class="night-matrix-legend"><span class="present">출석</span><span class="dorm">학사</span><span class="after">방과후 강좌명</span><span class="program">프로그램명</span><span class="late">지각</span><span class="pending">확인</span><span class="none">기록 없음</span></div>${matrix}</div>`;
}
```

## function render

```js
function render(page) {
  if(setupWizardActive){ renderSetupWizard(); return; }
  const views = {
    dashboard: dashboardView,
    students: studentsView,


    recordcheck: ()=>`<div class="module-page recordcheck-page"><div class="standalone-feature-head"><small>NEIS LOCAL CHECK</small><h2>세특 오류검증</h2><p>나이스 교과 세특 엑셀을 현재 PC에서만 읽어 학번·이름·과목과 검증 항목을 확인합니다.</p></div><div id="standaloneRecordcheckMount"></div></div>`,
    dorm: dormView,
    timetable: timetableView,
    attendance: attendanceView,
    scores: scoresView,
    admissions: admissionsView,
    records: recordsView,
    programs: programsView,
    alerts: studentAlertsView,
    subjects: recordsView,
    calendar: calendarView,
    work: workView,
    duties: dutiesView,
    forms: formsView,
    inputs: inputCenterView,
    outputs: outputsView,
    communication: communicationView,
    settings: settingsView,
    help: helpView,
  };
  try {
    $("#pageContent").innerHTML = studentFocusBarMarkup() + (views[page] || dashboardView)();
    bindPage(page);
    updateStudentSignalIndicator();
    $("[data-student-focus-return]")?.addEventListener("click",returnToFocusedStudent);
    $("[data-student-focus-end]")?.addEventListener("click",endStudentFocus);
    if(studentFocusContext && page!=="students") requestAnimationFrame(()=>applyStudentFocusToPage(page));
  } catch (error) {
    console.error(error);
    $("#pageContent").innerHTML =
      `<div class="setting-card pastel-peach"><h3>화면을 불러오지 못했습니다</h3><p>${String(error?.message || error)}</p><button class="btn primary" id="recoverDashboard">대시보드 초기화</button></div>`;
    $("#recoverDashboard").onclick = async () => {
      state = structuredClone(baseState);
      await save();
      navigate("dashboard");
    };
  }
}
```

## function bindEvents

- NOT FOUND as named function

## Coupling / call-site snippets

### data-dashboard-timetable-mode

- index 714480
```text
<div class="dashboard-night-week"><div class="dashboard-night-corner">시간대</div>${days.map((d,i)=>`<div class="dashboard-night-head"><b>${d}</b><small>${dates[i]?`${dates[i].getMonth()+1}/${dates[i].getDate()}`:""}</small></div>`).join("")}${cells.join("")}</div>`; } function dashboardTimetableHeaderControlsMarkup(){   const mode=dashboardTimetableAutoMode();   const dates=dashboardNightWeekDates(),first=dates[0],last=dates[4];   const range=first&&last?`${first.getMonth()+1}/${first.getDate()}~${last.getMonth()+1}/${last.getDate()}`:"이번 주";   return `<nav class="dashboard-timetable-header-controls"><button class="${mode==='day'?'active':''}" data-dashboard-timetable-mode="day">정규시간</button><button class="${mode==='night'?'active':''}" data-dashboard-timetable-mode="night">야간시간</button><span class="dashboard-tt-week-nav"><button data-dashboard-tt-week-shift="-1" aria-label="이전 주">‹</button><b>${range}</b><button data-dashboard-tt-week-shift="1" aria-label="다음 주">›</button></span></nav>`; } function dashboardTimetablePanelMarkup(){   const mode=dashboardTimetableAutoMode();   return mode==='night'?dashboardNightWeekMarkup():dashboardPersonalWeekMarkup(); } function dashboardNightStudentGroups(day,slot){   const rows=dashboardNightAttendanceRows(day,slot).map(normalizeDashboardStudentRow);   const map=new Map();   rows.forEach(row=>{     const gc=recordGradeClass(row.studentRef||row),cls=String(Number(gc.classNo||0)||"");     if(!cls)return;     if(!map.has(cls))map.set(cls,new Map());     const key=String(row.studentRef?.id||row.studentId||row.studentNo||`${row.name}|${cls}`);     map.get(cls).set(key,row);   });   return map; } function openDashboardNightProgram(programId,day){   const program=dashboardAfterProgramsForDay
```

- index 714575
```text
=>`<div class="dashboard-night-head"><b>${d}</b><small>${dates[i]?`${dates[i].getMonth()+1}/${dates[i].getDate()}`:""}</small></div>`).join("")}${cells.join("")}</div>`; } function dashboardTimetableHeaderControlsMarkup(){   const mode=dashboardTimetableAutoMode();   const dates=dashboardNightWeekDates(),first=dates[0],last=dates[4];   const range=first&&last?`${first.getMonth()+1}/${first.getDate()}~${last.getMonth()+1}/${last.getDate()}`:"이번 주";   return `<nav class="dashboard-timetable-header-controls"><button class="${mode==='day'?'active':''}" data-dashboard-timetable-mode="day">정규시간</button><button class="${mode==='night'?'active':''}" data-dashboard-timetable-mode="night">야간시간</button><span class="dashboard-tt-week-nav"><button data-dashboard-tt-week-shift="-1" aria-label="이전 주">‹</button><b>${range}</b><button data-dashboard-tt-week-shift="1" aria-label="다음 주">›</button></span></nav>`; } function dashboardTimetablePanelMarkup(){   const mode=dashboardTimetableAutoMode();   return mode==='night'?dashboardNightWeekMarkup():dashboardPersonalWeekMarkup(); } function dashboardNightStudentGroups(day,slot){   const rows=dashboardNightAttendanceRows(day,slot).map(normalizeDashboardStudentRow);   const map=new Map();   rows.forEach(row=>{     const gc=recordGradeClass(row.studentRef||row),cls=String(Number(gc.classNo||0)||"");     if(!cls)return;     if(!map.has(cls))map.set(cls,new Map());     const key=String(row.studentRef?.id||row.studentId||row.studentNo||`${row.name}|${cls}`);     map.get(cls).set(key,row);   });   return map; } function openDashboardNightProgram(programId,day){   const program=dashboardAfterProgramsForDay(day).find(p=>String(p.id||p.programId||"")===String(programId));   if(!program)return toast("프
```

- index 981474
```text
vigate("timetable");     }),   );   $$("[data-school-hours-popup]").forEach((x)=>(x.onclick=()=>openSchoolHoursPopup()));   $$('[data-dashboard-tt-week-shift]').forEach(button=>button.onclick=()=>{const current=new Date(`${dashboardWeekDate||dateKey(today)}T12:00:00`);current.setDate(current.getDate()+Number(button.dataset.dashboardTtWeekShift||0)*7);dashboardWeekDate=dateKey(current);render("dashboard");});   $$('[data-mail-alert]').forEach(input=>input.onchange=async()=>{state.settings.mailAlerts=state.settings.mailAlerts||{};state.settings.mailAlerts[input.dataset.mailAlert]=input.checked;await save();toast("메일 알림 설정을 저장했습니다.");});   $$('[data-dashboard-timetable-mode]').forEach(button=>button.onclick=()=>{dashboardTimetableMode=button.dataset.dashboardTimetableMode||"day";render("dashboard");});   $$('[data-dashboard-night-program]').forEach(button=>button.onclick=(event)=>{event.stopPropagation();openDashboardNightProgram(button.dataset.dashboardNightProgram,button.dataset.dashboardNightProgramDay);});   $$('[data-dashboard-night-day][data-dashboard-night-slot]').forEach(button=>button.onclick=()=>openDashboardNightSlot(button.dataset.dashboardNightDay,button.dataset.dashboardNightSlot));   const studentTimetableClass=$("#studentTimetableClass"),studentTimetableSelect=$("#studentTimetableSelect");   if(studentTimetableClass)studentTimetableClass.onchange=()=>{     studentTimetableSelectedId="";     const cls=studentTimetableClass.value||"";     const students=(Array.isArray(readonlyCache?.students)?readonlyCache.students:[])       .filter(st=>String(recordGradeClass(st).grade||"1")==="1"&&String(Number(recordGradeClass(st).classNo||0))===String(cls))       .sort((a,b)=>String(a.studentNo||"").localeCompare(String(b.
```

### calendarDayTone(

- index 72332
```text
/g,'');   const parts=raw.split(/[\n/]+/).map(x=>x.replace(/^\([^)]*\)\s*/,'').trim()).filter(Boolean);   const looksGeneric = !title || /^(?:\(?\d+[-~]?\d*교시\)?|\(?\d+[-~]\d+교시\)?|~|\d{1,2}:\d{2}(?:[-~]\d{1,2}:\d{2})?|\d+학년|각 반|전체)$/.test(title);   const candidate=parts.find(x=>!/(?:^\d{1,2}:\d{2}|^\d+학년$|교시$|희망학생|전체$|각 반|교실$|세미나실$|고당예관$|확정$|예정$|예약$|부$)/.test(x));   if (looksGeneric && candidate) return candidate;   return title || candidate || '일정'; }  function calendarShortTitle(title, max = 18) {   const value = String(title || "일정").replace(/\s+/g, " ").trim();   return value.length > max ? `${value.slice(0, max)}…` : value; }  function calendarDayTone(key) {   const date = new Date(`${key}T12:00:00`);   const weekday = date.getDay();   const holiday = attendanceIsSchoolHoliday(key);   return {     holiday,     saturday: weekday === 6 && !holiday,     sunday: weekday === 0 && !holiday,     className: holiday ? "holiday" : weekday === 6 ? "saturday" : weekday === 0 ? "sunday" : "weekday",   }; }  function calendarSelectedDayMarkup() {   const events = schoolEventsForDate(calendarSelectedDate).filter(calendarEventMatchesFilter);   const date = new Date(`${calendarSelectedDate}T12:00:00`);   const label = `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdayLabelFromKey(calendarSelectedDate, true)}`;   return `<section class="calendar-selected-day"><div class="calendar-selected-head"><div><small>SELECTED DAY</small><h4>${escapeHtml(label)} · ${events.length}개 일정</h4></div><button data-page="calendar">전체 일정 보기</button></div><div class="calendar-selected-list">${events.length ? events.slice(0,4).map((event)=>{const kind=calendarEventVisualKind(event); const meta=[event.target,event.place,event.owner].filter(Boolean).join
```

- index 76065
```text
dar-month-shift="1" aria-label="다음 달">›</button></div><button class="calendar-today-button" data-calendar-today>오늘</button></div>${filterButtons}<div class="calendar-month-layout"><div class="mini-calendar compact-month">${weekdayHeads.map((x, index) => `<div class="cal-cell cal-head ${index===0?"sunday":index===6?"saturday":""}">${x}</div>`).join("")}`;   for (let i = 0; i < 42; i++) {     const d = new Date(start);     d.setDate(start.getDate() + i);     const day = d.getDate(),       key = dateKey(d),       events = schoolEventsForDate(key).filter(calendarEventMatchesFilter),       selected = key === calendarSelectedDate;     const tone = calendarDayTone(key);     html += `<div class="cal-cell ${tone.className} ${key === dateKey(today) ? "today" : ""} ${selected ? "selected" : ""} ${d.getMonth() === m ? "current-month" : "outside-month"}"><button class="cal-day-button" data-calendar-date="${key}"><span>${day}</span>${tone.holiday?'<em>공휴일</em>':""}</button>${events.slice(0, 3).map((event) => {const kind=calendarEventVisualKind(event); return `<div class="cal-event-wrap"><button class="cal-event kind-${kind} ${calendarEventIsPending(event)?"pending":""}" data-school-event="${escapeHtml(event.id)}" title="${escapeHtml(event.detail)}"><time>${escapeHtml(event.time || "종일")}</time><span>${escapeHtml(calendarShortTitle(calendarDisplayTitle(event), 22))}</span></button></div>`;}).join("")}${events.length > 3 ? `<button class="cal-more" data-calendar-date="${key}">＋${events.length - 3}개 더보기</button>` : ""}</div>`;   }   return html + `</div>${showMode ? calendarSelectedDayMarkup() : ""}</div>`; } function schoolEventsForDate(key) {   return allSchoolEvents().filter((event) => {     const start = String(event.date || "");    
```

- index 681432
```text
hool-event="${escapeHtml(event.id)}"><time>${escapeHtml(event.time||"종일")}</time><span>${escapeHtml(calendarShortTitle(calendarDisplayTitle(event),18))}</span></button>`).join(""):`<small>일정 없음</small>`}</div></section>`).join("")}</div>`; }  function dashboardMiniCalendarMarkup(){   const anchor=new Date(`${dashboardMonthDate||dateKey(today)}T12:00:00`);   const y=anchor.getFullYear(),m=anchor.getMonth(); const first=new Date(y,m,1); const start=new Date(y,m,1-first.getDay());   let cells=""; for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const key=dateKey(d);const count=schoolEventsForDate(key).length;const tone=calendarDayTone(key);cells+=`<button class="${d.getMonth()!==m?"muted":""} ${key===dateKey(today)?"today":""} ${key===dashboardSelectedDate?"selected":""} ${tone.className}" data-dashboard-calendar-date="${key}"><span>${d.getDate()}</span>${count?`<i aria-label="${count}개 일정">${count}</i>`:""}</button>`;}   return `<div class="uep-mini-cal-head"><button data-dashboard-month-shift="-1" aria-label="이전 달">‹</button><b>${y}년 ${m+1}월</b><button data-dashboard-month-shift="1" aria-label="다음 달">›</button><button data-dashboard-month-today>오늘</button></div><div class="uep-mini-cal"><div class="sunday">일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div class="saturday">토</div>${cells}</div>`; }  function dashboardSelectedDayMarkup(){   const key=dashboardSelectedDate||dateKey(today);   const date=new Date(`${key}T12:00:00`);   const events=schoolEventsForDate(key).sort((a,b)=>String(a.time||"99:99").localeCompare(String(b.time||"99:99")));   return `<div class="uep-selected-day-head"><div><small>SELECTED DAY</small><h3>${date.getMonth()+1}월 ${date.getDate()}일 ${escapeHtml
```

- index 697995
```text
data-lunch-duty-date="${escapeHtml(key)}" data-lunch-duty-teacher="${escapeHtml(teacher)}" data-lunch-duty-type="${escapeHtml(row.dutyType||'급식실')}"><b>${escapeHtml(teacher||'-')}</b><span>(${escapeHtml(row.dutyType||'급식실')})</span>${mine?'<em>내 근무</em>':''}</button>`;       return `<button type="button" class="duty-cal-entry night ${mine?'mine':''}" data-night-duty-edit="${escapeHtml(row.id||'')}" data-night-duty-date="${escapeHtml(key)}" data-night-duty-teacher="${escapeHtml(teacher)}"><b>${escapeHtml(teacher||'-')}</b>${mine?'<em>내 근무</em>':''}</button>`;     }).join('');     const weekday=new Date(year,month,day).getDay();     const tone=calendarDayTone(key);     const dayClass=weekday===0?'sunday':weekday===6?'saturday':'';     cells.push(`<div class="duty-cal-cell ${dayClass} ${tone.className||''} ${isToday?'today':''} ${list.length?'has-duty':''}"><header><time>${day}</time>${isToday?'<em>오늘</em>':''}</header><div class="duty-cal-list">${items}</div></div>`);   }   while(cells.length%7) cells.push('<div class="duty-cal-cell empty" aria-hidden="true"></div>');   const myCount=rows.filter(r=>String(r.teacher||'').trim()===person).length;   const commonInfo=type==='night'?`<div class="night-duty-common"><span><b>시간</b> 16:30~21:30</span><span><b>장소</b> 면학관 2~3층</span><span><b>대상</b> 1학년 1~9반</span><small>교사 이름을 클릭하면 감독교사를 변경할 수 있습니다.</small></div>`:'';   return `<div class="duty-calendar-view duty-calendar-${type}" data-duty-calendar="${type}">     <div class="duty-calendar-topline">       <div class="duty-calendar-toolbar"><button type="button" data-duty-month="-1" aria-label="이전 달">‹</button><strong>${year}년 ${month+1}월 ${title}</strong><button type="button" data-duty-month="1" aria-label="다음 달">›</button></div>   
```

### 공휴일

- index 76367
```text
ay":index===6?"saturday":""}">${x}</div>`).join("")}`;   for (let i = 0; i < 42; i++) {     const d = new Date(start);     d.setDate(start.getDate() + i);     const day = d.getDate(),       key = dateKey(d),       events = schoolEventsForDate(key).filter(calendarEventMatchesFilter),       selected = key === calendarSelectedDate;     const tone = calendarDayTone(key);     html += `<div class="cal-cell ${tone.className} ${key === dateKey(today) ? "today" : ""} ${selected ? "selected" : ""} ${d.getMonth() === m ? "current-month" : "outside-month"}"><button class="cal-day-button" data-calendar-date="${key}"><span>${day}</span>${tone.holiday?'<em>공휴일</em>':""}</button>${events.slice(0, 3).map((event) => {const kind=calendarEventVisualKind(event); return `<div class="cal-event-wrap"><button class="cal-event kind-${kind} ${calendarEventIsPending(event)?"pending":""}" data-school-event="${escapeHtml(event.id)}" title="${escapeHtml(event.detail)}"><time>${escapeHtml(event.time || "종일")}</time><span>${escapeHtml(calendarShortTitle(calendarDisplayTitle(event), 22))}</span></button></div>`;}).join("")}${events.length > 3 ? `<button class="cal-more" data-calendar-date="${key}">＋${events.length - 3}개 더보기</button>` : ""}</div>`;   }   return html + `</div>${showMode ? calendarSelectedDayMarkup() : ""}</div>`; } function schoolEventsForDate(key) {   return allSchoolEvents().filter((event) => {     const start = String(event.date || "");     const end = String(event.endDate || event.date || "");     return start && key >= start && key <= end;   }); }  function allSchoolEvents() {   const manualRows = Array.isArray(state.settings?.manualCalendar) ? state.settings.manualCalendar : [];   const manual = manualRows.map((row, index) => ({     
```

- index 117698
```text
tate:'',actualExit:'',actualReentry:'',priorNightAcademyHome:false,formRequired:false,individualOutingAllowed:false});   $("#drawerKicker").textContent='DORMITORY · RULE';   $("#drawerTitle").textContent=copyMode?'학사운영규칙 복사':existing?'학사운영규칙 수정':'학사운영규칙 추가';   const opt=(v)=>String(rule.category)===v?'selected':'';   $("#drawerBody").innerHTML=`<form id="dormRuleEditorForm" class="dorm-rule-editor">     <div class="dorm-rule-editor-grid">       <label>규칙 구분<select id="dormRuleCategory"><option value="period" ${opt('period')}>학교 운영기간</option><option value="closure" ${opt('closure')}>학사 미운영</option><option value="exception" ${opt('exception')}>공휴일·연휴 / 입·퇴소 변경</option><option value="exam" ${opt('exam')}>시험기간 학원외출 허용</option><option value="base" ${opt('base')}>기본 입·퇴소</option><option value="vacation" ${opt('vacation')}>방학 중 학원외출 허용</option></select></label>       <label>규칙명<input id="dormRuleName" value="${escapeHtml(rule.name||'')}" required></label>       <label data-dorm-rule-field="start">적용 시작일시<input type="datetime-local" id="dormRuleStart" value="${escapeHtml(dormRuleNormalizeDateTime(rule.start))}" required></label>       <label data-dorm-rule-field="end">적용 종료일시<input type="datetime-local" id="dormRuleEnd" value="${escapeHtml(dormRuleNormalizeDateTime(rule.end))}" required></label>       <label data-dorm-rule-field="days">적용 요일<input id="dormRuleDays" value="${escapeHtml(rule.days||'전체')}" placeholder="전체 또는 월,화,수,목"></label>       <label data-dorm-rule-field="effect">판정/효과<input id="dormRuleEffect" value="${escapeHtml(rule.effect||'')}" placeholder="입·퇴소 변경"></label>       <label data-dorm-rule-field="entry">입소시간<input id="dormRuleEntry" value="${escapeHtml(rule.entryTime||'')}" placeholder="예: 일 19:00"></label>  
```

- index 127312
```text
   }catch(error){ console.error('[UEP] 학사운영규칙 버튼 처리 실패',error); toast(error?.message||'학사운영규칙 버튼 처리 중 오류가 발생했습니다.'); }   },true); } ensureDormRuleDelegatedActions();  function dormRuleManagementMarkup(currentStudents,outings){   const rules=dormRuleHistory().slice().sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')));   const grouped=['period','closure','base','exception','exam','vacation'];   const categoryHelp={     period:'학교의 1학기·여름방학·2학기·겨울방학 구분입니다. 방학이라고 학사를 자동 중단하지 않습니다.',     closure:'실제로 학사를 운영하지 않는 기간만 등록합니다. 이 기간 외출은 운영현황·통계에서 제외됩니다.',     base:'평상시 주말 입·퇴소처럼 반복되는 기본 운영규칙입니다.',     exception:'기본 주간규칙과 입·퇴소 일시가 달라지는 공휴일·연휴 등을 기록합니다. 퇴소~입소 사이 기간은 자동 계산하며 학원외출 허용상태는 기본규칙을 유지합니다.',     exam:'시험 3주 전부터 시험 마지막 날까지 평소 금지된 학원외출을 특별 허용합니다. 개인신청으로 확정합니다.',     vacation:'여름·겨울방학 중 학사를 운영하면서 허용할 외출 조건과 시간을 등록합니다.'   };   const sections=grouped.map(category=>{     const rows=rules.filter(x=>x.category===category);     return `<section class="data-card dorm-rule-category"><div class="card-head"><div><strong>${dormRuleCategoryLabel(category)}</strong><small>${categoryHelp[category]}</small></div><button class="btn secondary" data-dorm-rule-add="${category}">+ 추가</button></div><div class="dorm-rule-list">${rows.length?rows.map(rule=>`<article class="dorm-rule-row ${rule.active?'active':'inactive'}"><div class="dorm-rule-title"><b>${escapeHtml(rule.name)}</b><small>${escapeHtml(rule.effect||dormRuleCategoryLabel(category))}${rule.active?'':' · 사용 안 함'}</small></div><span>${escapeHtml(dormRuleDateText(rule.start))}<br>~ ${escapeHtml(dormRuleDateText(rule.end))}</span><div class="dorm-rule-detail"><p>${escapeHtml(rule.note||'')}</p><small>${escapeHtml([rule.days&&`요일 ${rule.days}`,rule.entryTime&&`입소 ${rule.entry
```

- index 173775
```text
:"after"};   if(/일반 방과후|방학 방과후|방과후학교/.test(text)) return {cls:"after",label:"방과후",kind:"after"};   const title=String(program?.actualTitle||program?.title||"프로그램");   return {cls:"program",label:title.length>8?`${title.slice(0,7)}…`:title,kind:program?.kind||"general"}; } function attendanceIsWeekday(day){const n=new Date(`${day}T12:00:00`).getDay();return n>=1&&n<=5;} function attendanceIsSchoolHoliday(day){   const fixed2026=new Set(["2026-08-17","2026-09-24","2026-09-25","2026-09-26","2026-10-05","2026-10-09","2026-12-25"]);   if(fixed2026.has(String(day))) return true;   const events=schoolEventsForDate(day);   return events.some(event=>/공휴일|대체공휴일|재량휴업|휴업일|개교기념일|임시공휴일|석가탄신일|부처님오신날|어린이날|현충일|광복절|개천절|한글날|성탄절|설날|추석/.test(`${event.title||""} ${event.type||""} ${event.detail||""}`)); } function isNightOperatingDay(day){return attendanceIsWeekday(day)&&!attendanceIsSchoolHoliday(day);} function nearestNightOperatingDay(day){   let d=new Date(`${day}T12:00:00`);   for(let i=0;i<31;i++){const key=dateKey(d);if(isNightOperatingDay(key))return key;d.setDate(d.getDate()-1);}   return day; } function shiftNightOperatingDate(day,direction){   let d=new Date(`${day}T12:00:00`);   const step=Number(direction)>=0?1:-1;   for(let i=0;i<62;i++){     d.setDate(d.getDate()+step);     const key=dateKey(d);     if(isNightOperatingDay(key))return key;   }   return day; } function openOfficialAttendanceEditor(row=null){   const students=(readonlyCache?.students||[]).slice().sort((a,b)=>String(a.studentNo||"").localeCompare(String(b.studentNo||"")));   const selectedNo=String(row?.studentNo||"");   const options=students.map(student=>`<option value="${escapeHtml(student.studentNo||"")}" ${String(student.studentNo)===selectedNo?"selected":""}>
```

- index 173781
```text
r"};   if(/일반 방과후|방학 방과후|방과후학교/.test(text)) return {cls:"after",label:"방과후",kind:"after"};   const title=String(program?.actualTitle||program?.title||"프로그램");   return {cls:"program",label:title.length>8?`${title.slice(0,7)}…`:title,kind:program?.kind||"general"}; } function attendanceIsWeekday(day){const n=new Date(`${day}T12:00:00`).getDay();return n>=1&&n<=5;} function attendanceIsSchoolHoliday(day){   const fixed2026=new Set(["2026-08-17","2026-09-24","2026-09-25","2026-09-26","2026-10-05","2026-10-09","2026-12-25"]);   if(fixed2026.has(String(day))) return true;   const events=schoolEventsForDate(day);   return events.some(event=>/공휴일|대체공휴일|재량휴업|휴업일|개교기념일|임시공휴일|석가탄신일|부처님오신날|어린이날|현충일|광복절|개천절|한글날|성탄절|설날|추석/.test(`${event.title||""} ${event.type||""} ${event.detail||""}`)); } function isNightOperatingDay(day){return attendanceIsWeekday(day)&&!attendanceIsSchoolHoliday(day);} function nearestNightOperatingDay(day){   let d=new Date(`${day}T12:00:00`);   for(let i=0;i<31;i++){const key=dateKey(d);if(isNightOperatingDay(key))return key;d.setDate(d.getDate()-1);}   return day; } function shiftNightOperatingDate(day,direction){   let d=new Date(`${day}T12:00:00`);   const step=Number(direction)>=0?1:-1;   for(let i=0;i<62;i++){     d.setDate(d.getDate()+step);     const key=dateKey(d);     if(isNightOperatingDay(key))return key;   }   return day; } function openOfficialAttendanceEditor(row=null){   const students=(readonlyCache?.students||[]).slice().sort((a,b)=>String(a.studentNo||"").localeCompare(String(b.studentNo||"")));   const selectedNo=String(row?.studentNo||"");   const options=students.map(student=>`<option value="${escapeHtml(student.studentNo||"")}" ${String(student.studentNo)===selectedNo?"selected":""}>${esca
```

- index 173802
```text
방과후|방과후학교/.test(text)) return {cls:"after",label:"방과후",kind:"after"};   const title=String(program?.actualTitle||program?.title||"프로그램");   return {cls:"program",label:title.length>8?`${title.slice(0,7)}…`:title,kind:program?.kind||"general"}; } function attendanceIsWeekday(day){const n=new Date(`${day}T12:00:00`).getDay();return n>=1&&n<=5;} function attendanceIsSchoolHoliday(day){   const fixed2026=new Set(["2026-08-17","2026-09-24","2026-09-25","2026-09-26","2026-10-05","2026-10-09","2026-12-25"]);   if(fixed2026.has(String(day))) return true;   const events=schoolEventsForDate(day);   return events.some(event=>/공휴일|대체공휴일|재량휴업|휴업일|개교기념일|임시공휴일|석가탄신일|부처님오신날|어린이날|현충일|광복절|개천절|한글날|성탄절|설날|추석/.test(`${event.title||""} ${event.type||""} ${event.detail||""}`)); } function isNightOperatingDay(day){return attendanceIsWeekday(day)&&!attendanceIsSchoolHoliday(day);} function nearestNightOperatingDay(day){   let d=new Date(`${day}T12:00:00`);   for(let i=0;i<31;i++){const key=dateKey(d);if(isNightOperatingDay(key))return key;d.setDate(d.getDate()-1);}   return day; } function shiftNightOperatingDate(day,direction){   let d=new Date(`${day}T12:00:00`);   const step=Number(direction)>=0?1:-1;   for(let i=0;i<62;i++){     d.setDate(d.getDate()+step);     const key=dateKey(d);     if(isNightOperatingDay(key))return key;   }   return day; } function openOfficialAttendanceEditor(row=null){   const students=(readonlyCache?.students||[]).slice().sort((a,b)=>String(a.studentNo||"").localeCompare(String(b.studentNo||"")));   const selectedNo=String(row?.studentNo||"");   const options=students.map(student=>`<option value="${escapeHtml(student.studentNo||"")}" ${String(student.studentNo)===selectedNo?"selected":""}>${escapeHtml(student.studen
```

- index 712719
```text
kDates(),days=["월","화","수","목","금"],slots=[     {key:"오후자습",label:"오후자습",time:schoolHourRange("오후자습")||"17:00~18:00"},     {key:"야자1",label:"야자1",time:schoolHourRange("야자1")||"19:00~20:10"},     {key:"야자2",label:"야자2",time:schoolHourRange("야자2")||"20:20~21:30"}   ];   const cells=[];   slots.forEach(slot=>{     cells.push(`<div class="dashboard-night-period"><b>${escapeHtml(slot.label)}</b><small>${escapeHtml(slot.time)}</small></div>`);     dates.forEach((date,i)=>{       const key=dateKey(date),isWed=i===2,holiday=attendanceIsSchoolHoliday(key);       if(holiday){cells.push(`<div class="dashboard-night-cell closed holiday"><b>미운영</b><small>공휴일</small></div>`);return;}       if(isWed){cells.push(`<div class="dashboard-night-cell closed"><b>-</b><small>야간 미운영</small></div>`);return;}       const rows=dashboardNightAttendanceRows(key,slot.key),students=new Set(rows.map(attendanceStudentKey).filter(Boolean));       const programs=dashboardAfterProgramsForDay(key).filter(p=>dashboardProgramNightSlot(p)===slot.key);       const programCards=programs.map(p=>`<button class="dashboard-night-program-chip" data-dashboard-night-program="${escapeHtml(p.id||p.programId||"")}" data-dashboard-night-program-day="${key}"><b>${/야간심화/.test(`${p.afterType||""} ${p.title||""}`)?"야간심화":"방과후"}</b><span>${escapeHtml(p.actualTitle||p.title||"프로그램")}</span></button>`).join("");       cells.push(`<div class="dashboard-night-cell ${students.size||programs.length?'active':'empty'}"><button class="dashboard-night-roster" data-dashboard-night-day="${key}" data-dashboard-night-slot="${escapeHtml(slot.key)}"><b>${students.size?`${students.size}명`:'-'}</b><small>${students.size?'자습인원 보기':'자습 자료 없음'}</small></button>${programCards}</div>`);     });   });
```

- index 1220483
```text
     let cur='';       try{ cur=String(recordStudentId||'').trim(); }catch(_e){}       let i=ids.indexOf(cur);       if(i<0) i=0;       i=prev?Math.max(0,i-1):Math.min(ids.length-1,i+1);       try{ recordStudentId=ids[i]; }catch(_e){}       renderRecordsSafe();     }   },true);    // Dashboard safeguard: do not leave a holiday-time mode visibly selected on an ordinary weekday.   // This only normalizes the selector when both labels exist; it does not remove holiday support.   function normalizeHolidayMode(){     const nodes=[...document.querySelectorAll('button,[role="button"],.chip,.pill,.seg-btn')];     const holiday=nodes.find(el=>/공휴s*시간|공휴일/.test((el.textContent||'').trim()));     const regular=nodes.find(el=>/정규s*시간/.test((el.textContent||'').trim()));     if(!holiday||!regular) return;     const now=new Date();     const day=now.getDay();     if(day===0||day===6) return;     const hs=getComputedStyle(holiday);     const rs=getComputedStyle(regular);     const holidayLooksActive=holiday.getAttribute('aria-pressed')==='true'||holiday.classList.contains('active')||holiday.classList.contains('selected')||hs.backgroundColor!==rs.backgroundColor;     if(holidayLooksActive && typeof regular.click==='function') regular.click();   }   setTimeout(normalizeHolidayMode,300);   setTimeout(normalizeHolidayMode,1200); })(); /* UEP_08132_INTERACTION_REPAIR_END */        /* UEP_08134_CURRICULUM_SECURITY_START */ (function(){  if(typeof document==='undefined'||window.__UEP08134CurriculumSecurity)return;  window.__UEP08134CurriculumSecurity=true;  const PIN_KEY='uep_subject_confidential_pin_hash_v2';  const SESSION_KEY='uep_subject_confidential_unlocked_v2';  const exact=(el,t)=>String(el&&el.textContent||'').trim()===t;  function p
```

### 민감정보 보안

- index 387117
```text
offline ? ["저장자료 표시", "warn"] : ["실시간 연결됨", ""]) : neisLoading ? ["불러오는 중", "warn"] : ["연결 확인", "error"];   const profile=currentUserProfile(), access=currentTeacherAccessScope();    const header=(title,desc,badge)=>`${settingsTabsMarkup()}<section class="settings-section-head"><div><small>UEP SETTINGS</small><h2>${title}</h2><p>${desc}</p></div><span>${badge}</span></section>`;    if(settingsPanel==="security") return `<div class="module-page settings-v064 settings-final">     ${header("사용자·보안","계정 승인과 역할, 민감정보 보호를 관리합니다.","관리자·학년부장")}     <article class="setting-card sensitive-security-settings"><div><small>PRIVACY · SECURITY</small><h3>🔒 민감정보 보안</h3><p>교육비지원 · 요보호학생 · 위기학생 상세정보의 열람 비밀번호를 관리합니다.</p><p class="settings-help">상세정보는 1차 블라인드 후 비밀번호 인증을 거쳐 확인하며 인증은 10분 동안 유지됩니다.</p></div><div class="sensitive-security-status"><b>${sensitivePasswordConfigured()?'비밀번호 설정됨':'비밀번호 설정 필요'}</b><button type="button" class="btn primary" data-sensitive-password-set>${sensitivePasswordConfigured()?'비밀번호 변경':'비밀번호 설정'}</button><button type="button" class="btn secondary" data-sensitive-lock>즉시 잠금</button></div></article>     <article class="setting-card role-settings-card"><div class="connection-title"><div><h3>사용자·권한 프로필</h3><p>현재 로그인 사용자의 역할과 담당 범위를 확인합니다.</p></div><span class="state">${escapeHtml(currentRoleDisplay())}</span></div><div class="user-profile-summary"><div><small>사용자</small><b>${escapeHtml(profile.name||"미설정")}</b></div><div><small>부서</small><b>${escapeHtml(profile.department||"미설정")}</b></div><div><small>조회 범위</small><b>${escapeHtml(access.label)}</b></div></div><p class="safe-note">담임은 학년 자료를 조회할 수 있고 타반 연락정보는 기본 마스킹합니다. 성적·응답·정규화 원천자료는 UEP에서 직접 수정하지 않습니다.</p></article>     <article class="setting-card access-control-
```

- index 1232433
```text
 return [...document.querySelectorAll('header *,nav *,button,.badge,.chip,.pill')].some(el=>['관리자','학년부장'].includes(String(el.textContent||'').trim()));   }   async function digest(v){     const b=new TextEncoder().encode(v);     const h=await crypto.subtle.digest('SHA-256',b);     return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');   }    function ensureSubjectSecuritySetting(){     if(!/설정/.test(String(document.body.textContent||'')))return;     if(document.querySelector('[data-uep135-subject-security]'))return;     const sensitive=[...document.querySelectorAll('h1,h2,h3,h4,b,strong,div,span')].find(el=>exact(el,'민감정보 보안'));     if(!sensitive)return;     const host=sensitive.closest('section,.card,[class*="card"],[class*="panel"]')||sensitive.parentElement;     if(!host||!host.parentElement)return;     const can=privileged();     const box=document.createElement('section');     box.dataset.uep135SubjectSecurity='1';     box.style.cssText='margin-top:12px;padding:18px;border:1px solid #d8e5e8;border-radius:14px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:18px';     box.innerHTML='<div><div style="font-size:11px;letter-spacing:.08em;color:#168d7f;font-weight:700">CONFIDENTIAL · CURRICULUM</div><div style="font-size:17px;font-weight:800;margin-top:5px">🔐 선택과목 대외비 보안</div><div style="font-size:12px;color:#6b7c82;margin-top:6px">과목별 신청현황 전용 비밀번호 · 민감정보 비밀번호와 별도 관리</div></div><div style="display:flex;gap:8px;align-items:center"><span data-uep135-pin-state style="font-size:12px;color:#5d747b"></span><button type="button" data-uep135-pin-set '+(can?'':'disabled')+'>비밀번호 설정</button><button type="button" data-uep135-pin-lock '+(can?'':'disabled')+'>즉시 잠금</button><
```

### data-sensitive-password-set

- index 387407
```text
>UEP SETTINGS</small><h2>${title}</h2><p>${desc}</p></div><span>${badge}</span></section>`;    if(settingsPanel==="security") return `<div class="module-page settings-v064 settings-final">     ${header("사용자·보안","계정 승인과 역할, 민감정보 보호를 관리합니다.","관리자·학년부장")}     <article class="setting-card sensitive-security-settings"><div><small>PRIVACY · SECURITY</small><h3>🔒 민감정보 보안</h3><p>교육비지원 · 요보호학생 · 위기학생 상세정보의 열람 비밀번호를 관리합니다.</p><p class="settings-help">상세정보는 1차 블라인드 후 비밀번호 인증을 거쳐 확인하며 인증은 10분 동안 유지됩니다.</p></div><div class="sensitive-security-status"><b>${sensitivePasswordConfigured()?'비밀번호 설정됨':'비밀번호 설정 필요'}</b><button type="button" class="btn primary" data-sensitive-password-set>${sensitivePasswordConfigured()?'비밀번호 변경':'비밀번호 설정'}</button><button type="button" class="btn secondary" data-sensitive-lock>즉시 잠금</button></div></article>     <article class="setting-card role-settings-card"><div class="connection-title"><div><h3>사용자·권한 프로필</h3><p>현재 로그인 사용자의 역할과 담당 범위를 확인합니다.</p></div><span class="state">${escapeHtml(currentRoleDisplay())}</span></div><div class="user-profile-summary"><div><small>사용자</small><b>${escapeHtml(profile.name||"미설정")}</b></div><div><small>부서</small><b>${escapeHtml(profile.department||"미설정")}</b></div><div><small>조회 범위</small><b>${escapeHtml(access.label)}</b></div></div><p class="safe-note">담임은 학년 자료를 조회할 수 있고 타반 연락정보는 기본 마스킹합니다. 성적·응답·정규화 원천자료는 UEP에서 직접 수정하지 않습니다.</p></article>     <article class="setting-card access-control-card"><div class="connection-title"><div><h3>사용자·권한 승인</h3><p>01_사용자계정의 사용여부·역할·담당학년·담임반을 기준으로 로그인과 조회범위를 제어합니다.</p></div><span class="state connected">계정표 승인</span></div><div class="connection-actions"><button class="btn primary" type="button" data-access-control>권한 승인 제어판</button></div><
```

- index 974446
```text
    (x) => (x.onclick = () => navigate(x.dataset.page)),   );   $$('[data-calendar-hub]').forEach(button=>button.onclick=()=>{calendarHubMode=button.dataset.calendarHub||'schedule';render('calendar');});   $$('[data-work-embedded]').forEach(button=>button.onclick=()=>{workEmbeddedMode=button.dataset.workEmbedded||'home';render('work');});   $$('[data-output-hub]').forEach(button=>button.onclick=()=>{outputHubMode=button.dataset.outputHub||'alerts';outputCenterState.home=true;render('outputs');});   $$('[data-settings-panel]').forEach(button=>button.onclick=()=>{settingsPanel=button.dataset.settingsPanel||'basic';render('settings');});   $$('[data-sensitive-password-set]').forEach(button=>button.onclick=async()=>{await setSensitivePasswordFlow();});   $$('[data-sensitive-lock]').forEach(button=>button.onclick=()=>{lockSensitiveSession();toast('민감정보를 잠갔습니다.');if(state.activePage==='settings')render('settings');});   $$('[data-screen-setting]').forEach(button=>button.onclick=async()=>{const key=button.dataset.screenSetting;if(key==='alwaysOnTop'){state.settings.alwaysOnTop=!state.settings.alwaysOnTop;await save();await window.schoolBoard?.setAlwaysOnTop?.(state.settings.alwaysOnTop);render('settings');}else if(key==='layoutLocked'){state.settings.layoutLocked=!state.settings.layoutLocked;await save();render('settings');}});   $$("[data-calendar-sync]").forEach((button) => (button.onclick = async () => {     button.disabled = true;     const original = button.textContent;     button.textContent = "동기화 중…";     const academicYear=today.getMonth()+1>=3?today.getFullYear():today.getFullYear()-1;     const result = await window.schoolBoard?.syncSchoolCalendar?.({date:dateKey(today),academicYear,fullAcademicYear:true});     if (!
```

### 과목별 신청현황

- index 1195040
```text
al","기록"]];return '<div class="record-main-tabs">'+tabs.map(([id,label])=>'<button data-record-mode="'+id+'" class="'+(recordMode===id?'active':'')+'"><b>'+label+'</b><small>'+(id==='activities'?'학생 활동 사실 확인':id==='sdgs'?'진로·전공·탐구주제·사회적 가치 연계':id==='curriculum'?'학기별 선택과목':'학생 성장 자료')+'</small></button>').join('')+'</div>';} function uepCurriculumNav(){return '<div class="selection-analysis-tabs curriculum-final-tabs"><button data-curriculum-workspace="students" class="'+(curriculumWorkspaceMode==='students'?'active':'')+'">학생신청</button><button data-curriculum-workspace="subjects" class="'+(curriculumWorkspaceMode==='subjects'?'active':'')+'">과목별 신청현황</button></div>';} function uepSelectionErrorLabel(errors){return errors.length?'<span class="selection-error-count">'+errors.length+'건 확인</span>':'<span class="selection-ok">정상</span>';} function uepStudentApplicationDetail(row,errors){const student=row.__student,bundle=studentRecordBundle(student),sms=uepSelectionSms(student,errors),className=String(student.className||recordStudentClass(student)||'').replace(/반+$/,'');const career=careerSupportMarkup(student,bundle,false);const alert=errors.length?'<section class="selection-error-panel selection-error-first"><header><h3>먼저 확인할 신청 오류</h3><span>'+errors.length+'건</span></header>'+errors.map(x=>'<article><b>'+escapeHtml(x.type)+'</b><em>'+escapeHtml(x.term)+'</em><p>'+escapeHtml(x.detail)+'</p></article>').join('')+'</section>':'<section class="selection-safe-panel selection-safe-first"><b>✓ 선택과목 검증 정상</b><span>현재 신청자료에서 확인할 오류가 없습니다.</span></section>';const termCards=['2-1','2-2','3-1','3-2'].map(term=>'<section><header><h3>'+term.replace('-','학년 ')+'학기</h3><span>'+uepSelectionTermSubjects(row,term).length+'과목</span></header>
```

- index 1224695
```text
])]  };  function planHtml(){return '<div class="uep134-plan"><div class="uep134-title"><b>2026학년도 입학생 3개년 교육과정 편성표</b><span>학교교육과정DB 기준</span></div>'+Object.entries(plan).map(([sem,blocks])=>'<section class="uep134-sem"><h3>'+sem.replace('-','학년 ')+'학기</h3><div class="uep134-blocks">'+blocks.join('')+'</div></section>').join('')+'</div>';}  function setActive(btns,active){btns.forEach(b=>{b.style.background=b===active?'#0b8a78':'';b.style.color=b===active?'#fff':'';});}  function ensureTabs(){    const bs=[...document.querySelectorAll('button,[role="button"]')];    const student=bs.find(x=>exact(x,'학생신청')); const subject=bs.find(x=>exact(x,'과목별 신청현황')); if(!student||!subject)return;    const row=student.parentElement;if(!row||row!==subject.parentElement)return;    row.style.display='grid';row.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';row.style.gap='10px';    let planBtn=row.querySelector('[data-uep134-plan]');if(!planBtn){planBtn=student.cloneNode(true);planBtn.dataset.uep134Plan='1';planBtn.textContent='교육과정 편성표';row.insertBefore(planBtn,student);}    [planBtn,student,subject].forEach(b=>{b.style.width='100%';b.style.margin='0';});    if(!privileged()){subject.disabled=true;subject.setAttribute('aria-disabled','true');subject.title='관리자·학년부장 전용 대외비';subject.style.opacity='.48';subject.style.cursor='not-allowed';subject.textContent='🔒 과목별 신청현황';}    if(row.dataset.uep134Wired==='1')return;row.dataset.uep134Wired='1';    let panel=row.parentElement.querySelector('[data-uep134-plan-panel]');if(!panel){panel=document.createElement('div');panel.dataset.uep134PlanPanel='1';panel.innerHTML=planHtml();row.insertAdjacentElement('afterend',panel);panel.style.display='none';}    function hideContent(showPlan){let n=pan
```

- index 1225414
```text
tElement;if(!row||row!==subject.parentElement)return;    row.style.display='grid';row.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';row.style.gap='10px';    let planBtn=row.querySelector('[data-uep134-plan]');if(!planBtn){planBtn=student.cloneNode(true);planBtn.dataset.uep134Plan='1';planBtn.textContent='교육과정 편성표';row.insertBefore(planBtn,student);}    [planBtn,student,subject].forEach(b=>{b.style.width='100%';b.style.margin='0';});    if(!privileged()){subject.disabled=true;subject.setAttribute('aria-disabled','true');subject.title='관리자·학년부장 전용 대외비';subject.style.opacity='.48';subject.style.cursor='not-allowed';subject.textContent='🔒 과목별 신청현황';}    if(row.dataset.uep134Wired==='1')return;row.dataset.uep134Wired='1';    let panel=row.parentElement.querySelector('[data-uep134-plan-panel]');if(!panel){panel=document.createElement('div');panel.dataset.uep134PlanPanel='1';panel.innerHTML=planHtml();row.insertAdjacentElement('afterend',panel);panel.style.display='none';}    function hideContent(showPlan){let n=panel.nextElementSibling;while(n){if(showPlan){if(n.dataset.uep134OldDisplay===undefined)n.dataset.uep134OldDisplay=n.style.display||'';n.style.display='none';}else if(n.dataset.uep134OldDisplay!==undefined){n.style.display=n.dataset.uep134OldDisplay;delete n.dataset.uep134OldDisplay;}n=n.nextElementSibling;}panel.style.display=showPlan?'block':'none';}    planBtn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();hideContent(true);setActive([planBtn,student,subject],planBtn);},true);    student.addEventListener('click',()=>{hideContent(false);setActive([planBtn,student,subject],student);},true);    subject.addEventListener('click',async e=>{if(!privileged()){e.preventDefault();e.stopImm
```

- index 1227641
```text
,h4,p,span')];    const anchor=labels.find(el=>/민감정보.*비밀번호.*설정/.test(String(el.textContent||'').trim())); if(!anchor)return;    const host=anchor.closest('section,.card,.setting-row,.settings-section')||anchor.parentElement;if(!host||!host.parentElement)return;    const box=document.createElement('div');box.dataset.uep134PinSetting='1';box.style.cssText='margin-top:12px;padding:14px 16px;border:1px solid #d7e4e8;border-radius:14px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:16px';    const can=privileged();box.innerHTML='<div><b>선택과목 대외비 비밀번호 설정</b><div style="font-size:12px;color:#6b7b83;margin-top:4px">과목별 신청현황 전용 · 민감정보 비밀번호와 별도 관리</div></div><button type="button" data-uep134-pin-btn '+(can?'':'disabled')+' style="padding:9px 14px;border-radius:10px;border:1px solid #c9dce1;background:'+(can?'#eefaf7':'#f2f4f5')+';opacity:'+(can?'1':'.5')+'">'+(can?'설정/변경':'권한 없음')+'</button>';    host.insertAdjacentElement('afterend',box);    if(can)box.querySelector('[data-uep134-pin-btn]').onclick=async()=>{const p=prompt('새 선택과목 대외비 비밀번호를 4자리 이상 입력하세요.');if(!p||p.length<4)return alert('4자리 이상 입력해 주세요.');localStorage.setItem(PIN_KEY,await digest(p));sessionStorage.removeItem(SESSION_KEY);alert('선택과목 대외비 비밀번호가 저장되었습니다.');};  }  function fixFalseHolidayBadges(){    const falseDates=new Set(['2026-08-24','2026-08-25','2026-08-26','2026-08-27','2026-08-28','2026-08-29','2026-08-30','2026-08-31','2026-09-01','2026-09-02','2026-09-03','2026-09-04']);    [...document.querySelectorAll('[data-date],[data-day],td,.calendar-day,.day-cell')].forEach(cell=>{      let d=String(cell.dataset&&cell.dataset.date||cell.getAttribute&&cell.getAttribute('data-date')||'');      if(!falseDates.has(d))return;      [...
```

- index 1233197
```text
el"]')||sensitive.parentElement;     if(!host||!host.parentElement)return;     const can=privileged();     const box=document.createElement('section');     box.dataset.uep135SubjectSecurity='1';     box.style.cssText='margin-top:12px;padding:18px;border:1px solid #d8e5e8;border-radius:14px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:18px';     box.innerHTML='<div><div style="font-size:11px;letter-spacing:.08em;color:#168d7f;font-weight:700">CONFIDENTIAL · CURRICULUM</div><div style="font-size:17px;font-weight:800;margin-top:5px">🔐 선택과목 대외비 보안</div><div style="font-size:12px;color:#6b7c82;margin-top:6px">과목별 신청현황 전용 비밀번호 · 민감정보 비밀번호와 별도 관리</div></div><div style="display:flex;gap:8px;align-items:center"><span data-uep135-pin-state style="font-size:12px;color:#5d747b"></span><button type="button" data-uep135-pin-set '+(can?'':'disabled')+'>비밀번호 설정</button><button type="button" data-uep135-pin-lock '+(can?'':'disabled')+'>즉시 잠금</button></div>';     host.insertAdjacentElement('afterend',box);     const state=box.querySelector('[data-uep135-pin-state]');     const refresh=()=>{state.textContent=localStorage.getItem(PIN_KEY)?'비밀번호 설정됨':'비밀번호 설정 필요';};refresh();     if(!can){box.style.opacity='.55';box.querySelectorAll('button').forEach(b=>{b.style.cursor='not-allowed';b.title='관리자·학년부장 전용';});return;}     box.querySelector('[data-uep135-pin-set]').onclick=async()=>{       const p=prompt('새 선택과목 대외비 비밀번호를 4자리 이상 입력하세요.');       if(!p||p.length<4)return alert('4자리 이상 입력해 주세요.');       const p2=prompt('확인을 위해 같은 비밀번호를 다시 입력하세요.');       if(p!==p2)return alert('비밀번호가 일치하지 않습니다.');       localStorage.setItem(PIN_KEY,await digest(p));sessionStorage.removeItem(SESSION_KEY);refresh();alert('선택과목 대
```

- index 1234432
```text
opacity='.55';box.querySelectorAll('button').forEach(b=>{b.style.cursor='not-allowed';b.title='관리자·학년부장 전용';});return;}     box.querySelector('[data-uep135-pin-set]').onclick=async()=>{       const p=prompt('새 선택과목 대외비 비밀번호를 4자리 이상 입력하세요.');       if(!p||p.length<4)return alert('4자리 이상 입력해 주세요.');       const p2=prompt('확인을 위해 같은 비밀번호를 다시 입력하세요.');       if(p!==p2)return alert('비밀번호가 일치하지 않습니다.');       localStorage.setItem(PIN_KEY,await digest(p));sessionStorage.removeItem(SESSION_KEY);refresh();alert('선택과목 대외비 비밀번호가 저장되었습니다.');     };     box.querySelector('[data-uep135-pin-lock]').onclick=()=>{sessionStorage.removeItem(SESSION_KEY);alert('과목별 신청현황을 즉시 잠갔습니다.');};   }    function visibleMonth(){     const txt=String(document.body.textContent||'');     const m=txt.match(/(20\d{2})년\s*(\d{1,2})월/);     return m?{y:+m[1],m:+m[2]}:null;   }   function dayNumberElement(cell){     return [...cell.querySelectorAll('span,b,strong,div')].find(el=>/^\d{1,2}$/.test(String(el.textContent||'').trim())&&el.children.length===0)||null;   }   function likelyCellFromBadge(badge){     let n=badge;     for(let i=0;i<7&&n;i++,n=n.parentElement){       const d=dayNumberElement(n);       if(d){const r=n.getBoundingClientRect();if(r.width>90&&r.height>60)return n;}     }     return badge.closest('td,[data-date],[data-day],.calendar-day,.day-cell');   }   function repairFalseHolidayCalendar(){     const vm=visibleMonth();if(!vm||vm.y!==2026||vm.m!==8)return;     const badges=[...document.querySelectorAll('span,b,em,small,div')].filter(el=>exact(el,'공휴일'));     badges.forEach(b=>{       const cell=likelyCellFromBadge(b);if(!cell)return;       const dEl=dayNumberElement(cell);if(!dEl)return;       const day=+String(dEl.textContent||'').trim();  
```

### 공결·지각 학생

- index 738499
```text
ams:[...new Set(rows.map(row=>String(row.programTitle||row.programName||row.title||row.activityName||'프로그램명 확인 필요').trim()).filter(Boolean))]});   const submittedGroups=allReportGroups.filter(group=>dashboardReportGroupState(group).state==="complete").map(group=>reportGroupWithRows(group,group.rows));   const progressGroups=allReportGroups.filter(group=>dashboardReportGroupState(group).state==="progress").map(group=>reportGroupWithRows(group,group.rows));   const missingGroups=allReportGroups.filter(group=>dashboardReportGroupState(group).state==="missing").map(group=>reportGroupWithRows(group,group.rows));   const configs={     late:{title:'공결·지각 학생',page:'attendance',rows:[...official,...late],attendance:true,dateSelectable:true},     night:{title:'야자 참여 학생',page:'attendance',rows:(readonlyCache?.nightAttendance||readonlyCache?.attendance||[]).filter(r=>String(r.date||r.day||'').slice(0,10)===basisDate&&nightRecordIsAttendance(r)),dateSelectable:true},     submitted:{title:'선택활동 보고서 제출완료 학생',page:'programs',rows:submittedGroups,report:true,reportGrouped:true},     progress:{title:'선택활동 보고서 제출중 학생',page:'programs',rows:progressGroups,report:true,reportGrouped:true},     report:{title:'선택활동 보고서 미제출 학생',page:'programs',rows:missingGroups,report:true,reportGrouped:true},     outing:{title:'오늘 학사 외출 학생',page:'attendance',rows:(readonlyCache?.dormOutings||readonlyCache?.outings||[]).filter(r=>String(r.date||r.day||'').slice(0,10)===basisDate)},     absent:{title:'오늘 프로그램 불참 학생',page:'programs',rows:(readonlyCache?.programAttendance||[]).filter(r=>String(r.date||r.day||'').slice(0,10)===basisDate&&/불참|결석|미참여/.test(String(r.status||r.result||'')))}   };   const cfg=configs[kind]||configs.late;   const scoped=cfg.reportGrouped?
```

- index 1237041
```text
nceDetail(chip){     const meta=collectMeta(chip);     const type=(meta.match(/공조퇴|공지각|공외출|공결|조퇴|지각|외출/)||[])[0]||'공결';     const period=(meta.match(/(?:\d{1,2}\s*[~\-]\s*\d{1,2}|\d{1,2})\s*교시/)||[])[0]||'';     const time=(meta.match(/\d{1,2}:\d{2}\s*[~\-]\s*\d{1,2}:\d{2}/)||[])[0]||'';     return [type,period||time].filter(Boolean).join(' ');   }   function currentStatusDate(){     const inp=[...document.querySelectorAll('input[type="date"]')].find(x=>x.value);if(inp)return inp.value;     const m=String(document.body.textContent||'').match(/기준일\s*(20\d{2}-\d{2}-\d{2})/);return m?m[1]:'';   }   function wireAttendanceStatusCards(){     if(!/공결·지각 학생/.test(String(document.body.textContent||'')))return;     const date=currentStatusDate();     const chips=[...document.querySelectorAll('button,[role="button"],.chip,.badge,div')].filter(el=>/^\d{4}\s+\S+/.test(String(el.textContent||'').trim())&&/공결|지각|조퇴|외출/.test(String(el.textContent||'')));     chips.forEach(chip=>{       if(chip.dataset.uep135Attendance==='1')return;chip.dataset.uep135Attendance='1';       const raw=String(chip.textContent||'').trim();const who=(raw.match(/^(\d{4})\s+([^\s]+)/)||[]);if(!who[1])return;       const detail=inferAttendanceDetail(chip);chip.textContent=who[1]+' '+who[2]+' · '+detail;       chip.style.cursor='pointer';chip.title='출결 메뉴의 해당 날짜로 이동';       chip.addEventListener('click',()=>{         sessionStorage.setItem(DEEP_KEY,JSON.stringify({date:date,studentNo:who[1],name:who[2],detail}));         const menu=[...document.querySelectorAll('button,a,[role="button"],nav *')].find(x=>exact(x,'출결'));         if(menu)menu.click();       });     });   }   function applyAttendanceDeepLink(){     const raw=sessionStorage.getItem(DEEP_KEY);if(!raw)r
```

### official

- index 21427
```text
:false, nightException:true, nightSummary:false },   },   activePage: "dashboard",   timetableTab: "mine",   calendarMode: "month", }; let state = structuredClone(baseState),   helpOpen = "start"; let googleConnectionStatus = { ok: false, encryption: false }; let readonlyCache = null; let googleConnectionError = ""; let readonlyAutoRefreshTimer = null; const READONLY_AUTO_REFRESH_MS = 10 * 60 * 1000; let neisData = null; let neisError = ""; let neisLoading = false; let lastPeriodAlertKey = ""; let outingViewDate = new Date(today); let attendanceMode = "late"; let attendanceStatStudentFilter = "all"; let attendanceStatClassFilter = "all"; let officialClassFilter = "all"; let officialStudentFilter = "all"; let lateClassFilter = "all"; let nightClassFilter = "1"; let attendanceViewDate = dateKey(today); let nightViewMonth = dateKey(today).slice(0, 7); let programMode = "home"; let programPlanningMode = "overview"; let commonProgramArea="autonomy"; let commonProgramClassNo="1"; let commonCareerTerm="1학기"; let programMonth = dateKey(today).slice(0,7); let dormMode = "g1s2"; let scoreMode = "internal"; let scorePeriod = "all"; let scoreStatisticsType = "mock"; let scoreStatisticsExam = ""; let scoreStatisticsClass = "all"; let admissionMode = "growth"; let admissionManagementFilter = "all"; let recordMode = "activities"; let recordWriterArea = "autonomy"; let recordWriterSelected = new Set(); const recordDraftKey = (studentId,area)=>`uep-record-draft:${studentId}:${area}`; let recordAiConfigured = false; let recordSdgsDetail = ""; let recordCareerDateBusy = ""; let recordCareerAutoRunning = false; let recordCareerSemesterScanRunning=false; let recordCareerSemesterScanProgress="";  const recordCareerWeekCache = new Map();  cons
```

- index 21460
```text
tSummary:false },   },   activePage: "dashboard",   timetableTab: "mine",   calendarMode: "month", }; let state = structuredClone(baseState),   helpOpen = "start"; let googleConnectionStatus = { ok: false, encryption: false }; let readonlyCache = null; let googleConnectionError = ""; let readonlyAutoRefreshTimer = null; const READONLY_AUTO_REFRESH_MS = 10 * 60 * 1000; let neisData = null; let neisError = ""; let neisLoading = false; let lastPeriodAlertKey = ""; let outingViewDate = new Date(today); let attendanceMode = "late"; let attendanceStatStudentFilter = "all"; let attendanceStatClassFilter = "all"; let officialClassFilter = "all"; let officialStudentFilter = "all"; let lateClassFilter = "all"; let nightClassFilter = "1"; let attendanceViewDate = dateKey(today); let nightViewMonth = dateKey(today).slice(0, 7); let programMode = "home"; let programPlanningMode = "overview"; let commonProgramArea="autonomy"; let commonProgramClassNo="1"; let commonCareerTerm="1학기"; let programMonth = dateKey(today).slice(0,7); let dormMode = "g1s2"; let scoreMode = "internal"; let scorePeriod = "all"; let scoreStatisticsType = "mock"; let scoreStatisticsExam = ""; let scoreStatisticsClass = "all"; let admissionMode = "growth"; let admissionManagementFilter = "all"; let recordMode = "activities"; let recordWriterArea = "autonomy"; let recordWriterSelected = new Set(); const recordDraftKey = (studentId,area)=>`uep-record-draft:${studentId}:${area}`; let recordAiConfigured = false; let recordSdgsDetail = ""; let recordCareerDateBusy = ""; let recordCareerAutoRunning = false; let recordCareerSemesterScanRunning=false; let recordCareerSemesterScanProgress="";  const recordCareerWeekCache = new Map();  const recordCareerDateKey=(activityId
```

- index 63537
```text
'change'));}     requestAnimationFrame(()=>{const target=$('#admissionStudent');if(target){target.value=student.id;$('#admissionQueryButton')?.click();}});   }else if(page==='attendance'){     attendanceStatStudentFilter=attendanceStudentKey(student);   }else if(page==='records'){     recordQueryMode='student'; recordClassNo=classNo||recordClassNo; recordStudentId=student.id;   } } function goFromStudentDashboard(page,target=''){   const student=studentFocusStudent();   if(page==='scores')scoreMode='combined';   if(page==='admissions')admissionMode=target==='combined'?'combined':(target||'combined');   if(page==='attendance')attendanceMode=['official','late','night'].includes(target)?target:'statistics';   closeDrawer();   navigate(page);   // navigate()는 좌측 메뉴 진입 규칙에 따라 생활기록부 첫 탭을 활동내역으로 초기화한다.   // 학생 대시보드의 선택과목 전체보기에서는 해당 학생·교육과정 탭을 다시 명시하여 흐름을 보존한다.   if(page==='records'){     recordMode=target==='curriculum'?'curriculum':target==='final'?'final':'activities';     recordQueryMode='student';     if(student){recordStudentId=student.id;recordClassNo=recordStudentClass(student)||recordClassNo;}     render('records');   }   if(page==='attendance'){     attendanceMode=['official','late','night'].includes(target)?target:'statistics';     if(student)attendanceStatStudentFilter=attendanceStudentKey(student);     render('attendance');     window.scrollTo(0,0);   } }  function navigate(page) {   if(setupWizardActive){ renderSetupWizard(); return; }   // v0.78.7: hidden legacy pages are routed into their integrated hubs.   const routedTimetable=page==="timetable", routedDuties=page==="duties", routedForms=page==="forms";   if(routedTimetable){ calendarHubMode="timetable"; page="calendar"; }   if(routedDuties){ workEmbeddedMode="
```

- index 64074
```text
ns')admissionMode=target==='combined'?'combined':(target||'combined');   if(page==='attendance')attendanceMode=['official','late','night'].includes(target)?target:'statistics';   closeDrawer();   navigate(page);   // navigate()는 좌측 메뉴 진입 규칙에 따라 생활기록부 첫 탭을 활동내역으로 초기화한다.   // 학생 대시보드의 선택과목 전체보기에서는 해당 학생·교육과정 탭을 다시 명시하여 흐름을 보존한다.   if(page==='records'){     recordMode=target==='curriculum'?'curriculum':target==='final'?'final':'activities';     recordQueryMode='student';     if(student){recordStudentId=student.id;recordClassNo=recordStudentClass(student)||recordClassNo;}     render('records');   }   if(page==='attendance'){     attendanceMode=['official','late','night'].includes(target)?target:'statistics';     if(student)attendanceStatStudentFilter=attendanceStudentKey(student);     render('attendance');     window.scrollTo(0,0);   } }  function navigate(page) {   if(setupWizardActive){ renderSetupWizard(); return; }   // v0.78.7: hidden legacy pages are routed into their integrated hubs.   const routedTimetable=page==="timetable", routedDuties=page==="duties", routedForms=page==="forms";   if(routedTimetable){ calendarHubMode="timetable"; page="calendar"; }   if(routedDuties){ workEmbeddedMode="duties"; page="work"; }   if(routedForms){ workEmbeddedMode="forms"; page="work"; }   if(page==="alerts"){ outputHubMode="alerts"; page="outputs"; }   if(page==="calendar" && state.activePage!=="calendar" && !routedTimetable) calendarHubMode="schedule";   if(page==="work" && state.activePage!=="work" && !routedDuties && !routedForms) workEmbeddedMode="home";   // 좌측 메뉴를 다시 누르거나 다른 메뉴로 이동하면 해당 모듈의 첫 화면부터 시작합니다.   if(page==="inputs"){     inputCenterConfig.manualText="";   }else if(page==="outputs"){     outputCenterState.home=true; 
```

- index 102814
```text
(student) => classNumberOf(student) === String(classNo));       const dormCount = members.filter((student) => student.dorm === "학사").length;       return `<button class="student-class-card" data-student-class="${escapeHtml(classNo)}" aria-pressed="false"><small>${escapeHtml(classNo)}반</small><b>${members.length}명</b><span>학사 ${dormCount}명</span></button>`;     }).join("");     const rows = liveStudents.map((student, i) => `<button class="student-detail-card student-row hidden ${studentHeatClass(student)}" data-student="${i}" data-class="${escapeHtml(classNumberOf(student))}" data-search="${escapeHtml([student.studentNo, student.name, student.officialName, student.displayName, student.className, student.middleSchool].join(" ").toLowerCase())}" data-status="${escapeHtml(student.status || "재학")}"><header><b>${escapeHtml(student.studentNo || "-")} ${escapeHtml(student.name)}</b><em>상세 ›</em></header><div><span><small>학적</small>${escapeHtml(student.status || "재학")}</span><span><small>학사</small>${escapeHtml(student.dorm || "-")}</span><span><small>NFC</small>${escapeHtml(student.nfc || "-")}</span></div><footer>${escapeHtml(student.middleSchool || "-")}</footer></button>`).join("");     return `<div class="module-page student-master-page student-master-compact">${studentPageTabs}<div class="student-class-dashboard">${classCards}</div><div class="toolbar student-master-toolbar"><input class="search" type="search" id="studentMasterSearch" placeholder="학번·이름·반·출신중학교 검색"><select class="filter" id="studentStatusFilter"><option value="">전체 학적</option><option>재학</option><option>전입</option><option>전출</option><option>자퇴</option></select><div class="student-heat-period" title="학생카드 색은 선택 기간 안의 클릭 횟수로 계산됩니다."><small>카드색 기준</small><button
```

- index 175200
```text
const students=(readonlyCache?.students||[]).slice().sort((a,b)=>String(a.studentNo||"").localeCompare(String(b.studentNo||"")));   const selectedNo=String(row?.studentNo||"");   const options=students.map(student=>`<option value="${escapeHtml(student.studentNo||"")}" ${String(student.studentNo)===selectedNo?"selected":""}>${escapeHtml(student.studentNo||"")} ${escapeHtml(student.name||"")} · ${escapeHtml(classNumberOf(student))}반</option>`).join("");   $("#drawerKicker").textContent=row?"OFFICIAL ATTENDANCE · EDIT":"OFFICIAL ATTENDANCE · NEW";   $("#drawerTitle").textContent=row?"공결 기록 수정":"공결 기록 등록";   $("#drawerBody").innerHTML=`<form id="officialAttendanceEditor" class="official-attendance-editor official-attendance-editor-v2">     <div class="official-editor-hero"><span>${row?"EDIT":"NEW"}</span><div><b>${row?"기존 공결 내용을 정확하게 수정합니다.":"새 공결 기록을 기본정보 연결시트에 등록합니다."}</b><small>저장 즉시 30_공결기록과 UEP 조회 화면에 반영됩니다.</small></div></div>     <section class="official-editor-section"><header><b>대상·일자</b><small>학생과 공결 적용일을 선택합니다.</small></header><div class="official-editor-grid two">       <label>일자<input type="date" id="officialDate" required value="${escapeHtml(row?.date||attendanceViewDate||dateKey(today))}"></label>       <label>학생<select id="officialStudent" required><option value="">학생 선택</option>${options}</select></label>     </div></section>     <section class="official-editor-section"><header><b>출결 구분</b><small>하루 전체 또는 교시 단위로 기록할 수 있습니다.</small></header><div class="official-editor-grid four">       <label>출결구분<select id="officialAttendanceType"><option ${row?.attendanceType==="출석인정"?"selected":""}>출석인정</option><option ${row?.attendanceType==="질병"?"selected":""}>질병</option><option ${row?.attendanceType==="미인정"?"selected":"
```

- index 175233
```text
udents||[]).slice().sort((a,b)=>String(a.studentNo||"").localeCompare(String(b.studentNo||"")));   const selectedNo=String(row?.studentNo||"");   const options=students.map(student=>`<option value="${escapeHtml(student.studentNo||"")}" ${String(student.studentNo)===selectedNo?"selected":""}>${escapeHtml(student.studentNo||"")} ${escapeHtml(student.name||"")} · ${escapeHtml(classNumberOf(student))}반</option>`).join("");   $("#drawerKicker").textContent=row?"OFFICIAL ATTENDANCE · EDIT":"OFFICIAL ATTENDANCE · NEW";   $("#drawerTitle").textContent=row?"공결 기록 수정":"공결 기록 등록";   $("#drawerBody").innerHTML=`<form id="officialAttendanceEditor" class="official-attendance-editor official-attendance-editor-v2">     <div class="official-editor-hero"><span>${row?"EDIT":"NEW"}</span><div><b>${row?"기존 공결 내용을 정확하게 수정합니다.":"새 공결 기록을 기본정보 연결시트에 등록합니다."}</b><small>저장 즉시 30_공결기록과 UEP 조회 화면에 반영됩니다.</small></div></div>     <section class="official-editor-section"><header><b>대상·일자</b><small>학생과 공결 적용일을 선택합니다.</small></header><div class="official-editor-grid two">       <label>일자<input type="date" id="officialDate" required value="${escapeHtml(row?.date||attendanceViewDate||dateKey(today))}"></label>       <label>학생<select id="officialStudent" required><option value="">학생 선택</option>${options}</select></label>     </div></section>     <section class="official-editor-section"><header><b>출결 구분</b><small>하루 전체 또는 교시 단위로 기록할 수 있습니다.</small></header><div class="official-editor-grid four">       <label>출결구분<select id="officialAttendanceType"><option ${row?.attendanceType==="출석인정"?"selected":""}>출석인정</option><option ${row?.attendanceType==="질병"?"selected":""}>질병</option><option ${row?.attendanceType==="미인정"?"selected":""}>미인정</option><option ${row?.att
```

- index 175260
```text
,b)=>String(a.studentNo||"").localeCompare(String(b.studentNo||"")));   const selectedNo=String(row?.studentNo||"");   const options=students.map(student=>`<option value="${escapeHtml(student.studentNo||"")}" ${String(student.studentNo)===selectedNo?"selected":""}>${escapeHtml(student.studentNo||"")} ${escapeHtml(student.name||"")} · ${escapeHtml(classNumberOf(student))}반</option>`).join("");   $("#drawerKicker").textContent=row?"OFFICIAL ATTENDANCE · EDIT":"OFFICIAL ATTENDANCE · NEW";   $("#drawerTitle").textContent=row?"공결 기록 수정":"공결 기록 등록";   $("#drawerBody").innerHTML=`<form id="officialAttendanceEditor" class="official-attendance-editor official-attendance-editor-v2">     <div class="official-editor-hero"><span>${row?"EDIT":"NEW"}</span><div><b>${row?"기존 공결 내용을 정확하게 수정합니다.":"새 공결 기록을 기본정보 연결시트에 등록합니다."}</b><small>저장 즉시 30_공결기록과 UEP 조회 화면에 반영됩니다.</small></div></div>     <section class="official-editor-section"><header><b>대상·일자</b><small>학생과 공결 적용일을 선택합니다.</small></header><div class="official-editor-grid two">       <label>일자<input type="date" id="officialDate" required value="${escapeHtml(row?.date||attendanceViewDate||dateKey(today))}"></label>       <label>학생<select id="officialStudent" required><option value="">학생 선택</option>${options}</select></label>     </div></section>     <section class="official-editor-section"><header><b>출결 구분</b><small>하루 전체 또는 교시 단위로 기록할 수 있습니다.</small></header><div class="official-editor-grid four">       <label>출결구분<select id="officialAttendanceType"><option ${row?.attendanceType==="출석인정"?"selected":""}>출석인정</option><option ${row?.attendanceType==="질병"?"selected":""}>질병</option><option ${row?.attendanceType==="미인정"?"selected":""}>미인정</option><option ${row?.attendanceType==="기타"?"selecte
```

### 출석인정

- index 176153
```text
on class="official-editor-section"><header><b>대상·일자</b><small>학생과 공결 적용일을 선택합니다.</small></header><div class="official-editor-grid two">       <label>일자<input type="date" id="officialDate" required value="${escapeHtml(row?.date||attendanceViewDate||dateKey(today))}"></label>       <label>학생<select id="officialStudent" required><option value="">학생 선택</option>${options}</select></label>     </div></section>     <section class="official-editor-section"><header><b>출결 구분</b><small>하루 전체 또는 교시 단위로 기록할 수 있습니다.</small></header><div class="official-editor-grid four">       <label>출결구분<select id="officialAttendanceType"><option ${row?.attendanceType==="출석인정"?"selected":""}>출석인정</option><option ${row?.attendanceType==="질병"?"selected":""}>질병</option><option ${row?.attendanceType==="미인정"?"selected":""}>미인정</option><option ${row?.attendanceType==="기타"?"selected":""}>기타</option></select></label>       <label>세부구분<select id="officialDetailType"><option ${row?.detailType==="결석"?"selected":""}>결석</option><option ${row?.detailType==="조퇴"?"selected":""}>조퇴</option><option ${row?.detailType==="지각"?"selected":""}>지각</option><option ${row?.detailType==="결과"?"selected":""}>결과</option></select></label>       <label>시작교시<input id="officialStartPeriod" inputmode="numeric" value="${escapeHtml(row?.startPeriod||"")}" placeholder="예: 5"></label>       <label>종료교시<input id="officialEndPeriod" inputmode="numeric" value="${escapeHtml(row?.endPeriod||"")}" placeholder="예: 7"></label>     </div></section>     <section class="official-editor-section"><header><b>사유·근거</b><small>담임이 바로 이해할 수 있도록 구체적으로 작성합니다.</small></header><div class="official-editor-grid two">       <label class="span-two">사유<input id="officialReason" required value="${escapeHtml(row?.reaso
```

- index 176174
```text
itor-section"><header><b>대상·일자</b><small>학생과 공결 적용일을 선택합니다.</small></header><div class="official-editor-grid two">       <label>일자<input type="date" id="officialDate" required value="${escapeHtml(row?.date||attendanceViewDate||dateKey(today))}"></label>       <label>학생<select id="officialStudent" required><option value="">학생 선택</option>${options}</select></label>     </div></section>     <section class="official-editor-section"><header><b>출결 구분</b><small>하루 전체 또는 교시 단위로 기록할 수 있습니다.</small></header><div class="official-editor-grid four">       <label>출결구분<select id="officialAttendanceType"><option ${row?.attendanceType==="출석인정"?"selected":""}>출석인정</option><option ${row?.attendanceType==="질병"?"selected":""}>질병</option><option ${row?.attendanceType==="미인정"?"selected":""}>미인정</option><option ${row?.attendanceType==="기타"?"selected":""}>기타</option></select></label>       <label>세부구분<select id="officialDetailType"><option ${row?.detailType==="결석"?"selected":""}>결석</option><option ${row?.detailType==="조퇴"?"selected":""}>조퇴</option><option ${row?.detailType==="지각"?"selected":""}>지각</option><option ${row?.detailType==="결과"?"selected":""}>결과</option></select></label>       <label>시작교시<input id="officialStartPeriod" inputmode="numeric" value="${escapeHtml(row?.startPeriod||"")}" placeholder="예: 5"></label>       <label>종료교시<input id="officialEndPeriod" inputmode="numeric" value="${escapeHtml(row?.endPeriod||"")}" placeholder="예: 7"></label>     </div></section>     <section class="official-editor-section"><header><b>사유·근거</b><small>담임이 바로 이해할 수 있도록 구체적으로 작성합니다.</small></header><div class="official-editor-grid two">       <label class="span-two">사유<input id="officialReason" required value="${escapeHtml(row?.reasonText||row?.reason||"
```

### 조퇴

- index 1250
```text
, hour12:false }).format(parsed); }; const addDateDays = (dateText, days) => {   const date = new Date(`${dateText || dateKey(today)}T12:00:00`);   if (Number.isNaN(date.getTime())) return "";   date.setDate(date.getDate() + Number(days || 0));   return dateKey(date); }; const daysFromToday = (dateText) => {   const due = new Date(`${dateText}T12:00:00`), now = new Date(`${dateKey(today)}T12:00:00`);   return Number.isNaN(due.getTime()) ? null : Math.round((due-now)/86400000); };  const SOURCE_REFERENCE_DATA = {"approval":[["근무지내 출장(관내출장)","결보강담당(협조) → 교무부장 → 교감","청주시내"],["근무지외 출장(관외출장)","결보강담당(협조) → 교무부장 → 윤혜옥 부장(협조) → 교감 → 교장","청주시외"],["외출·조퇴·지각","결보강담당(협조) → 교무부장 → 교감",""],["연가·병가·결근(1일 이내)","결보강담당(협조) → 교무부장 → 교감 → 교장","연가 사유 미기재(해외여행 제외)"],["연가·병가·결근(2일 이상)","결보강담당(협조) → 교무부장 → 장영인 부장(협조) → 행정실장(협조) → 교감 → 교장","해외여행 시 국가명 기재, 병가 누계 7일째부터 진단서 제출"],["특별휴가(경조사)","결보강담당 → 교무부장 → 행정실장(협조) → 교감 → 교장","복무지침 일수 확인"],["초과근무 신청","방과후부장 → 교감","방과후 수업이 없는 경우 16:30부터, 16:00 이전 상신, 이중지급 불가"],["EVPN 신청","정보부장 → 교감 → 교장",""],["회계 관련 결재(지출 품의)","담당교사 → 담당부장 → 윤혜옥 부장(협조) → 행정실장(협조) → 교감 → 교장","행정실 사전 협의, 품의결재 후 시행"],["일반 교무 행정","담당교사 → 담당부장 → 교감 → 교장",""],["회계 포함 교무 행정","지출 품의 결재선과 동일","예산액 100만원 이상은 별도 계약 필요, 행정실 사전 협의"],["행사 진행 일정 포함 결재","담당교사 → 담당부장 → 교무부장(협조) → 교감 → 교장",""],["교외체험학습","담임교사 → 교무부장 → 교감 → 교장","나이스 학부모서비스 신청, 3일 전 신청·체험 후 7일 이내 결과보고서"],["시상 관련 업무","담당교사 → 시상계(협조) → 교무부장 → 교감 → 교장","상신 전 교육계획서 수상명·인원 일치 확인"]],"homeroom":[["1","1","천부성","홍석민"],["1","2","이은경","유병석"],["1","3","김현태","송정은"],["1","4","최혜선","홍성출"],["1","5","이태연","김영숙"],["1","6","서월산","임중명"],["1","7","우순정","임종근"],["1","8","서진미","홍석민"],["1","9","박은규","설영란"],["2","1","조성호","윤용철"],["2","2","배진우","박종민"],["2","3","이의지","이동하"],["2","4","신현서","박연오"],["2","5","반민정",
```

- index 176533
```text
label>     </div></section>     <section class="official-editor-section"><header><b>출결 구분</b><small>하루 전체 또는 교시 단위로 기록할 수 있습니다.</small></header><div class="official-editor-grid four">       <label>출결구분<select id="officialAttendanceType"><option ${row?.attendanceType==="출석인정"?"selected":""}>출석인정</option><option ${row?.attendanceType==="질병"?"selected":""}>질병</option><option ${row?.attendanceType==="미인정"?"selected":""}>미인정</option><option ${row?.attendanceType==="기타"?"selected":""}>기타</option></select></label>       <label>세부구분<select id="officialDetailType"><option ${row?.detailType==="결석"?"selected":""}>결석</option><option ${row?.detailType==="조퇴"?"selected":""}>조퇴</option><option ${row?.detailType==="지각"?"selected":""}>지각</option><option ${row?.detailType==="결과"?"selected":""}>결과</option></select></label>       <label>시작교시<input id="officialStartPeriod" inputmode="numeric" value="${escapeHtml(row?.startPeriod||"")}" placeholder="예: 5"></label>       <label>종료교시<input id="officialEndPeriod" inputmode="numeric" value="${escapeHtml(row?.endPeriod||"")}" placeholder="예: 7"></label>     </div></section>     <section class="official-editor-section"><header><b>사유·근거</b><small>담임이 바로 이해할 수 있도록 구체적으로 작성합니다.</small></header><div class="official-editor-grid two">       <label class="span-two">사유<input id="officialReason" required value="${escapeHtml(row?.reasonText||row?.reason||"")}" placeholder="공결 사유를 입력하세요"></label>       <label>장소<input id="officialPlace" value="${escapeHtml(row?.place||"")}" placeholder="장소"></label>       <label>증빙상태<select id="officialEvidence"><option ${row?.evidence==="불필요"?"selected":""}>불필요</option><option ${row?.evidence==="확인완료"?"selected":""}>확인완료</option><option ${row?.evidence==="미확인"?"selected":""}
```

- index 176552
```text
section>     <section class="official-editor-section"><header><b>출결 구분</b><small>하루 전체 또는 교시 단위로 기록할 수 있습니다.</small></header><div class="official-editor-grid four">       <label>출결구분<select id="officialAttendanceType"><option ${row?.attendanceType==="출석인정"?"selected":""}>출석인정</option><option ${row?.attendanceType==="질병"?"selected":""}>질병</option><option ${row?.attendanceType==="미인정"?"selected":""}>미인정</option><option ${row?.attendanceType==="기타"?"selected":""}>기타</option></select></label>       <label>세부구분<select id="officialDetailType"><option ${row?.detailType==="결석"?"selected":""}>결석</option><option ${row?.detailType==="조퇴"?"selected":""}>조퇴</option><option ${row?.detailType==="지각"?"selected":""}>지각</option><option ${row?.detailType==="결과"?"selected":""}>결과</option></select></label>       <label>시작교시<input id="officialStartPeriod" inputmode="numeric" value="${escapeHtml(row?.startPeriod||"")}" placeholder="예: 5"></label>       <label>종료교시<input id="officialEndPeriod" inputmode="numeric" value="${escapeHtml(row?.endPeriod||"")}" placeholder="예: 7"></label>     </div></section>     <section class="official-editor-section"><header><b>사유·근거</b><small>담임이 바로 이해할 수 있도록 구체적으로 작성합니다.</small></header><div class="official-editor-grid two">       <label class="span-two">사유<input id="officialReason" required value="${escapeHtml(row?.reasonText||row?.reason||"")}" placeholder="공결 사유를 입력하세요"></label>       <label>장소<input id="officialPlace" value="${escapeHtml(row?.place||"")}" placeholder="장소"></label>       <label>증빙상태<select id="officialEvidence"><option ${row?.evidence==="불필요"?"selected":""}>불필요</option><option ${row?.evidence==="확인완료"?"selected":""}>확인완료</option><option ${row?.evidence==="미확인"?"selected":""}>미확인</option><optio
```

- index 1008992
```text
|"출석부 연결")}</span></div></div><div class="program-notice attendance-linked"><b>표시 기준</b><p>11_방과후학교의 강좌, 12_차시일정의 실제수업일·야자영향타임, 13_출석부의 학생 등록이 모두 일치한 경우에만 표시됩니다.</p></div><div class="program-actions"><button class="btn primary" id="openNightProgramFull">전체 프로그램 상세</button></div></div>`;   $("#drawer").classList.remove("program-expanded","hidden"); $("#drawerBackdrop").classList.remove("hidden");   $("#openNightProgramFull")?.addEventListener("click",()=>openAfterschoolProgramDrawer(id)); }  function normalizeAfterAttendanceStatus(value){   const text=String(value||"").trim();   if(/불참\(인정\)|공결|공식 ?행사|인정/.test(text))return "불참(인정)";   if(/불참\(조퇴\)|조퇴/.test(text))return "불참(조퇴)";   if(/불참\(결석\)|병결|결석/.test(text))return "불참(결석)";   if(/불참\(미인정\)|미인정|무단|불참/.test(text))return "불참(미인정)";   if(/수강|출석|참여|정상|입실|지각/.test(text))return "수강";   return "신청"; } function afterAttendanceOverrideKey(program,student){   return [program.sessionId||program.id||"",student.studentId||student.studentNo||student.number||student.name||""].join("|"); } function resolvedAfterAttendanceStatus(program,student){   const key=afterAttendanceOverrideKey(program,student);   return state.afterAttendanceOverrides?.[key]||normalizeAfterAttendanceStatus(student.attendance||student.result||student.participation); } const AFTER_ATTENDANCE_STATUSES=["신청","수강","불참(미인정)","불참(결석)","불참(조퇴)","불참(인정)"];  function openAfterschoolProgramDrawer(id) {   const sourceProgram = [...afterSchoolProgramGroups(),...groupedAfterSchoolCourses(afterSchoolProgramGroups())].find((item) => item.id === id);   const program = programWithOverride(sourceProgram);   if (!program) return;   const students = (program.students || []).slice().sort((a,b)=>Number(programStudentGrade(a))-Number(p
```

- index 1008997
```text
 연결")}</span></div></div><div class="program-notice attendance-linked"><b>표시 기준</b><p>11_방과후학교의 강좌, 12_차시일정의 실제수업일·야자영향타임, 13_출석부의 학생 등록이 모두 일치한 경우에만 표시됩니다.</p></div><div class="program-actions"><button class="btn primary" id="openNightProgramFull">전체 프로그램 상세</button></div></div>`;   $("#drawer").classList.remove("program-expanded","hidden"); $("#drawerBackdrop").classList.remove("hidden");   $("#openNightProgramFull")?.addEventListener("click",()=>openAfterschoolProgramDrawer(id)); }  function normalizeAfterAttendanceStatus(value){   const text=String(value||"").trim();   if(/불참\(인정\)|공결|공식 ?행사|인정/.test(text))return "불참(인정)";   if(/불참\(조퇴\)|조퇴/.test(text))return "불참(조퇴)";   if(/불참\(결석\)|병결|결석/.test(text))return "불참(결석)";   if(/불참\(미인정\)|미인정|무단|불참/.test(text))return "불참(미인정)";   if(/수강|출석|참여|정상|입실|지각/.test(text))return "수강";   return "신청"; } function afterAttendanceOverrideKey(program,student){   return [program.sessionId||program.id||"",student.studentId||student.studentNo||student.number||student.name||""].join("|"); } function resolvedAfterAttendanceStatus(program,student){   const key=afterAttendanceOverrideKey(program,student);   return state.afterAttendanceOverrides?.[key]||normalizeAfterAttendanceStatus(student.attendance||student.result||student.participation); } const AFTER_ATTENDANCE_STATUSES=["신청","수강","불참(미인정)","불참(결석)","불참(조퇴)","불참(인정)"];  function openAfterschoolProgramDrawer(id) {   const sourceProgram = [...afterSchoolProgramGroups(),...groupedAfterSchoolCourses(afterSchoolProgramGroups())].find((item) => item.id === id);   const program = programWithOverride(sourceProgram);   if (!program) return;   const students = (program.students || []).slice().sort((a,b)=>Number(programStudentGrade(a))-Number(progra
```

- index 1009023
```text
div class="program-notice attendance-linked"><b>표시 기준</b><p>11_방과후학교의 강좌, 12_차시일정의 실제수업일·야자영향타임, 13_출석부의 학생 등록이 모두 일치한 경우에만 표시됩니다.</p></div><div class="program-actions"><button class="btn primary" id="openNightProgramFull">전체 프로그램 상세</button></div></div>`;   $("#drawer").classList.remove("program-expanded","hidden"); $("#drawerBackdrop").classList.remove("hidden");   $("#openNightProgramFull")?.addEventListener("click",()=>openAfterschoolProgramDrawer(id)); }  function normalizeAfterAttendanceStatus(value){   const text=String(value||"").trim();   if(/불참\(인정\)|공결|공식 ?행사|인정/.test(text))return "불참(인정)";   if(/불참\(조퇴\)|조퇴/.test(text))return "불참(조퇴)";   if(/불참\(결석\)|병결|결석/.test(text))return "불참(결석)";   if(/불참\(미인정\)|미인정|무단|불참/.test(text))return "불참(미인정)";   if(/수강|출석|참여|정상|입실|지각/.test(text))return "수강";   return "신청"; } function afterAttendanceOverrideKey(program,student){   return [program.sessionId||program.id||"",student.studentId||student.studentNo||student.number||student.name||""].join("|"); } function resolvedAfterAttendanceStatus(program,student){   const key=afterAttendanceOverrideKey(program,student);   return state.afterAttendanceOverrides?.[key]||normalizeAfterAttendanceStatus(student.attendance||student.result||student.participation); } const AFTER_ATTENDANCE_STATUSES=["신청","수강","불참(미인정)","불참(결석)","불참(조퇴)","불참(인정)"];  function openAfterschoolProgramDrawer(id) {   const sourceProgram = [...afterSchoolProgramGroups(),...groupedAfterSchoolCourses(afterSchoolProgramGroups())].find((item) => item.id === id);   const program = programWithOverride(sourceProgram);   if (!program) return;   const students = (program.students || []).slice().sort((a,b)=>Number(programStudentGrade(a))-Number(programStudentGrade(b))||Number(
```

- index 1009705
```text
(text))return "불참(결석)";   if(/불참\(미인정\)|미인정|무단|불참/.test(text))return "불참(미인정)";   if(/수강|출석|참여|정상|입실|지각/.test(text))return "수강";   return "신청"; } function afterAttendanceOverrideKey(program,student){   return [program.sessionId||program.id||"",student.studentId||student.studentNo||student.number||student.name||""].join("|"); } function resolvedAfterAttendanceStatus(program,student){   const key=afterAttendanceOverrideKey(program,student);   return state.afterAttendanceOverrides?.[key]||normalizeAfterAttendanceStatus(student.attendance||student.result||student.participation); } const AFTER_ATTENDANCE_STATUSES=["신청","수강","불참(미인정)","불참(결석)","불참(조퇴)","불참(인정)"];  function openAfterschoolProgramDrawer(id) {   const sourceProgram = [...afterSchoolProgramGroups(),...groupedAfterSchoolCourses(afterSchoolProgramGroups())].find((item) => item.id === id);   const program = programWithOverride(sourceProgram);   if (!program) return;   const students = (program.students || []).slice().sort((a,b)=>Number(programStudentGrade(a))-Number(programStudentGrade(b))||Number(a.className)-Number(b.className)||Number(String(a.studentNo||"").slice(-2))-Number(String(b.studentNo||"").slice(-2)));   const statusCounts=Object.fromEntries(AFTER_ATTENDANCE_STATUSES.map(status=>[status,0]));   students.forEach(student=>{const status=resolvedAfterAttendanceStatus(program,student);statusCounts[status]=(statusCounts[status]||0)+1;});   const statusSummary=AFTER_ATTENDANCE_STATUSES.map(status=>`<span class="after-status-kpi"><b>${escapeHtml(status)}</b><em>${statusCounts[status]||0}</em></span>`).join("");   $("#drawerKicker").textContent = "AFTER-SCHOOL PROGRAM";   $("#drawerTitle").textContent = program.title;   $("#drawerBody").innerHTML = `<div class="p
```

- index 1236471
```text
w===0?'#e65353':dow===6?'#3677d5':'';       [...cell.querySelectorAll('[class*="holiday"]')].forEach(x=>x.classList.remove('holiday','is-holiday','public-holiday','red-day'));     });   }    function collectMeta(el){     const nodes=[el,...el.querySelectorAll('*'),el.parentElement,el.parentElement&&el.parentElement.parentElement].filter(Boolean);     let out='';     nodes.forEach(n=>{out+=' '+String(n.textContent||'');if(n.attributes)[...n.attributes].forEach(a=>out+=' '+a.name+'='+a.value);});     return out.replace(/\s+/g,' ').trim();   }   function inferAttendanceDetail(chip){     const meta=collectMeta(chip);     const type=(meta.match(/공조퇴|공지각|공외출|공결|조퇴|지각|외출/)||[])[0]||'공결';     const period=(meta.match(/(?:\d{1,2}\s*[~\-]\s*\d{1,2}|\d{1,2})\s*교시/)||[])[0]||'';     const time=(meta.match(/\d{1,2}:\d{2}\s*[~\-]\s*\d{1,2}:\d{2}/)||[])[0]||'';     return [type,period||time].filter(Boolean).join(' ');   }   function currentStatusDate(){     const inp=[...document.querySelectorAll('input[type="date"]')].find(x=>x.value);if(inp)return inp.value;     const m=String(document.body.textContent||'').match(/기준일\s*(20\d{2}-\d{2}-\d{2})/);return m?m[1]:'';   }   function wireAttendanceStatusCards(){     if(!/공결·지각 학생/.test(String(document.body.textContent||'')))return;     const date=currentStatusDate();     const chips=[...document.querySelectorAll('button,[role="button"],.chip,.badge,div')].filter(el=>/^\d{4}\s+\S+/.test(String(el.textContent||'').trim())&&/공결|지각|조퇴|외출/.test(String(el.textContent||'')));     chips.forEach(chip=>{       if(chip.dataset.uep135Attendance==='1')return;chip.dataset.uep135Attendance='1';       const raw=String(chip.textContent||'').trim();const who=(raw.match(/^(\d{4})\s+([^\s]+)/)||[]);if(!who[1])r
```

### data-calendar-date

- index 76300
```text
.map((x, index) => `<div class="cal-cell cal-head ${index===0?"sunday":index===6?"saturday":""}">${x}</div>`).join("")}`;   for (let i = 0; i < 42; i++) {     const d = new Date(start);     d.setDate(start.getDate() + i);     const day = d.getDate(),       key = dateKey(d),       events = schoolEventsForDate(key).filter(calendarEventMatchesFilter),       selected = key === calendarSelectedDate;     const tone = calendarDayTone(key);     html += `<div class="cal-cell ${tone.className} ${key === dateKey(today) ? "today" : ""} ${selected ? "selected" : ""} ${d.getMonth() === m ? "current-month" : "outside-month"}"><button class="cal-day-button" data-calendar-date="${key}"><span>${day}</span>${tone.holiday?'<em>공휴일</em>':""}</button>${events.slice(0, 3).map((event) => {const kind=calendarEventVisualKind(event); return `<div class="cal-event-wrap"><button class="cal-event kind-${kind} ${calendarEventIsPending(event)?"pending":""}" data-school-event="${escapeHtml(event.id)}" title="${escapeHtml(event.detail)}"><time>${escapeHtml(event.time || "종일")}</time><span>${escapeHtml(calendarShortTitle(calendarDisplayTitle(event), 22))}</span></button></div>`;}).join("")}${events.length > 3 ? `<button class="cal-more" data-calendar-date="${key}">＋${events.length - 3}개 더보기</button>` : ""}</div>`;   }   return html + `</div>${showMode ? calendarSelectedDayMarkup() : ""}</div>`; } function schoolEventsForDate(key) {   return allSchoolEvents().filter((event) => {     const start = String(event.date || "");     const end = String(event.endDate || event.date || "");     return start && key >= start && key <= end;   }); }  function allSchoolEvents() {   const manualRows = Array.isArray(state.settings?.manualCalendar) ? state.settings.manualCal
```

- index 76872
```text
() === m ? "current-month" : "outside-month"}"><button class="cal-day-button" data-calendar-date="${key}"><span>${day}</span>${tone.holiday?'<em>공휴일</em>':""}</button>${events.slice(0, 3).map((event) => {const kind=calendarEventVisualKind(event); return `<div class="cal-event-wrap"><button class="cal-event kind-${kind} ${calendarEventIsPending(event)?"pending":""}" data-school-event="${escapeHtml(event.id)}" title="${escapeHtml(event.detail)}"><time>${escapeHtml(event.time || "종일")}</time><span>${escapeHtml(calendarShortTitle(calendarDisplayTitle(event), 22))}</span></button></div>`;}).join("")}${events.length > 3 ? `<button class="cal-more" data-calendar-date="${key}">＋${events.length - 3}개 더보기</button>` : ""}</div>`;   }   return html + `</div>${showMode ? calendarSelectedDayMarkup() : ""}</div>`; } function schoolEventsForDate(key) {   return allSchoolEvents().filter((event) => {     const start = String(event.date || "");     const end = String(event.endDate || event.date || "");     return start && key >= start && key <= end;   }); }  function allSchoolEvents() {   const manualRows = Array.isArray(state.settings?.manualCalendar) ? state.settings.manualCalendar : [];   const manual = manualRows.map((row, index) => ({     id: `manual-${index}`,     date: row[0],     target: row[1],     time: row[2],     place: row[3],     title: row[4],     owner: row[5],     detail: `대상: ${row[1]} / 시간: ${row[2]} / 장소: ${row[3]} / 프로그램명: ${row[4]} / 부서·담당자: ${row[5]}`,     source: "직접 붙여넣기",     type: /마감|제출|입찰|종료/.test(row.join(" ")) ? "마감" : /시험|방학|수련|학력평가/.test(row.join(" ")) ? "학사" : "업무",   }));   const connected = Array.isArray(readonlyCache?.schoolCalendar) ? readonlyCache.schoolCalendar : [];   const connectedKeys=new Set(con
```

- index 217839
```text
schedule-cell empty"><span>—</span></div>';const kind=calendarEventVisualKind(event);return `<button class="school-schedule-cell kind-${kind} ${calendarEventIsPending(event)?"pending":""}" data-school-event="${escapeHtml(event.id)}"><time>${escapeHtml(event.time||"종일")}</time><b>${escapeHtml(calendarShortTitle(calendarDisplayTitle(event),26))}</b><small>${escapeHtml([event.target,event.place].filter(Boolean).join(" · ")||event.owner||"학교일정")}</small></button>`;}).join("")}</div>`).join("");   return `<section class="school-schedule-timetable"><div class="school-schedule-head"><div class="school-schedule-corner">순서</div>${days.map(d=>`<button data-calendar-date="${dateKey(d)}" class="${dateKey(d)===dateKey(today)?"today":""}"><b>${["일","월","화","수","목","금","토"][d.getDay()]}</b><span>${d.getMonth()+1}/${d.getDate()}</span><em>${schoolEventsForDate(dateKey(d)).length}건</em></button>`).join("")}</div>${rows}</section>`; } function calendarView() {   const hubTabs=`<div class="uep-hub-tabs calendar-hub-tabs"><button class="${calendarHubMode==="schedule"?"active":""}" data-calendar-hub="schedule"><b>학교일정</b><small>월간·주간 일정</small></button><button class="${calendarHubMode==="timetable"?"active":""}" data-calendar-hub="timetable"><b>시간표</b><small>개인·학급·학생·교사</small></button></div>`;   if(calendarHubMode==="timetable") return `<div class="module-page calendar-timetable-hub">${hubTabs}${timetableView()}</div>`;   const anchor=new Date(`${calendarSelectedDate||dateKey(today)}T12:00:00`);   return `<div class="module-page calendar-page-v654 school-schedule-page">${hubTabs}<div class="calendar-page-toolbar"><div><small>SCHOOL SCHEDULE · 데이터처리시트 41_학교캘린더</small><h3>학교일정</h3><p>월간계획을 기본으로 확인하고 월간·주간 보기를 자유롭게 전환합니다.</p></div><div><button
```

- index 976442
```text
onlyCache = refreshed.data;     button.disabled = false;     button.textContent = original;     render(state.activePage);     toast(`${result.sheetName} 3월~다음 해 2월 일정 ${result.count}건을 반영했습니다.${result.failedSheets?.length?` (${result.failedSheets.length}개 월 확인 필요)`:""}`);   }));   $$("[data-calendar-mode]").forEach(     (x) =>       (x.onclick = async () => {         state.calendarMode = x.dataset.calendarMode;         await save();         render(page);       }),   );   $$('[data-calendar-filter]').forEach((button) => (button.onclick = async () => {     calendarFilter = button.dataset.calendarFilter || "all";     render(page);   }));   $$('[data-calendar-date]').forEach((button) => (button.onclick = async (event) => {     event.stopPropagation();     calendarSelectedDate = button.dataset.calendarDate || dateKey(today);     render(page);   }));   $$('[data-calendar-month-shift]').forEach((button) => (button.onclick = async () => {     const current = new Date(`${calendarSelectedDate || dateKey(today)}T12:00:00`);     current.setMonth(current.getMonth() + Number(button.dataset.calendarMonthShift || 0), 1);     calendarSelectedDate = dateKey(current);     render(page);   }));   $$('[data-calendar-week-shift]').forEach((button) => (button.onclick = async () => {     const current = new Date(`${calendarSelectedDate || dateKey(today)}T12:00:00`);     current.setDate(current.getDate() + Number(button.dataset.calendarWeekShift || 0) * 7);     calendarSelectedDate = dateKey(current);     render(page);   }));   $$('[data-calendar-today]').forEach((button) => (button.onclick = async () => {     calendarSelectedDate = dateKey(today);     render(page);   }));   $$('[data-dashboard-month-shift]').forEach((button) => (button.onclick =
```

### data-dashboard-student-status

- index 731228
```text
cialCount=new Set(official.map(attendanceStudentKey)).size;   const lateCount=new Set(late.map(attendanceStudentKey)).size;   const nightCount=new Set(night.map(attendanceStudentKey)).size;   const nightTotal=currentStudents.length||259;   const items=[     ['late','공결/지각',`공결 ${officialCount} · 지각 ${lateCount}`,'attendance-combo'],     ['night','야자출결',`${nightCount}/${nightTotal}`,''],     ['submitted','제출완료',`${submitted.length}`,''],     ['progress','제출중',`${progress.length}`,''],     ['report','미제출',`${missing.length}`,'']   ];   return `<div class="uep-student-status-compact">${items.map(([kind,label,value,cls])=>`<button class="${cls}" data-dashboard-student-status="${kind}" title="${label} 상세보기"><span>${label}</span><b>${value}</b></button>`).join('')}</div>`; }  function dashboardStudentStatusMarkup(){   const todayKey=dateKey(today);   const yesterday=new Date(today);yesterday.setDate(today.getDate()-1);const yesterdayKey=dateKey(yesterday);   const official=filterRowsForDashboardStatus((readonlyCache?.officialAttendance||[]).filter(row=>String(row.date||row.day||'').slice(0,10)===todayKey));   const late=filterRowsForDashboardStatus((readonlyCache?.lateAttendance||[]).filter(row=>String(row.date||row.day||'').slice(0,10)===todayKey));   const night=filterRowsForDashboardStatus((readonlyCache?.nightAttendance||readonlyCache?.attendance||[]).filter(row=>String(row.date||row.day||'').slice(0,10)===yesterdayKey&&nightRecordIsAttendance(row)));   const reportRows=filterRowsForDashboardStatus(dashboardReportStatusRows());   const targetGroups=dashboardReportGroups(reportRows);   const submitted=targetGroups.filter(group=>dashboardReportGroupState(group).state==="complete");   const progress=targetGroups.filter(group=
```

- index 733635
```text
'night','야자출결',`${nightCount}/${nightTotal}`,'attendance','야자 출결 학생','명'],     ['submitted','제출완료',submitted.length,'programs','선택활동 보고서 제출완료 학생','명'],     ['progress','제출중',progress.length,'programs','선택활동 보고서 일부 제출 학생','명'],     ['report','미제출',missing.length,'programs','선택활동 보고서 미제출 학생','명']   ];   return `<div class="uep-student-scope"><span>조회 기준 · <b>${escapeHtml(scope.label)}</b></span><strong>선택활동 대상 <b>${targetGroups.length}</b>명</strong><em>완료 ${submitted.length}명 · 제출중 ${progress.length}명 · 미제출 ${missing.length}명</em></div><div class="uep-student-kpis">${metrics.map(([kind,label,count,page,desc,unit])=>`<button class="kpi-${kind}" data-dashboard-student-status="${kind}" data-page="${page}" title="${desc} 조회"><span>${label}</span><b>${count}</b><small>${kind==='late'?desc:unit}</small></button>`).join('')}</div>`; }  function dashboardStatusStudentGroups(rows,{report=false,attendance=false}={}){   const map=new Map();   (rows||[]).forEach((source,index)=>{     const row=report?source:normalizeDashboardStudentRow(source);     const key=String(row.studentRef?.id||row.studentId||row.studentNo||`${row.classLabel}|${row.name}|${index}`);     if(!map.has(key))map.set(key,{...row,key,rows:[],programs:[...(row.programs||[])],statusLabels:[]});     const group=map.get(key);group.rows.push(...(row.rows||[row]));     if(report){(row.programs||[]).forEach(x=>{if(!group.programs.includes(x))group.programs.push(x);});}     if(attendance){       const label=String(source.dashboardStatusType||source.detailType||source.type||source.statusType||'').trim();       if(label&&!group.statusLabels.includes(label))group.statusLabels.push(label);     }   });   return [...map.values()].sort((a,b)=>String(a.studentNo||'').localeCompare(St
```

- index 978955
```text
d');   }));   $$('[data-dashboard-week-today]').forEach((button) => (button.onclick = () => { dashboardWeekDate = dateKey(today); render('dashboard'); }));   $$('[data-dashboard-calendar-date]').forEach((button) => (button.onclick = (event) => {     event.preventDefault();     event.stopPropagation();     dashboardSelectedDate=button.dataset.dashboardCalendarDate||dateKey(today);     const selected=new Date(`${dashboardSelectedDate}T12:00:00`);     dashboardMonthDate=dateKey(new Date(selected.getFullYear(),selected.getMonth(),1));     dashboardWeekDate=dashboardSelectedDate;     openDashboardCalendarDate(dashboardSelectedDate);   }));   $$('[data-dashboard-student-status]').forEach((button) => (button.onclick = (event) => { event.preventDefault(); event.stopPropagation(); openDashboardStudentStatus(button.dataset.dashboardStudentStatus); }));   $$('[data-counsel-student]').forEach((button) => (button.onclick = (event) => { event.preventDefault(); event.stopPropagation(); if(studentPageMode==='counsel'){ studentCounselSelectedStudentId=button.dataset.counselStudent||''; render('students'); requestAnimationFrame(()=>document.querySelector('.counsel-right-column')?.scrollIntoView({block:'nearest'})); } else { openDashboardCounselDialog(button.dataset.counselStudent); } }));   $$('[data-dashboard-calendar-mode]').forEach((button) => (button.onclick = () => { dashboardCalendarMode=button.dataset.dashboardCalendarMode||'month'; render('dashboard'); }));   $$('[data-dashboard-calendar-full]').forEach((button) => (button.onclick = (event) => {     event.preventDefault();     event.stopPropagation();     const mode=button.dataset.dashboardCalendarFull||'month';     calendarSelectedDate=button.dataset.dashboardCalendarTarget||(mod
```

## Injected repair blocks

- UEP_08132_INTERACTION_REPAIR_START: present
- UEP_08133_CURRICULUM_SECURITY_START: absent
- UEP_08134_CURRICULUM_SECURITY_START: present
- UEP_08135_RUNTIME_REPAIR_START: present
