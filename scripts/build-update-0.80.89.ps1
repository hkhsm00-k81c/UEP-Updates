$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8

# UEP 0.80.89 integrated functional/UI release.
# Base is the stable 0.80.87 renderer recovery. Do not modify launcher/update/startup/Google bridge.
$g=$g.Replace('const APP_VERSION = "0.80.87";','const APP_VERSION = "0.80.89";')
$g=$g.Replace('v0.80.87','v0.80.89')

$patch=@'

// __UEP_SELECTION_SDGS_INTEGRATED_08089__
(function(){
  const termLabel=value=>{
    const s=String(value||'').replace(/\s+/g,'');
    let m=s.match(/([23])(?:학년)?[-_.]?([12])(?:학기)?/);
    if(!m)m=s.match(/([23])학년([12])학기/);
    return m?`${m[1]}학년 ${m[2]}학기`:String(value||'').trim();
  };
  const studentMatch=(row,student)=>{
    const rid=String(row?.studentId||row?.학생ID||row?.학생아이디||'').trim();
    const rno=String(row?.studentNo||row?.학번||row?.번호||'').trim();
    const sid=String(student?.id||'').trim(), sno=String(student?.studentNo||'').trim();
    return (rid&&sid&&rid===sid)||(rno&&sno&&rno===sno);
  };
  const sourceText=row=>String(row?.round||row?.applicationRound||row?.source||row?.sourceSheet||row?.원본시트||row?.신청구분||row?.구분||'');
  const subjectText=row=>String(row?.subject||row?.course||row?.과목명||row?.선택과목||row?.교과목||'').normalize('NFKC').replace(/\s+/g,' ').trim();
  const termText=row=>termLabel(row?.term||row?.semester||row?.학기||row?.신청학기||'');
  const isPre=row=>/사전|상담|구글폼|google|폼응답/i.test(sourceText(row));
  const isMain=row=>/본신청|리로|수강신청|최종/i.test(sourceText(row));
  const allSelectionRows=()=>{
    const candidates=['selectionSubjects','studentSubjects','selectionResponses','subjectResponses','selectionApplications','courseSelections','preSelectionSubjects','selectionPreApplications'];
    const out=[]; const seen=new Set();
    for(const key of candidates){
      const arr=readonlyCache?.[key]; if(!Array.isArray(arr))continue;
      for(const row of arr){
        const sig=JSON.stringify([row?.studentId,row?.studentNo,row?.학번,termText(row),subjectText(row),sourceText(row)]);
        if(!seen.has(sig)){seen.add(sig);out.push(row);}
      }
    }
    return out;
  };
  const rawRowsForStudent=student=>allSelectionRows().filter(r=>studentMatch(r,student));
  const mainTermsForStudent=student=>new Set(rawRowsForStudent(student).filter(isMain).map(termText).filter(Boolean));
  const preTermsForStudent=student=>new Set(rawRowsForStudent(student).filter(isPre).map(termText).filter(Boolean));
  const termsMentioned=text=>{
    const out=[]; const s=String(text||'');
    for(const m of s.matchAll(/([23])\s*[-학년\. ]\s*([12])(?:\s*학기)?/g))out.push(`${m[1]}학년 ${m[2]}학기`);
    return [...new Set(out)];
  };
  const waitingForMissingMain=(student,text)=>{
    const mentioned=termsMentioned(text).filter(t=>/^3학년/.test(t));
    if(!mentioned.length)return false;
    const main=mainTermsForStudent(student);
    return mentioned.some(t=>!main.has(t));
  };

  const originalComparisons=typeof selectionComparisonsForStudent==='function'?selectionComparisonsForStudent:null;
  selectionComparisonsForStudent=function(student){
    const stored=originalComparisons?originalComparisons(student):[];
    if(stored?.length)return stored.map(r=>{
      const term=termLabel(r.term||r.semester);
      const pre=Array.isArray(r.preSubjects)?r.preSubjects:[];
      const main=Array.isArray(r.mainSubjects)?r.mainSubjects:[];
      if(/^3학년/.test(term)&&pre.length&&!main.length&&!mainTermsForStudent(student).has(term))return {...r,term,status:'본신청 대기',waiting:true};
      return {...r,term};
    });
    const rows=rawRowsForStudent(student); if(!rows.length)return [];
    const terms=[...new Set(rows.map(termText).filter(Boolean))].sort((a,b)=>curriculumTermOrder(a)-curriculumTermOrder(b));
    return terms.map(term=>{
      const sem=rows.filter(r=>termText(r)===term);
      const pre=[...new Set(sem.filter(isPre).map(subjectText).filter(Boolean))];
      const main=[...new Set(sem.filter(isMain).map(subjectText).filter(Boolean))];
      if(!pre.length&&!main.length)return null;
      if(pre.length&&!main.length)return {term,preSubjects:pre,mainSubjects:[],removed:[],added:[],status:'본신청 대기',waiting:true};
      if(!pre.length&&main.length)return {term,preSubjects:[],mainSubjects:main,removed:[],added:[],status:'사전자료 없음'};
      const removed=pre.filter(x=>!main.includes(x)),added=main.filter(x=>!pre.includes(x));
      return {term,preSubjects:pre,mainSubjects:main,removed,added,status:!removed.length&&!added.length?'일치':'변경'};
    }).filter(Boolean);
  };

  selectionComparisonMarkup=function(student){
    const rows=selectionComparisonsForStudent(student);
    const preAvailable=preTermsForStudent(student).size>0;
    if(!rows.length)return `<section class="selection-compare-panel compact-089"><header><div><small>PRE ↔ MAIN</small><h3>사전상담 ↔ 본신청</h3></div><span>${preAvailable?'본신청 연결 대기':'사전자료 연결 대기'}</span></header><p class="selection-compare-help">사전 Google Form과 기본정보연결시트 본신청을 학기별로 자동 대조합니다.</p></section>`;
    const changed=rows.filter(x=>x.status==='변경').length,waiting=rows.filter(x=>/대기/.test(x.status)).length,same=rows.filter(x=>x.status==='일치').length;
    return `<section class="selection-compare-panel compact-089"><header><div><small>PRE ↔ MAIN</small><h3>사전상담 ↔ 본신청</h3></div><span>${changed?`변경 ${changed}`:same?`일치 ${same}`:'비교 중'}${waiting?` · 대기 ${waiting}`:''}</span></header><details><summary>학기별 비교 보기</summary><div class="selection-compare-grid">${rows.map(x=>`<article class="selection-compare-card ${x.status==='일치'?'same':/대기/.test(x.status)?'waiting':'changed'}"><div class="selection-compare-title"><b>${escapeHtml(x.term)}</b><em>${escapeHtml(x.status)}</em></div><div class="selection-compare-columns"><div><small>사전상담</small><p>${(x.preSubjects||[]).map(s=>`<span>${escapeHtml(s)}</span>`).join('')||'<i>없음</i>'}</p></div><div><small>본신청</small><p>${(x.mainSubjects||[]).map(s=>`<span>${escapeHtml(s)}</span>`).join('')||(/대기/.test(x.status)?'<i>아직 업로드되지 않음</i>':'<i>없음</i>')}</p></div></div>${x.status==='변경'?`<div class="selection-change-summary">${x.removed?.length?`<span class="removed">빠짐 · ${escapeHtml(x.removed.join(' · '))}</span>`:''}${x.added?.length?`<span class="added">추가 · ${escapeHtml(x.added.join(' · '))}</span>`:''}</div>`:''}</article>`).join('')}</div></details></section>`;
  };

  const originalErrors=typeof selectionErrorsForStudent==='function'?selectionErrorsForStudent:null;
  if(originalErrors){
    selectionErrorsForStudent=function(student){
      const rows=originalErrors(student)||[];
      return rows.filter(x=>!waitingForMissingMain(student,[x.type,x.detail,x.subject,x.terms,x.message].filter(Boolean).join(' ')));
    };
  }

  selectionErrorHistoryMarkup=function(student){
    const stored=(readonlyCache?.selectionErrorTransitions||[]).filter(x=>String(x.studentId||'')===String(student?.id||'')||String(x.studentNo||'')===String(student?.studentNo||''));
    const rows=stored.map(x=>{
      const text=[x.category,x.mainMessage,x.preMessage,x.terms,x.subject].filter(Boolean).join(' ');
      return waitingForMissingMain(student,text)?{...x,status:'재검증 대기',mainMessage:'사전신청 오류 이력 · 3학년 본신청 자료가 아직 없어 확정 판정을 보류합니다.'}:x;
    });
    if(!rows.length)return `<section class="selection-error-history compact-089"><header><div><small>VALIDATION HISTORY</small><h3>사전 오류 재검증</h3></div><span>특이사항 없음</span></header><p>문·이과 혼합·과학 위계·학기간 중복 오류 이력을 본신청과 연결해 추적합니다.</p></section>`;
    const waiting=rows.filter(x=>/대기/.test(x.status)).length,bad=rows.filter(x=>/지속|신규|재검토/.test(x.status)&&!/대기/.test(x.status)).length,resolved=rows.filter(x=>/해결/.test(x.status)).length;
    return `<section class="selection-error-history compact-089"><header><div><small>VALIDATION HISTORY</small><h3>사전 오류 재검증</h3></div><span>${bad?`확인 ${bad}`:resolved?`해결 ${resolved}`:'진행 중'}${waiting?` · 대기 ${waiting}`:''}</span></header><details><summary>오류 이력 보기</summary><div class="selection-error-history-grid">${rows.map(x=>`<article class="${/해결/.test(x.status)?'resolved':/대기/.test(x.status)?'waiting':'warning'}"><b>${escapeHtml(x.category||'오류 이력')}</b><em>${escapeHtml(x.status||'확인')}</em><p>${escapeHtml(x.mainMessage||x.preMessage||'세부내용 확인')}</p></article>`).join('')}</div></details></section>`;
  };

  function refineGrowthProfile(){
    const root=document.querySelector('.growth-profile-v082'); if(!root||root.dataset.ui089==='1')return;
    root.dataset.ui089='1';
    const intro=root.querySelector('.growth-profile-intro'),guide=root.querySelector('.growth-teacher-guide'),story=root.querySelector('.growth-story-card'),axis=root.querySelector('.growth-axis-grid'),lens=root.querySelector('.growth-sdg-lens');
    if(intro&&guide){
      const guideP=guide.querySelector('p')?.textContent?.trim()||'';
      const guideE=guide.querySelector('em')?.textContent?.trim()||'';
      const compact=document.createElement('details');compact.className='growth-guide-inline-089';compact.innerHTML=`<summary>왜 대학 인재상과 SDGs를 함께 보나요?</summary><p>${escapeHtml(guideP)}</p><em>${escapeHtml(guideE)}</em>`;
      intro.appendChild(compact);guide.remove();
    }
    if(story&&axis)story.insertAdjacentElement('afterend',axis);
    if(lens){
      const grid=lens.querySelector('.growth-sdg-grid');
      if(grid&&!grid.dataset.sorted089){
        grid.dataset.sorted089='1';
        const buttons=[...grid.querySelectorAll('.growth-sdg-chip')];
        const confirmed=buttons.filter(x=>x.classList.contains('confirmed'));
        const possible=buttons.filter(x=>x.classList.contains('possible'));
        const empty=buttons.filter(x=>!x.classList.contains('confirmed')&&!x.classList.contains('possible'));
        grid.innerHTML=''; confirmed.forEach(x=>grid.appendChild(x)); possible.forEach(x=>grid.appendChild(x));
        if(empty.length){
          const details=document.createElement('details');details.className='growth-sdg-empty-089';details.innerHTML=`<summary>현재 근거가 없는 목표 ${empty.length}개 보기</summary><div class="growth-sdg-empty-grid"></div>`;
          const holder=details.querySelector('.growth-sdg-empty-grid');empty.forEach(x=>holder.appendChild(x));grid.insertAdjacentElement('afterend',details);
        }
      }
    }
  }
  const obs=new MutationObserver(()=>requestAnimationFrame(refineGrowthProfile));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(refineGrowthProfile,0);
})();
'@

