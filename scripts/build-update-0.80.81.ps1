$ErrorActionPreference='Stop'
$gd='app/resources/app/electron/google-data.cjs'
$gyo='app/resources/app/gyomuon.js'
$css='app/resources/app/gyomuon.css'
$pkg='app/resources/app/package.json'

$d=Get-Content $gd -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8
$c=Get-Content $css -Raw -Encoding UTF8

# ----------------------------
# 1) 선택과목: 06_선택과목이력의 2-1/2-2 표기를 화면 표준 학기명으로 정규화
# ----------------------------
$d=$d.Replace('semester:String(row["학기"]||row["이수학기"]||"").trim(), term:String(row["이수학기"]||row["학기"]||"").trim(),','semester:normalizeSelectionTerm(row["이수학기"]||row["학기"]||""), term:normalizeSelectionTerm(row["이수학기"]||row["학기"]||""),')

# 현재 이력에 신청차수/비고도 보존
$d=$d.Replace('final:String(row["최종여부"]||"").trim(), source:String(row["원본시트"]||"06_선택과목이력").trim()','final:String(row["최종여부"]||"").trim(), round:String(row["신청차수"]||"").trim(), note:String(row["비고"]||"").trim(), source:String(row["원본시트"]||"06_선택과목이력").trim()')

