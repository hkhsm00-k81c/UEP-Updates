const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const gp=path.join(root,'gyomuon.js'),pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};

must(/APP_VERSION\s*=\s*["']0\.82\.54["']/.test(g),'0.82.54 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.54["']/,'APP_VERSION = "0.82.55"');
g=g.replace(/const CURRENT='0\.82\.54';/g,"const CURRENT='0.82.55';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.55';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

// Replace the 0.82.54 admission classification with school-context classification.
const helperRe=/function uep08254AdmissionText\([\s\S]*?function uep08254AdmissionCardClass\(row\)\{[\s\S]*?return ' uep-admission-other';\}\n/;
must(helperRe.test(g),'0.82.54 admission helper block not found');
const helpers=`function uep08255AdmissionText(row,keys){return keys.map(k=>String(row?.[k]||'').trim()).filter(Boolean).join(' ');}\nfunction uep08255AdmissionEligibility(row){\n  const type=uep08255AdmissionText(row,['전형유형','대전형','전형구분']);\n  const name=String(row?.['전형명']||'').trim();\n  const eligibility=uep08255AdmissionText(row,['지원자격구분','지원자격','지원자격요약','지원대상','자격제한','지원자격제한','특별전형구분','세부유형']);\n  const combined=[type,name,eligibility].join(' ');\n  const schoolRecommendation=/학교장\\s*추천|교장\\s*추천/.test(combined);\n  const personalRestricted=/경제배려|국가보훈|보훈대상|기초생활|차상위|한부모|다문화|북한이탈|특수교육|장애|농어촌|서해\\s*5도|특성화고|마이스터고|재직자|만학도|사회통합|고른기회|기회균형/.test(combined);\n  const regionalTrack=/지역인재|지역의사/.test(combined);\n  const hasRegionalSchoolCondition=regionalTrack&&/고교|학교|재학|졸업|지역/.test(eligibility);\n  const unhoRegionalEligible=/충북|충청|충남|대전|세종/.test(eligibility);\n  const otherRegionalRestriction=hasRegionalSchoolCondition&&!unhoRegionalEligible;\n  const restricted=!schoolRecommendation&&(personalRestricted||otherRegionalRestriction);\n  return {type,name,eligibility,schoolRecommendation,restricted};\n}\nfunction uep08255AdmissionGroup(row){const info=uep08255AdmissionEligibility(row);if(info.restricted)return 90;const t=info.type;if(/교과/.test(t))return 10;if(/종합/.test(t))return 20;if(/논술/.test(t))return 30;return 80;}\nfunction uep08255AdmissionCompare(a,b){const ga=uep08255AdmissionGroup(a),gb=uep08255AdmissionGroup(b);if(ga!==gb)return ga-gb;return dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b)||String(a?.['전형명']||'').localeCompare(String(b?.['전형명']||''),'ko');}\nfunction uep08255AdmissionCardClass(row){const info=uep08255AdmissionEligibility(row);if(info.restricted)return ' uep-admission-restricted';if(/교과/.test(info.type))return ' uep-admission-subject';if(/종합/.test(info.type))return ' uep-admission-holistic';if(/논술/.test(info.type))return ' uep-admission-essay';return ' uep-admission-other';}\n`;
g=g.replace(helperRe,helpers);
g=g.replace(/sort\(uep08254AdmissionCompare\)/g,'sort(uep08255AdmissionCompare)');
g=g.replace(/uep08254AdmissionCardClass\(r\)/g,'uep08255AdmissionCardClass(r)');

// Render ordinary tracks first; eligibility-limited tracks live in one disclosure area.
const admissionRe=/  const admissionHtml=[\s\S]*?\n  const resultHtml=/;
must(admissionRe.test(g),'admission renderer block not found');
const admissionBlock=`  const renderAdmissionCard=r=>'<article class="uep-uni-admission-card'+uep08255AdmissionCardClass(r)+'"><div class="uep-uni-badges">'+uep08223UniversityBadges(r)+'</div><h4>'+escapeHtml(r['전형유형']||r['대전형']||'전형')+' · '+escapeHtml(r['전형명']||'전형명 확인')+'</h4><p>'+escapeHtml(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r))+'</p><small><b>수능최저</b> '+escapeHtml(r['수능최저']||r['수능최저원문']||(String(r['배지사용여부']).toUpperCase()==='N'?'참고/검증중':'미적용 또는 확인 필요'))+'</small></article>';\n  const ordinaryAdmissions=admissions.filter(r=>!uep08255AdmissionEligibility(r).restricted);\n  const restrictedAdmissions=admissions.filter(r=>uep08255AdmissionEligibility(r).restricted);\n  const admissionHtml=ordinaryAdmissions.length?ordinaryAdmissions.slice(0,18).map(renderAdmissionCard).join(''):'<p>대학별 일반 전형구조 자료를 연결 중입니다.</p>';\n  const restrictedHtml=restrictedAdmissions.length?'<details class="uep-uni-restricted-disclosure"><summary>지원자격 제한 전형 <b>'+restrictedAdmissions.length+'개</b><span>펼쳐보기</span></summary><div class="uep-uni-admission-grid uep-uni-restricted-grid">'+restrictedAdmissions.slice(0,30).map(renderAdmissionCard).join('')+'</div></details>':'';\n  const resultHtml=`;
g=g.replace(admissionRe,admissionBlock);
const bodyNeedle="<div class=\"uep-uni-admission-grid\">'+admissionHtml+'</div></section>'+";
must(g.includes(bodyNeedle),'admission body anchor not found');
g=g.replace(bodyNeedle,"<div class=\"uep-uni-admission-grid\">'+admissionHtml+'</div>'+restrictedHtml+'</section>'+" );

// Make the counsel editor a child overlay of the active Today University layer.
// This avoids competing top-level stacking contexts instead of trying to win with a larger global z-index.
const editorStart=g.indexOf('function uep08253OpenAdmissionCounselEditor(university){');
must(editorStart>=0,'counsel editor function not found');
const editorAppend=g.indexOf('document.body.appendChild(layer);',editorStart);
must(editorAppend>=0,'counsel editor append anchor not found');
g=g.slice(0,editorAppend)+"const host=document.querySelector('.dashboard-admission-layer')||document.body;host.appendChild(layer);"+g.slice(editorAppend+'document.body.appendChild(layer);'.length);
const editorClassOld="layer.className='counsel-reason-layer uep-admission-counsel-editor-layer';layer.style.position='fixed';layer.style.inset='0';layer.style.zIndex='2147483000';";
must(g.includes(editorClassOld),'0.82.54 counsel layer class anchor not found');
g=g.replace(editorClassOld,"layer.className='uep-admission-counsel-editor-layer';");

const styleNeedle='.uep-uni-admission-card.uep-admission-restricted:not(.uep-admission-unavailable){box-shadow:inset 4px 0 0 #c79a3b!important}';
must(g.includes(styleNeedle),'0.82.54 admission style anchor not found');
const styleReplace='.uep-uni-admission-card.uep-admission-restricted{background:#fff!important;border-color:#d7dee8!important;box-shadow:none!important;opacity:1!important}.uep-uni-admission-card.uep-admission-unavailable{background:#fff!important;border-color:#d7dee8!important;box-shadow:none!important;opacity:1!important}.uep-uni-restricted-disclosure{margin-top:14px;border:1px solid #dbe3ec;border-radius:12px;background:#f8fafc;overflow:hidden}.uep-uni-restricted-disclosure>summary{list-style:none;cursor:pointer;padding:12px 14px;font-weight:800;display:flex;align-items:center;gap:8px}.uep-uni-restricted-disclosure>summary::-webkit-details-marker{display:none}.uep-uni-restricted-disclosure>summary span{margin-left:auto;font-size:12px;color:#64748b}.uep-uni-restricted-disclosure[open]>summary span{font-size:0}.uep-uni-restricted-disclosure[open]>summary span:after{content:"접기";font-size:12px}.uep-uni-restricted-grid{padding:0 12px 12px}.uep-admission-counsel-editor-layer{position:fixed!important;inset:0!important;z-index:20!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:20px!important;background:rgba(15,23,42,.34)!important}';
g=g.replace(styleNeedle,styleReplace);

g=g.replace(/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/,"const UEP_08221_RELEASE_NOTES=['0.82.55 · 대학전형 상담화면 후속 수정','경제배려·국가보훈·특수교육 등 개인 자격 전형은 지원자격 제한 영역으로 분류','학교장추천과 충청권 지역의사·지역인재처럼 운호고가 통상 충족하는 조건은 일반 교과·종합 그룹에 유지','지원자격 제한 전형은 기본 화면에서 접고 필요할 때 펼쳐서 확인','상담포인트 편집창을 오늘의 대학 레이어 내부 자식 팝업으로 변경해 부모 팝업 위에 안정적으로 표시','0.82.54의 대학상세·56A 상담포인트 DB 기능 유지'];");
fs.writeFileSync(gp,g);
console.log('patched 0.82.55 admission disclosure + counsel child layer');