if($g -notmatch '__UEP_SELECTION_SDGS_INTEGRATED_08089__'){
  $loadCall='load();'
  $at=$g.LastIndexOf($loadCall)
  if($at -lt 0){throw 'main load() call not found'}
  $g=$g.Substring(0,$at)+$patch+"`n"+$g.Substring($at)
}

$css=@'
/* __UEP_SELECTION_SDGS_UI_08089__ */
.selection-compare-panel.compact-089,.selection-error-history.compact-089{display:inline-block;vertical-align:top;width:calc(50% - 6px);min-height:0!important;padding:12px 14px!important;margin:8px 6px 8px 0!important;border-radius:14px!important}
.selection-error-history.compact-089{margin-right:0!important}
.selection-compare-panel.compact-089 header,.selection-error-history.compact-089 header{margin:0!important;align-items:center!important}
.selection-compare-panel.compact-089 h3,.selection-error-history.compact-089 h3{font-size:15px!important;margin:2px 0!important}
.selection-compare-panel.compact-089 p,.selection-error-history.compact-089 p{margin:6px 0!important}
.selection-compare-panel.compact-089 details,.selection-error-history.compact-089 details{margin-top:7px!important}
.selection-compare-panel.compact-089 summary,.selection-error-history.compact-089 summary{cursor:pointer;font-weight:800;color:#337b72}
.selection-compare-card.waiting,.selection-error-history-grid article.waiting{background:#fff9e8!important;border-color:#ead7a3!important}
.growth-profile-v082{display:flex;flex-direction:column;gap:10px}
.growth-profile-v082 .growth-profile-intro{padding:16px 20px!important;min-height:0!important}
.growth-profile-v082 .growth-profile-intro>div>p{margin:6px 0!important;line-height:1.5!important}
.growth-guide-inline-089{margin-top:10px;border-top:1px solid #d9e8e4;padding-top:8px}
.growth-guide-inline-089 summary{cursor:pointer;font-weight:800;color:#176f63}
.growth-guide-inline-089 p{margin:8px 0 4px!important;font-size:13px}.growth-guide-inline-089 em{display:block;padding:8px 10px;border-radius:10px;background:#fff5d9;color:#88621d;font-style:normal;font-size:12px}
.growth-profile-v082 .growth-story-card{padding:14px 18px!important}.growth-profile-v082 .growth-story-card>p{font-size:15px!important;line-height:1.55!important;margin:10px 0!important}
.growth-profile-v082 .growth-axis-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:7px!important;margin:0!important}
.growth-profile-v082 .growth-axis-grid>section{padding:10px 12px!important;min-height:0!important}.growth-profile-v082 .growth-axis-grid h3{font-size:13px!important;margin:3px 0!important}.growth-profile-v082 .growth-axis-grid b{font-size:13px!important}.growth-profile-v082 .growth-axis-grid p{font-size:11px!important;margin:4px 0 0!important}
.growth-profile-v082 .growth-sdg-lens{padding:14px 16px!important}.growth-profile-v082 .growth-sdg-lens header{margin-bottom:8px!important}
.growth-profile-v082 .growth-sdg-grid{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:7px!important}
.growth-profile-v082 .growth-sdg-chip{min-height:62px!important;padding:9px 10px!important}.growth-profile-v082 .growth-sdg-chip.confirmed{order:0;box-shadow:0 0 0 2px rgba(43,154,132,.24) inset!important}.growth-profile-v082 .growth-sdg-chip.possible{order:1;opacity:.72}.growth-sdg-empty-089{margin-top:8px}.growth-sdg-empty-089 summary{cursor:pointer;color:#76868b;font-size:12px}.growth-sdg-empty-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;margin-top:7px}.growth-sdg-empty-grid .growth-sdg-chip{opacity:.42!important}
.growth-profile-v082 .growth-sdg-detail{margin-top:10px!important;padding:12px 14px!important}.growth-profile-v082 .growth-sdg-detail article{padding:10px 12px!important;margin:6px 0!important}
@media(max-width:1100px){.selection-compare-panel.compact-089,.selection-error-history.compact-089{display:block;width:100%;margin-right:0!important}.growth-profile-v082 .growth-axis-grid{grid-template-columns:repeat(2,1fr)!important}.growth-profile-v082 .growth-sdg-grid,.growth-sdg-empty-grid{grid-template-columns:repeat(4,1fr)!important}}
'@
$cssJson=$css | ConvertTo-Json -Compress
$styleInject=@"

// __UEP_SELECTION_SDGS_STYLE_08089__
try {
  const s=document.createElement('style');s.id='uep-selection-sdgs-08089';s.textContent=$cssJson;document.head.appendChild(s);
} catch(e) { console.warn('[UEP] 0.80.89 style injection skipped',e); }
"@
$loadCall='load();';$at=$g.LastIndexOf($loadCall);$g=$g.Substring(0,$at)+$styleInject+"`n"+$g.Substring($at)

Set-Content $gyo $g -Encoding UTF8 -NoNewline
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.89'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check $gyo
if($LASTEXITCODE -ne 0){throw 'gyomuon.js syntax check failed'}
$verify=Get-Content $gyo -Raw -Encoding UTF8
if($verify -notmatch 'const APP_VERSION = "0\.80\.89"'){throw '0.80.89 version marker missing'}
if($verify -notmatch '__UEP_SELECTION_SDGS_INTEGRATED_08089__'){throw 'integrated selection/SDGs patch missing'}
if($verify -notmatch '__UEP_SELECTION_SDGS_UI_08089__'){throw 'integrated UI style missing'}
Write-Host 'UEP 0.80.89 integrated selection and SDGs release applied.'
