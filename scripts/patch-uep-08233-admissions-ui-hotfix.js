const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.32["'];/.test(g),'0.82.32 renderer base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.32["'];/,'const APP_VERSION = "0.82.33";').replace(/const CURRENT='0\.82\.32';/g,"const CURRENT='0.82.33';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.33';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// 0.82.32 changed an earlier function definition, but later admissions patches could still shadow it.
// Install the track-first renderer LAST so the runtime function is authoritative.
g += `\n/* UEP_08233_ADMISSIONS_RUNTIME_OVERRIDE */\n(function(){
  const rows=(keys,sheet)=>{for(const key of keys){try{const r=dashboardAdmissionRows(key,sheet)||[];if(r.length)return r}catch(e){}}return [];};
  const normType=v=>String(v||'').replace('정시','수능위주').trim();
  const ids=v=>String(v||'').split(/[,/·]/).map(x=>x.trim()).filter(Boolean);
  const uniq=rs=>{const seen=new Set();return rs.filter(r=>{const k=[r['대학명'],r['캠퍼스'],r['전형명'],r['대전형']].map(v=>String(v||'').trim()).join('|');if(!k||seen.has(k))return false;seen.add(k);return true;});};
  window.uep08233OpenAdmissionTypes=function(){
    const types=rows(['admissionTypes'],'53_전형이해').filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));
    const details=rows(['admissionSubtypes','admissionTypeDetails'],'53A_전형세부유형DB').filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));
    let structures=rows(['admissionTypeUniversities','admissionStructures','universityAdmissionStructures'],'53B_전형유형별대학DB');
    if(!structures.length){try{structures=dashboardAdmissionStructureRows()||[]}catch(e){structures=[]}}
    structures=uniq(structures.filter(r=>String(r['UEP노출']??'Y').toUpperCase()!=='N'&&String(r['대학명']||'').trim()));
    const button=r=>{const u=String(r['대학명']||'').trim(),campus=String(r['캠퍼스']||'').trim(),track=String(r['전형명']||r['대전형']||'').trim(),structure=String(r['평가구조요약']||'').trim(),minimum=String(r['수능최저']||'').trim();const meta=[structure,minimum?('최저 '+minimum):''].filter(Boolean).join(' · ');return '<button type="button" class="admission-track-button" data-admission-university="'+escapeHtml(u)+'" data-admission-track="'+escapeHtml(track)+'"><b>'+escapeHtml(u)+(campus?' <em>'+escapeHtml(campus)+'</em>':'')+' · '+escapeHtml(track)+'</b>'+(meta?'<small>'+escapeHtml(meta)+'</small>':'')+'</button>';};
    const groups=[];
    for(const type of types){const broad=normType(type['전형유형']);const broadRows=uniq(structures.filter(s=>normType(s['대전형'])===broad));if(!broadRows.length)continue;const ds=details.filter(d=>normType(d['대전형'])===broad);const cards=[];const assigned=new Set();for(const d of ds){const sid=String(d['세부ID']||'').trim();const linked=uniq(broadRows.filter(s=>!sid||ids(s['세부유형ID']).includes(sid)));if(!linked.length)continue;linked.forEach(r=>assigned.add([r['대학명'],r['캠퍼스'],r['전형명'],r['대전형']].map(v=>String(v||'').trim()).join('|')));cards.push('<article class="admission-track-type-card"><div class="admission-track-card-head"><b>'+escapeHtml(d['세부유형']||type['전형유형']||'')+'</b><span>'+linked.length+'개 실제 전형</span></div><p>'+escapeHtml(d['대표평가구조']||d['한줄요약']||type['한줄요약']||'')+'</p>'+(d['수능최저경향']?'<small><strong>수능최저</strong> · '+escapeHtml(d['수능최저경향'])+'</small>':'')+(d['담임상담체크']?'<small><strong>상담체크</strong> · '+escapeHtml(d['담임상담체크'])+'</small>':'')+'<div class="admission-track-list">'+linked.map(button).join('')+'</div></article>');}
      const extra=broadRows.filter(r=>!assigned.has([r['대학명'],r['캠퍼스'],r['전형명'],r['대전형']].map(v=>String(v||'').trim()).join('|')));if(extra.length)cards.push('<article class="admission-track-type-card"><div class="admission-track-card-head"><b>기타 실제 전형</b><span>'+extra.length+'개</span></div><p>53B 공식 전형 중 아직 세부유형이 고정되지 않은 사례입니다.</p><div class="admission-track-list">'+extra.map(button).join('')+'</div></article>');
      groups.push('<section class="admission-track-section"><div class="admission-track-section-head"><div><h3>'+escapeHtml(type['전형유형']||broad)+'</h3><p>'+escapeHtml(type['한줄요약']||'')+'</p></div><span>'+broadRows.length+'개 실제 전형</span></div><div class="admission-explain-grid admission-track-grid">'+cards.join('')+'</div></section>');
    }
    openDashboardAdmissionDialog('전형 이해 · 실제 대학전형으로 비교','<div class="admission-learning-flow admission-track-first"><div class="admission-track-intro"><b>대학 전형을 먼저 모으고, 공통 구조로 이해합니다.</b><span>2028 공식 시행계획 기반 '+structures.length+'개 실제 대학·전형 사례 · 대학명 · 전형명으로 비교</span></div>'+groups.join('')+'<p class="admission-reference-note">53B 실제 대학전형 → 53A 공통 구조 → 53 전형 이해</p></div>');
    document.querySelectorAll('.admission-track-button[data-admission-university]').forEach(btn=>btn.onclick=()=>{window.__uepAdmissionFocusTrack=btn.dataset.admissionTrack||'';if(typeof openDashboardAdmissionUniversityByName==='function')openDashboardAdmissionUniversityByName(btn.dataset.admissionUniversity);else{const all=typeof dashboardAdmissionUniversities==='function'?dashboardAdmissionUniversities():[];const row=all.find(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===dashboardAdmissionNormalizeUniversity(btn.dataset.admissionUniversity));if(row)openDashboardUniversityDetail(row);}});
  };
  try{openDashboardAdmissionTypes=window.uep08233OpenAdmissionTypes;}catch(e){window.openDashboardAdmissionTypes=window.uep08233OpenAdmissionTypes;}

  // Repair the dashboard '오늘의 대학' card even if its old inline binding was lost.
  document.addEventListener('click',function(e){
    const el=e.target&&e.target.closest?e.target.closest('button,[role="button"],.dashboard-top-card,.dashboard-admission-card,.admission-card'):null;
    if(!el)return;const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
    if(!text.includes('오늘의 대학'))return;
    if(el.closest('.uep-release-overlay,.admission-learning-flow,.uep-uni-detail-modal,.uep-university-detail'))return;
    e.preventDefault();e.stopImmediatePropagation();
    try{const u=dashboardAdmissionTodayUniversity();if(u)openDashboardUniversityDetail(u);else openDashboardAdmissionDialog('오늘의 대학','<p>56_대학입시마스터 자료를 읽지 못했습니다.</p>');}catch(err){console.error('[UEP 0.82.33] today university click',err);}
  },true);
})();\n`;

g += `\n/* UEP_08233_RELEASE_NOTES */\n(function(){const VERSION='0.82.33',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08233'))return;const o=document.createElement('div');o.id='uep-release-08233';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.33 수정사항</h2><ul><li>전형 이해의 실행시점 렌더러를 마지막에 고정해 대학명 · 실제 전형명이 반드시 표시되도록 수정했습니다.</li><li>53B 캐시 키가 어느 경로로 들어와도 실제 대학 전형을 읽도록 보강했습니다.</li><li>대시보드 오늘의 대학 카드 클릭이 무반응인 문제를 복구했습니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;

must(g.includes('UEP_08233_ADMISSIONS_RUNTIME_OVERRIDE'),'runtime override missing');
must(g.includes('window.uep08233OpenAdmissionTypes'),'track-first runtime function missing');
must(g.includes("text.includes('오늘의 대학')"),'today university click repair missing');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.33 admissions UI hotfix patched');
