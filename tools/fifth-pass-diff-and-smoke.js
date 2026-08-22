const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'audit-output';
const gPath=path.join(appRoot,'resources/app/gyomuon.js');
const g=fs.readFileSync(gPath,'utf8');
const lines=g.split(/\r?\n/);
const out=[];
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function sha(s){return crypto.createHash('sha256').update(s).digest('hex').slice(0,12)}
function functionSites(name){
  const re=new RegExp('(?:^|\\n)\\s*(?:function\\s+'+esc(name)+'\\s*\\(|'+esc(name)+'\\s*=\\s*function\\s*\\()','g');
  const starts=[]; let m;
  while((m=re.exec(g))){ starts.push(m.index+(m[0].startsWith('\n')?1:0)); }
  return starts.map(start=>{
    const brace=g.indexOf('{',start); if(brace<0)return null;
    let d=0,inS=null,escp=false,tmplExpr=0,end=-1;
    for(let i=brace;i<g.length;i++){
      const c=g[i],p=g[i-1];
      if(escp){escp=false;continue}
      if(inS){ if(c==='\\'){escp=true;continue} if(c===inS){inS=null;continue} if(inS==='`'&&c==='$'&&g[i+1]==='{'){tmplExpr++;i++;d++;continue} continue; }
      if(c==='"'||c==="'"||c==='`'){inS=c;continue}
      if(c==='{')d++; else if(c==='}'){d--;if(d===0){end=i+1;break}}
    }
    if(end<0)return null;
    const body=g.slice(start,end); const line=1+(g.slice(0,start).match(/\n/g)||[]).length;
    const tokens=[...body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)].map(x=>x[1]);
    return {name,line,start,end,chars:body.length,hash:sha(body),tokens:new Set(tokens),body};
  }).filter(Boolean);
}
const shadow=['sdgsDashboard','findPopupRoot','applyFix','uepStudentApplicationDetail','uepStudentApplicationView','uepSubjectApplicationView'];
const flatten=['selectionComparisonsForStudent','selectionComparisonMarkup','selectionErrorHistoryMarkup','selectionErrorsForStudent','recordsView','uepSelectionDataset'];
const diffs=[];
for(const name of [...shadow,...flatten]){
  const sites=functionSites(name); if(sites.length<2)continue;
  const last=sites[sites.length-1];
  for(let i=0;i<sites.length-1;i++){
    const a=sites[i],b=last;
    const onlyOld=[...a.tokens].filter(x=>!b.tokens.has(x)).sort();
    const onlyNew=[...b.tokens].filter(x=>!a.tokens.has(x)).sort();
    diffs.push({name,kind:shadow.includes(name)?'SHADOW':'FLATTEN',oldLine:a.line,newLine:b.line,oldChars:a.chars,newChars:b.chars,oldHash:a.hash,newHash:b.hash,oldOnlyCount:onlyOld.length,newOnlyCount:onlyNew.length,oldOnly:onlyOld.slice(0,80).join(' '),newOnly:onlyNew.slice(0,80).join(' ')});
  }
}
fs.writeFileSync(path.join(outDir,'fifth-pass-function-diffs.csv'),['name,kind,oldLine,newLine,oldChars,newChars,oldHash,newHash,oldOnlyCount,newOnlyCount,oldOnly,newOnly',...diffs.map(r=>Object.values(r).map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))].join('\n'),'utf8');

