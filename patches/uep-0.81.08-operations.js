// __UEP_OPERATIONS_08108__
function uep08108AttendanceLabel(row){
  const attendance=String(row?.attendanceType||row?.type||'').replace(/\s|·/g,'');
  const detail=String(row?.detailType||row?.statusType||'').replace(/\s|·/g,'');
  let label='';
  if(/출석인정/.test(attendance)) label='출석인정'+(detail||'결석');
  else if(/출석인정/.test(detail)) label=detail;
  else label=String(row?.dashboardStatusType||detail||attendance||'공결').trim();
  const start=String(row?.startPeriod||'').replace(/\.0$/,''),end=String(row?.endPeriod||'').replace(/\.0$/,'');
  const period=start?(end&&end!==start?`${start}~${end}교시`:`${start}교시`):String(row?.period||'').trim();
  if(/결과|지각|조퇴/.test(label)&&period&&!/종일|하루/.test(period)) label+=` · ${period}`;
  return label;
}

dashboardStatusStudentGroups=function(rows,{report=false,attendance=false}={}){
  const map=new Map();
  (rows||[]).forEach((source,index)=>{
    const row=report?source:normalizeDashboardStudentRow(source);
    const key=String(row.studentRef?.id||row.studentId||row.studentNo||`${row.classLabel}|${row.name}|${index}`);
    if(!map.has(key))map.set(key,{...row,key,rows:[],programs:[...(row.programs||[])],statusLabels:[]});
    const group=map.get(key);group.rows.push(...(row.rows||[row]));
    if(report)(row.programs||[]).forEach(x=>{if(!group.programs.includes(x))group.programs.push(x);});
    if(attendance){const label=uep08108AttendanceLabel(source);if(label&&!group.statusLabels.includes(label))group.statusLabels.push(label);}
  });
  return [...map.values()].sort((a,b)=>String(a.studentNo||'').localeCompare(String(b.studentNo||''),'ko'));
};

dashboardCounselRowsMarkup=function(rows){
  const isHead=currentUserIsGradeHead(),mine=String(currentTeacherHomeroomClass()||'').replace('1-','');
  const cached=__uepDashboardCounselCache||{},candidates=Array.isArray(cached.all)?cached.all:[];
  const active=candidates.filter(candidate=>{const alertId=`${candidate.group||'growth'}:${candidate.stage||'manage'}:${candidate.student.id}`;return !counselCandidateCompleted(candidate)&&!autoNoticeIsDismissed('counsel',alertId);});
  if(!isHead){
    if(!mine)return '<div class="work-mini-empty">담임 학급을 확인할 수 없습니다.</div>';
    const students=active.filter(x=>String(classNumberOf(x.student))===mine).slice(0,9);
    if(!students.length)return '<div class="work-mini-empty">현재 상담 필요 학생이 없습니다.</div>';
    return `<div class="dashboard-counsel-student-grid">${students.map(x=>`<button class="dashboard-counsel-student-card" data-dashboard-counsel-student="${escapeHtml(x.student.id||x.student.studentNo||'')}"><b>${escapeHtml(x.student.studentNo)} ${escapeHtml(x.student.name)}</b><span>${escapeHtml((x.tags||[]).slice(0,2).join(' · ')||'상담 추천')}</span><small>${escapeHtml(x.reasons?.[0]||'상담 필요 사유 확인')}</small></button>`).join('')}</div>`;
  }
  const classes=Array.from({length:9},(_,i)=>String(i+1));
  return `<div class="dashboard-counsel-class-grid all-classes">${classes.map(cls=>{const total=candidates.filter(x=>String(classNumberOf(x.student))===cls).length,remain=active.filter(x=>String(classNumberOf(x.student))===cls).length,done=Math.max(0,total-remain);return `<button class="dashboard-counsel-class-card ${remain?'':'empty'}" data-student-counsel-class="${cls}"><b>${cls}반 <em>잔여 ${remain}명</em></b><span>상담 대상 ${total}명</span><small>완료 ${done}명 · 잔여 ${remain}명 · 목록 보기</small></button>`;}).join('')}</div>`;
};

