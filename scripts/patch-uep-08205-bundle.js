const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root) throw new Error('usage: node patch-uep-08205-bundle.js <app-root>');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const gPath=path.join(root,'resources','app','gyomuon.js');
const cssPath=path.join(root,'resources','app','gyomuon.css');
let g=fs.readFileSync(gPath,'utf8');
let css=fs.readFileSync(cssPath,'utf8');

// 1) Version
must(g.includes('const APP_VERSION = "0.82.04";'),'APP_VERSION 0.82.04 marker missing');
g=g.replace('const APP_VERSION = "0.82.04";','const APP_VERSION = "0.82.05";');

// 2) Dashboard report status: only programs that really require a report for that student.
// Undefined reportRequired used to be treated as required, inflating target rows and making most students "진행중/미제출".
const reportFnRe=/function dashboardReportStatusRows\(\)\{[\s\S]*?\n\}\nfunction officialAttendanceRowsForDate08162/;
must(reportFnRe.test(g),'dashboardReportStatusRows block missing');
const reportFn=`function dashboardReportStatusRows(){
  const rows=[];
  const programs=(readonlyCache?.programs||[]).filter(program=>dashboardProgramIsSelectedActivity(program));
  const reports=readonlyCache?.programReports||readonlyCache?.reports||[];
  programs.forEach(program=>{
    const programTitle=String(program.recordTitle||program.actualTitle||program.title||'프로그램명 확인 필요').trim();
    (program.students||[]).forEach(student=>{
      // UEP 0.82.05: explicit report setting/form/data connection, or an actually submitted report,
      // is the only evidence that this student-program pair belongs to the report target population.
      if(!programRequiresStudentReport(program,student,reports))return;
      const matchedReport=resolveStudentProgramReport(program,student,reports);
      const submitted=Boolean(matchedReport&&matchedReport.submitted!==false);
      rows.push({
        studentId:student.studentId||student.id||'',
        studentNo:student.studentNo||student.number||'',
        name:student.name||student.studentName||'',
        classNo:student.classNo||student.className||'',
        programId:program.programId||program.id||'',
        programTitle,
        activityKind:'선택활동',
        submitted,
        reportId:matchedReport?.id||'',
        reportRef:matchedReport||null,
        status:submitted?'제출 완료':'미제출'
      });
    });
  });
  if(rows.length)return rows;
  // Fallback: if program roster metadata is temporarily unavailable, show submitted normalized reports only.
  return reports.filter(report=>dashboardProgramIsSelectedActivity(report)).map(report=>({
    ...report,
    programTitle:report.programTitle||report.programName||report.reportGroup||'프로그램명 확인 필요',
    activityKind:'선택활동',
    submitted:report.submitted!==false&&Boolean(report.id||report.reportId||report.submittedAt||report.content)
  }));
}
function officialAttendanceRowsForDate08162`;
g=g.replace(reportFnRe,reportFn);

// 3) Student afterschool history: retain the grouped course but attach its real session rows for expandable detail.
const courseReturnOld='return {...group,__studentParticipant:original?.__studentParticipant||group.students.find(x=>studentMatches(x,live))||null,__attendanceSummary:attendanceSummary,__programGroup:"방과후학교",__isAfter:true,__isSelected:false,__isCommon:false};';
must(g.includes(courseReturnOld),'afterForStudent grouped return marker missing');
const courseReturnNew='return {...group,__studentParticipant:original?.__studentParticipant||group.students.find(x=>studentMatches(x,live))||null,__attendanceSummary:attendanceSummary,__courseRows:courseRows,__programGroup:"방과후학교",__isAfter:true,__isSelected:false,__isCommon:false};';
g=g.replace(courseReturnOld,courseReturnNew);

const afterBranchRe=/if\(p\.__isAfter\)\{[\s\S]*?return `<article class="student-program-row afterschool-history-row">[\s\S]*?<\/article>`;\n\s*\}/;
must(afterBranchRe.test(g),'student afterschool history render branch missing');
const afterBranch=`if(p.__isAfter){
      const afterText=\`${'${p.type||""} ${p.afterType||""} ${p.actualTitle||p.title||""}'}\`;
      const month=Number(String(p.date||p.dates?.[0]||'').slice(5,7)||0);
      const isNight=/야간심화|심화수업/.test(afterText);
      const termLabel=/여름|방학/.test(afterText)?'여름방학 방과후':month>=8?'2학기 방과후':'1학기 방과후';
      const typeLabel=isNight?'야간심화':termLabel;
      const weekdayText=String(p.weekdays||'').trim()||[...new Set((p.dates||[]).map(d=>weekdayLabelFromKey(d,false)).filter(Boolean))].join('·')||'요일 미등록';
      const rows=Array.isArray(p.__courseRows)?p.__courseRows:[];
      const activeRows=rows.filter(row=>!row.isCourseMaster);
      const detailRows=(activeRows.length?activeRows:rows).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(a.time||'').localeCompare(String(b.time||'')));
      const dateList=[...new Set(detailRows.map(row=>String(row.date||'').slice(0,10)).filter(Boolean))].sort();
      const range=dateList.length?(dateList.length===1?dateList[0]:\`${'${dateList[0]} ~ ${dateList[dateList.length-1]}'}\`):(p.scheduleText||p.date||'운영기간 확인');
      const teacher=String(p.teacher||detailRows.find(x=>x.teacher)?.teacher||'').trim();
      const place=String(p.place||detailRows.find(x=>x.place)?.place||'').trim();
      const detail=detailRows.length?detailRows.map(row=>{
        const participant=row.__studentParticipant||(row.students||[]).find(x=>studentMatches(x,live));
        const status=String(participant?.attendance||participant?.result||participant?.participation||participant?.status||'등록').trim();
        return \`<div class="afterschool-history-session"><time>${'${escapeHtml(row.date||"-")}'}</time><b>${'${escapeHtml(row.time||row.period||"-")}'}</b><span>${'${escapeHtml(status||"등록")}'}</span><small>${'${escapeHtml(row.place||place||"")}'}</small></div>\`;
      }).join(''):'<div class="empty-inline">차시별 상세 출석자료가 없습니다.</div>';
      return \`<details class="student-program-row afterschool-history-row afterschool-course-history"><summary><div class="student-program-main"><span class="program-kind after">${'${escapeHtml(typeLabel)}'}</span><b>${'${escapeHtml(p.actualTitle||p.title||"방과후학교")}'}</b><small>${'${escapeHtml(`${weekdayText} · ${p.__attendanceSummary||"출석현황 없음"}`)}'}</small></div><div class="student-program-state"><p>${'${escapeHtml(range)}'}</p><em>상세 ›</em></div></summary><div class="afterschool-history-detail"><div class="afterschool-history-meta"><span><small>유형</small><b>${'${escapeHtml(typeLabel)}'}</b></span><span><small>담당</small><b>${'${escapeHtml(teacher||"-")}'}</b></span><span><small>장소</small><b>${'${escapeHtml(place||"-")}'}</b></span><span><small>차시</small><b>${'${detailRows.length}'}회</b></span></div><div class="afterschool-history-sessions">${'${detail}'}</div></div></details>\`;
    }`;
