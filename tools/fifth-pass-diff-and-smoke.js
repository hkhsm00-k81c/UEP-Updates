const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'audit-output';
const gPath=path.join(appRoot,'resources/app/gyomuon.js');
const g=fs.readFileSync(gPath,'utf8');
const lines=g.split(/\r?\n/);
function parseCsv(text){
  const rows=[]; let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(q&&text[i+1]==='"'){cur+='"';i++;} else q=!q;
    } else if(c===','&&!q){row.push(cur);cur='';}
    else if((c==='\n'||c==='\r')&&!q){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(cur);cur=''; if(row.some(x=>x!==''))rows.push(row); row=[];
    } else cur+=c;
  }
  if(cur||row.length){row.push(cur);rows.push(row)}
  if(!rows.length)return [];
  const hdr=rows[0];
  return rows.slice(1).map(a=>Object.fromEntries(hdr.map((h,i)=>[h,a[i]??''])));
}
function csv(rows,fields){return [fields.join(','),...rows.map(r=>fields.map(f=>'"'+String(r[f]??'').replaceAll('"','""')+'"').join(','))].join('\n')}
function offsetForLine(line){let off=0;for(let i=1;i<line;i++)off+=lines[i-1].length+1;return off}
function tokens(s){return new Set([...s.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)].map(m=>m[1]))}

// Use third-pass exact line/char extraction instead of re-parsing JS bodies.
const dupRows=parseCsv(fs.readFileSync(path.join(outDir,'third-pass-duplicates.csv'),'utf8'));
const groups=new Map();
for(const r of dupRows){if(!groups.has(r.name))groups.set(r.name,[]);groups.get(r.name).push(r)}
const diffs=[];
for(const [name,rows] of groups){
  rows.sort((a,b)=>Number(a.line)-Number(b.line));
  if(rows.length<2)continue;
  const final=rows[rows.length-1];
  const finalBody=g.slice(offsetForLine(Number(final.line)),offsetForLine(Number(final.line))+Number(final.chars));
  const finalTokens=tokens(finalBody);
  for(const old of rows.slice(0,-1)){
    const oldBody=g.slice(offsetForLine(Number(old.line)),offsetForLine(Number(old.line))+Number(old.chars));
    const oldTokens=tokens(oldBody);
    const onlyOld=[...oldTokens].filter(x=>!finalTokens.has(x)).sort();
    const onlyNew=[...finalTokens].filter(x=>!oldTokens.has(x)).sort();
    diffs.push({
      name,
      kind:String(old.class||'').includes('FLATTEN')?'FLATTEN':'SHADOW',
      oldKind:old.kind,
      finalKind:final.kind,
      oldLine:old.line,
      newLine:final.line,
      oldChars:old.chars,
      newChars:final.chars,
      oldHash:old.hash,
      newHash:final.hash,
      oldOnlyCount:onlyOld.length,
      newOnlyCount:onlyNew.length,
      oldOnly:onlyOld.slice(0,120).join(' '),
      newOnly:onlyNew.slice(0,120).join(' ')
    });
  }
}
fs.writeFileSync(path.join(outDir,'fifth-pass-function-diffs.csv'),csv(diffs,['name','kind','oldKind','finalKind','oldLine','newLine','oldChars','newChars','oldHash','newHash','oldOnlyCount','newOnlyCount','oldOnly','newOnly']),'utf8');

const deadRows=parseCsv(fs.readFileSync(path.join(outDir,'fourth-pass-dead-review.csv'),'utf8'));
const candidates=deadRows.filter(r=>r.classification==='SAFE_DELETE_AFTER_SMOKE');
const smokeMap={
 tasksMarkup:['dashboard','업무/할일 표시'],dormProgramIsHolisticTarget:['dorm','기숙/프로그램 대상 판정'],nightMatrixStatus:['attendance','야자 상태표'],schoolScheduleTimetableMarkup:['timetable','학교일정·시간표'],outputProgramCardMarkup:['outputs','출력센터 프로그램 카드'],internalNineGradeReferenceMap:['admissions','9등급 참조'],admissionCutLimit:['admissions','입시 컷'],counselRecordLabel:['records','상담 기록 라벨'],recordAreaPanel:['records','생활기록부 영역'],autoInferCareerDatesForClass:['records','진로 날짜 자동추론'],dateDistanceDays:['records','날짜거리'],careerDateEditor:['records','진로 날짜 편집'],normalizeRecordEnding:['records','기록 문장 정규화'],recordEvidenceSignals:['records','기록 근거 신호'],sdgsEvidenceForGoal:['records','SDGs 근거'],stripProgramDatesFromRecordText:['records','프로그램 날짜 제거'],programTopTabs:['programs','프로그램 상단탭'],formatTaskCompletedAt:['dashboard','업무 완료시각'],fixedTeacherTimetableReference:['timetable','교사시간표'],homeroomWeekMarkup:['timetable','담임 주간표'],safeWidget:['dashboard','대시보드 위젯'],dashboardTodayLessonsMarkup:['dashboard','오늘 수업'],dashboardSelectedDayMarkup:['dashboard','선택일'],dashboardCompactTasksMarkup:['dashboard','업무 카드'],dashboardStudentStatusMarkup:['dashboard','학생상태'],workItemReadByCurrentUser:['work','업무 읽음'],completionStatusMarkup:['work','완료상태'],todayProgramsMarkup:['dashboard','오늘 프로그램'],canRevealStudentSensitiveInfo:['students','민감정보 권한'],signalRowsForStudent:['students','학생 신호'],openMealDutyDrawer:['dashboard','급식지도 팝업'],openStudentTimetableDrawer:['students','학생시간표 팝업'],studentActivityOverview:['students','학생 활동개요'],sortUniversitiesByPriority:['admissions','대학 정렬'],admissionPairCompatible:['admissions','입시 조합'],studentStatsRankCard:['scores','학생 순위 카드'],sendProgramEmailNotice:['programs','프로그램 이메일'],prepareProgramSmsNotice:['programs','프로그램 문자'],openProgramAttendanceQr:['programs','프로그램 QR'],copyProgramRiroNotice:['programs','리로 공지'],copyProgramIndividualNotices:['programs','개별 안내'],copyProgramFamilyLetter:['programs','가정통신문']
};
const smoke=candidates.map(x=>{const m=smokeMap[x.name]||['unknown','수동확인'];return {name:x.name,line:x.line,page:m[0],check:m[1]};});
fs.writeFileSync(path.join(outDir,'fifth-pass-smoke-plan.csv'),csv(smoke,['name','line','page','check']),'utf8');

