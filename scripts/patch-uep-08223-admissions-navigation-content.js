const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const cp=path.join(root,'resources','app','gyomuon.css');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
let c=fs.readFileSync(cp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
must(/const\s+APP_VERSION\s*=\s*["']0\.82\.22["'];/.test(g),'0.82.22 base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.22["'];/,'const APP_VERSION = "0.82.23";');
g=g.replace(/const CURRENT='0\.82\.22';/g,"const CURRENT='0.82.23';");
if(fs.existsSync(pp)){
  const p=JSON.parse(fs.readFileSync(pp,'utf8'));
  p.version='0.82.23';
  fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');
}

const start='function openDashboardUniversityDetail(university=dashboardAdmissionTodayUniversity()){';
const end='}function dashboardStudentStatusCompactMarkup(){';
const si=g.indexOf(start), ei=g.indexOf(end,si);
must(si>=0&&ei>si,'university detail function boundary not found');

const replacement=`function uep08223UniversityRegions(row){
  const text=String((row&&row['캠퍼스'])||'')+' '+String((row&&row['대학명'])||'');
  const defs=[
    ['서울',/서울|관악|신촌|성북|동대문|광진|동작|마포|서대문|종로|성동|송파|강남|노원/],
    ['경기',/경기|수원|용인|안성|성남|고양|화성|포천|의정부/],
    ['인천',/인천|송도/],
    ['충북',/충북|청주|개신|충주|제천/],
    ['충남',/충남|천안|아산|홍성|논산|공주/],
    ['대전',/대전/],
    ['세종',/세종/],
    ['강원',/강원|춘천|원주|강릉/],
    ['부산',/부산/],['대구',/대구/],['광주',/광주/],['전북',/전북|전주|익산/],['전남',/전남|순천|목포/],['경북',/경북|경산|포항|안동/],['경남',/경남|창원|진주|김해/]
  ];
  const out=defs.filter(x=>x[1].test(text)).map(x=>x[0]);
  return out.length?out:['기타'];
}
function uep08223UniversityBadges(row){
  const type=String(row['전형유형']||row['대전형']||'');
  const method=String(row['선발방식']||row['평가구조요약']||dashboardAdmissionMethod(row)||'');
  const min=String(row['수능최저']||row['수능최저원문']||'');
  const values=[];
  if(type)values.push(type);
  if(/교과|내신/.test(method)&&!values.some(x=>/교과/.test(x)))values.push('교과');
  if(/서류|종합/.test(method)&&!values.some(x=>/종합/.test(x)))values.push('서류');
  if(/면접/.test(method))values.push('면접');
  if(/논술/.test(method))values.push('논술');
  if(/추천|학교장/.test(method+type))values.push('추천');
  if(min&&!/미적용|없음/.test(min))values.push('수능최저');
  if(/미적용|없음/.test(min))values.push('최저없음');
  return [...new Set(values)].slice(0,5).map(v=>'<span>'+escapeHtml(v)+'</span>').join('');
}
function uep08223TodayNav(university){
  const all=dashboardAdmissionUniversities();
  const norm=dashboardAdmissionNormalizeUniversity(university['대학명']);
  const idx=Math.max(0,all.findIndex(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm));
  const currentRegions=uep08223UniversityRegions(university);
  const regionOrder=['서울','경기','인천','충북','충남','대전','세종','강원','부산','대구','광주','전북','전남','경북','경남','기타'];
  const present=regionOrder.filter(region=>all.some(r=>uep08223UniversityRegions(r).includes(region)));
  let active=String(window.__uepAdmissionRegion||'');
  if(!currentRegions.includes(active))active=currentRegions[0]||present[0]||'기타';
  window.__uepAdmissionRegion=active;
  const regionRows=all.filter(r=>uep08223UniversityRegions(r).includes(active));
  const prev=all[(idx-1+all.length)%all.length], next=all[(idx+1)%all.length];
  return '<div class="uep-uni-explorer">'+
    '<div class="uep-uni-region-tabs">'+present.map(region=>'<button type="button" data-uep-region="'+escapeHtml(region)+'" class="'+(region===active?'active':'')+'">'+escapeHtml(region)+'</button>').join('')+'</div>'+
    '<div class="uep-uni-list">'+regionRows.map(r=>'<button type="button" data-uep-university="'+escapeHtml(r['대학명'])+'" class="'+(dashboardAdmissionNormalizeUniversity(r['대학명'])===norm?'active':'')+'">'+escapeHtml(r['대학명'])+'</button>').join('')+'</div>'+
    '<div class="uep-uni-prevnext"><button type="button" data-uep-prev="'+escapeHtml(prev&&prev['대학명']||'')+'">← '+escapeHtml(prev&&prev['대학명']||'이전 대학')+'</button><b>'+escapeHtml(university['대학명']||'')+'</b><button type="button" data-uep-next="'+escapeHtml(next&&next['대학명']||'')+'">'+escapeHtml(next&&next['대학명']||'다음 대학')+' →</button></div>'+
  '</div>';
}
function uep08223BindUniversityNavigation(){
  const all=dashboardAdmissionUniversities();
  document.querySelector('[data-uep-back-types]')?.addEventListener('click',()=>{window.__uepAdmissionReturn='';openDashboardAdmissionTypes();});
  document.querySelectorAll('[data-uep-region]').forEach(btn=>btn.onclick=()=>{const region=btn.dataset.uepRegion;window.__uepAdmissionRegion=region;const row=all.find(r=>uep08223UniversityRegions(r).includes(region));if(row){window.__uepAdmissionReturn='today';openDashboardUniversityDetail(row);}});
  document.querySelectorAll('[data-uep-university]').forEach(btn=>btn.onclick=()=>{const row=all.find(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===dashboardAdmissionNormalizeUniversity(btn.dataset.uepUniversity));if(row){window.__uepAdmissionReturn='today';openDashboardUniversityDetail(row);}});
  document.querySelector('[data-uep-prev]')?.addEventListener('click',e=>{const row=all.find(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===dashboardAdmissionNormalizeUniversity(e.currentTarget.dataset.uepPrev));if(row){window.__uepAdmissionReturn='today';openDashboardUniversityDetail(row);}});
  document.querySelector('[data-uep-next]')?.addEventListener('click',e=>{const row=all.find(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===dashboardAdmissionNormalizeUniversity(e.currentTarget.dataset.uepNext));if(row){window.__uepAdmissionReturn='today';openDashboardUniversityDetail(row);}});
}
function openDashboardUniversityDetail(university=dashboardAdmissionTodayUniversity()){
  if(!university)return openDashboardAdmissionDialog('오늘의 대학','<p>56_대학입시마스터 자료를 읽지 못했습니다.</p>');
  const name=university['대학명']||'오늘의 대학',norm=dashboardAdmissionNormalizeUniversity(name);
  const structures=dashboardAdmissionStructureRows().filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);
  const minimums=dashboardAdmissionRows('admissionMinimums','54_수능최저DB').filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);
  const results=dashboardAdmissionRows('admissionResults','55_대학입결DB').filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);
  const admissions=structures.length?structures:minimums;
  const origin=window.__uepAdmissionReturn==='types'?'types':'today';
  const nav=origin==='types'?'<div class="uep-uni-type-back"><button type="button" data-uep-back-types>← 전형 이해로</button></div>':uep08223TodayNav(university);
  const admissionHtml=admissions.length?admissions.slice(0,18).map(r=>'<article class="uep-uni-admission-card"><div class="uep-uni-badges">'+uep08223UniversityBadges(r)+'</div><h4>'+escapeHtml(r['전형유형']||r['대전형']||'전형')+' · '+escapeHtml(r['전형명']||'전형명 확인')+'</h4><p>'+escapeHtml(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r))+'</p><small><b>수능최저</b> '+escapeHtml(r['수능최저']||r['수능최저원문']||(String(r['배지사용여부']).toUpperCase()==='N'?'참고/검증중':'미적용 또는 확인 필요'))+'</small></article>').join(''):'<p>대학별 전형구조 자료를 연결 중입니다.</p>';
  const resultHtml=results.length?results.slice(0,12).map(r=>'<article class="uep-uni-result-card"><h4>'+escapeHtml(r['모집단위']||'모집단위')+'</h4><p>'+escapeHtml(r['전형명(대)']||r['전형명']||'')+'</p><div><b>합격 '+escapeHtml(r['합격자수']||'-')+'명</b><span>최저내신 '+escapeHtml(r['최저내신등급']||'-')+'</span></div></article>').join(''):'<p>현재 연결된 운호고 실제 입결이 없습니다.</p>';
  const body='<div class="uep-admission-university-detail uep-admission-university-detail-08223">'+nav+
    '<section class="uep-uni-section"><div class="uep-uni-section-title"><div><small>ADMISSION</small><h3>주요 전형과 선발방식</h3></div><span>'+escapeHtml(university['기준학년도']||'2028')+' 기준</span></div><div class="uep-uni-admission-grid">'+admissionHtml+'</div></section>'+
    '<section class="uep-uni-summary-section"><div class="uep-uni-summary-card"><small>수시 핵심</small><p>'+escapeHtml(university['수시핵심']||'수시 전형별 평가요소를 확인합니다.')+'</p></div><div class="uep-uni-summary-card"><small>정시 핵심</small><p>'+escapeHtml(university['정시핵심']||'정시 영역별 반영비율과 가산점을 확인합니다.')+'</p></div><div class="uep-uni-summary-card"><small>과목선택 참고</small><p>'+escapeHtml(university['과목선택/교과포인트']||'-')+'</p></div></section>'+
    '<section class="uep-uni-section"><div class="uep-uni-section-title"><div><small>UNHO DATA</small><h3>운호고 실제 입결</h3></div></div><div class="uep-uni-result-grid">'+resultHtml+'</div></section>'+
    '<section class="uep-uni-counsel"><b>담임 상담 포인트</b><p>'+escapeHtml(university['담임상담체크']||university['카드한줄']||'학생의 내신·선택과목·모의고사·수업 탐구를 대학 전형 구조와 함께 확인합니다.')+'</p></section>'+
    '<p class="admission-reference-note">'+escapeHtml(university['기준학년도']||'2028')+' 기준 · '+escapeHtml(university['자료상태']||'교육용 참고')+' · 2029 최종 모집요강 재확인</p></div>';
  openDashboardAdmissionDialogBase(name,body);
  setTimeout(uep08223BindUniversityNavigation,0);
}
function dashboardStudentStatusCompactMarkup(){`;
g=g.slice(0,si)+replacement+g.slice(ei+end.length);

// Make type-origin navigation explicit and remove the old floating helper.
g += `\n/* UEP_08223_ADMISSION_NAV_OVERRIDE */\nfunction uep08221OpenUniversityFromTypes(name){window.__uepAdmissionReturn='types';document.getElementById('uep-admission-back-button')?.remove();return openDashboardAdmissionUniversityByName(name);}\n`;

// Reliable 0.82.23 first-run release notes.
if(!g.includes('UEP_08223_RELEASE_NOTES')){
  g += `\n/* UEP_08223_RELEASE_NOTES */\n(function(){const VERSION='0.82.23',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08223'))return;const o=document.createElement('div');o.id='uep-release-08223';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.23 수정사항</h2><ul><li>대입상담 팝업을 화면 90% 수준으로 확대하고 가로 스크롤을 제거했습니다.</li><li>전형 이해에서 대학 선택 시 전형 이해로 돌아가기를 유지합니다.</li><li>오늘의 대학 상세에 지역별 대학 탐색과 이전/다음 대학 보기를 추가했습니다.</li><li>대학 상세를 전형 카드·핵심 요약·운호고 입결 카드 구조로 통일했습니다.</li><li>52_대입기초의 수시 지원 횟수·수능최저·5등급 내신 등 실질 정보를 보강했습니다.</li><li>업데이트 가능 시 상단 버전에 현재 → 최신 표시를 유지합니다.</li></ul><button type="button">확인</button></div>';o.querySelector('button').onclick=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,700),{once:true});else setTimeout(show,700);setTimeout(show,2500);})();\n`;
}

if(!c.includes('UEP_08223_ADMISSIONS_EXPLORER')){
 c += `\n/* UEP_08223_ADMISSIONS_EXPLORER */\n.dashboard-admission-dialog{width:min(92vw,1680px)!important;max-width:none!important;height:92vh!important;max-height:92vh!important;border-radius:22px!important}\n.dashboard-admission-body{overflow-y:auto!important;overflow-x:hidden!important;padding:18px 20px 26px!important}\n.dashboard-admission-dialog>header{padding:18px 24px!important}\n#uep-admission-back-button{display:none!important}\n.uep-admission-university-detail-08223{font-size:15.5px;line-height:1.65;color:#172033}\n.uep-uni-type-back{margin:0 0 14px}.uep-uni-type-back button,.uep-uni-prevnext button{border:1px solid #cbd8e3;background:#fff;border-radius:999px;padding:9px 14px;font-weight:800;color:#254560;cursor:pointer}\n.uep-uni-explorer{position:sticky;top:-18px;z-index:8;margin:-18px -20px 18px;padding:14px 20px 12px;background:rgba(255,255,255,.97);border-bottom:1px solid #e3eaf0;backdrop-filter:blur(10px)}\n.uep-uni-region-tabs,.uep-uni-list{display:flex;flex-wrap:wrap;gap:7px}.uep-uni-region-tabs{margin-bottom:9px}.uep-uni-region-tabs button,.uep-uni-list button{border:1px solid #d2dde7;background:#fff;border-radius:999px;padding:7px 11px;font-size:13px;font-weight:750;color:#3a556b;cursor:pointer}.uep-uni-region-tabs button.active{background:#1f5f8f;color:#fff;border-color:#1f5f8f}.uep-uni-list button.active{background:#e9f4ff;border-color:#7db0df;color:#155a91;font-weight:850}\n.uep-uni-prevnext{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin-top:12px}.uep-uni-prevnext button:last-child{justify-self:end}.uep-uni-prevnext>b{text-align:center;font-size:15px}\n.uep-uni-section{margin-bottom:16px;padding:18px;border:1px solid #dce5ec;border-radius:18px;background:linear-gradient(180deg,#fff,#fbfdff)}\n.uep-uni-section-title{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px}.uep-uni-section-title small{font-size:10px;font-weight:900;letter-spacing:.12em;color:#5d82a6}.uep-uni-section-title h3{margin:2px 0 0;font-size:20px}.uep-uni-section-title>span{font-size:12px;padding:5px 9px;border-radius:999px;background:#eef5fb;color:#486983}\n.uep-uni-admission-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.uep-uni-admission-card{padding:15px;border:1px solid #dbe5ec;border-radius:15px;background:#fff;box-shadow:0 3px 12px rgba(15,23,42,.035)}.uep-uni-admission-card h4{margin:7px 0 8px;font-size:15.5px}.uep-uni-admission-card p{margin:0 0 10px;font-size:14px;line-height:1.55;color:#334155}.uep-uni-admission-card small{display:block;padding:8px 9px;border-radius:9px;background:#f7f9fb;font-size:13px}.uep-uni-badges{display:flex;flex-wrap:wrap;gap:5px}.uep-uni-badges span{font-size:11px;font-weight:850;padding:4px 7px;border-radius:999px;background:#edf5ff;color:#2b68a0}\n.uep-uni-summary-section{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}.uep-uni-summary-card{padding:16px;border:1px solid #dce5ec;border-radius:16px;background:#fff}.uep-uni-summary-card small{font-weight:900;color:#2c6ca2}.uep-uni-summary-card p{margin:7px 0 0;font-size:14px;line-height:1.6}\n.uep-uni-result-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.uep-uni-result-card{padding:14px;border:1px solid #dce5ec;border-radius:14px;background:#fff}.uep-uni-result-card h4{margin:0 0 5px;font-size:15px}.uep-uni-result-card p{margin:0 0 9px;font-size:13px;color:#64748b}.uep-uni-result-card div{display:flex;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid #edf1f4}.uep-uni-result-card div b{color:#1f5f8f}.uep-uni-result-card div span{color:#475569;font-size:13px}\n.uep-uni-counsel{display:flex;gap:14px;align-items:flex-start;padding:14px 16px;border-radius:14px;background:#f4f8fc;border:1px solid #dce7f0;margin-bottom:12px}.uep-uni-counsel>b{white-space:nowrap;color:#245f91}.uep-uni-counsel p{margin:0}\n@media(max-width:1200px){.uep-uni-admission-grid,.uep-uni-result-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.uep-uni-summary-section{grid-template-columns:1fr}}\n`;
}

must(g.includes('const APP_VERSION = "0.82.23";'),'version bump failed');
must(g.includes('UEP_08220_ADMISSIONS_REAL_CONNECT'),'live admissions marker missing');
must(g.includes('uep08223TodayNav'),'today navigation missing');
must(g.includes('data-uep-region'),'region navigation missing');
must(g.includes('UEP_08223_RELEASE_NOTES'),'release notes missing');
must(c.includes('width:min(92vw,1680px)'),'wide dialog css missing');
must(c.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'3-column university cards missing');
fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(cp,c,'utf8');
console.log('UEP 0.82.23 admissions navigation/content UI patched');