# ----------------------------
# 2) 기존 Google Form 사전상담 vs 리로스쿨 본신청 비교 데이터를 cache에 실제 생성
# ----------------------------
if($d -notmatch 'const selectionComparisons = \[\];'){
$comparison=@'

  // 0.80.81: 사전상담 Google Form과 기본정보 06_선택과목이력(본신청)을 학생·학기별로 비교한다.
  // 행 번호가 아니라 학생ID 우선, 학번 보조키를 사용한다.
  const selectionComparisons = [];
  const currentByStudent = new Map();
  selectedSubjects.forEach(row=>{
    const key=String(row.studentId||row.studentNo||'').trim();
    if(!key)return;
    if(!currentByStudent.has(key))currentByStudent.set(key,[]);
    currentByStudent.get(key).push(row);
  });
  students.forEach(student=>{
    const no=String(student.studentNo||'').replace(/\.0$/,'').trim();
    const sid=String(student.id||'').trim();
    const raw=latestRawSelection.get(no)||{};
    const pre=[];
    selectionBlocks.forEach(([term,group,column])=>{
      String(raw[column]||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(subject=>pre.push({term,group,subject}));
    });
    const current=[...(currentByStudent.get(sid)||[]),...(sid===no?[]:(currentByStudent.get(no)||[]))];
    const terms=[...new Set([...pre.map(x=>x.term),...current.map(x=>normalizeSelectionTerm(x.term||x.semester))].filter(Boolean))];
    terms.forEach(term=>{
      const preSet=new Set(pre.filter(x=>x.term===term).map(x=>String(x.subject||'').trim()).filter(Boolean));
      const mainSet=new Set(current.filter(x=>normalizeSelectionTerm(x.term||x.semester)===term).map(x=>String(x.subject||'').trim()).filter(Boolean));
      if(!preSet.size&&!mainSet.size)return;
      const kept=[...preSet].filter(x=>mainSet.has(x));
      const removed=[...preSet].filter(x=>!mainSet.has(x));
      const added=[...mainSet].filter(x=>!preSet.has(x));
      const status=!removed.length&&!added.length?'일치':(removed.length&&added.length?'변경':(added.length?'추가':'삭제'));
      selectionComparisons.push({studentId:sid,studentNo:no,name:student.name||'',term,status,preSubjects:[...preSet],mainSubjects:[...mainSet],kept,removed,added});
    });
  });
'@
  $marker='  if(curriculumErrors.length){'
  if($d.Contains($marker)){$d=$d.Replace($marker,$comparison+"`n"+$marker)}else{throw 'selection comparison insertion point not found'}
}
if($d -notmatch 'selectionComparisons,'){
  $d=$d.Replace('    selectedSubjects,`n    selectionSubjectErrors,','    selectedSubjects,`n    selectionComparisons,`n    selectionSubjectErrors,')
}

# ----------------------------
# 3) 교육과정 화면에 사전상담↔본신청 비교 패널 실제 연결
# ----------------------------
if($g -notmatch 'function selectionComparisonMarkup\('){
$helper=@'

function selectionComparisonsForStudent(student){
  return (readonlyCache?.selectionComparisons||[]).filter(x=>(x.studentId&&String(x.studentId)===String(student?.id))||(x.studentNo&&String(x.studentNo)===String(student?.studentNo)));
}
function selectionComparisonMarkup(student){
  const rows=selectionComparisonsForStudent(student);
  if(!rows.length)return `<section class="selection-compare-panel"><header><div><small>PRE-CONSULTATION ↔ MAIN APPLICATION</small><h3>사전상담 ↔ 본신청 비교</h3></div><span>비교자료 없음</span></header><p class="selection-compare-help">기존 Google Form 사전상담과 리로스쿨 본신청 자료가 함께 연결되면 학기별 변경 내용을 표시합니다.</p></section>`;
  const changed=rows.filter(x=>x.status!=='일치').length;
  return `<section class="selection-compare-panel"><header><div><small>PRE-CONSULTATION ↔ MAIN APPLICATION</small><h3>사전상담 ↔ 본신청 비교</h3><p>학생이 상담 단계에서 생각했던 선택과 실제 본신청이 어떻게 달라졌는지 확인합니다.</p></div><span>${changed?`변경 ${changed}개 학기`:'전체 일치'}</span></header><div class="selection-compare-grid">${rows.sort((a,b)=>curriculumTermOrder(a.term)-curriculumTermOrder(b.term)).map(x=>`<article class="selection-compare-card ${x.status==='일치'?'same':'changed'}"><div class="selection-compare-title"><b>${escapeHtml(x.term)}</b><em>${escapeHtml(x.status)}</em></div><div class="selection-compare-columns"><div><small>사전상담</small><p>${x.preSubjects.map(s=>`<span>${escapeHtml(s)}</span>`).join('')||'<i>없음</i>'}</p></div><div><small>본신청</small><p>${x.mainSubjects.map(s=>`<span>${escapeHtml(s)}</span>`).join('')||'<i>없음</i>'}</p></div></div>${x.status!=='일치'?`<div class="selection-change-summary">${x.removed.length?`<span class="removed">빠짐 · ${escapeHtml(x.removed.join(' · '))}</span>`:''}${x.added.length?`<span class="added">추가 · ${escapeHtml(x.added.join(' · '))}</span>`:''}</div>`:'<div class="selection-change-summary"><span class="same">사전상담과 본신청이 같습니다.</span></div>'}</article>`).join('')}</div></section>`;
}
'@
  $insert='function selectionSubmissionInfo(bundle){'
  if($g.Contains($insert)){$g=$g.Replace($insert,$helper+"`n"+$insert)}else{throw 'selectionSubmissionInfo marker not found'}
}

# curriculum return에 비교 패널 삽입
$g=$g.Replace('${profilePanel}${errorPanel}<div class="curriculum-term-grid">','${profilePanel}${selectionComparisonMarkup(student)}${errorPanel}<div class="curriculum-term-grid">')

# ----------------------------
# 4) SDGs: 기존 이수현황 화면을 생활기록부 핵심 성장 스토리로 실제 교체
# ----------------------------
$newSdgs=@'
function sdgsDashboard(student,bundle){
  const career=studentCareerSupport(student,bundle);
  const programs=(bundle.programs||[]).filter(p=>p.kind!=="after");
  const activityRows=bundle.activities||[];
  const reportRows=[...recordEvidenceRows(student,bundle,"autonomy"),...recordEvidenceRows(student,bundle,"career")].filter(r=>r.report);
  const uniqueReports=[]; const seenReports=new Set();
  reportRows.forEach(r=>{const k=String(r.report?.id||[r.report?.submittedAt,r.title,(r.report?.responses||[]).join('|')].join('::'));if(!seenReports.has(k)){seenReports.add(k);uniqueReports.push(r);}});

  const sdgMap=new Map(SDG_CATALOG.map(([no,name])=>[no,{no,name,evidence:[],programs:[],reports:[]} ]));
  programs.forEach(p=>String(p.sdgs||'').split(/[,;/\s]+/).map(Number).filter(n=>n>=1&&n<=17).forEach(n=>{const row=sdgMap.get(n);if(row){row.programs.push(p);row.evidence.push({type:'program',title:p.recordTitle||p.title||'프로그램'});}}));
  uniqueReports.forEach(row=>suggestSdgsForRows([row]).slice(0,3).forEach(x=>{const item=sdgMap.get(Number(x.no));if(item){item.reports.push(row);item.evidence.push({type:'report',title:row.title||row.program?.recordTitle||row.program?.title||'보고서'});}}));
  const ranked=[...sdgMap.values()].filter(x=>x.evidence.length).sort((a,b)=>b.evidence.length-a.evidence.length||a.no-b.no);
  const topSdgs=ranked.slice(0,4);

  const careerCounts=new Map();
  uniqueReports.forEach(row=>{const a=analyzeReportTags(row.report);a.careers.forEach(tag=>careerCounts.set(tag.label,(careerCounts.get(tag.label)||0)+tag.score));});
  const topCareers=[...careerCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([label])=>label);
  const hope=[career.hopeTrack,career.hopeMajor].filter(v=>v&&v!=='-');
  const selected=(bundle.selected||[]).slice(0,8).map(x=>x.subject).filter(Boolean);
  const areaCounts=new Map();
  activityRows.forEach(x=>{const area=String(x.area||x.type||'기타').trim()||'기타';areaCounts.set(area,(areaCounts.get(area)||0)+1);});
  const areaSummary=[...areaCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);

  const story=[];
  if(hope.length)story.push(`${hope.join(' · ')}에 관심을 두고`);
  if(topCareers.length)story.push(`${topCareers.slice(0,3).join('·')} 분야의 탐구가 반복되고 있으며`);
  if(topSdgs.length)story.push(`${topSdgs.slice(0,3).map(x=>`SDG ${x.no} ${x.name}`).join(', ')}와 연결되는 사회적 가치가 활동 속에서 나타납니다.`);
  if(!story.length)story.push('현재 연결된 학교활동과 보고서를 바탕으로 학생의 관심 주제와 가치의 흐름을 만들어 가는 단계입니다.');
  const storyText=story.join(' ');

  const valueCards=topSdgs.length?topSdgs.map(x=>`<article><b>SDG ${x.no}</b><span>${escapeHtml(x.name)}</span><small>연결 근거 ${x.evidence.length}건</small></article>`).join(''):'<div class="empty-inline">아직 충분한 SDGs 연결 근거가 없습니다.</div>';
  const topicText=topCareers.length?topCareers.join(' · '):uniqueReports.slice(0,3).map(r=>r.title).filter(Boolean).join(' · ')||'탐구주제 형성 중';
  const evidenceText=[...areaSummary.map(([k,v])=>`${k} ${v}건`),`프로그램 ${programs.length}건`,`보고서 ${uniqueReports.length}건`].join(' · ');

  const details=[...sdgMap.values()].map(x=>`<button class="growth-sdg-chip ${x.evidence.length?'active':''}" data-sdgs-detail="${x.no}"><b>${x.no}</b><span>${escapeHtml(x.name)}</span><small>${x.evidence.length?`${x.evidence.length}건 연결`:'현재 근거 없음'}</small></button>`).join('');
  const detailNo=Number(recordSdgsDetail||0); const detail=detailNo?sdgMap.get(detailNo):null;

  return `<div class="growth-profile-v081">
    <section class="growth-profile-intro"><div><small>STUDENT GROWTH STORY · UNESCO SCHOOL</small><h2>${escapeHtml(student.name)} 생활기록부 핵심 성장 프로파일</h2><p><b>활동의 나열이 아니라 학생의 스토리를 봅니다.</b> 우리 학교의 유네스코 교육 방향과 학교교육과정(자율·진로·동아리·봉사), 선택활동, 교과·탐구·보고서를 진로·전공과 SDGs의 관점에서 함께 읽어 학생의 관심·문제의식·성장 흐름을 확인합니다.</p></div><span>17개 목표를 채우는 것이 목적이 아닙니다.</span></section>

    <section class="growth-story-card"><header><div><small>CORE STORY</small><h3>이 학생을 설명하는 현재의 성장 스토리</h3></div><span>생활기록부 전체 연결</span></header><p>${escapeHtml(storyText)}</p><div class="growth-story-source">${escapeHtml(evidenceText)}</div></section>

    <div class="growth-axis-grid">
      <section><small>01 CAREER · MAJOR</small><h3>진로·전공 관심</h3><b>${escapeHtml(hope.join(' · ')||'진로 관심 형성 중')}</b><p>${selected.length?`선택과목 · ${escapeHtml(selected.slice(0,6).join(' · '))}`:'선택과목 연결 자료를 확인합니다.'}</p></section>
      <section><small>02 EXPLORATION</small><h3>핵심 탐구주제</h3><b>${escapeHtml(topicText)}</b><p>보고서와 진로활동에서 반복·심화되는 주제를 중심으로 봅니다.</p></section>
      <section><small>03 VALUE · SDGs</small><h3>사회적 가치·SDGs</h3><div class="growth-value-mini">${valueCards}</div></section>
      <section><small>04 EVIDENCE FLOW</small><h3>학교교육과정 속 근거</h3><b>${activityRows.length+programs.length+uniqueReports.length}건 연결</b><p>${escapeHtml(areaSummary.map(([k,v])=>`${k} ${v}`).join(' · ')||'활동 근거 연결 중')}</p></section>
    </div>

    <section class="growth-teacher-guide"><header><div><small>HOMEROOM GUIDE</small><h3>담임은 이렇게 지도해 주세요</h3></div><span>상담·보고서·기록 연계</span></header><div><p><b>① 진로 연결</b> 이 활동이 자신의 관심 전공과 어떻게 이어지는가?</p><p><b>② 문제 발견</b> 사회·공동체·환경·미래의 어떤 문제를 발견했는가?</p><p><b>③ 관점 변화</b> 활동 전후 생각이나 판단이 어떻게 달라졌는가?</p><p><b>④ 다음 탐구</b> 다음 교과·진로·선택활동에서 무엇을 더 깊게 보고 싶은가?</p></div><em>학생 보고서는 활동 요약보다 ‘무엇을 바라보게 되었는지’를 표현할 때 생활기록부 전체의 스토리가 살아납니다.</em></section>

    <section class="growth-sdg-lens"><header><div><small>SDGs VALUE LENS</small><h3>17개 목표는 학생을 읽는 ‘가치의 렌즈’입니다</h3><p>미이수·충족을 판단하지 않고 현재 활동에서 확인되는 연결 근거를 보여줍니다.</p></div><span>${ranked.length}개 목표에서 근거 발견</span></header><div class="growth-sdg-grid">${details}</div></section>

    ${detail?`<section class="growth-sdg-detail"><header><h3>SDG ${detail.no} ${escapeHtml(detail.name)} · 연결 근거</h3><span>${detail.evidence.length}건</span></header>${detail.evidence.map(e=>`<article><b>${escapeHtml(e.title)}</b><small>${e.type==='report'?'학생 보고서':'학교 프로그램'}</small></article>`).join('')||'<div class="empty-inline">현재 연결 근거가 없습니다.</div>'}</section>`:''}

    ${careerPortfolioDashboard(student,bundle)}
  </div>`;
}
'@
$pattern='(?s)function sdgsDashboard\(student,bundle\)\{.*?\n\}\nfunction existingFinalRecord'
if([regex]::IsMatch($g,$pattern)){
  $g=[regex]::Replace($g,$pattern,$newSdgs+"`nfunction existingFinalRecord",1)
}else{throw 'sdgsDashboard block not found'}

# 탭 문구도 실제 철학과 일치
$g=$g.Replace('["sdgs","SDGs 이수현황"]','["sdgs","SDGs 연계 성장 프로파일"]')
$g=$g.Replace('id==="sdgs"?"17개 목표별 포트폴리오"','id==="sdgs"?"진로·전공·탐구주제·사회적 가치 연계"')

# 버전
$g=$g.Replace('const APP_VERSION = "0.80.80";','const APP_VERSION = "0.80.81";')
$g=$g.Replace('v0.80.80','v0.80.81')

# ----------------------------
# 5) 화면 스타일
# ----------------------------
if($c -notmatch 'UEP_GROWTH_PROFILE_081'){
$c += @'

/* __UEP_GROWTH_PROFILE_081__ */
.growth-profile-v081{display:grid;gap:16px}.growth-profile-intro,.growth-story-card,.growth-teacher-guide,.growth-sdg-lens,.growth-sdg-detail{border:1px solid #dce8e6;border-radius:20px;background:#fff;padding:20px}.growth-profile-intro{display:flex;justify-content:space-between;gap:20px;background:linear-gradient(135deg,#eefaf7,#f7fbff)}.growth-profile-intro h2{margin:5px 0 8px;font-size:23px}.growth-profile-intro p{max-width:980px;line-height:1.65}.growth-profile-intro>span{align-self:flex-start;background:#e7f7f1;border-radius:999px;padding:9px 13px;font-weight:700;color:#277562;white-space:nowrap}.growth-story-card header,.growth-teacher-guide header,.growth-sdg-lens header,.growth-sdg-detail header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.growth-story-card>p{font-size:18px;line-height:1.75;font-weight:650;color:#16344b;margin:14px 0}.growth-story-source{font-size:12px;color:#71818d}.growth-axis-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.growth-axis-grid>section{border:1px solid #e0e8eb;border-radius:17px;padding:17px;background:#fbfdfd;min-height:155px}.growth-axis-grid small,.growth-profile-v081 header small{color:#2b8b78;font-weight:800;letter-spacing:.04em}.growth-axis-grid h3{margin:6px 0 12px}.growth-axis-grid b{font-size:15px;line-height:1.45}.growth-axis-grid p{font-size:12px;color:#687984;line-height:1.5}.growth-value-mini{display:grid;grid-template-columns:1fr 1fr;gap:6px}.growth-value-mini article{padding:8px;border-radius:10px;background:#eef8f5;display:grid}.growth-value-mini article b{font-size:12px}.growth-value-mini article span,.growth-value-mini article small{font-size:10px}.growth-teacher-guide>div{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:15px 0}.growth-teacher-guide p{margin:0;padding:12px 14px;border-radius:12px;background:#f5f8fb}.growth-teacher-guide em{display:block;background:#fff7df;border-radius:12px;padding:12px 14px;font-style:normal;color:#695319}.growth-sdg-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:14px}.growth-sdg-chip{border:1px solid #e0e6ea;background:#fafcfd;border-radius:12px;padding:10px;text-align:left;display:grid;gap:3px}.growth-sdg-chip.active{border-color:#8fd1c3;background:#effaf7}.growth-sdg-chip b{font-size:16px}.growth-sdg-chip span{font-size:11px;font-weight:700}.growth-sdg-chip small{font-size:9px;color:#7b8993}.growth-sdg-detail article{display:inline-flex;flex-direction:column;gap:3px;margin:8px 8px 0 0;padding:10px 12px;border-radius:12px;background:#f3f8fa}.selection-compare-panel{margin:14px 0;border:1px solid #dbe5ec;border-radius:18px;padding:18px;background:#fff}.selection-compare-panel header{display:flex;justify-content:space-between;gap:16px}.selection-compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.selection-compare-card{border:1px solid #e1e7eb;border-radius:14px;padding:12px}.selection-compare-card.changed{border-color:#f0c88b;background:#fffaf2}.selection-compare-title{display:flex;justify-content:space-between}.selection-compare-title em{font-style:normal;font-weight:800}.selection-compare-columns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.selection-compare-columns>div{background:#f7f9fb;border-radius:10px;padding:9px}.selection-compare-columns p{display:flex;flex-wrap:wrap;gap:5px}.selection-compare-columns span{font-size:11px;background:#fff;border:1px solid #e2e7ea;border-radius:999px;padding:4px 7px}.selection-change-summary{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;font-size:11px}.selection-change-summary .removed{color:#a34a42}.selection-change-summary .added{color:#1f7662}.selection-change-summary .same{color:#2f7b69}@media(max-width:1200px){.growth-axis-grid{grid-template-columns:1fr 1fr}.growth-sdg-grid{grid-template-columns:repeat(4,1fr)}}
'@
}

Set-Content $gd $d -Encoding UTF8 -NoNewline
Set-Content $gyo $g -Encoding UTF8 -NoNewline
Set-Content $css $c -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.81'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check $gd
node --check 'app/resources/app/electron/main.cjs'
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo

$vd=Get-Content $gd -Raw -Encoding UTF8
$vg=Get-Content $gyo -Raw -Encoding UTF8
if(-not $vd.Contains('selectionComparisons')){throw 'selection comparison cache missing'}
if(-not $vg.Contains('생활기록부 핵심 성장 프로파일')){throw 'growth profile UI missing'}
if(-not $vg.Contains('0.80.81')){throw 'visible version 0.80.81 missing'}
Write-Host 'UEP 0.80.81 real selection comparison + growth-story SDGs profile applied.'
