# UEP 0.81.19 openStudentDrawer Detailed Audit

```json
{
  "function": "openStudentDrawer",
  "chars": 24540,
  "renders": 0,
  "queryAll": 7,
  "arrayOps": 54,
  "repeatedReceivers": [
    {
      "expr": "participationPrograms.filter",
      "count": 4
    },
    {
      "expr": "rawParticipationPrograms.filter",
      "count": 2
    },
    {
      "expr": "subjectByTerm.filter",
      "count": 2
    },
    {
      "expr": "group.rows.map",
      "count": 2
    },
    {
      "expr": "rows.map",
      "count": 2
    }
  ],
  "operationContexts": [
    {
      "op": ".map",
      "offset": 622,
      "context": "ary||{}, bundle=studentRecordBundle(live), attendance=studentAttendanceDetails(live); const studentReports=studentCanonicalReports(live); const resolvedPrograms=bundle.programs.map(program=>{ const participant=(program.students||[]).find(x=>studentMatches(x,live))||null; const programId=String(program.programId||program.activityId||program.id||\"\").trim(); const strictReport=resolveStudentProgramReport(program,live,studentReports); const resolvedParticipant=participant?{"
    },
    {
      "op": ".find",
      "offset": 682,
      "context": "tAttendanceDetails(live); const studentReports=studentCanonicalReports(live); const resolvedPrograms=bundle.programs.map(program=>{ const participant=(program.students||[]).find(x=>studentMatches(x,live))||null; const programId=String(program.programId||program.activityId||program.id||\"\").trim(); const strictReport=resolveStudentProgramReport(program,live,studentReports); const resolvedParticipant=participant?{ ...participant, reportSubmitted:Boolean(participant.r"
    },
    {
      "op": ".filter",
      "offset": 2622,
      "context": "n?\"공통프로그램\":isAfter?\"방과후학교\":isSelected?\"선택프로그램\":\"기타프로그램\",__isCommon:isCommon,__isAfter:isAfter,__isSelected:isSelected}; }); const rawParticipationPrograms=resolvedPrograms .filter(program=>program.__studentParticipant && ((program.__isSelected||program.__isAfter)|| (program.__isCommon&&program.__studentParticipant.reportSubmitted))) .filter((program,index,array)=>array.findIndex(item=>programStableKey(item)===programStableKey(program))===index); const afterRows=rawParticipationProg"
    },
    {
      "op": ".filter",
      "offset": 2789,
      "context": "Programs .filter(program=>program.__studentParticipant && ((program.__isSelected||program.__isAfter)|| (program.__isCommon&&program.__studentParticipant.reportSubmitted))) .filter((program,index,array)=>array.findIndex(item=>programStableKey(item)===programStableKey(program))===index); const afterRows=rawParticipationPrograms.filter(p=>p.__isAfter); const afterRowsByCourse=new Map(); for(const row of afterRows){ const key=String(row.programId||row.courseId||row.id).replace(/^after-(?:m"
    },
    {
      "op": ".findIndex",
      "offset": 2825,
      "context": "m.__studentParticipant && ((program.__isSelected||program.__isAfter)|| (program.__isCommon&&program.__studentParticipant.reportSubmitted))) .filter((program,index,array)=>array.findIndex(item=>programStableKey(item)===programStableKey(program))===index); const afterRows=rawParticipationPrograms.filter(p=>p.__isAfter); const afterRowsByCourse=new Map(); for(const row of afterRows){ const key=String(row.programId||row.courseId||row.id).replace(/^after-(?:master|session)-/,\"\"); if(key){ if(!a"
    },
    {
      "op": ".filter",
      "offset": 2946,
      "context": "reportSubmitted))) .filter((program,index,array)=>array.findIndex(item=>programStableKey(item)===programStableKey(program))===index); const afterRows=rawParticipationPrograms.filter(p=>p.__isAfter); const afterRowsByCourse=new Map(); for(const row of afterRows){ const key=String(row.programId||row.courseId||row.id).replace(/^after-(?:master|session)-/,\"\"); if(key){ if(!afterRowsByCourse.has(key))afterRowsByCourse.set(key,[]); afterRowsByCourse.get(key).push(row); } const titleKey=`title:${"
    },
    {
      "op": ".map",
      "offset": 3502,
      "context": "){ if(!afterRowsByCourse.has(titleKey))afterRowsByCourse.set(titleKey,[]); afterRowsByCourse.get(titleKey).push(row); } } const afterForStudent=groupedAfterSchoolCourses(afterRows).map(group=>{ const courseKey=String(group.programId||group.courseId||group.id).replace(/^after-course-/,\"\"); const titleKey=`title:${group.actualTitle||group.title||\"\"}`; const byCourse=afterRowsByCourse.get(courseKey)||[]; const byTitle=afterRowsByCourse.get(titleKey)||[]; const courseRows=byCourse.length?byCourse:by"
    },
    {
      "op": ".filter",
      "offset": 3861,
      "context": "yCourse=afterRowsByCourse.get(courseKey)||[]; const byTitle=afterRowsByCourse.get(titleKey)||[]; const courseRows=byCourse.length?byCourse:byTitle; const sessionRows=courseRows.filter(p=>!p.isCourseMaster); const attendanceRows=sessionRows.length?sessionRows:courseRows; const participants=attendanceRows.map(p=>p.__studentParticipant||(p.students||[]).find(x=>studentMatches(x,live))).filter(Boolean); const statuses=participants.map(x=>String(x.attendance||x.result||x.participation"
    },
    {
      "op": ".map",
      "offset": 3997,
      "context": "se:byTitle; const sessionRows=courseRows.filter(p=>!p.isCourseMaster); const attendanceRows=sessionRows.length?sessionRows:courseRows; const participants=attendanceRows.map(p=>p.__studentParticipant||(p.students||[]).find(x=>studentMatches(x,live))).filter(Boolean); const statuses=participants.map(x=>String(x.attendance||x.result||x.participation||\"\").trim()).filter(Boolean); let attended=0,absent=0; for(const status of statuses){ if(/출석|지각|공결|인정|정상|입실/.test(status))attended+"
    },
    {
      "op": ".find",
      "offset": 4045,
      "context": "ter(p=>!p.isCourseMaster); const attendanceRows=sessionRows.length?sessionRows:courseRows; const participants=attendanceRows.map(p=>p.__studentParticipant||(p.students||[]).find(x=>studentMatches(x,live))).filter(Boolean); const statuses=participants.map(x=>String(x.attendance||x.result||x.participation||\"\").trim()).filter(Boolean); let attended=0,absent=0; for(const status of statuses){ if(/출석|지각|공결|인정|정상|입실/.test(status))attended++; else if(/결석|미입실|불참|취소/.test(status))absent++;"
    },
    {
      "op": ".filter",
      "offset": 4078,
      "context": "nst attendanceRows=sessionRows.length?sessionRows:courseRows; const participants=attendanceRows.map(p=>p.__studentParticipant||(p.students||[]).find(x=>studentMatches(x,live))).filter(Boolean); const statuses=participants.map(x=>String(x.attendance||x.result||x.participation||\"\").trim()).filter(Boolean); let attended=0,absent=0; for(const status of statuses){ if(/출석|지각|공결|인정|정상|입실/.test(status))attended++; else if(/결석|미입실|불참|취소/.test(status))absent++; } const pending=Math.max(0,s"
    },
    {
      "op": ".map",
      "offset": 4127,
      "context": ":courseRows; const participants=attendanceRows.map(p=>p.__studentParticipant||(p.students||[]).find(x=>studentMatches(x,live))).filter(Boolean); const statuses=participants.map(x=>String(x.attendance||x.result||x.participation||\"\").trim()).filter(Boolean); let attended=0,absent=0; for(const status of statuses){ if(/출석|지각|공결|인정|정상|입실/.test(status))attended++; else if(/결석|미입실|불참|취소/.test(status))absent++; } const pending=Math.max(0,statuses.length-attended-absent); const attend"
    },
    {
      "op": ".filter",
      "offset": 4194,
      "context": "ntParticipant||(p.students||[]).find(x=>studentMatches(x,live))).filter(Boolean); const statuses=participants.map(x=>String(x.attendance||x.result||x.participation||\"\").trim()).filter(Boolean); let attended=0,absent=0; for(const status of statuses){ if(/출석|지각|공결|인정|정상|입실/.test(status))attended++; else if(/결석|미입실|불참|취소/.test(status))absent++; } const pending=Math.max(0,statuses.length-attended-absent); const attendanceSummary=statuses.length?(attended||absent?`출석 ${attended}회 · 결석"
    },
    {
      "op": ".find",
      "offset": 4733,
      "context": "회`:\"\"}`:`출석 미입력 · ${statuses[0]||\"신청\"}`):\"출석현황 없음\"; const original=courseRows[0]||null; return {...group,__studentParticipant:original?.__studentParticipant||group.students.find(x=>studentMatches(x,live))||null,__attendanceSummary:attendanceSummary,__programGroup:\"방과후학교\",__isAfter:true,__isSelected:false,__isCommon:false}; }); const participationPrograms=[...rawParticipationPrograms.filter(p=>!p.__isAfter),...afterForStudent] .sort((a,b)=>String(b.date||\"\").localeCompare(String(a"
    },
    {
      "op": ".filter",
      "offset": 4950,
      "context": "l,__attendanceSummary:attendanceSummary,__programGroup:\"방과후학교\",__isAfter:true,__isSelected:false,__isCommon:false}; }); const participationPrograms=[...rawParticipationPrograms.filter(p=>!p.__isAfter),...afterForStudent] .sort((a,b)=>String(b.date||\"\").localeCompare(String(a.date||\"\"))||String(a.recordTitle||a.actualTitle||a.title||\"\").localeCompare(String(b.recordTitle||b.actualTitle||b.title||\"\"))); let selectedCount=0,afterCount=0,commonCount=0; const linkedReportIds=new Set(); for("
    },
    {
      "op": ".sort",
      "offset": 4999,
      "context": "Group:\"방과후학교\",__isAfter:true,__isSelected:false,__isCommon:false}; }); const participationPrograms=[...rawParticipationPrograms.filter(p=>!p.__isAfter),...afterForStudent] .sort((a,b)=>String(b.date||\"\").localeCompare(String(a.date||\"\"))||String(a.recordTitle||a.actualTitle||a.title||\"\").localeCompare(String(b.recordTitle||b.actualTitle||b.title||\"\"))); let selectedCount=0,afterCount=0,commonCount=0; const linkedReportIds=new Set(); for(const p of participationPrograms){ if(p.__isSelec"
    },
    {
      "op": ".filter",
      "offset": 5599,
      "context": "ng(p.__studentParticipant?.reportId||\"\"); if(reportId)linkedReportIds.add(reportId); } const submittedReportCount=studentReports.length; const unmatchedReportCount=studentReports.filter(r=>r.id&&!linkedReportIds.has(String(r.id))).length; const mockMini=[\"3월모의고사\",\"6월모의고사\"].map(exam=>`<span class=\"mock-mini\"><b>${exam}</b>${mockGradeMiniMarkup(live.id,exam)}</span>`).join(''); const activityPreview=bundle.activities.filter(x=>{const t=`${x.area||\"\"} ${x.type||\"\"} ${x.title||\"\"} ${x.role||\"\""
    },
    {
      "op": ".map",
      "offset": 5696,
      "context": "ittedReportCount=studentReports.length; const unmatchedReportCount=studentReports.filter(r=>r.id&&!linkedReportIds.has(String(r.id))).length; const mockMini=[\"3월모의고사\",\"6월모의고사\"].map(exam=>`<span class=\"mock-mini\"><b>${exam}</b>${mockGradeMiniMarkup(live.id,exam)}</span>`).join(''); const activityPreview=bundle.activities.filter(x=>{const t=`${x.area||\"\"} ${x.type||\"\"} ${x.title||\"\"} ${x.role||\"\"} ${x.source||\"\"}`;const office=/임원|학생회|회장|부회장|실장|부실장|반장|부반장/.test(t);const club=isTrueClubActivi"
    },
    {
      "op": ".filter",
      "offset": 5843,
      "context": "onst mockMini=[\"3월모의고사\",\"6월모의고사\"].map(exam=>`<span class=\"mock-mini\"><b>${exam}</b>${mockGradeMiniMarkup(live.id,exam)}</span>`).join(''); const activityPreview=bundle.activities.filter(x=>{const t=`${x.area||\"\"} ${x.type||\"\"} ${x.title||\"\"} ${x.role||\"\"} ${x.source||\"\"}`;const office=/임원|학생회|회장|부회장|실장|부실장|반장|부반장/.test(t);const club=isTrueClubActivity(x);const volunteer=isVolunteerActivity(x)&&String(x.area||\"\")!==\"교육과정 내 봉사\";return office||club||volunteer;}).slice(0,12); const subjectPrevie"
    },
    {
      "op": ".map",
      "offset": 6305,
      "context": ";}).slice(0,12); const subjectPreview=bundle.selected.slice(0,30); const subjectOrder=['2학년 1학기','2학년 2학기','3학년 1학기','3학년 2학기']; const subjectTerms=[...new Set(subjectPreview.map(x=>x.term||x.semester||'학기 미지정'))] .sort((a,b)=>{const ai=subjectOrder.indexOf(a),bi=subjectOrder.indexOf(b);return (ai<0?99:ai)-(bi<0?99:bi)||String(a).localeCompare(String(b));}); const subjectByTerm=subjectTerms.map(term=>({term,rows:subjectPreview.filter(x=>(x.term||x.semester||'학기 미지정')===term)})); co"
    },
    {
      "op": ".sort",
      "offset": 6349,
      "context": "le.selected.slice(0,30); const subjectOrder=['2학년 1학기','2학년 2학기','3학년 1학기','3학년 2학기']; const subjectTerms=[...new Set(subjectPreview.map(x=>x.term||x.semester||'학기 미지정'))] .sort((a,b)=>{const ai=subjectOrder.indexOf(a),bi=subjectOrder.indexOf(b);return (ai<0?99:ai)-(bi<0?99:bi)||String(a).localeCompare(String(b));}); const subjectByTerm=subjectTerms.map(term=>({term,rows:subjectPreview.filter(x=>(x.term||x.semester||'학기 미지정')===term)})); const visibleSubjectTerms=subjectByTerm.filter"
    },
    {
      "op": ".map",
      "offset": 6530,
      "context": "sort((a,b)=>{const ai=subjectOrder.indexOf(a),bi=subjectOrder.indexOf(b);return (ai<0?99:ai)-(bi<0?99:bi)||String(a).localeCompare(String(b));}); const subjectByTerm=subjectTerms.map(term=>({term,rows:subjectPreview.filter(x=>(x.term||x.semester||'학기 미지정')===term)})); const visibleSubjectTerms=subjectByTerm.filter(group=>group.term==='2학년 1학기'||group.term==='2학년 2학기'||!/^3학년 /.test(group.term)); const hiddenSubjectTerms=subjectByTerm.filter(group=>group.term==='3학년 1학기'||group.term==='3학년"
    },
    {
      "op": ".filter",
      "offset": 6567,
      "context": "dexOf(a),bi=subjectOrder.indexOf(b);return (ai<0?99:ai)-(bi<0?99:bi)||String(a).localeCompare(String(b));}); const subjectByTerm=subjectTerms.map(term=>({term,rows:subjectPreview.filter(x=>(x.term||x.semester||'학기 미지정')===term)})); const visibleSubjectTerms=subjectByTerm.filter(group=>group.term==='2학년 1학기'||group.term==='2학년 2학기'||!/^3학년 /.test(group.term)); const hiddenSubjectTerms=subjectByTerm.filter(group=>group.term==='3학년 1학기'||group.term==='3학년 2학기'); const subjectTermMarkup=grou"
    },
    {
      "op": ".filter",
      "offset": 6662,
      "context": "tring(b));}); const subjectByTerm=subjectTerms.map(term=>({term,rows:subjectPreview.filter(x=>(x.term||x.semester||'학기 미지정')===term)})); const visibleSubjectTerms=subjectByTerm.filter(group=>group.term==='2학년 1학기'||group.term==='2학년 2학기'||!/^3학년 /.test(group.term)); const hiddenSubjectTerms=subjectByTerm.filter(group=>group.term==='3학년 1학기'||group.term==='3학년 2학기'); const subjectTermMarkup=groups=>groups.map(group=>`<div class=\"subject-term-row\"><strong>${escapeHtml(group.term)}</strong>"
    },
    {
      "op": ".filter",
      "offset": 6793,
      "context": "rm)})); const visibleSubjectTerms=subjectByTerm.filter(group=>group.term==='2학년 1학기'||group.term==='2학년 2학기'||!/^3학년 /.test(group.term)); const hiddenSubjectTerms=subjectByTerm.filter(group=>group.term==='3학년 1학기'||group.term==='3학년 2학기'); const subjectTermMarkup=groups=>groups.map(group=>`<div class=\"subject-term-row\"><strong>${escapeHtml(group.term)}</strong><div class=\"subject-chip-list\">${group.rows.map(x=>`<span title=\"${escapeHtml(x.subject)}\"><b>${escapeHtml(x.subject)}</b></span>`)"
    },
    {
      "op": ".map",
      "offset": 6897,
      "context": "년 2학기'||!/^3학년 /.test(group.term)); const hiddenSubjectTerms=subjectByTerm.filter(group=>group.term==='3학년 1학기'||group.term==='3학년 2학기'); const subjectTermMarkup=groups=>groups.map(group=>`<div class=\"subject-term-row\"><strong>${escapeHtml(group.term)}</strong><div class=\"subject-chip-list\">${group.rows.map(x=>`<span title=\"${escapeHtml(x.subject)}\"><b>${escapeHtml(x.subject)}</b></span>`).join('')}</div></div>`).join(''); const hiddenSubjectCount=hiddenSubjectTerms.reduce((sum,group)=>sum"
    },
    {
      "op": ".map",
      "offset": 7025,
      "context": "'3학년 2학기'); const subjectTermMarkup=groups=>groups.map(group=>`<div class=\"subject-term-row\"><strong>${escapeHtml(group.term)}</strong><div class=\"subject-chip-list\">${group.rows.map(x=>`<span title=\"${escapeHtml(x.subject)}\"><b>${escapeHtml(x.subject)}</b></span>`).join('')}</div></div>`).join(''); const hiddenSubjectCount=hiddenSubjectTerms.reduce((sum,group)=>sum+group.rows.length,0); const careerSupport=studentCareerSupport(live,bundle); const careerHope=[careerSupport.hopeTrack,care"
    },
    {
      "op": ".filter",
      "offset": 7365,
      "context": "ectTerms.reduce((sum,group)=>sum+group.rows.length,0); const careerSupport=studentCareerSupport(live,bundle); const careerHope=[careerSupport.hopeTrack,careerSupport.hopeMajor].filter(value=>value&&value!==\"-\").join(\" · \")||\"-\"; const actualNine=(()=>{try{return admissionBase(live.id).actual9;}catch{return null;}})(); const finalPreview=bundle.finalRecords.slice(0,4); const studentAccess=studentAccessContext(live); const contactMasked=isStudentSensitiveCardMasked(live,\"contact\"); c"
    },
    {
      "op": ".map",
      "offset": 8779,
      "context": "ce(5,7)||0); const termLabel=/여름|방학/.test(afterText)?\"여름방학 방과후\":month>=8?\"2학기 방과후\":\"1학기 방과후\"; const weekdayText=String(p.weekdays||\"\").trim()||[...new Set((p.dates||[]).map(d=>weekdayLabelFromKey(d,false)).filter(Boolean))].join(\"·\")||\"요일 미등록\"; return `<article class=\"student-program-row afterschool-history-row\"><div class=\"student-program-main\"><span class=\"program-kind after\">${escapeHtml(termLabel)}</span><b>${escapeHtml(p.actualTitle||p.title||\"방과후학교\")}</b><small>${escapeHt"
    },
    {
      "op": ".filter",
      "offset": 8816,
      "context": "름|방학/.test(afterText)?\"여름방학 방과후\":month>=8?\"2학기 방과후\":\"1학기 방과후\"; const weekdayText=String(p.weekdays||\"\").trim()||[...new Set((p.dates||[]).map(d=>weekdayLabelFromKey(d,false)).filter(Boolean))].join(\"·\")||\"요일 미등록\"; return `<article class=\"student-program-row afterschool-history-row\"><div class=\"student-program-main\"><span class=\"program-kind after\">${escapeHtml(termLabel)}</span><b>${escapeHtml(p.actualTitle||p.title||\"방과후학교\")}</b><small>${escapeHtml(`${weekdayText} · ${p.__attendance"
    },
    {
      "op": ".filter",
      "offset": 9566,
      "context": "nd ${p.__isCommon?'common':'selected'}\">${escapeHtml(p.__programGroup)}</span><b>${escapeHtml(p.recordTitle||p.actualTitle||p.title)}</b><small>${escapeHtml([p.date,p.time,p.place].filter(Boolean).join(' · '))}</small></div><div class=\"student-program-state\"><p>${escapeHtml(reportState+submittedAt)}</p>${view}</div></article>`; }; const programGroups=[ [\"선택활동\",participationPrograms.filter(p=>p.__isSelected)], [\"공통활동\",participationPrograms.filter(p=>p.__isCommon)], [\"방과후·야간심화\",par"
    },
    {
      "op": ".filter",
      "offset": 9778,
      "context": "small></div><div class=\"student-program-state\"><p>${escapeHtml(reportState+submittedAt)}</p>${view}</div></article>`; }; const programGroups=[ [\"선택활동\",participationPrograms.filter(p=>p.__isSelected)], [\"공통활동\",participationPrograms.filter(p=>p.__isCommon)], [\"방과후·야간심화\",participationPrograms.filter(p=>p.__isAfter)], [\"기타활동\",participationPrograms.filter(p=>!p.__isSelected&&!p.__isCommon&&!p.__isAfter)] ].filter(([,rows])=>rows.length); const programMarkup=programGroups.lengt"
    },
    {
      "op": ".filter",
      "offset": 9840,
      "context": "(reportState+submittedAt)}</p>${view}</div></article>`; }; const programGroups=[ [\"선택활동\",participationPrograms.filter(p=>p.__isSelected)], [\"공통활동\",participationPrograms.filter(p=>p.__isCommon)], [\"방과후·야간심화\",participationPrograms.filter(p=>p.__isAfter)], [\"기타활동\",participationPrograms.filter(p=>!p.__isSelected&&!p.__isCommon&&!p.__isAfter)] ].filter(([,rows])=>rows.length); const programMarkup=programGroups.length?programGroups.map(([label,rows])=>`<section class=\"student-p"
    },
    {
      "op": ".filter",
      "offset": 9904,
      "context": "onst programGroups=[ [\"선택활동\",participationPrograms.filter(p=>p.__isSelected)], [\"공통활동\",participationPrograms.filter(p=>p.__isCommon)], [\"방과후·야간심화\",participationPrograms.filter(p=>p.__isAfter)], [\"기타활동\",participationPrograms.filter(p=>!p.__isSelected&&!p.__isCommon&&!p.__isAfter)] ].filter(([,rows])=>rows.length); const programMarkup=programGroups.length?programGroups.map(([label,rows])=>`<section class=\"student-program-group\"><header><b>${label}</b><span>${rows.length}건</span"
    },
    {
      "op": ".filter",
      "offset": 9963,
      "context": "er(p=>p.__isSelected)], [\"공통활동\",participationPrograms.filter(p=>p.__isCommon)], [\"방과후·야간심화\",participationPrograms.filter(p=>p.__isAfter)], [\"기타활동\",participationPrograms.filter(p=>!p.__isSelected&&!p.__isCommon&&!p.__isAfter)] ].filter(([,rows])=>rows.length); const programMarkup=programGroups.length?programGroups.map(([label,rows])=>`<section class=\"student-program-group\"><header><b>${label}</b><span>${rows.length}건</span></header><div>${rows.map(renderProgramRow).join('')}</div>"
    },
    {
      "op": ".filter",
      "offset": 10024,
      "context": "ter(p=>p.__isCommon)], [\"방과후·야간심화\",participationPrograms.filter(p=>p.__isAfter)], [\"기타활동\",participationPrograms.filter(p=>!p.__isSelected&&!p.__isCommon&&!p.__isAfter)] ].filter(([,rows])=>rows.length); const programMarkup=programGroups.length?programGroups.map(([label,rows])=>`<section class=\"student-program-group\"><header><b>${label}</b><span>${rows.length}건</span></header><div>${rows.map(renderProgramRow).join('')}</div></section>`).join(''):'<div class=\"student-dashboard-empty\"><"
    },
    {
      "op": ".map",
      "offset": 10113,
      "context": "[\"기타활동\",participationPrograms.filter(p=>!p.__isSelected&&!p.__isCommon&&!p.__isAfter)] ].filter(([,rows])=>rows.length); const programMarkup=programGroups.length?programGroups.map(([label,rows])=>`<section class=\"student-program-group\"><header><b>${label}</b><span>${rows.length}건</span></header><div>${rows.map(renderProgramRow).join('')}</div></section>`).join(''):'<div class=\"student-dashboard-empty\"><b>참여 프로그램 자료가 없습니다.</b><small>선택활동·공통활동·방과후·야간심화별로 참여 이력을 표시합니다.</small></div>'; const"
    },
    {
      "op": ".map",
      "offset": 10245,
      "context": "programMarkup=programGroups.length?programGroups.map(([label,rows])=>`<section class=\"student-program-group\"><header><b>${label}</b><span>${rows.length}건</span></header><div>${rows.map(renderProgramRow).join('')}</div></section>`).join(''):'<div class=\"student-dashboard-empty\"><b>참여 프로그램 자료가 없습니다.</b><small>선택활동·공통활동·방과후·야간심화별로 참여 이력을 표시합니다.</small></div>'; const unmatchedReportMarkup=unmatchedReportCount?`<p class=\"program-unmatched-note\">프로그램 고유번호가 연결되지 않은 보고서 ${unmatchedReportCount}건은 잘못된 활"
    },
    {
      "op": ".map",
      "offset": 13414,
      "context": "-student-attendance-target=\"program\"><b>${attendance.programAbsent.length}</b>프로그램 불참</button></div><details><summary>출결 상세보기</summary><p><b>공결</b> ${attendance.official.slice(0,8).map(x=>`${x.date||'-'} ${x.detailType||x.type||'공결'} ${x.reasonText||x.reason||''}`).join(' · ')||'공결 이력 없음'}</p><p><b>지각</b> ${attendance.late.slice(0,5).map(x=>`${x.date||'-'} 지각`).join(' · ')||'지각 이력 없음'}</p><p><b>프로그램 불참</b> ${attendance.programAbsent.slice(0,5).map(x=>`${x.date||'-'} ${x.programTitle}`).join(' ·"
    },
    {
      "op": ".map",
      "offset": 13569,
      "context": "dance.official.slice(0,8).map(x=>`${x.date||'-'} ${x.detailType||x.type||'공결'} ${x.reasonText||x.reason||''}`).join(' · ')||'공결 이력 없음'}</p><p><b>지각</b> ${attendance.late.slice(0,5).map(x=>`${x.date||'-'} 지각`).join(' · ')||'지각 이력 없음'}</p><p><b>프로그램 불참</b> ${attendance.programAbsent.slice(0,5).map(x=>`${x.date||'-'} ${x.programTitle}`).join(' · ')||'프로그램 불참 이력 없음'}</p></details></section></div><section class=\"student-score-dashboard student-sensitive-card ${scoreMasked?'is-masked':''}\" data-sensit"
    },
    {
      "op": ".map",
      "offset": 13681,
      "context": "oin(' · ')||'공결 이력 없음'}</p><p><b>지각</b> ${attendance.late.slice(0,5).map(x=>`${x.date||'-'} 지각`).join(' · ')||'지각 이력 없음'}</p><p><b>프로그램 불참</b> ${attendance.programAbsent.slice(0,5).map(x=>`${x.date||'-'} ${x.programTitle}`).join(' · ')||'프로그램 불참 이력 없음'}</p></details></section></div><section class=\"student-score-dashboard student-sensitive-card ${scoreMasked?'is-masked':''}\" data-sensitive-card=\"score\">${scoreMasked?`<div class=\"student-section-title\"><h4>성적·입시 요약</h4></div>${maskedStudentCardMar"
    },
    {
      "op": ".map",
      "offset": 14856,
      "context": "v class=\"student-section-title\"><h4>활동 이력</h4><button class=\"link-button no-print\" data-student-route=\"records\">전체보기</button></div><div class=\"activity-chip-grid\">${activityPreview.map(x=>{const isVolunteer=/봉사/.test(`${x.area||''} ${x.type||''} ${x.source||''}`);const meta=isVolunteer?[x.date,x.organization,Number(x.hours)?`${Number(x.hours)}시간`:\"\"]:[x.area,x.role,x.date];return `<span><b>${escapeHtml(x.title||x.type||'활동')}</b><small>${escapeHtml(meta.filter(Boolean).join(' · '))}</small></spa"
    },
    {
      "op": ".filter",
      "offset": 15133,
      "context": "Volunteer?[x.date,x.organization,Number(x.hours)?`${Number(x.hours)}시간`:\"\"]:[x.area,x.role,x.date];return `<span><b>${escapeHtml(x.title||x.type||'활동')}</b><small>${escapeHtml(meta.filter(Boolean).join(' · '))}</small></span>`;}).join('')||'<p>연결 자료 없음</p>'}</div></section><section class=\"student-subject-card\"><div class=\"student-section-title\"><h4>선택과목</h4><button class=\"link-button no-print\" data-student-route=\"records\" data-record-target=\"curriculum\">전체보기</button></div>${careerSupportMarkup(l"
    },
    {
      "op": "querySelectorAll",
      "offset": 16190,
      "context": "hidden\");$(\"#drawerBackdrop\").classList.remove(\"hidden\"); $(\"#drawerBody #printStudentDashboard\")?.addEventListener(\"click\",()=>printStudentDashboard(live)); $(\"#drawerBody\")?.querySelectorAll(`[data-copy-student-email]`).forEach(button=>button.onclick=async()=>{try{await navigator.clipboard.writeText(button.dataset.copyStudentEmail||\"\");toast(\"학생 이메일을 복사했습니다.\");}catch{toast(\"이메일 복사에 실패했습니다.\");}}); $(\"#drawerBody\")?.querySelectorAll(`[data-edit-contact]`).forEach(button=>button.onclick=()="
    },
    {
      "op": "querySelectorAll",
      "offset": 16436,
      "context": "on.onclick=async()=>{try{await navigator.clipboard.writeText(button.dataset.copyStudentEmail||\"\");toast(\"학생 이메일을 복사했습니다.\");}catch{toast(\"이메일 복사에 실패했습니다.\");}}); $(\"#drawerBody\")?.querySelectorAll(`[data-edit-contact]`).forEach(button=>button.onclick=()=>{const field=button.dataset.editContact;const labels={phone:\"학생 휴대전화번호\",email:\"학생 이메일\",guardian1Phone:`${live.guardian1Relation||\"보호자1\"} 휴대전화번호`,guardian2Phone:`${live.guardian2Relation||\"보호자2\"} 휴대전화번호`};editStudentContact(sourceLive,field,label"
    },
    {
      "op": "querySelectorAll",
      "offset": 16811,
      "context": "elation||\"보호자1\"} 휴대전화번호`,guardian2Phone:`${live.guardian2Relation||\"보호자2\"} 휴대전화번호`};editStudentContact(sourceLive,field,labels[field]||\"연락정보\",index,button);}); $(\"#drawerBody\")?.querySelectorAll('[data-reveal-student-card]').forEach(button=>button.onclick=()=>{studentSensitiveRevealKeys.add(sensitiveRevealKey(live,button.dataset.revealStudentCard));openStudentDrawer(index);}); $('#drawerBody')?.querySelectorAll('[data-open-student-report]').forEach(button=>button.onclick=()=>openSubmittedPro"
    },
    {
      "op": "querySelectorAll",
      "offset": 17033,
      "context": "d]').forEach(button=>button.onclick=()=>{studentSensitiveRevealKeys.add(sensitiveRevealKey(live,button.dataset.revealStudentCard));openStudentDrawer(index);}); $('#drawerBody')?.querySelectorAll('[data-open-student-report]').forEach(button=>button.onclick=()=>openSubmittedProgramReport(button.dataset.openStudentReport, live)); $('#drawerBody')?.querySelector('[data-open-participation-dashboard]')?.addEventListener('click',()=>{ $('#drawerBody').innerHTML=`<div class=\"student-dashboard-v4"
    },
    {
      "op": "querySelectorAll",
      "offset": 18994,
      "context": "Markup}</div></section></div>`; $('#drawerBody')?.querySelector('[data-back-student-dashboard]')?.addEventListener('click',()=>openStudentDrawer(index)); $('#drawerBody')?.querySelectorAll('[data-open-student-report]').forEach(button=>button.onclick=()=>openSubmittedProgramReport(button.dataset.openStudentReport, live)); $('#drawerBody')?.querySelectorAll('[data-report-tag-detail]').forEach(button=>button.onclick=()=>openReportTagDetail(button.dataset.reportTagDetail)); }); $('#d"
    },
    {
      "op": "querySelectorAll",
      "offset": 19167,
      "context": "ody')?.querySelectorAll('[data-open-student-report]').forEach(button=>button.onclick=()=>openSubmittedProgramReport(button.dataset.openStudentReport, live)); $('#drawerBody')?.querySelectorAll('[data-report-tag-detail]').forEach(button=>button.onclick=()=>openReportTagDetail(button.dataset.reportTagDetail)); }); $('#drawerBody')?.querySelectorAll('[data-report-tag-detail]').forEach(button=>button.onclick=()=>openReportTagDetail(button.dataset.reportTagDetail)); const openStudentHubOver"
    },
    {
      "op": "querySelectorAll",
      "offset": 19327,
      "context": "$('#drawerBody')?.querySelectorAll('[data-report-tag-detail]').forEach(button=>button.onclick=()=>openReportTagDetail(button.dataset.reportTagDetail)); }); $('#drawerBody')?.querySelectorAll('[data-report-tag-detail]').forEach(button=>button.onclick=()=>openReportTagDetail(button.dataset.reportTagDetail)); const openStudentHubOverlay=(kind,options={})=>{ const labels={records:'활동·생활기록부',curriculum:'선택과목',official:'공결',late:'지각',night:'야자출결',program:'프로그램',score:'성적',admission:'입시'};"
    },
    {
      "op": ".map",
      "offset": 19765,
      "context": ":'지각',night:'야자출결',program:'프로그램',score:'성적',admission:'입시'}; let body=''; if(kind==='records'){ body=`<div class=\"student-hub-list\"><h4>활동 이력</h4>${bundle.activities.map(x=>`<article><b>${escapeHtml(x.title||x.type||'활동')}</b><span>${escapeHtml([x.area,x.date,x.role,x.organization].filter(Boolean).join(' · '))}</span></article>`).join('')||'<p>연결 자료가 없습니다.</p>'}<h4>최종 기록</h4>${bundle.finalRecords.map(x=>`<article><b>${escapeHtml(x.area||x.type||'기록')}</b><span>${escapeHtml(x.conte"
    },
    {
      "op": ".filter",
      "offset": 19882,
      "context": "<div class=\"student-hub-list\"><h4>활동 이력</h4>${bundle.activities.map(x=>`<article><b>${escapeHtml(x.title||x.type||'활동')}</b><span>${escapeHtml([x.area,x.date,x.role,x.organization].filter(Boolean).join(' · '))}</span></article>`).join('')||'<p>연결 자료가 없습니다.</p>'}<h4>최종 기록</h4>${bundle.finalRecords.map(x=>`<article><b>${escapeHtml(x.area||x.type||'기록')}</b><span>${escapeHtml(x.content||x.text||x.record||'')}</span></article>`).join('')||'<p>저장된 최종 기록이 없습니다.</p>'}</div>`; }else if(kind==='curri"
    },
    {
      "op": ".map",
      "offset": 19999,
      "context": "')}</b><span>${escapeHtml([x.area,x.date,x.role,x.organization].filter(Boolean).join(' · '))}</span></article>`).join('')||'<p>연결 자료가 없습니다.</p>'}<h4>최종 기록</h4>${bundle.finalRecords.map(x=>`<article><b>${escapeHtml(x.area||x.type||'기록')}</b><span>${escapeHtml(x.content||x.text||x.record||'')}</span></article>`).join('')||'<p>저장된 최종 기록이 없습니다.</p>'}</div>`; }else if(kind==='curriculum'){ body=`<div class=\"student-hub-list\"><h4>진로희망</h4><article><b>${escapeHtml(careerHope)}</b><span>선택과목 응"
    },
    {
      "op": ".map",
      "offset": 20372,
      "context": "d==='curriculum'){ body=`<div class=\"student-hub-list\"><h4>진로희망</h4><article><b>${escapeHtml(careerHope)}</b><span>선택과목 응답 기준</span></article><h4>학기별 선택과목</h4>${subjectByTerm.map(group=>`<article><b>${escapeHtml(group.term)}</b><span>${escapeHtml(group.rows.map(x=>x.subject).join(' · '))}</span></article>`).join('')||'<p>선택과목 자료가 없습니다.</p>'}</div>`; }else if(kind==='official'||kind==='late'||kind==='night'){ const rows=kind==='official'?attendance.official:kind==='late'?attendanc"
    },
    {
      "op": ".map",
      "offset": 20455,
      "context": "<b>${escapeHtml(careerHope)}</b><span>선택과목 응답 기준</span></article><h4>학기별 선택과목</h4>${subjectByTerm.map(group=>`<article><b>${escapeHtml(group.term)}</b><span>${escapeHtml(group.rows.map(x=>x.subject).join(' · '))}</span></article>`).join('')||'<p>선택과목 자료가 없습니다.</p>'}</div>`; }else if(kind==='official'||kind==='late'||kind==='night'){ const rows=kind==='official'?attendance.official:kind==='late'?attendance.late:attendance.night; body=`<div class=\"student-hub-list\">${rows.map(x=>`<"
    },
    {
      "op": ".map",
      "offset": 20765,
      "context": "d==='late'||kind==='night'){ const rows=kind==='official'?attendance.official:kind==='late'?attendance.late:attendance.night; body=`<div class=\"student-hub-list\">${rows.map(x=>`<article><b>${escapeHtml(x.date||'-')} ${escapeHtml(x.timeSlot||x.detailType||x.type||'')}</b><span>${escapeHtml([x.reasonText||x.reason,x.status,x.inputPath,x.programTitle].filter(Boolean).join(' · '))}</span></article>`).join('')||'<p>해당 출결 기록이 없습니다.</p>'}</div>`; }else if(kind==='program'){ body=`"
    },
    {
      "op": ".filter",
      "offset": 20947,
      "context": "ap(x=>`<article><b>${escapeHtml(x.date||'-')} ${escapeHtml(x.timeSlot||x.detailType||x.type||'')}</b><span>${escapeHtml([x.reasonText||x.reason,x.status,x.inputPath,x.programTitle].filter(Boolean).join(' · '))}</span></article>`).join('')||'<p>해당 출결 기록이 없습니다.</p>'}</div>`; }else if(kind==='program'){ body=`<div class=\"student-hub-list\">${participationPrograms.map(p=>`<article><b>${escapeHtml(p.recordTitle||p.actualTitle||p.title||'프로그램')}</b><span>${escapeHtml([p.__programGroup,p.date,"
    },
    {
      "op": ".map",
      "offset": 21138,
      "context": "lean).join(' · '))}</span></article>`).join('')||'<p>해당 출결 기록이 없습니다.</p>'}</div>`; }else if(kind==='program'){ body=`<div class=\"student-hub-list\">${participationPrograms.map(p=>`<article><b>${escapeHtml(p.recordTitle||p.actualTitle||p.title||'프로그램')}</b><span>${escapeHtml([p.__programGroup,p.date,p.time,p.place,p.__attendanceSummary].filter(Boolean).join(' · '))}</span></article>`).join('')||'<p>참여 프로그램 자료가 없습니다.</p>'}</div>`; }else if(kind==='score'){ body=`<div class=\"stud"
    },
    {
      "op": ".filter",
      "offset": 21304,
      "context": "pationPrograms.map(p=>`<article><b>${escapeHtml(p.recordTitle||p.actualTitle||p.title||'프로그램')}</b><span>${escapeHtml([p.__programGroup,p.date,p.time,p.place,p.__attendanceSummary].filter(Boolean).join(' · '))}</span></article>`).join('')||'<p>참여 프로그램 자료가 없습니다.</p>'}</div>`; }else if(kind==='score'){ body=`<div class=\"student-hub-score\"><div><small>최근 내신</small><b>${escapeHtml(scoreSummary.internalExam||'-')}</b><strong>${scoreSummary.internalAverage??'-'}등급</strong><em>9등급 환산 ${actual"
    },
    {
      "op": ".map",
      "offset": 22016,
      "context": "s||[];}catch{} body=`<div class=\"student-hub-list\"><article><b>현재 9등급 환산 내신</b><span>${actualNine==null?'-':actualNine.toFixed(2)}</span></article>${admissionRows.slice(0,20).map(x=>`<article><b>${escapeHtml(x.university||x.school||x.name||'대학')}</b><span>${escapeHtml([x.department||x.major,x.result||x.judgement,x.targetGrade||x.grade].filter(Boolean).join(' · '))}</span></article>`).join('')||'<p>연결된 대학 지원 가능성 자료가 없습니다.</p>'}</div>`; } const overlay=document.createElement('section"
    },
    {
      "op": ".filter",
      "offset": 22179,
      "context": "nRows.slice(0,20).map(x=>`<article><b>${escapeHtml(x.university||x.school||x.name||'대학')}</b><span>${escapeHtml([x.department||x.major,x.result||x.judgement,x.targetGrade||x.grade].filter(Boolean).join(' · '))}</span></article>`).join('')||'<p>연결된 대학 지원 가능성 자료가 없습니다.</p>'}</div>`; } const overlay=document.createElement('section'); overlay.className='student-hub-overlay'; overlay.innerHTML=`<div class=\"student-hub-overlay-card\"><header><div><small>${escapeHtml(live.studentNo)} ${e"
    }
  ],
  "decision": "REVIEW_OPENSTUDENTDRAWER_CONTEXT"
}
```