g=g.replace(afterBranchRe,afterBranch);

css+=`\n/* UEP_08205_REPORT_AFTER_HISTORY */\n.afterschool-course-history{display:block!important;padding:0!important;overflow:hidden;}\n.afterschool-course-history>summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:14px 16px;}\n.afterschool-course-history>summary::-webkit-details-marker{display:none;}\n.afterschool-course-history[open]>summary{border-bottom:1px solid var(--line,#e4ebe9);}\n.afterschool-course-history .student-program-state em{font-style:normal;font-weight:800;color:#4c7d74;}\n.afterschool-history-detail{padding:14px 16px;background:rgba(245,249,248,.72);}\n.afterschool-history-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px;}\n.afterschool-history-meta span{background:#fff;border:1px solid var(--line,#e4ebe9);border-radius:10px;padding:8px 10px;}\n.afterschool-history-meta small{display:block;color:#81918d;font-size:11px;}\n.afterschool-history-meta b{display:block;margin-top:2px;font-size:12px;}\n.afterschool-history-sessions{display:grid;gap:6px;}\n.afterschool-history-session{display:grid;grid-template-columns:110px 110px 100px 1fr;gap:10px;align-items:center;background:#fff;border:1px solid var(--line,#e4ebe9);border-radius:9px;padding:8px 10px;font-size:12px;}\n.afterschool-history-session time{font-weight:800;}\n.afterschool-history-session span{font-weight:800;color:#476f67;}\n@media(max-width:900px){.afterschool-history-meta{grid-template-columns:repeat(2,1fr)}.afterschool-history-session{grid-template-columns:1fr 1fr}.afterschool-history-session small{grid-column:1/-1}}\n`;

// 4) Release notes once.
g+=`\n/* UEP_08205_RELEASE_NOTES_ONCE_START */\n(function(){\n  if(typeof window==='undefined'||window.__UEP08205ReleaseNotesInstalled)return;window.__UEP08205ReleaseNotesInstalled=true;\n  const V='0.82.05',KEY='uep.updateNotes.lastShownVersion';\n  function close(){document.getElementById('uepUpdateNotes08205')?.remove();try{localStorage.setItem(KEY,V);localStorage.setItem('uep.releaseNotes.seen',V)}catch{}}\n  function show(){try{if(String(APP_VERSION)!==V||localStorage.getItem(KEY)===V)return}catch{return}document.querySelectorAll('[id^="uepUpdateNotes"]').forEach(x=>x.remove());const l=document.createElement('div');l.id='uepUpdateNotes08205';l.style.cssText='position:fixed;inset:0;z-index:2147483010;background:rgba(20,31,35,.38);display:flex;align-items:center;justify-content:center;padding:24px';l.innerHTML='<div style="width:min(700px,92vw);background:#fff;border-radius:22px;padding:24px;box-shadow:0 26px 70px rgba(0,0,0,.22)"><h2>UEP 0.82.05 업데이트</h2><ul><li>대시보드 보고서 집계를 실제 보고서 대상 프로그램만 기준으로 계산합니다.</li><li>보고서 설정이 없는 선택활동을 미제출 대상으로 잘못 세던 문제를 수정했습니다.</li><li>학생 방과후·야간심화 이력을 강좌 단위로 묶고 차시별 출석 상세를 펼쳐볼 수 있습니다.</li></ul><button type="button" style="float:right;border:0;border-radius:12px;background:#167866;color:#fff;padding:10px 18px;font-weight:900;cursor:pointer">확인</button><div style="clear:both"></div></div>';document.body.appendChild(l);l.querySelector('button').onclick=close;}\n  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900);\n})();\n/* UEP_08205_RELEASE_NOTES_ONCE_END */\n`;

for(const p of [path.join(root,'resources','app','package.json'),path.join(root,'package.json')]){if(fs.existsSync(p)){try{const j=JSON.parse(fs.readFileSync(p,'utf8'));if(j.version==='0.82.04'){j.version='0.82.05';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n','utf8')}}catch{}}}

fs.writeFileSync(gPath,g,'utf8');
fs.writeFileSync(cssPath,css,'utf8');
console.log('UEP 0.82.05 dashboard report + afterschool history fixes applied');
