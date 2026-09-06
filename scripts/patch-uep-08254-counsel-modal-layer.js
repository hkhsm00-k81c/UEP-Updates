const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const gp=path.join(root,'gyomuon.js'),pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};

must(/APP_VERSION\s*=\s*["']0\.82\.53["']/.test(g),'0.82.53 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.53["']/,'APP_VERSION = "0.82.54"');
g=g.replace(/const CURRENT='0\.82\.\d+';/g,"const CURRENT='0.82.54';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.54';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

const counselOld="layer.className='counsel-reason-layer uep-admission-counsel-editor-layer';";
must(g.includes(counselOld),'counsel editor layer anchor not found');
g=g.replace(counselOld,"layer.className='counsel-reason-layer uep-admission-counsel-editor-layer';layer.style.position='fixed';layer.style.inset='0';layer.style.zIndex='2147483000';");

const detailAnchor='function openDashboardUniversityDetail(university=dashboardAdmissionTodayUniversity()){' ;
must(g.includes(detailAnchor),'university detail anchor not found');
const helpers=`function uep08254AdmissionText(row,keys){return keys.map(k=>String(row?.[k]||'').trim()).filter(Boolean).join(' ');}\nfunction uep08254AdmissionEligibility(row){\n  const type=uep08254AdmissionText(row,['전형유형','대전형','전형구분']);\n  const name=String(row?.['전형명']||'').trim();\n  const eligibility=uep08254AdmissionText(row,['지원자격구분','지원자격','지원자격요약','지원대상','자격제한','지원자격제한','특별전형구분','세부유형']);\n  const explicit=uep08254AdmissionText(row,['운호고지원여부','UEP지원가능여부','지원가능여부']);\n  const schoolRecommendation=/학교장\\s*추천|교장\\s*추천/.test(eligibility+' '+name);\n  const impossible=/지원\\s*불가|불가/.test(explicit)||/농어촌|서해\\s*5도|특성화고|마이스터고/.test(eligibility+' '+name);\n  const restricted=!schoolRecommendation&&(impossible||/지역인재|기회균형|고른기회|사회통합|국가보훈|보훈대상|기초생활|차상위|한부모|다문화|북한이탈|특수교육|장애|재직자|만학도/.test(eligibility));\n  return {type,name,eligibility,schoolRecommendation,restricted,impossible};\n}\nfunction uep08254AdmissionGroup(row){const info=uep08254AdmissionEligibility(row);if(info.restricted)return 90;const t=info.type;if(/교과/.test(t))return 10;if(/종합/.test(t))return 20;if(/논술/.test(t))return 30;return 80;}\nfunction uep08254AdmissionCompare(a,b){const ga=uep08254AdmissionGroup(a),gb=uep08254AdmissionGroup(b);if(ga!==gb)return ga-gb;return dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b)||String(a?.['전형명']||'').localeCompare(String(b?.['전형명']||''),'ko');}\nfunction uep08254AdmissionCardClass(row){const info=uep08254AdmissionEligibility(row);if(info.impossible)return ' uep-admission-unavailable';if(info.restricted)return ' uep-admission-restricted';if(/교과/.test(info.type))return ' uep-admission-subject';if(/종합/.test(info.type))return ' uep-admission-holistic';if(/논술/.test(info.type))return ' uep-admission-essay';return ' uep-admission-other';}\nfunction uep08254AdmissionEligibilityBadge(row){const info=uep08254AdmissionEligibility(row);if(info.impossible)return '<span class="uep-uni-badge uep-eligibility-unavailable">운호고 지원불가</span>';if(info.restricted)return '<span class="uep-uni-badge uep-eligibility-restricted">지원자격 제한</span>';return '';}\n`;
g=g.replace(detailAnchor,helpers+detailAnchor);

const admissionsOld="  const admissions=structures.length?structures:minimums;";
must(g.includes(admissionsOld),'admission rows anchor not found');
g=g.replace(admissionsOld,"  const admissions=[...(structures.length?structures:minimums)].sort(uep08254AdmissionCompare);");

const cardOpen='<article class="uep-uni-admission-card">';
must(g.includes(cardOpen),'admission card element anchor not found');
g=g.replace(cardOpen,'<article class="uep-uni-admission-card\'+uep08254AdmissionCardClass(r)+\'">');
const badgeOpen="uep08223UniversityBadges(r)+'</div><h4>";
must(g.includes(badgeOpen),'admission badge anchor not found');
g=g.replace(badgeOpen,"uep08223UniversityBadges(r)+uep08254AdmissionEligibilityBadge(r)+'</div><h4>");

const styleNeedle='.uep-admission-counsel-editor .actions .primary{background:#0f5f9a;color:#fff;border-color:#0f5f9a}@media(max-width:1180px)';
must(g.includes(styleNeedle),'university style anchor not found');
const admissionStyles='.uep-uni-admission-card{border-width:1px!important;border-style:solid!important}.uep-uni-admission-card.uep-admission-subject{background:#f4f8ff!important;border-color:#bfd4f4!important}.uep-uni-admission-card.uep-admission-holistic{background:#f3faf6!important;border-color:#bddfc9!important}.uep-uni-admission-card.uep-admission-essay{background:#faf5ff!important;border-color:#d9c2ef!important}.uep-uni-admission-card.uep-admission-restricted{background:#fff9ed!important;border-color:#ead19a!important}.uep-uni-admission-card.uep-admission-unavailable{background:#fff2f2!important;border-color:#e6b2b2!important;opacity:.92}.uep-eligibility-restricted{background:#fff0c7!important;color:#7a5100!important;border-color:#e1c06e!important}.uep-eligibility-unavailable{background:#fbe1e1!important;color:#8a2424!important;border-color:#e0aaaa!important}';
g=g.replace(styleNeedle,'.uep-admission-counsel-editor .actions .primary{background:#0f5f9a;color:#fff;border-color:#0f5f9a}'+admissionStyles+'@media(max-width:1180px)');

g=g.replace(/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/,"const UEP_08221_RELEASE_NOTES=['0.82.54 · 대학전형 카드 정렬·구분 개선','교과 → 종합 → 논술 → 개인 지원자격 제한 순으로 대학 전형카드를 정렬','교과·종합·논술·지원자격 제한을 카드 색으로 구분하고 농어촌·서해5도·특성화고 등 운호고 구조적 지원불가 전형은 별도 표시','학교장추천은 학생 개인 자격제한으로 분류하지 않음','상담포인트 편집 팝업이 오늘의 대학 팝업 위에 정상 표시되도록 레이어 수정','상단 버전 표시는 실제 실행 버전을 기준으로 정상화'];");
fs.writeFileSync(gp,g);
console.log('patched 0.82.54 admission cards + counsel modal + version pill');
