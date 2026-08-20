$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8

# UEP 0.80.90 final refinement over 0.80.89.
# Do not modify launcher/update/startup/Google bridge.
$g=$g.Replace('const APP_VERSION = "0.80.89";','const APP_VERSION = "0.80.90";')
$g=$g.Replace('v0.80.89','v0.80.90')

$patch=@'

// __UEP_FINAL_REFINEMENT_08090__
(function(){
  const esc=s=>typeof escapeHtml==='function'?escapeHtml(String(s??'')):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Selection curriculum: show results, not explanatory process cards.
  if(typeof selectionComparisonMarkup==='function'){
    selectionComparisonMarkup=function(student){
      const rows=typeof selectionComparisonsForStudent==='function'?(selectionComparisonsForStudent(student)||[]):[];
      if(!rows.length)return '';
      const changed=rows.filter(x=>x.status==='변경').length;
      const waiting=rows.filter(x=>/대기/.test(String(x.status||''))).length;
      return `<section class="selection-result-090"><header><b>사전신청 · 본신청 결과</b><span>${changed?`변경 ${changed}건`:waiting?`비교 대기 ${waiting}건`:'신청 결과 일치'}</span></header><div class="selection-result-grid-090">${rows.map(x=>`<article><strong>${esc(x.term)}</strong><div><small>사전신청</small><p>${(x.preSubjects||[]).map(s=>`<span>${esc(s)}</span>`).join('')||'<i>자료 없음</i>'}</p></div><div><small>본신청</small><p>${(x.mainSubjects||[]).map(s=>`<span>${esc(s)}</span>`).join('')||(/대기/.test(String(x.status||''))?'<i>본신청 자료 대기</i>':'<i>자료 없음</i>')}</p></div></article>`).join('')}</div></section>`;
    };
  }
  if(typeof selectionErrorHistoryMarkup==='function'){
    const prior=selectionErrorHistoryMarkup;
    selectionErrorHistoryMarkup=function(student){
      const html=prior(student);
      if(!html)return '';
      const box=document.createElement('div');box.innerHTML=html;
      const sec=box.firstElementChild;if(!sec)return html;
      sec.classList.add('selection-validation-090');
      const h=sec.querySelector('h3');if(h)h.textContent='선택과목 오류 검토';
      const sm=sec.querySelector('small');if(sm)sm.textContent='사전신청 오류 · 본신청 재검증';
      const p=sec.querySelector(':scope > p');if(p)p.remove();
      const details=sec.querySelector('details');if(details){details.open=true;const summary=details.querySelector('summary');if(summary)summary.remove();}
      return sec.outerHTML;
    };
  }

  function refineGrowth090(){
    const root=document.querySelector('.growth-profile-v082');if(!root)return;
    // Always-visible university talent + UNESCO/SDGs rationale.
    const intro=root.querySelector('.growth-profile-intro');
    const guide=intro?.querySelector('.growth-guide-inline-089');
    if(guide&&guide.tagName==='DETAILS'){
      const title=guide.querySelector('summary')?.textContent?.trim()||'왜 대학 인재상과 SDGs를 함께 보나요?';
      const p=guide.querySelector('p')?.textContent?.trim()||'';
      const em=guide.querySelector('em')?.textContent?.trim()||'';
      const panel=document.createElement('section');panel.className='growth-guide-open-090';panel.innerHTML=`<b>SDGs 17개를 채우는 것이 목적이 아닙니다.</b><h4>${esc(title)}</h4><p>${esc(p)}</p>${em?`<em>${esc(em)}</em>`:''}`;
      guide.replaceWith(panel);
    }
    // Merge core story and four axes into one visual unit.
    const story=root.querySelector('.growth-story-card');const axis=root.querySelector('.growth-axis-grid');
    if(story&&axis&&!story.classList.contains('merged-090')){story.classList.add('merged-090');story.appendChild(axis);}
    // Keep all 17 SDG cards visible; no click/fold navigation.
    const lens=root.querySelector('.growth-sdg-lens');
    if(lens){
      const grid=lens.querySelector('.growth-sdg-grid');const emptyDetails=lens.querySelector('.growth-sdg-empty-089');
      if(grid&&emptyDetails){const holder=emptyDetails.querySelector('.growth-sdg-empty-grid');if(holder)[...holder.children].forEach(x=>grid.appendChild(x));emptyDetails.remove();}
      const chips=[...(grid?.querySelectorAll('.growth-sdg-chip')||[])];
      chips.sort((a,b)=>(Number(a.dataset.sdg||a.querySelector('b,strong')?.textContent?.match(/\d+/)?.[0]||99)-Number(b.dataset.sdg||b.querySelector('b,strong')?.textContent?.match(/\d+/)?.[0]||99)));
      chips.forEach(x=>grid.appendChild(x));
      // Existing evidence detail panels become permanently visible beneath their matching SDG card when identifiable.
      const details=[...lens.querySelectorAll('.growth-sdg-detail,.growth-sdg-evidence-detail,[data-sdg-detail]')];
      for(const d of details){
        const id=String(d.dataset.sdgDetail||d.dataset.sdg||d.getAttribute('data-goal')||'');
        if(!id)continue;const chip=chips.find(c=>String(c.dataset.sdg||c.getAttribute('data-goal')||c.textContent.match(/^\s*(\d+)/)?.[1]||'')===id);
        if(chip&&!chip.contains(d)){d.classList.add('inline-evidence-090');chip.appendChild(d);}
      }
    }
  }

  // Privacy/demo mode: only direct student identifiers are masked in statistics.
  function refineStatsPrivacy090(){
    document.querySelectorAll('table').forEach(table=>{
      const heads=[...table.querySelectorAll('thead th')];if(!heads.length)return;
      const statTable=heads.some(h=>/순위|총점|평균등급|표준점수|백분위|성취도|등급산출/.test(h.textContent||''));if(!statTable)return;
      const idCols=new Set();heads.forEach((h,i)=>{if(/^(학생|이름|성명|학번|번호)$/.test((h.textContent||'').trim()))idCols.add(i);});
      table.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(!idCols.has(i)){td.classList.remove('privacy-mask','masked','demo-mask','blurred');td.style.filter='none';td.style.color='';}}));
    });
  }
  const run=()=>{refineGrowth090();refineStatsPrivacy090();};
  const obs=new MutationObserver(()=>requestAnimationFrame(run));obs.observe(document.documentElement,{childList:true,subtree:true});setTimeout(run,0);
})();
'@

