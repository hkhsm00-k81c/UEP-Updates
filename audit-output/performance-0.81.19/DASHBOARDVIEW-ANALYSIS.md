# dashboardView repetition analysis

Decision: REVIEW_MEMOIZATION

## line 11

```js
9:   const groups=[["lookup","팝업"],["link","링크"],["run","실행"]];
10:   const quickOrder=JSON.parse(localStorage.getItem('uepQuickOrder')||'{}');
11:   quick.sort((a,b)=>{const aa=(quickOrder[a[2]]||[]).indexOf(a[0]),bb=(quickOrder[b[2]]||[]).indexOf(b[0]);return (aa<0?999:aa)-(bb<0?999:bb);});
12:   const connectionNotice=readonlyCache?.students?.length?"":`<div class="uep-connection-note"><span>!</span><div><b>Google 최신 동기화를 확인하세요. 마지막 저장 자료는 계속 사용할 수 있습니다.</b><small>${escapeHtml(googleConnectionError||"서비스 계정과 공유 권한을 확인하세요.")}</small></div><button data-page="settings">설정</button></div>`;
13:   const calendarMarkup=dashboardCalendarMode==='week'?dashboardWeekAgendaMarkup():dashboardMiniCalendarMarkup();
```

## line 17

```js
15:     <section class="uep-today-strip-v0755"><div class="uep-home-clock"><strong id="heroClock">오전 00:00:00</strong><span id="heroDate">날짜 확인 중</span></div><div class="uep-weather-inline"><i id="heroWeatherIcon">○</i><span><b id="heroWeatherText">청주 날씨</b><em id="heroWeatherTemp">--℃</em></span></div>${dashboardDutyBadgesMarkup()}</section>
16:     <header class="uep-home-header uep-home-header-v0755">
17:       <section class="uep-quick-area uep-quick-area-v0750 uep-quick-area-compact"><div class="uep-quick-groups">${groups.map(([kind,label])=>`<section class="uep-quick-group quick-${kind}"><b>${label} 메뉴 (${quick.filter(q=>q[2]===kind).length})</b><div class="uep-quick-actions">${quick.filter(q=>q[2]===kind).map(q=>`<button class="uep-quick-card-v0755" draggable="true" data-reference="${q[0]}" data-quick-kind="${q[2]}"><i class="uep-quick-icon"></i><span><b>${q[1]}</b></span></button>`).join("")}</div></section>`).join("")}</div></section>
18:     </header>${connectionNotice}
19:     <section class="uep-dashboard-priority-row uep-dashboard-three-line uep-dashboard-priority-v07631">
```