const safeCsv=fs.readFileSync(path.join(outDir,'fourth-pass-dead-review.csv'),'utf8').split(/\r?\n/).slice(1).filter(Boolean);
function parseCsvLine(s){const a=[];let cur='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(q&&s[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(c===','&&!q){a.push(cur);cur='';}else cur+=c;}a.push(cur);return a;}
const candidates=safeCsv.map(parseCsvLine).map(a=>({name:a[0],line:a[1],classification:a[7]})).filter(x=>x.classification==='SAFE_DELETE_AFTER_SMOKE');
const smokeMap={
 tasksMarkup:['dashboard','업무/할일 표시'],dormProgramIsHolisticTarget:['dorm','기숙/프로그램 대상 판정'],nightMatrixStatus:['attendance','야자 상태표'],schoolScheduleTimetableMarkup:['timetable','학교일정·시간표'],outputProgramCardMarkup:['outputs','출력센터 프로그램 카드'],internalNineGradeReferenceMap:['admissions','9등급 참조'],admissionCutLimit:['admissions','입시 컷'],counselRecordLabel:['records','상담 기록 라벨'],recordAreaPanel:['records','생활기록부 영역'],autoInferCareerDatesForClass:['records','진로 날짜 자동추론'],dateDistanceDays:['records','날짜거리'],careerDateEditor:['records','진로 날짜 편집'],normalizeRecordEnding:['records','기록 문장 정규화'],recordEvidenceSignals:['records','기록 근거 신호'],sdgsEvidenceForGoal:['records','SDGs 근거'],stripProgramDatesFromRecordText:['records','프로그램 날짜 제거'],programTopTabs:['programs','프로그램 상단탭'],formatTaskCompletedAt:['dashboard','업무 완료시각'],fixedTeacherTimetableReference:['timetable','교사시간표'],homeroomWeekMarkup:['timetable','담임 주간표'],safeWidget:['dashboard','대시보드 위젯'],dashboardTodayLessonsMarkup:['dashboard','오늘 수업'],dashboardSelectedDayMarkup:['dashboard','선택일'],dashboardCompactTasksMarkup:['dashboard','업무 카드'],dashboardStudentStatusMarkup:['dashboard','학생상태'],workItemReadByCurrentUser:['work','업무 읽음'],completionStatusMarkup:['work','완료상태'],todayProgramsMarkup:['dashboard','오늘 프로그램'],canRevealStudentSensitiveInfo:['students','민감정보 권한'],signalRowsForStudent:['students','학생 신호'],openMealDutyDrawer:['dashboard','급식지도 팝업'],openStudentTimetableDrawer:['students','학생시간표 팝업'],studentActivityOverview:['students','학생 활동개요'],sortUniversitiesByPriority:['admissions','대학 정렬'],admissionPairCompatible:['admissions','입시 조합'],studentStatsRankCard:['scores','학생 순위 카드'],sendProgramEmailNotice:['programs','프로그램 이메일'],prepareProgramSmsNotice:['programs','프로그램 문자'],openProgramAttendanceQr:['programs','프로그램 QR'],copyProgramRiroNotice:['programs','리로 공지'],copyProgramIndividualNotices:['programs','개별 안내'],copyProgramFamilyLetter:['programs','가정통신문']
};
const smoke=candidates.map(x=>{const m=smokeMap[x.name]||['unknown','수동확인'];return {...x,page:m[0],check:m[1]};});
fs.writeFileSync(path.join(outDir,'fifth-pass-smoke-plan.csv'),['name,line,page,check',...smoke.map(r=>[r.name,r.line,r.page,r.check].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))].join('\n'),'utf8');

const report=[];
report.push('# UEP CODEBASE AUDIT — FIFTH PASS DIFF + SMOKE PLAN','');
report.push(`- shadow/flatten diff rows: ${diffs.length}`);
report.push(`- smoke candidates: ${smoke.length}`,'');
report.push('## Function-generation risk');
for(const r of diffs){
  const risk=r.oldOnlyCount===0?'LOWER':'REVIEW';
  report.push(`- ${r.name} ${r.kind}: old@${r.oldLine} -> final@${r.newLine} | oldOnly=${r.oldOnlyCount} newOnly=${r.newOnlyCount} | ${risk}`);
  if(r.oldOnlyCount) report.push(`  - old-only tokens: ${r.oldOnly}`);
}
report.push('','## Smoke plan by page');
const groups=new Map();for(const s of smoke){if(!groups.has(s.page))groups.set(s.page,[]);groups.get(s.page).push(s)}
for(const [page,arr] of [...groups.entries()].sort()){report.push(`- ${page}: ${arr.length}`);for(const s of arr)report.push(`  - ${s.name}: ${s.check}`)}
report.push('','## Decision rule','- oldOnly=0 for a shadowed declaration: earlier generation is a strong delete candidate after syntax + route smoke.','- oldOnly>0: inspect whether those old-only tokens are behavior or merely local names before removal.','- FLATTEN rows are never deleted mechanically; preserve wrapper-added behavior in one canonical implementation.','- Smoke candidates are not deleted in this pass.');
fs.writeFileSync(path.join(outDir,'FIFTH-PASS-DIFF-SMOKE.md'),report.join('\n'),'utf8');
console.log(`FIFTH PASS COMPLETE diffs=${diffs.length} smoke=${smoke.length}`);
