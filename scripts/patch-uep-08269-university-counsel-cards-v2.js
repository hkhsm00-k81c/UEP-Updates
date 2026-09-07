const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app/resources/app';
const gp=path.join(root,'gyomuon.js');
const cp=path.join(root,'gyomuon.css');
const pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
let c=fs.readFileSync(cp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.68["'];/.test(g),'expected 0.82.68 renderer base');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.68["'];/,'const APP_VERSION = "0.82.69";');
g=g.replace(/const CURRENT='0\.82\.68';/g,"const CURRENT='0.82.69';");
if(fs.existsSync(pp)){
  const p=JSON.parse(fs.readFileSync(pp,'utf8'));
  must(String(p.version)==='0.82.68','expected package 0.82.68');
  p.version='0.82.69';
  fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');
}

const start="  const resultHtml=results.length?";
const stop="  openDashboardAdmissionDialogBase(displayName,body);";
const si=g.indexOf(start);
const ei=g.indexOf(stop,si);
must(si>=0,'university lower-render start missing');
must(ei>si,'university dialog call missing');
const oldChunk=g.slice(si,ei);
must(oldChunk.includes("minimums.slice(0,14)"),'expected flat minimum renderer missing');
must(oldChunk.includes("uep08253AdmissionCounselMarkup(university)"),'counsel markup missing in base');
must(oldChunk.includes("2029 최종 모집요강 재확인"),'reference note missing in base');

const replacement=String.raw`  const uep08269TrackLabel=r=>{
    const type=String(r?.['전형유형']||'').trim(),track=String(r?.['전형명']||'').trim();
    const nt=type.replace(/\s+/g,'').replace(/전형$/,''),nk=track.replace(/\s+/g,'').replace(/전형$/,'');
    return track&&(nk.startsWith(nt)||nt.startsWith(nk))?track:[type,track].filter(Boolean).join(' · ')||'전형 확인';
  };
  const uep08269GroupBy=(rows,keyFn)=>{
    const map=new Map();
    rows.forEach(row=>{const key=String(keyFn(row)||'').trim()||'기타';if(!map.has(key))map.set(key,[]);map.get(key).push(row);});
    return [...map.entries()];
  };
  const resultYearValues=[...new Set(results.map(r=>String(r['기준학년도']||r['입결기준학년도']||r['결과학년도']||'').trim()).filter(Boolean))];
  const resultBasis=resultYearValues.length===1?resultYearValues[0]+'학년도':resultYearValues.length>1?resultYearValues.join('·')+'학년도':'기준연도 미기록';
  const resultHtml=results.length?results.map(r=>'<article class="uep-uni-result-card"><h4>'+escapeHtml(r['모집단위']||'모집단위')+'</h4><p>'+escapeHtml(r['전형명(대)']||r['전형명']||'')+'</p><div><b>합격 '+escapeHtml(r['합격자수']||'-')+'명</b><span>최저내신 '+escapeHtml(r['최저내신등급']||'-')+'</span></div></article>').join(''):'<p class="uep-uni-result-empty">현재 연결된 운호고 실제 합격사례가 없습니다.</p>';
  const resultDisclosure='<details class="uep-uni-result-disclosure"><summary><span><small>UNHO DATA</small><b>운호고 실제 합격사례</b></span><em>'+escapeHtml(resultBasis)+' · '+results.length+'건</em><i>펼쳐보기</i></summary><div class="uep-uni-result-grid">'+resultHtml+'</div></details>';
  const calcs=dashboardAdmissionRows('admissionGradeCalcs','57_내신산정DB').filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);
  const calc=calcs.find(r=>String(r['검증상태']||'').startsWith('A-'))||calcs[0]||null;
  const recommendations=dashboardAdmissionRows('admissionRecommendations','58_권장과목DB').filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm&&String(r['UEP노출']||'Y').trim().toUpperCase()!=='N');
  const detailLine=(label,value)=>value?'<div class="uep-uni-detail-line"><b>'+escapeHtml(label)+'</b><span>'+escapeHtml(value)+'</span></div>':'';
  const calcBadge=(label,value)=>value?'<span class="uep-uni-calc-badge"><small>'+escapeHtml(label)+'</small><b>'+escapeHtml(String(value))+'</b></span>':'';
  const calcHtml=calc?'<div class="uep-uni-calc-highlight">'+calcBadge('반영학년',calc['반영학년'])+calcBadge('반영교과·과목',calc['반영교과/과목'])+calcBadge('이수학점·가중',calc['이수학점가중'])+'</div><details class="uep-uni-calc-details"><summary>세부 산식 보기</summary><div class="uep-uni-detail-stack">'+detailLine('등급점수',calc['석차등급배점'])+detailLine('성취도점수',calc['성취도배점/환산'])+detailLine('등급 미기재',calc['석차등급미기재과목처리'])+detailLine('최종 산식',calc['내신산식'])+'</div></details>':'<div class="uep-uni-detail-pending"><b>정확한 숫자 산식 검증중</b><span>등급별 점수·성취도별 점수·가중치가 공식 원문에서 확인된 뒤 표시합니다.</span></div>';
  const minimumGroups=uep08269GroupBy(minimums,r=>r['모집단위']||'모집단위');
  const minHtml=minimumGroups.length?minimumGroups.map(([unit,rows])=>'<article class="uep-uni-min-card"><header><h4>'+escapeHtml(unit)+'</h4><span>'+rows.length+'개 전형</span></header><div class="uep-uni-min-track-list">'+rows.map(r=>'<div class="uep-uni-min-track"><b>'+escapeHtml(uep08269TrackLabel(r))+'</b><p>'+escapeHtml(r['수능최저원문']||'공식 기준 확인 필요')+'</p></div>').join('')+'</div></article>').join(''):'<div class="uep-uni-detail-pending"><b>모집단위별 기준 검증중</b><span>공식 원문 숫자가 확인된 기준만 표시합니다.</span></div>';
  const statusRecommendations=recommendations.filter(r=>/자료미확보|미제시/.test(String(r['구분']||'')));
  const normalRecommendations=recommendations.filter(r=>!/자료미확보|미제시/.test(String(r['구분']||'')));
  const recommendationGroups=uep08269GroupBy(normalRecommendations,r=>r['과목']||r['원문']||'공식 자료 확인 필요');
  const courseStatusHtml=statusRecommendations.map(r=>{const kind=String(r['구분']||'').trim(),unit=String(r['모집단위/계열']||'전체').trim()||'전체',subjects=String(r['과목']||'').trim(),original=String(r['원문']||'').trim();if(/자료미확보/.test(kind))return '<div class="uep-uni-detail-pending uep-uni-recommend-status pending"><b>전공연계 자료 미확보</b><span>'+escapeHtml(original||subjects||'별도 전공 연계 과목 자료가 아직 연결되지 않았습니다.')+'</span></div>';return '<div class="uep-uni-recommend-status-card missing"><b>'+escapeHtml(unit)+'</b><span>공식 자료 확인 · 미제시</span><p>'+escapeHtml(subjects||original||'해당 모집단위의 별도 관련·권장과목 제시 없음')+'</p></div>';}).join('');
  const courseHtml=!recommendations.length?'<div class="uep-uni-detail-pending uep-uni-recommend-status input"><b>자료 입력 전</b><span>58_권장과목DB에 이 대학의 전공 연계 자료가 아직 등록되지 않았습니다.</span></div>':courseStatusHtml+recommendationGroups.map(([subjects,rows])=>{const units=[...new Set(rows.map(r=>String(r['모집단위/계열']||'전체').trim()||'전체'))];const kinds=[...new Set(rows.map(r=>String(r['구분']||'관련 교과').trim()||'관련 교과'))];return '<article class="uep-uni-recommend-card"><header><div>'+kinds.map(k=>'<span>'+escapeHtml(k)+'</span>').join('')+'</div><h4>'+escapeHtml(subjects)+'</h4></header><div class="uep-uni-recommend-units">'+units.map(unit=>'<span>'+escapeHtml(unit)+'</span>').join('')+'</div></article>';}).join('');
  const logoUrl=String(university['로고URL']||university['대학로고URL']||'').trim();
  const monogram=String(displayName||name).replace(/대학교|대학/g,'').trim().slice(0,2)||'대학';
  const identityMark=logoUrl?'<img src="'+escapeHtml(logoUrl)+'" alt="'+escapeHtml(displayName)+' 로고" class="uep-uni-logo">':'<span class="uep-uni-logo uep-uni-logo-fallback" aria-label="대학 로고 미등록">'+escapeHtml(monogram)+'</span>';
  const identityHtml='<section class="uep-uni-identity">'+identityMark+'<div><small>UNIVERSITY PROFILE</small><h2>'+escapeHtml(displayName)+'</h2><p>'+escapeHtml([university['캠퍼스'],university['기준학년도']?university['기준학년도']+' 입학전형':null].filter(Boolean).join(' · '))+'</p></div><span>'+escapeHtml(university['자료상태']||'교육용 참고')+'</span></section>';
  const body='<div class="uep-admission-university-detail uep-admission-university-detail-08223 uep-admission-university-detail-08269">'+nav+identityHtml+
    '<section class="uep-uni-section"><div class="uep-uni-section-title"><div><small>ADMISSION</small><h3>주요 전형과 선발방식</h3></div><span>'+escapeHtml(university['기준학년도']||'2028')+' 기준</span></div><div class="uep-uni-admission-grid">'+admissionHtml+'</div>'+restrictedHtml+'</section>'+
    '<section class="uep-uni-section uep-uni-calc-section"><div class="uep-uni-section-title"><div><small>GRADE</small><h3>내신성적 산출방법</h3></div></div>'+calcHtml+'</section>'+
    '<section class="uep-uni-section uep-uni-minimum-section"><div class="uep-uni-section-title"><div><small>MINIMUM</small><h3>모집단위별 수능최저</h3></div><span>모집단위 안에서 전형별 비교</span></div><div class="uep-uni-minimum-grid">'+minHtml+'</div></section>'+
    '<section class="uep-uni-section uep-uni-course-section"><div class="uep-uni-section-title"><div><small>COURSE</small><h3>관련·권장과목</h3></div><span>공식 과목 조합 → 모집단위</span></div><div class="uep-uni-recommend-grid">'+courseHtml+'</div></section>'+
    resultDisclosure+
    uep08253AdmissionCounselMarkup(university)+
    '<p class="admission-reference-note">'+escapeHtml(university['기준학년도']||'2028')+' 기준 · '+escapeHtml(university['자료상태']||'교육용 참고')+' · 2029 최종 모집요강 재확인</p></div>';
`;

g=g.slice(0,si)+replacement+g.slice(ei);

const cssMarker='/* UEP_08269_UNIVERSITY_COUNSEL_CARDS */';
must(!c.includes(cssMarker),'0.82.69 university CSS already present');
c+=String.raw`
/* UEP_08269_UNIVERSITY_COUNSEL_CARDS */
.uep-admission-university-detail-08269{display:flex;flex-direction:column;gap:16px}
.uep-admission-university-detail-08269>.uep-uni-section{margin-bottom:0}
.uep-uni-identity{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:16px;padding:18px 20px;border:1px solid #d7e3ee;border-radius:20px;background:linear-gradient(135deg,#f8fbff,#fff);box-shadow:0 4px 18px rgba(15,23,42,.04)}
.uep-uni-identity>div small{display:block;margin-bottom:2px;font-size:10px;font-weight:900;letter-spacing:.12em;color:#5d82a6}.uep-uni-identity h2{margin:0;font-size:24px;color:#172b3f}.uep-uni-identity p{margin:4px 0 0;color:#64748b;font-size:13px}.uep-uni-identity>span:last-child{padding:6px 10px;border-radius:999px;background:#eef5fb;color:#486983;font-size:12px;font-weight:800}.uep-uni-logo{width:56px;height:56px;object-fit:contain;border-radius:14px;background:#fff;border:1px solid #dce6ef;padding:7px}.uep-uni-logo-fallback{display:grid;place-items:center;padding:0;background:#183f61;color:#fff;font-size:17px;font-weight:900;letter-spacing:-.04em}
.uep-uni-calc-highlight{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.uep-uni-calc-badge{display:flex;flex-direction:column;gap:5px;padding:14px;border:1px solid #dbe6ef;border-radius:14px;background:#f8fbfe}.uep-uni-calc-badge small{font-size:11px;font-weight:850;color:#5d7891}.uep-uni-calc-badge b{font-size:14px;line-height:1.5;color:#17324d}.uep-uni-calc-details{margin-top:12px;border-top:1px dashed #dce5ed;padding-top:10px}.uep-uni-calc-details>summary{cursor:pointer;color:#24628f;font-size:13px;font-weight:850;list-style:none}.uep-uni-calc-details>summary::-webkit-details-marker{display:none}.uep-uni-calc-details>summary:after{content:' +';margin-left:5px}.uep-uni-calc-details[open]>summary:after{content:' −'}
.uep-uni-minimum-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.uep-uni-min-card{border:1px solid #dbe5ec;border-radius:15px;background:#fff;overflow:hidden;box-shadow:0 3px 12px rgba(15,23,42,.035)}.uep-uni-min-card>header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;background:#f7fbff;border-bottom:1px solid #e4edf4}.uep-uni-min-card h4{margin:0;font-size:15px;color:#17324d}.uep-uni-min-card header span{flex:0 0 auto;border-radius:999px;padding:4px 8px;background:#e8f3ff;color:#17629a;font-size:11px;font-weight:850}.uep-uni-min-track-list{display:flex;flex-direction:column}.uep-uni-min-track{padding:11px 14px;border-bottom:1px solid #edf2f6}.uep-uni-min-track:last-child{border-bottom:0}.uep-uni-min-track b{display:block;margin-bottom:4px;color:#245f91;font-size:12px}.uep-uni-min-track p{margin:0;color:#334e68;font-size:13px;line-height:1.5}
.uep-uni-recommend-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.uep-uni-recommend-card,.uep-uni-recommend-status-card{padding:14px;border:1px solid #dbe5ec;border-radius:15px;background:#fff}.uep-uni-recommend-card header>div{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:7px}.uep-uni-recommend-card header span{padding:3px 7px;border-radius:999px;background:#eef6ff;color:#24628f;font-size:10px;font-weight:850}.uep-uni-recommend-card h4{margin:0 0 11px;font-size:15px;line-height:1.45;color:#17324d}.uep-uni-recommend-units{display:flex;flex-wrap:wrap;gap:6px}.uep-uni-recommend-units>span{padding:5px 8px;border-radius:9px;background:#f6f8fa;border:1px solid #e6ebef;color:#475569;font-size:11px;line-height:1.35}.uep-uni-recommend-status-card.missing{background:#fafafa;color:#64748b}.uep-uni-recommend-status-card>b{display:block;margin-bottom:4px}.uep-uni-recommend-status-card>span{font-size:11px;font-weight:800}.uep-uni-recommend-status-card>p{margin:7px 0 0;font-size:12px}
.uep-uni-result-disclosure{border:1px solid #dce5ec;border-radius:18px;background:#fff;overflow:hidden}.uep-uni-result-disclosure>summary{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:15px 18px;cursor:pointer;list-style:none;background:#fbfdff}.uep-uni-result-disclosure>summary::-webkit-details-marker{display:none}.uep-uni-result-disclosure>summary span{display:flex;flex-direction:column}.uep-uni-result-disclosure>summary small{font-size:10px;font-weight:900;letter-spacing:.12em;color:#5d82a6}.uep-uni-result-disclosure>summary b{font-size:16px;color:#17324d}.uep-uni-result-disclosure>summary em{font-style:normal;font-size:12px;color:#64748b}.uep-uni-result-disclosure>summary i{font-style:normal;padding:5px 9px;border-radius:999px;background:#eef5fb;color:#376587;font-size:11px;font-weight:850}.uep-uni-result-disclosure[open]>summary i{font-size:0}.uep-uni-result-disclosure[open]>summary i:after{content:'접기';font-size:11px}.uep-uni-result-disclosure>.uep-uni-result-grid{padding:14px;border-top:1px solid #e5edf3}.uep-uni-result-empty{grid-column:1/-1;margin:0;padding:14px;color:#64748b}
@media(max-width:1200px){.uep-uni-minimum-grid,.uep-uni-recommend-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.uep-uni-calc-highlight{grid-template-columns:1fr}}
@media(max-width:780px){.uep-uni-identity{grid-template-columns:auto 1fr}.uep-uni-identity>span:last-child{grid-column:1/-1}.uep-uni-minimum-grid,.uep-uni-recommend-grid{grid-template-columns:1fr}.uep-uni-result-disclosure>summary{grid-template-columns:1fr}.uep-uni-result-disclosure>summary i{justify-self:start}}
`;

const releaseMarker='/* UEP_08269_RELEASE_NOTES_ONCE */';
must(!g.includes(releaseMarker),'0.82.69 release note already present');
g+=String.raw`
/* UEP_08269_RELEASE_NOTES_ONCE */
(function(){const VERSION='0.82.69',KEY='uep:release-notes:'+VERSION;if(String(APP_VERSION)!==VERSION)return;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08269'))return;const o=document.createElement('div');o.id='uep-release-08269';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.69 수정사항</h2><ul><li>오늘의 대학의 주요 전형 카드는 유지하고 내신·수능최저·권장과목 영역을 상담용 카드 구조로 개편했습니다.</li><li>수능최저는 모집단위 카드 안에서 전형별 조건을 직접 비교하도록 변경했습니다.</li><li>관련·권장과목은 58_권장과목DB의 공식 과목 조합을 먼저 보여주고 해당 모집단위를 연결합니다.</li><li>운호고 실제 합격사례는 기본 접힘으로 정리하고 입결 기준연도가 없는 자료에는 연도를 임의 생성하지 않습니다.</li><li>대학 로고 URL이 등록된 경우 상단에 표시하며 미등록 대학은 대학명 마크로 대체합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();})();
`;

must(g.includes("const APP_VERSION = \"0.82.69\";"),'renderer version not updated');
must(g.includes('uep08269GroupBy'),'grouping helper missing');
must(g.includes('uep-uni-result-disclosure'),'result disclosure missing');
must(g.includes("university['로고URL']"),'logo-field support missing');
must(g.includes('uep08253AdmissionCounselMarkup(university)'),'counsel markup lost');
must(g.includes('2029 최종 모집요강 재확인'),'reference note lost');
must(!g.slice(si,si+replacement.length+200).includes('minimums.slice(0,14)'),'old flat minimum renderer remains in university chunk');
must(c.includes(cssMarker),'static university CSS missing');
fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(cp,c,'utf8');
console.log('UEP 0.82.69 university counseling cards patch v2 applied');
