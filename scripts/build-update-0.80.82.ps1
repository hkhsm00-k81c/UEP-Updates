$ErrorActionPreference='Stop'
$gd='app/resources/app/electron/google-data.cjs'
$gyo='app/resources/app/gyomuon.js'
$css='app/resources/app/gyomuon.css'
$pkg='app/resources/app/package.json'
$d=Get-Content $gd -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8
$c=Get-Content $css -Raw -Encoding UTF8

# 1) 선택과목 학기 자동 확장: 2-1/2-2/3-1/3-2 및 표기 변형을 모두 동일 표준으로 처리.
# 3학년 본신청을 06_선택과목이력에 추가하면 코드 수정 없이 바로 반영된다.
$termHelper=@'

// __UEP_SELECTION_TERM_08082__
function normalizeSelectionTerm(value){
  const s=String(value||'').replace(/\s+/g,'').replace(/학년도/g,'').trim();
  let m=s.match(/([23])(?:학년)?[-_.]?([12])(?:학기)?/);
  if(!m)m=s.match(/([23])학년([12])학기/);
  if(m)return `${m[1]}학년 ${m[2]}학기`;
  return String(value||'').trim();
}
'@
if($d -notmatch '__UEP_SELECTION_TERM_08082__'){$d += $termHelper}
$d=$d.Replace('pre.push({term,group,subject})','pre.push({term:normalizeSelectionTerm(term),group,subject})')