const expectedNames=[...new Set(dupRows.map(r=>r.name))];
const diffNames=[...new Set(diffs.map(r=>r.name))];
const missingDiffNames=expectedNames.filter(n=>!diffNames.includes(n));
const unknownSmoke=smoke.filter(s=>s.page==='unknown').map(s=>s.name);
const report=[];
report.push('# UEP CODEBASE AUDIT — FIFTH PASS DIFF + SMOKE PLAN','');
report.push(`- duplicate/override names expected: ${expectedNames.length}`);
report.push(`- duplicate/override names analyzed: ${diffNames.length}`);
report.push(`- shadow/flatten diff rows: ${diffs.length}`);
report.push(`- SAFE_DELETE_AFTER_SMOKE expected: ${candidates.length}`);
report.push(`- smoke candidates mapped: ${smoke.length}`);
report.push(`- missing diff names: ${missingDiffNames.length}`);
report.push(`- unknown smoke mappings: ${unknownSmoke.length}`,'');
report.push('## Function-generation risk');
for(const r of diffs){
  const risk=Number(r.oldOnlyCount)===0?'LOWER':'REVIEW';
  report.push(`- ${r.name} ${r.kind}: ${r.oldKind}@${r.oldLine} -> ${r.finalKind}@${r.newLine} | oldOnly=${r.oldOnlyCount} newOnly=${r.newOnlyCount} | ${risk}`);
  if(Number(r.oldOnlyCount))report.push(`  - old-only tokens: ${r.oldOnly}`);
}
report.push('','## Smoke plan by page');
const byPage=new Map();for(const s of smoke){if(!byPage.has(s.page))byPage.set(s.page,[]);byPage.get(s.page).push(s)}
for(const [page,arr] of [...byPage.entries()].sort()){report.push(`- ${page}: ${arr.length}`);for(const s of arr)report.push(`  - ${s.name}: ${s.check}`)}
if(missingDiffNames.length)report.push('','## MISSING DIFF NAMES',...missingDiffNames.map(n=>'- '+n));
if(unknownSmoke.length)report.push('','## UNKNOWN SMOKE MAPPINGS',...unknownSmoke.map(n=>'- '+n));
report.push('','## Decision rule','- This pass is fail-closed: incomplete duplicate or smoke coverage fails CI.','- FLATTEN rows are never deleted mechanically; preserve wrapper-added behavior in one canonical implementation.','- Smoke candidates are not deleted in this pass.');
fs.writeFileSync(path.join(outDir,'FIFTH-PASS-DIFF-SMOKE.md'),report.join('\n'),'utf8');

if(expectedNames.length!==12)throw new Error(`Expected 12 duplicate/override names, got ${expectedNames.length}`);
if(diffNames.length!==expectedNames.length)throw new Error(`Incomplete diff coverage: ${diffNames.length}/${expectedNames.length}; missing=${missingDiffNames.join(',')}`);
if(candidates.length!==42)throw new Error(`Expected 42 SAFE_DELETE_AFTER_SMOKE candidates, got ${candidates.length}`);
if(smoke.length!==candidates.length)throw new Error(`Incomplete smoke coverage: ${smoke.length}/${candidates.length}`);
if(unknownSmoke.length)throw new Error(`Unknown smoke mappings: ${unknownSmoke.join(',')}`);
console.log(`FIFTH PASS COMPLETE names=${diffNames.length}/${expectedNames.length} diffs=${diffs.length} smoke=${smoke.length}/${candidates.length}`);
