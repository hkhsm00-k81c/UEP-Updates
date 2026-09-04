const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};
must(/APP_VERSION\s*=\s*["']0\.82\.48["']/.test(g),'0.82.48 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.48["']/,'APP_VERSION = "0.82.49"').replace(/const CURRENT='0\.82\.48';/g,"const CURRENT='0.82.49';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.49';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

// Dashboard: admissions become three non-overlapping jobs: understand / search by major / deep-dive university.
const cardsOld="['admission','basics','대입 기초','수시·정시와 고1 준비'],['admission','types','전형 이해','대학별 선발방식 비교'],['admission','university','오늘의 대학',u?.['대학명']||'대학 정보']";
must(g.includes(cardsOld),'dashboard admission card array not found');
g=g.replace(cardsOld,"['admission','basics','대입 이해','기초부터 실제 전형까지'],['admission','major','전공별 대학 찾기','전공·지역·전형·최저 검색'],['admission','university','오늘의 대학',u?.['대학명']||'대학 정보']");

const bindOld="if(key==='basics')return openDashboardAdmissionBasics();if(key==='types')return openDashboardAdmissionTypes();if(key==='university')";
must(g.includes(bindOld),'dashboard admission binding not found');
g=g.replace(bindOld,"if(key==='basics')return openDashboardAdmissionGuide();if(key==='major')return openDashboardAdmissionMajorSearch();if(key==='types')return openDashboardAdmissionGuide();if(key==='university')");

// Native combined guide: 52 basics first, then 53/53A concepts backed by real 53B tracks.
g += String.raw`
/* UEP_08249_ADMISSION_GUIDE_MAJOR_SEARCH */
function openDashboardAdmissionGuide(){
  window.__uepAdmissionReturn='';window.__uepAdmissionRegion='';
  const basics=dashboardAdmissionRows('admissionBasics','52_대입기초').filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));
  const types=dashboardAdmissionRows('admissionTypes','53_전형이해').filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));
  const details=dashboardAdmissionRows('admissionTypeDetails','53A_전형세부유형DB').filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));
  const structures=dashboardAdmissionStructureRows().filter(r=>String(r['UEP노출']??'Y').toUpperCase()!=='N');
  const groups=[];for(const row of basics){const key=String(row['대분류']||'대입 기초').trim()||'대입 기초';let x=groups.find(v=>v.key===key);if(!x){x={key,rows:[]};groups.push(x)}x.rows.push(row)}
  const basicsHtml=groups.map(group=>'<section><h3>'+escapeHtml(group.key)+'</h3><div class="admission-explain-grid">'+group.rows.map(row=>'<article class="uep-basics-card"><b>'+escapeHtml(row['주제']||'')+'</b><p>'+escapeHtml(row['카드요약']||row['상세설명']||'')+'</p>'+(row['상담포인트']?'<small><strong>상담</strong> · '+escapeHtml(row['상담포인트'])+'</small>':'')+(row['주의/오해']?'<small><strong>주의</strong> · '+escapeHtml(row['주의/오해'])+'</small>':'')+'</article>').join('')+'</div></section>').join('');
  const norm=v=>String(v||'').replace('정시','수능위주').trim();
  const typeHtml=types.map(type=>{const broad=norm(type['전형유형']);const ds=details.filter(d=>norm(d['대전형'])===broad);const cards=(ds.length?ds:[type]).map(d=>{const sid=String(d['세부ID']||'');const linked=structures.filter(s=>norm(s['대전형'])===broad&&(!sid||String(s['세부유형ID']||'').split(/[,/]/).map(x=>x.trim()).includes(sid)));const examples=linked.slice(0,5).map(s=>'<button type="button" data-guide-university="'+escapeHtml(s['대학명']||'')+'"><b>'+escapeHtml((s['대학명']||'')+' · '+(s['전형명']||''))+'</b></button>').join('');return '<article class="admission-track-type-card"><div class="uep-type-card-badges">'+(typeof uep08224TypeBadges==='function'?uep08224TypeBadges(d,type):'')+'</div><b>'+escapeHtml(d['세부유형']||type['전형유형']||'')+'</b><p>'+escapeHtml(d['대표평가구조']||d['한줄요약']||type['한줄요약']||'')+'</p>'+(d['수능최저경향']?'<small><strong>수능최저</strong> · '+escapeHtml(d['수능최저경향'])+'</small>':'')+'<div class="admission-track-list">'+examples+'</div></article>'}).join('');return cards?'<section><h3>'+escapeHtml(type['전형유형']||broad)+'</h3><p>'+escapeHtml(type['한줄요약']||'')+'</p><div class="admission-explain-grid admission-track-grid">'+cards+'</div></section>':''}).join('');
  openDashboardAdmissionDialog('대입 이해','<div class="admission-learning-flow uep-admission-guide"><div class="admission-track-intro"><b>대입의 기본을 이해하고 실제 대학 전형으로 연결합니다.</b><span>52 대입기초 → 53·53A 전형구조 → 53B 실제 대학·전형 사례</span></div>'+basicsHtml+'<section class="uep-guide-divider"><h3>실제 전형으로 이해하기</h3><p>개념 설명 뒤 실제 대학의 전형을 함께 확인합니다.</p></section>'+typeHtml+'<p class="admission-reference-note">교육용 이해 자료이며 대학별 세부사항은 최종 모집요강을 다시 확인합니다.</p></div>');
  document.querySelectorAll('[data-guide-university]').forEach(b=>b.onclick=()=>{window.__uepAdmissionReturn='guide';openDashboardAdmissionUniversityByName(b.dataset.guideUniversity)});
}
function uep08249MajorText(row){return [row['모집단위'],row['모집단위/계열'],row['학과'],row['학부'],row['전공'],row['계열'],row['수능최저원문'],row['비고']].filter(Boolean).join(' ')}
function uep08249MajorResults(query,region,type,minimum){
  const q=String(query||'').trim().toLowerCase();
  const mins=dashboardAdmissionRows('admissionMinimumRows','54_수능최저DB').filter(r=>String(r['UEP노출']??'Y').toUpperCase()!=='N');
  const structures=dashboardAdmissionStructureRows().filter(r=>String(r['UEP노출']??'Y').toUpperCase()!=='N');
  const unis=dashboardAdmissionUniversities();
  const uniByNorm=new Map(unis.map(u=>[dashboardAdmissionNormalizeUniversity(u['대학명']),u]));
  const out=[];
  for(const m of mins){const text=uep08249MajorText(m);if(q&&!text.toLowerCase().includes(q))continue;const norm=dashboardAdmissionNormalizeUniversity(m['대학명']);const u=uniByNorm.get(norm)||{'대학명':m['대학명'],'캠퍼스':m['캠퍼스']};if(region&&typeof uep08223UniversityRegions==='function'&&!uep08223UniversityRegions(u).includes(region))continue;const track=String(m['전형명']||m['전형유형']||'').trim();const linked=structures.filter(s=>dashboardAdmissionNormalizeUniversity(s['대학명'])===norm&&(!track||String(s['전형명']||'').includes(track)||track.includes(String(s['전형명']||''))));const s=linked[0]||structures.find(x=>dashboardAdmissionNormalizeUniversity(x['대학명'])===norm)||{};const broad=String(s['대전형']||s['전형유형']||m['전형유형']||'').trim();if(type&&broad!==type)continue;const minText=String(m['수능최저원문']||m['수능최저']||m['최저기준']||'').trim();if(minimum==='none'&&!/미적용|없음|해당없음/.test(minText))continue;if(minimum==='yes'&&/미적용|없음|해당없음/.test(minText))continue;out.push({u,m,s,broad,track,minText,text})}
  const seen=new Set();return out.filter(x=>{const k=[x.u['대학명'],x.track,x.text,x.minText].join('|');if(seen.has(k))return false;seen.add(k);return true}).slice(0,120)
}
function openDashboardAdmissionMajorSearch(){
  window.__uepAdmissionReturn='major';
  const regions=['서울','경기','인천','충북','충남','대전','세종','강원','부산','대구','광주','전북','전남','경북','경남'];
  const quick=['의예','치의예','한의예','약학','수의예','간호','컴퓨터','AI','반도체','경영','교육'];
  const body='<div class="uep-major-search"><div class="admission-track-intro"><b>전공을 먼저 고르고, 실제 대학·전형·조건을 비교합니다.</b><span>모집단위별 수능최저DB와 실제 대학 전형DB를 함께 검색합니다.</span></div><div class="uep-major-quick">'+quick.map(x=>'<button type="button" data-major-quick="'+escapeHtml(x)+'">'+escapeHtml(x)+'</button>').join('')+'</div><div class="uep-major-filters"><input type="search" data-major-query placeholder="전공·학과 검색 (예: 의예, 약학, 컴퓨터)"><select data-major-region><option value="">전체 지역</option>'+regions.map(x=>'<option>'+x+'</option>').join('')+'</select><select data-major-type><option value="">전체 전형</option><option>학생부교과</option><option>학생부종합</option><option>논술</option><option>수능위주</option></select><select data-major-min><option value="">최저 전체</option><option value="yes">수능최저 있음</option><option value="none">수능최저 없음</option></select></div><div class="uep-major-result-summary" data-major-summary></div><div class="uep-major-results" data-major-results><div class="uep-uni-detail-pending"><b>전공을 선택하거나 검색하세요.</b><span>의치한약수부터 일반 전공까지 같은 검색 구조로 확장됩니다.</span></div></div></div>';
  openDashboardAdmissionDialog('전공별 대학 찾기',body);
  const layer=document.querySelector('.dashboard-admission-layer');if(!layer)return;const q=layer.querySelector('[data-major-query]'),reg=layer.querySelector('[data-major-region]'),typ=layer.querySelector('[data-major-type]'),min=layer.querySelector('[data-major-min]'),sum=layer.querySelector('[data-major-summary]'),box=layer.querySelector('[data-major-results]');
  const render=()=>{const rows=uep08249MajorResults(q.value,reg.value,typ.value,min.value);sum.textContent=(q.value?('“'+q.value+'” · '):'')+rows.length+'개 대학·전형·모집단위';box.innerHTML=rows.length?rows.map(x=>'<button type="button" class="uep-major-result-card" data-major-university="'+escapeHtml(x.u['대학명']||'')+'"><div><b>'+escapeHtml(x.u['대학명']||'')+'</b><span>'+escapeHtml(x.text||'모집단위 확인')+'</span></div><div><strong>'+escapeHtml(x.track||x.broad||'전형 확인')+'</strong><small>'+escapeHtml(x.minText||'수능최저 원문 확인')+'</small></div></button>').join(''):'<div class="uep-uni-detail-pending"><b>조건에 맞는 자료가 없습니다.</b><span>검색어 또는 필터를 넓혀 보세요.</span></div>';box.querySelectorAll('[data-major-university]').forEach(b=>b.onclick=()=>{window.__uepAdmissionReturn='major';openDashboardAdmissionUniversityByName(b.dataset.majorUniversity)})};
  [q,reg,typ,min].forEach(el=>{el.addEventListener('input',render);el.addEventListener('change',render)});layer.querySelectorAll('[data-major-quick]').forEach(b=>b.onclick=()=>{q.value=b.dataset.majorQuick;render()});
}
`;

// University detail can return to the new guide or major search without global click hacks.
g=g.replace("const origin=window.__uepAdmissionReturn==='types'?'types':'today';","const origin=['types','guide','major'].includes(window.__uepAdmissionReturn)?window.__uepAdmissionReturn:'today';");
g=g.replace("const nav=origin==='types'?'<div class=\"uep-uni-type-back\"><button type=\"button\" data-uep-back-types>← 전형 이해로</button></div>':uep08223TodayNav(university);","const nav=origin==='types'||origin==='guide'?'<div class=\"uep-uni-type-back\"><button type=\"button\" data-uep-back-types>← 대입 이해로</button></div>':origin==='major'?'<div class=\"uep-uni-type-back\"><button type=\"button\" data-uep-back-major>← 전공별 대학 찾기로</button></div>':uep08223TodayNav(university);");
// Bind new native back target alongside existing detail bindings.
g=g.replace("document.querySelector('[data-uep-back-types]')?.addEventListener('click',()=>openDashboardAdmissionTypes());","document.querySelector('[data-uep-back-types]')?.addEventListener('click',()=>openDashboardAdmissionGuide());document.querySelector('[data-uep-back-major]')?.addEventListener('click',()=>openDashboardAdmissionMajorSearch());");

// Native style rules, injected once by source code marker (not observer/post-render mutation).
g += String.raw`
(function(){if(document.getElementById('uep08249-major-style'))return;const s=document.createElement('style');s.id='uep08249-major-style';s.textContent='.uep-guide-divider{margin:24px 0 10px;padding-top:20px;border-top:1px solid #dbe7f2}.uep-major-search{display:grid;gap:16px}.uep-major-quick{display:flex;flex-wrap:wrap;gap:8px}.uep-major-quick button{border:1px solid #c8dcef;background:#fff;border-radius:999px;padding:8px 13px;font-weight:800;color:#164b73}.uep-major-filters{display:grid;grid-template-columns:minmax(260px,1.8fr) repeat(3,minmax(130px,1fr));gap:10px}.uep-major-filters input,.uep-major-filters select{border:1px solid #d2e0ec;border-radius:12px;padding:11px 12px;background:#fff}.uep-major-result-summary{font-weight:800;color:#164b73}.uep-major-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.uep-major-result-card{border:1px solid #d8e5ef;background:#fff;border-radius:14px;padding:14px;text-align:left;display:grid;grid-template-columns:1.1fr 1fr;gap:14px}.uep-major-result-card div{display:grid;gap:5px}.uep-major-result-card span,.uep-major-result-card small{font-size:12px;color:#60788c;line-height:1.45}.uep-major-result-card strong{color:#0f5688}@media(max-width:900px){.uep-major-filters{grid-template-columns:1fr 1fr}.uep-major-results{grid-template-columns:1fr}}';(document.head||document.documentElement).appendChild(s)})();
`;

const notesRe=/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/;must(notesRe.test(g),'release notes not found');
g=g.replace(notesRe,`const UEP_08221_RELEASE_NOTES=[
  '대입 기초와 전형 이해를 ‘대입 이해’로 통합해 기초 개념에서 실제 대학 전형 사례까지 한 흐름으로 볼 수 있게 했습니다.',
  '기존 전형 이해 자리에 ‘전공별 대학 찾기’를 신설했습니다. 의치한약수·간호·컴퓨터·AI·반도체 등 전공을 기준으로 대학과 실제 전형을 찾습니다.',
  '전공별 검색에서 지역·전형유형·수능최저 유무를 함께 필터링하고 모집단위별 수능최저 원문을 비교할 수 있습니다.',
  '검색 결과 대학을 누르면 오늘의 대학 상세로 이어져 선발방식·수능최저·내신산정·권장과목을 계속 확인할 수 있습니다.',
  '오늘의 대학은 현재 확정된 구조를 그대로 유지합니다.'
];`);
fs.writeFileSync(gp,g,'utf8');console.log('UEP 0.82.49 patch PASS');