# 2) 사전신청 오류 -> 본신청 상태 추적.
# 기존 사전검증 결과(curriculumErrors)를 보존하면서 본신청에서 중복/문이과 혼합을 재검증하고,
# 과학 위계 오류는 기존 오류의 관련 과목 잔존 여부를 근거로 지속/해결추정/재검토로 표시한다.
if($d -notmatch 'const selectionErrorTransitions = \[\];'){
$err=@'

  const selectionErrorTransitions = [];
  const normalizeErrCategory=e=>{
    const t=String(e?.type||e?.category||e?.kind||e?.message||e?.reason||'').toLowerCase();
    if(/중복|duplicate/.test(t))return '학기간 중복신청';
    if(/문.*이|이.*문|혼합|계열/.test(t))return '문이과 혼합';
    if(/위계|선수|과학/.test(t))return '과학계열 위계';
    return '기타 선택오류';
  };
  const errStudentNo=e=>String(e?.studentNo||e?.studentNumber||e?.['학번']||e?.no||'').replace(/\.0$/,'').trim();
  const errText=e=>String(e?.message||e?.reason||e?.detail||e?.description||JSON.stringify(e||{}));
  const extractNamedSubjects=text=>[...String(text||'').matchAll(/[「『\[\(\"']([^」』\]\)\"']{2,30})[」』\]\)\"']/g)].map(m=>m[1].trim());
  const mainByNo=new Map();
  selectedSubjects.forEach(r=>{const no=String(r.studentNo||'').replace(/\.0$/,'').trim();if(!no)return;if(!mainByNo.has(no))mainByNo.set(no,[]);mainByNo.get(no).push(r);});
  const detectMainErrors=(rows=[])=>{
    const out=[]; const byTerm=new Map(); const seenSubject=new Map();
    rows.forEach(r=>{const term=normalizeSelectionTerm(r.term||r.semester),sub=String(r.subject||'').trim(),group=String(r.group||r.category||r['교과군']||'').trim();if(!byTerm.has(term))byTerm.set(term,[]);byTerm.get(term).push({term,sub,group});if(sub){if(!seenSubject.has(sub))seenSubject.set(sub,new Set());seenSubject.get(sub).add(term);}});
    [...seenSubject].forEach(([sub,terms])=>{if(terms.size>1)out.push({category:'학기간 중복신청',message:`${sub} · ${[...terms].join(' / ')}`});});
    byTerm.forEach((list,term)=>{const hasSci=list.some(x=>/과학/.test(x.group));const hasSoc=list.some(x=>/사회|역사|도덕/.test(x.group));if(hasSci&&hasSoc)out.push({category:'문이과 혼합',message:`${term} 탐구/교과 선택에서 사회·과학 계열이 함께 확인됨`});});
    return out;
  };
  students.forEach(st=>{
    const no=String(st.studentNo||'').replace(/\.0$/,'').trim(); const sid=String(st.id||'').trim();
    const preErr=(curriculumErrors||[]).filter(e=>errStudentNo(e)===no||String(e?.studentId||'')===sid);
    const mainRows=mainByNo.get(no)||[]; const mainErr=detectMainErrors(mainRows); const mainSubjects=new Set(mainRows.map(x=>String(x.subject||'').trim()).filter(Boolean));
    preErr.forEach(e=>{
      const category=normalizeErrCategory(e), text=errText(e); let status='재검토';
      const sameMain=mainErr.find(x=>x.category===category);
      if(sameMain)status='지속';
      else if(category==='과학계열 위계'){
        const named=extractNamedSubjects(text); status=named.length?(named.some(s=>mainSubjects.has(s))?'재검토':'해결 추정'):(mainRows.length?'재검토':'본신청 전');
      }else status=mainRows.length?'해결됨':'본신청 전';
      selectionErrorTransitions.push({studentId:sid,studentNo:no,name:st.name||'',category,status,source:'사전신청 오류',preMessage:text,mainMessage:sameMain?.message||''});
    });
    mainErr.forEach(me=>{if(!preErr.some(e=>normalizeErrCategory(e)===me.category))selectionErrorTransitions.push({studentId:sid,studentNo:no,name:st.name||'',category:me.category,status:'신규 오류',source:'본신청 재검증',preMessage:'',mainMessage:me.message});});
  });
'@
$marker='  if(curriculumErrors.length){'
if($d.Contains($marker)){$d=$d.Replace($marker,$err+"`n"+$marker)}else{throw 'curriculum error insertion point missing'}
}
if($d -notmatch 'selectionErrorTransitions,'){$d=$d.Replace('    selectionComparisons,','    selectionComparisons,`n    selectionErrorTransitions,')}

# 3) 선택과목 화면에 오류 변화 이력 표시.
if($g -notmatch 'function selectionErrorHistoryMarkup\('){
$ui=@'

function selectionErrorHistoryMarkup(student){
  const rows=(readonlyCache?.selectionErrorTransitions||[]).filter(x=>String(x.studentId||'')===String(student?.id||'')||String(x.studentNo||'')===String(student?.studentNo||''));
  if(!rows.length)return `<section class="selection-error-history"><header><div><small>VALIDATION HISTORY</small><h3>사전신청 오류 → 본신청 재검증</h3></div><span>특이사항 없음</span></header><p>사전 Google Form에서 발견된 문이과 혼합·과학 위계·학기간 중복 오류를 본신청과 연결해 추적합니다.</p></section>`;
  const bad=rows.filter(x=>/지속|신규|재검토/.test(x.status)).length;
  return `<section class="selection-error-history"><header><div><small>VALIDATION HISTORY</small><h3>사전신청 오류 → 본신청 재검증</h3><p>상담 당시 오류가 실제 본신청에서 해결되었는지 집중 확인합니다.</p></div><span>${bad?`확인 필요 ${bad}건`:'모두 해결'}</span></header><div class="selection-error-history-grid">${rows.map(x=>`<article class="${/해결/.test(x.status)?'resolved':/본신청 전/.test(x.status)?'waiting':'warning'}"><b>${escapeHtml(x.category)}</b><em>${escapeHtml(x.status)}</em><p>${escapeHtml(x.mainMessage||x.preMessage||'세부내용 확인')}</p></article>`).join('')}</div></section>`;
}
'@
$insert='function selectionSubmissionInfo(bundle){'
if($g.Contains($insert)){$g=$g.Replace($insert,$ui+"`n"+$insert)}else{throw 'selection UI insertion point missing'}
}
$g=$g.Replace('${profilePanel}${selectionComparisonMarkup(student)}${errorPanel}<div class="curriculum-term-grid">','${profilePanel}${selectionComparisonMarkup(student)}${selectionErrorHistoryMarkup(student)}${errorPanel}<div class="curriculum-term-grid">')

# 4) 근거 기반 SDGs 성장 프로파일. 기존 0.80.81 함수를 보존하고 뒤에서 새 함수를 선언해 우선 사용.
$newGrowth=@'

// __UEP_EVIDENCE_GROWTH_08082__
function sdgsDashboard(student,bundle){
  const career=studentCareerSupport(student,bundle);
  const programs=(bundle.programs||[]).filter(p=>p.kind!=="after");
  const activities=bundle.activities||[];
  const volunteers=[...(bundle.volunteer||[]),...(bundle.volunteers||[]),...(bundle.service||[]),...(bundle.services||[])];
  const reportRows=[...recordEvidenceRows(student,bundle,"autonomy"),...recordEvidenceRows(student,bundle,"career")].filter(r=>r.report);
  const uniqueReports=[];const seen=new Set();reportRows.forEach(r=>{const k=String(r.report?.id||[r.report?.submittedAt,r.title,(r.report?.responses||[]).join('|')].join('::'));if(!seen.has(k)){seen.add(k);uniqueReports.push(r);}});
  const map=new Map(SDG_CATALOG.map(([no,name])=>[Number(no),{no:Number(no),name,evidence:[]} ]));
  const add=(no,type,title,detail,strength='confirmed')=>{const row=map.get(Number(no));if(!row)return;const key=[type,title,detail].join('|');if(row.evidence.some(e=>e.key===key))return;row.evidence.push({key,type,title:String(title||'활동'),detail:String(detail||''),strength});};
  programs.forEach(p=>String(p.sdgs||'').split(/[,;/\s]+/).map(Number).filter(n=>n>=1&&n<=17).forEach(n=>add(n,'프로그램',p.recordTitle||p.title,p.description||p.note,'confirmed')));
  [...activities,...volunteers].forEach(a=>{
    String(a.sdgs||a.SDGs||'').split(/[,;/\s]+/).map(Number).filter(n=>n>=1&&n<=17).forEach(n=>add(n,/봉사/.test(String(a.area||a.type||''))?'봉사':'학교교육과정',a.title||a.activity||a.name,a.detail||a.description||a.note,'confirmed'));
    try{suggestSdgsForRows([{title:a.title||a.activity||a.name,report:{responses:[a.detail||a.description||a.note||'']}}]).slice(0,2).forEach(x=>add(x.no,/봉사/.test(String(a.area||a.type||''))?'봉사':'학교교육과정',a.title||a.activity||a.name,a.detail||a.description||a.note,'possible'));}catch{}
  });
  uniqueReports.forEach(r=>{try{suggestSdgsForRows([r]).slice(0,3).forEach(x=>add(x.no,'보고서',r.title||r.program?.recordTitle||r.program?.title,(r.report?.responses||[]).join(' · '),'possible'));}catch{}});
  const ranked=[...map.values()].filter(x=>x.evidence.length).sort((a,b)=>{const ac=a.evidence.filter(e=>e.strength==='confirmed').length,bc=b.evidence.filter(e=>e.strength==='confirmed').length;return bc-ac||b.evidence.length-a.evidence.length||a.no-b.no;});
  const confirmed=ranked.filter(x=>x.evidence.some(e=>e.strength==='confirmed'));
  const possible=ranked.filter(x=>!x.evidence.some(e=>e.strength==='confirmed'));
  const hope=[career.hopeTrack,career.hopeMajor].filter(v=>v&&v!=='-');
  const careerCounts=new Map();uniqueReports.forEach(r=>{try{analyzeReportTags(r.report).careers.forEach(t=>careerCounts.set(t.label,(careerCounts.get(t.label)||0)+t.score));}catch{}});const topics=[...careerCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);
  const story=[hope.length?`${hope.join(' · ')}에 관심을 두고`:null,topics.length?`${topics.slice(0,3).join('·')} 주제를 반복적으로 탐구하며`:null,confirmed.length?`${confirmed.slice(0,3).map(x=>`SDG ${x.no} ${x.name}`).join(', ')}와 연결되는 가치가 실제 활동 근거에서 확인됩니다.`:possible.length?'보고서와 활동에서 지속가능발전목표와 연결 가능한 문제의식이 형성되고 있습니다.':null].filter(Boolean).join(' ')||'현재 연결된 학교생활 자료를 바탕으로 학생의 관심·탐구·가치 흐름을 형성하는 단계입니다.';
  const chips=[...map.values()].map(x=>{const conf=x.evidence.filter(e=>e.strength==='confirmed').length;const poss=x.evidence.length-conf;const cls=conf?'confirmed':poss?'possible':'';const label=conf?`근거 확인 ${conf}건${poss?` · 가능 ${poss}건`:''}`:poss?`연결 가능 ${poss}건`:'근거 없음';return `<button class="growth-sdg-chip ${cls}" data-sdgs-detail="${x.no}"><b>${x.no}</b><span>${escapeHtml(x.name)}</span><small>${label}</small></button>`}).join('');
  const detail=map.get(Number(recordSdgsDetail||0));
  return `<div class="growth-profile-v082"><section class="growth-profile-intro"><div><small>STUDENT GROWTH STORY · UNESCO SCHOOL</small><h2>${escapeHtml(student.name)} 생활기록부 핵심 성장 프로파일</h2><p><b>활동의 요약이 아니라 학생의 스토리를 읽습니다.</b> 운호고의 유네스코 교육기관으로서의 지속가능발전교육 방향과, 주요 대학 인재상에서 반복적으로 강조되는 학업·탐구·자기주도·문제해결·공동체 역량을 학생의 진로·전공, 자율·진로·동아리·봉사, 선택활동, 프로그램과 보고서의 실제 근거와 함께 살펴봅니다.</p></div><span>SDGs 17개를 채우는 것이 목적이 아닙니다.</span></section><section class="growth-story-card"><header><div><small>CORE STORY</small><h3>이 학생을 설명하는 현재의 성장 스토리</h3></div><span>근거 기반</span></header><p>${escapeHtml(story)}</p><div class="growth-story-source">확인 근거 ${confirmed.reduce((n,x)=>n+x.evidence.filter(e=>e.strength==='confirmed').length,0)}건 · 연결 가능 근거 ${possible.reduce((n,x)=>n+x.evidence.length,0)+confirmed.reduce((n,x)=>n+x.evidence.filter(e=>e.strength==='possible').length,0)}건</div></section><div class="growth-axis-grid"><section><small>01 CAREER · MAJOR</small><h3>진로·전공 관심</h3><b>${escapeHtml(hope.join(' · ')||'진로 관심 형성 중')}</b><p>선택과목과 진로희망을 함께 봅니다.</p></section><section><small>02 EXPLORATION</small><h3>핵심 탐구주제</h3><b>${escapeHtml(topics.join(' · ')||'탐구주제 형성 중')}</b><p>보고서에서 반복·심화되는 주제를 확인합니다.</p></section><section><small>03 VALUE · SDGs</small><h3>사회적 가치·SDGs</h3><b>${confirmed.length?`${confirmed.length}개 목표 근거 확인`:'확정 근거 형성 중'}</b><p>명시된 활동 근거와 내용 기반 연결 가능성을 구분합니다.</p></section><section><small>04 EVIDENCE FLOW</small><h3>학교교육과정 속 근거</h3><b>${activities.length+volunteers.length+programs.length+uniqueReports.length}건 자료 연결</b><p>자율·진로·동아리·봉사·선택활동·프로그램·보고서를 함께 읽습니다.</p></section></div><section class="growth-teacher-guide"><header><div><small>WHY THIS LENS?</small><h3>왜 대학 인재상과 SDGs를 함께 보나요?</h3></div></header><p>대학이 요구하는 하나의 정답형 인재를 만드는 것이 아니라, 학생이 자신의 전공 관심을 깊이 탐구하면서 사회·공동체·환경·미래의 문제를 발견하고 자신의 관점으로 해석해 온 흔적을 찾기 위해서입니다. 유네스코 지속가능발전교육의 주제는 이러한 경험을 생활기록부 전반에서 연결해 읽는 가치의 렌즈로 활용합니다.</p><em>담임 지도: 무엇을 했는가 → 왜 관심을 가졌는가 → 어떤 문제를 발견했는가 → 생각이 어떻게 달라졌는가 → 다음 탐구로 어떻게 이어지는가</em></section><section class="growth-sdg-lens"><header><div><small>EVIDENCE-BASED SDGs</small><h3>SDGs 근거 지도</h3><p>카드가 활성화되려면 보고서·봉사·학교교육과정·선택활동·프로그램 등의 실제 근거가 있어야 합니다.</p></div><span>${confirmed.length}개 확인 · ${possible.length}개 가능</span></header><div class="growth-sdg-grid">${chips}</div>${detail?`<div class="growth-sdg-detail"><h4>SDG ${detail.no} ${escapeHtml(detail.name)}</h4>${detail.evidence.length?detail.evidence.map(e=>`<article><b>${escapeHtml(e.type)} · ${e.strength==='confirmed'?'근거 확인':'연결 가능'}</b><span>${escapeHtml(e.title)}</span><p>${escapeHtml((e.detail||'').slice(0,180)||'연결된 활동 근거')}</p></article>`).join(''):'<p>현재 연결 근거가 없습니다.</p>'}</div>`:''}</section></div>`;
}

function uepSchoolGrowthGapSummary(){
  const acts=readonlyCache?.activities||[],progs=readonlyCache?.programs||[],reports=readonlyCache?.reports||[];return {evidenceCount:acts.length+progs.length+reports.length,message:'프로그램 추천은 SDG 개수를 채우기보다 학생 활동에서 부족한 탐구·공동체·사회문제 경험을 보완하는 방향으로 해석합니다.'};
}
(function(){
  const enhance=()=>{document.querySelectorAll('h1,h2,h3').forEach(h=>{if(/프로그램추천|프로그램 추천/.test(h.textContent||'')){const root=h.closest('section,main,div');if(root&&!root.querySelector('[data-growth-program-guide]')){const n=document.createElement('div');n.dataset.growthProgramGuide='1';n.className='growth-program-guide';n.innerHTML='<b>학생 성장 근거 기반 프로그램 추천</b><span>단순히 SDG 빈칸을 채우는 추천이 아닙니다. 학생들의 진로·탐구·공동체·사회문제 경험과 유네스코 지속가능발전교육의 관점을 함께 분석하여 학교교육과정에서 보완할 경험을 제안합니다.</span>';root.insertBefore(n,h.nextSibling);}}});};new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.documentElement,{subtree:true,childList:true});setTimeout(enhance,500);
})();
'@
if($g -notmatch '__UEP_EVIDENCE_GROWTH_08082__'){$g += $newGrowth}

# 5) 스타일
$cssAdd=@'

/* UEP 0.80.82 */
.selection-error-history,.growth-program-guide{margin:16px 0;padding:18px;border:1px solid #dbe7e3;border-radius:18px;background:#fff}.selection-error-history header{display:flex;justify-content:space-between;gap:16px}.selection-error-history-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-top:12px}.selection-error-history-grid article{padding:12px;border-radius:13px;background:#f6f8f8}.selection-error-history-grid article.warning{background:#fff4f1}.selection-error-history-grid article.resolved{background:#eff9f4}.selection-error-history-grid article.waiting{background:#f7f7f7}.selection-error-history-grid em{float:right;font-style:normal;font-size:12px}.growth-sdg-chip.confirmed{outline:2px solid rgba(35,150,110,.26)}.growth-sdg-chip.possible{outline:1px dashed rgba(80,110,130,.35)}.growth-sdg-detail article{padding:10px 0;border-bottom:1px solid #edf1f0}.growth-program-guide{display:flex;flex-direction:column;gap:5px;background:#f4faf7}.growth-program-guide span{font-size:12px;color:#60777b}.growth-profile-v082 .growth-profile-intro p{max-width:980px}
'@
if($c -notmatch 'UEP 0.80.82'){$c += $cssAdd}

# 6) 버전
$g=$g.Replace('const APP_VERSION = "0.80.81";','const APP_VERSION = "0.80.82";').Replace('v0.80.81','v0.80.82')
Set-Content $gd $d -Encoding UTF8 -NoNewline
Set-Content $gyo $g -Encoding UTF8 -NoNewline
Set-Content $css $c -Encoding UTF8 -NoNewline
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json;$p.version='0.80.82';$p|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
node --check $gd
node --check 'app/resources/app/electron/main.cjs'
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo
$vg=Get-Content $gyo -Raw -Encoding UTF8;$vd=Get-Content $gd -Raw -Encoding UTF8
if(-not $vg.Contains('0.80.82')){throw 'visible 0.80.82 missing'}
if(-not $vg.Contains('__UEP_EVIDENCE_GROWTH_08082__')){throw 'growth evidence engine missing'}
if(-not $vd.Contains('selectionErrorTransitions')){throw 'selection error transitions missing'}
if(-not $vd.Contains('__UEP_SELECTION_TERM_08082__')){throw 'dynamic selection term normalizer missing'}
Write-Host 'UEP 0.80.82 evidence-based SDGs, program lens, dynamic 2/3 grade selection and error-transition tracking applied.'