if($g -notmatch '__UEP_FINAL_REFINEMENT_08090__'){
  $loadCall='load();';$at=$g.LastIndexOf($loadCall);if($at -lt 0){throw 'main load() call not found'}
  $g=$g.Substring(0,$at)+$patch+"`n"+$g.Substring($at)
}

$css=@'
/* __UEP_FINAL_UI_08090__ */
.selection-compare-panel.compact-089{display:none!important}
.selection-result-090,.selection-validation-090{width:100%!important;margin:8px 0!important;padding:12px 14px!important;border-radius:14px!important}
.selection-result-090 header,.selection-validation-090 header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.selection-result-grid-090{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.selection-result-grid-090 article{border:1px solid #dbe7e4;border-radius:11px;padding:10px}.selection-result-grid-090 article>div{display:grid;grid-template-columns:70px 1fr;gap:6px;margin-top:6px}.selection-result-grid-090 p{margin:0}.selection-result-grid-090 p span{display:inline-block;margin:0 5px 3px 0}.selection-validation-090 details{display:block!important}.selection-validation-090 summary{display:none!important}
.growth-profile-v082 .growth-profile-intro{display:grid!important;grid-template-columns:minmax(0,1.35fr) minmax(360px,.9fr)!important;gap:22px!important;align-items:start!important}.growth-guide-open-090{border-left:1px solid #cfe2dd;padding-left:20px}.growth-guide-open-090>b{display:inline-block;background:#e5f5ee;color:#147664;border-radius:999px;padding:8px 12px;margin-bottom:8px}.growth-guide-open-090 h4{margin:2px 0 8px;color:#176f63;font-size:14px}.growth-guide-open-090 p{font-size:12px!important;line-height:1.55!important;margin:0 0 7px!important}.growth-guide-open-090 em{display:block;background:#fff4d7;border-radius:10px;padding:7px 9px;color:#88621d;font-style:normal;font-size:11px}
.growth-story-card.merged-090{padding:14px 18px!important}.growth-story-card.merged-090 .growth-axis-grid{margin-top:12px!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}.growth-story-card.merged-090 .growth-axis-grid>*{padding:10px!important;min-height:0!important}
.growth-sdg-empty-089{display:none!important}.growth-sdg-lens .growth-sdg-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;align-items:start!important}.growth-sdg-lens .growth-sdg-chip{height:auto!important;min-height:90px!important;padding:11px!important;cursor:default!important}.growth-sdg-chip .inline-evidence-090{display:block!important;position:static!important;margin-top:9px!important;padding-top:8px!important;border-top:1px solid #dce7e4!important;max-height:none!important;overflow:visible!important}.growth-sdg-chip .inline-evidence-090>*{display:block!important;margin:4px 0!important}
@media(max-width:1100px){.growth-profile-v082 .growth-profile-intro{grid-template-columns:1fr!important}.growth-guide-open-090{border-left:0;border-top:1px solid #cfe2dd;padding:10px 0 0}.growth-sdg-lens .growth-sdg-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
'@
if($g -notmatch '__UEP_FINAL_UI_08090__'){$g += "`nconst __uepFinalStyle090=document.createElement('style');__uepFinalStyle090.textContent=" + (ConvertTo-Json $css -Compress) + ";document.head.appendChild(__uepFinalStyle090);`n"}

Set-Content $gyo $g -Encoding UTF8
node --check $gyo
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.90'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.80.90 final refinement applied.'
