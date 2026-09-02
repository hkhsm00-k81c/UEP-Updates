const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const cp=path.join(root,'resources','app','gyomuon.css');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
let c=fs.readFileSync(cp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
must(/const\s+APP_VERSION\s*=\s*["']0\.82\.23["'];/.test(g),'0.82.23 base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.23["'];/,'const APP_VERSION = "0.82.24";');
g=g.replace(/const CURRENT='0\.82\.23';/g,"const CURRENT='0.82.24';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.24';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// 0.82.24: reset admission entry source on manual close, and make dashboard entry source explicit.
g += `\n/* UEP_08224_ADMISSION_STATE_RESET */\n(function(){
  const originalBase=openDashboardAdmissionDialogBase;
  openDashboardAdmissionDialogBase=function(title,body){
    originalBase(title,body);
    const layer=document.querySelector('.dashboard-admission-layer');
    const closeBtn=layer?.querySelector('[data-admission-close]');
    const reset=()=>{window.__uepAdmissionReturn='';window.__uepAdmissionRegion='';};
    if(closeBtn){const old=closeBtn.onclick;closeBtn.onclick=(e)=>{reset();if(typeof old==='function')old.call(closeBtn,e);};}
    if(layer){const oldLayer=layer.onclick;layer.onclick=(e)=>{if(e.target===layer)reset();if(typeof oldLayer==='function')oldLayer.call(layer,e);};}
  };
  document.addEventListener('click',e=>{
    const btn=e.target&&e.target.closest?e.target.closest('[data-dashboard-admission]'):null;
    if(!btn)return;
    const key=btn.getAttribute('data-dashboard-admission');
    if(key==='university'){window.__uepAdmissionReturn='today';window.__uepAdmissionRegion='';}
    else if(key==='types'||key==='basics'){window.__uepAdmissionReturn='';window.__uepAdmissionRegion='';}
  },true);
})();\n`;

// Basics: use available width instead of leaving a large empty area.
g += `\n/* UEP_08224_BASICS_AUTO_GRID */\nfunction openDashboardAdmissionBasics(){
  window.__uepAdmissionReturn='';window.__uepAdmissionRegion='';
  const rows=dashboardAdmissionRows('admissionBasics','52_대입기초').filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));
  if(!rows.length)return openDashboardAdmissionDialog('대입 기초','<p>52_대입기초 자료를 읽지 못했습니다.</p>');
  const groups=[];
  for(const row of rows){const key=String(row['대분류']||'대입 기초').trim()||'대입 기초';let group=groups.find(x=>x.key===key);if(!group){group={key,rows:[]};groups.push(group);}group.rows.push(row);}
  const html=groups.map(group=>'<section><h3>'+escapeHtml(group.key)+'</h3><div class="admission-explain-grid">'+group.rows.map(row=>'<article class="uep-basics-card"><b>'+escapeHtml(row['주제']||'')+'</b><p>'+escapeHtml(row['카드요약']||row['상세설명']||'')+'</p>'+(row['상세설명']&&row['상세설명']!==row['카드요약']?'<small>'+escapeHtml(row['상세설명'])+'</small>':'')+(row['상담포인트']?'<small><strong>상담</strong> · '+escapeHtml(row['상담포인트'])+'</small>':'')+(row['주의/오해']?'<small><strong>주의</strong> · '+escapeHtml(row['주의/오해'])+'</small>':'')+'</article>').join('')+'</div></section>').join('');
  openDashboardAdmissionDialog('대입 기초','<div class="admission-learning-flow uep-basics-flow">'+html+'<p class="admission-reference-note">52_대입기초 실시간 연결 · 2029 대입 기준, 대학별 세부사항은 최종 모집요강 재확인</p></div>');
}\n`;

// Types: add quick-scan badges while keeping the 3-column layout.
g += `\n/* UEP_08224_TYPE_BADGES */\nfunction uep08224TypeBadges(detail,type){
  const text=[detail['세부유형'],detail['대표평가구조'],detail['수능최저경향'],detail['담임상담체크'],type&&type['전형유형']].filter(Boolean).join(' ');
  const out=[];
  if(/지역균형|지역인재/.test(text))out.push(/지역인재/.test(text)?'지역인재':'지역균형');
  if(/추천|학교장/.test(text))out.push('추천');
  if(/면접/.test(text))out.push('면접');
  if(/서류|정성/.test(text))out.push('서류');
  if(/논술/.test(text))out.push('논술');
  const min=String(detail['수능최저경향']||'');
  if(/미적용|없음/.test(min))out.push('최저 X'); else if(min)out.push('최저 O');
  return [...new Set(out)].slice(0,5).map(v=>'<span>'+escapeHtml(v)+'</span>').join('');
}
function openDashboardAdmissionTypes(){
  window.__uepAdmissionReturn='';window.__uepAdmissionRegion='';
  const types=dashboardAdmissionRows('admissionTypes','53_전형이해').filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));
  const details=dashboardAdmissionRows('admissionTypeDetails','53A_전형세부유형DB').filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));
  const structures=dashboardAdmissionStructureRows().filter(r=>String(r['UEP노출']??'Y').toUpperCase()!=='N');
  if(!types.length&&!details.length)return openDashboardAdmissionDialog('전형 이해','<p>53_전형이해·53A_전형세부유형DB 자료를 읽지 못했습니다.</p>');
  const normalizeType=v=>String(v||'').replace('정시','수능위주').trim();
  const html=types.map(type=>{
    const broad=normalizeType(type['전형유형']);
    const ds=details.filter(d=>normalizeType(d['대전형'])===broad);
    const cards=(ds.length?ds:[type]).map(d=>{
      const sid=String(d['세부ID']||'');
      const linked=structures.filter(s=>normalizeType(s['대전형'])===broad&&(!sid||String(s['세부유형ID']||'').split(',').map(x=>x.trim()).includes(sid)));
      const names=[...new Set(linked.map(s=>s['대학명']).filter(Boolean))];
      const buttons=names.length?'<div class="admission-university-buttons">'+names.map(name=>'<button data-admission-university="'+escapeHtml(name)+'">'+escapeHtml(name)+'</button>').join('')+'</div>':'';
      return '<article><div class="uep-type-card-badges">'+uep08224TypeBadges(d,type)+'</div><b>'+escapeHtml(d['세부유형']||type['전형유형']||'')+'</b><p>'+escapeHtml(d['대표평가구조']||d['한줄요약']||type['한줄요약']||'')+'</p>'+(d['수능최저경향']?'<small><strong>수능최저</strong> · '+escapeHtml(d['수능최저경향'])+'</small>':'')+(d['담임상담체크']?'<small><strong>상담체크</strong> · '+escapeHtml(d['담임상담체크'])+'</small>':'')+(d['고1준비포인트']?'<small><strong>고1 준비</strong> · '+escapeHtml(d['고1준비포인트'])+'</small>':'')+buttons+'</article>';
    }).join('');
    return '<section><h3>'+escapeHtml(type['전형유형']||broad)+'</h3><p>'+escapeHtml(type['한줄요약']||'')+'</p><div class="admission-explain-grid">'+cards+'</div></section>';
  }).join('');
  openDashboardAdmissionDialog('전형 이해 · 대학별 선발방식 비교','<div class="admission-learning-flow uep-types-flow">'+html+'<p class="admission-reference-note">53_전형이해 + 53A 세부유형 + 53B 실제 대학전형 실시간 연결</p></div>');
  document.querySelectorAll('[data-admission-university]').forEach(button=>button.onclick=()=>uep08221OpenUniversityFromTypes(button.dataset.admissionUniversity));
}\n`;

// University detail: strengthen badges and make today's navigator a clear 3-step hierarchy.
g += `\n/* UEP_08224_UNIVERSITY_BADGES_NAV */\nfunction uep08223UniversityBadges(row){
  const type=String(row['전형유형']||row['대전형']||'');
  const method=String(row['선발방식']||row['평가구조요약']||dashboardAdmissionMethod(row)||'');
  const min=String(row['수능최저']||row['수능최저원문']||'');
  const values=[];
  if(type)values.push(type);
  if(/추천|학교장/.test(method+type))values.push('추천');
  if(/지역균형|지역인재/.test(method+type))values.push(/지역인재/.test(method+type)?'지역인재':'지역균형');
  if(/면접/.test(method))values.push('면접');
  if(/논술/.test(method+type))values.push('논술');
  if(/미적용|없음/.test(min))values.push('최저 X'); else if(min)values.push('최저 O');
  return [...new Set(values)].slice(0,5).map(v=>'<span>'+escapeHtml(v)+'</span>').join('');
}
function uep08223TodayNav(university){
  const all=dashboardAdmissionUniversities();
  const norm=dashboardAdmissionNormalizeUniversity(university['대학명']);
  const currentRegions=uep08223UniversityRegions(university);
  const regionOrder=['서울','경기','인천','충북','충남','대전','세종','강원','부산','대구','광주','전북','전남','경북','경남','기타'];
  const present=regionOrder.filter(region=>all.some(r=>uep08223UniversityRegions(r).includes(region)));
  let active=String(window.__uepAdmissionRegion||'');
  if(!currentRegions.includes(active))active=currentRegions[0]||present[0]||'기타';
  window.__uepAdmissionRegion=active;
  const regionRows=all.filter(r=>uep08223UniversityRegions(r).includes(active));
  let regionIndex=regionRows.findIndex(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);if(regionIndex<0)regionIndex=0;
  const prev=regionRows.length?regionRows[(regionIndex-1+regionRows.length)%regionRows.length]:null;
  const next=regionRows.length?regionRows[(regionIndex+1)%regionRows.length]:null;
  return '<div class="uep-uni-explorer">'+
    '<div class="uep-uni-nav-row uep-uni-nav-regions"><span class="uep-uni-nav-label">지역</span><div class="uep-uni-region-tabs">'+present.map(region=>'<button type="button" data-uep-region="'+escapeHtml(region)+'" class="'+(region===active?'active':'')+'">'+escapeHtml(region)+'</button>').join('')+'</div></div>'+
    '<div class="uep-uni-nav-row uep-uni-nav-schools"><span class="uep-uni-nav-label">대학</span><div class="uep-uni-list">'+regionRows.map(r=>'<button type="button" data-uep-university="'+escapeHtml(r['대학명'])+'" class="'+(dashboardAdmissionNormalizeUniversity(r['대학명'])===norm?'active':'')+'">'+escapeHtml(r['대학명'])+'</button>').join('')+'</div></div>'+
    '<div class="uep-uni-nav-row uep-uni-nav-prevnext"><span class="uep-uni-nav-label">탐색</span><div class="uep-uni-prevnext"><button type="button" data-uep-prev="'+escapeHtml(prev&&prev['대학명']||'')+'">← '+escapeHtml(prev&&prev['대학명']||'이전 대학')+'</button><b>'+escapeHtml(university['대학명']||'')+'</b><button type="button" data-uep-next="'+escapeHtml(next&&next['대학명']||'')+'">'+escapeHtml(next&&next['대학명']||'다음 대학')+' →</button></div></div>'+
  '</div>';
}\n`;

// Release notes for 0.82.24.
g += `\n/* UEP_08224_RELEASE_NOTES */\n(function(){const VERSION='0.82.24',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08224'))return;const o=document.createElement('div');o.id='uep-release-08224';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.24 수정사항</h2><ul><li>대입 기초 카드가 큰 팝업의 가로폭을 자연스럽게 사용하도록 자동 배치를 개선했습니다.</li><li>전형 이해와 대학 상세에 최저·면접·추천·지역인재 등 핵심 배지를 강화했습니다.</li><li>오늘의 대학 탐색을 지역 → 대학 → 이전/현재/다음의 3단 구조로 정리했습니다.</li><li>전형 이해에서 대학을 본 뒤 닫고 오늘의 대학을 열 때 돌아가기 상태가 남던 문제를 수정했습니다.</li><li>52_대입기초에 수시 합격 후 정시 지원 제한, 정시 가·나·다군 등 실제 상담 정보를 추가했습니다.</li><li>운호고 입결 UI는 원자료 이관 전까지 기존 표시를 유지합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,700),{once:true});else setTimeout(show,700);})();\n`;

c += `\n/* UEP_08224_ADMISSIONS_READABILITY */\n.uep-basics-flow .admission-explain-grid{grid-template-columns:repeat(auto-fit,minmax(340px,1fr))!important;align-items:stretch}.uep-basics-flow .uep-basics-card{min-width:0}.uep-basics-flow .uep-basics-card>b{font-size:17px}.uep-basics-flow .uep-basics-card p{font-size:15px;line-height:1.62}.uep-basics-flow .uep-basics-card small{font-size:14px;line-height:1.58}.uep-types-flow .admission-explain-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.uep-type-card-badges,.uep-uni-badges{display:flex!important;flex-wrap:wrap;gap:6px;margin-bottom:10px}.uep-type-card-badges span,.uep-uni-badges span{display:inline-flex;align-items:center;min-height:24px;padding:3px 9px;border-radius:999px;background:#eef5ff;border:1px solid #d7e7fb;color:#145c9e;font-size:12px;font-weight:800}.uep-uni-explorer{display:grid;gap:8px;padding:12px 16px 14px;border-bottom:1px solid #e7edf4;background:#fbfdff}.uep-uni-nav-row{display:grid;grid-template-columns:52px minmax(0,1fr);gap:10px;align-items:start}.uep-uni-nav-label{padding-top:7px;color:#73839a;font-size:12px;font-weight:800;letter-spacing:.04em}.uep-uni-region-tabs,.uep-uni-list{display:flex;flex-wrap:wrap;gap:7px}.uep-uni-region-tabs button,.uep-uni-list button{min-height:32px;padding:5px 11px;border-radius:999px;border:1px solid #cfdceb;background:#fff;color:#29435d;font-weight:700}.uep-uni-region-tabs button.active{background:#174f78!important;color:#fff!important;border-color:#174f78!important;box-shadow:0 0 0 2px rgba(23,79,120,.12)}.uep-uni-list button.active{background:#e8f3ff!important;color:#0d548f!important;border-color:#86b9e6!important;box-shadow:0 0 0 2px rgba(13,84,143,.08)}.uep-uni-prevnext{display:grid!important;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:10px;align-items:center;width:100%}.uep-uni-prevnext b{padding:6px 14px;border-radius:999px;background:#153e5f;color:#fff;font-size:14px}.uep-uni-prevnext button:first-child{text-align:left}.uep-uni-prevnext button:last-child{text-align:right}.uep-uni-type-back{padding:12px 16px 8px}.uep-uni-type-back button{min-height:36px;padding:6px 14px;border-radius:999px;border:1px solid #cfdceb;background:#fff;font-weight:800}@media(max-width:1100px){.uep-types-flow .admission-explain-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.uep-uni-nav-row{grid-template-columns:1fr}.uep-uni-nav-label{padding-top:0}.uep-uni-prevnext{grid-template-columns:1fr}}\n`;
fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(cp,c,'utf8');
console.log('UEP 0.82.24 admissions readability/state patch applied');
