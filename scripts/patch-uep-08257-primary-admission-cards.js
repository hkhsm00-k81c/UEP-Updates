const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const gp=path.join(root,'gyomuon.js'),pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};

must(/APP_VERSION\s*=\s*["']0\.82\.56["']/.test(g),'0.82.56 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.56["']/,'APP_VERSION = "0.82.57"');
g=g.replace(/const CURRENT='0\.82\.56';/g,"const CURRENT='0.82.57';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.57';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

const metaRe=/function uep08256AdmissionMeta\(row\)\{[\s\S]*?function uep08256AdmissionSupportBadge\(row\)\{[\s\S]*?\}\n/;
must(metaRe.test(g),'0.82.56 admission meta block not found');
const helpers=`function uep08257AdmissionMeta(row){\n  const legacy=uep08255AdmissionEligibility(row);\n  const explicitGroup=String(row?.['UEP전형그룹']||'').trim();\n  const explicitRestricted=String(row?.['UEP자격제한']||'').trim().toUpperCase();\n  const support=String(row?.['UEP운호고지원']||'').trim();\n  const type=String(legacy.type||'');\n  const fallbackGroup=/교과/.test(type)?'교과':/종합/.test(type)?'종합':/논술/.test(type)?'논술':/실기/.test(type)?'실기':/정시|수능/.test(type)?'정시':'기타';\n  const group=/^(교과|종합|논술|실기|정시|기타)$/.test(explicitGroup)?explicitGroup:fallbackGroup;\n  const combined=[legacy.type,legacy.name,legacy.eligibility].join(' ');\n  const legacyUnavailable=legacy.restricted&&/농어촌|서해\\s*5도|특성화고|마이스터고/.test(combined);\n  const unavailable=support==='불가'||(!support&&legacyUnavailable);\n  const restricted=explicitRestricted==='Y'||(!explicitRestricted&&legacy.restricted)||unavailable;\n  const primary=(group==='교과'||group==='종합')&&!restricted&&!unavailable;\n  return {...legacy,group,restricted,unavailable,support,primary,explicit:!!(explicitGroup||explicitRestricted||support)};\n}\nfunction uep08257AdmissionRank(row){const i=uep08257AdmissionMeta(row);if(i.primary&&i.group==='교과')return 10;if(i.primary&&i.group==='종합')return 20;if(i.group==='논술')return 30;if(i.group==='실기')return 40;if(i.group==='정시')return 50;if(i.restricted&&!i.unavailable)return 80;if(i.unavailable)return 90;return 70;}\nfunction uep08257AdmissionCompare(a,b){const ga=uep08257AdmissionRank(a),gb=uep08257AdmissionRank(b);if(ga!==gb)return ga-gb;return dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b)||String(a?.['전형명']||'').localeCompare(String(b?.['전형명']||''),'ko');}\nfunction uep08257AdmissionCardClass(row){const i=uep08257AdmissionMeta(row);if(i.group==='교과')return ' uep-admission-subject';if(i.group==='종합')return ' uep-admission-holistic';if(i.group==='논술')return ' uep-admission-essay';if(i.group==='정시')return ' uep-admission-regular';return ' uep-admission-other';}\nfunction uep08257AdmissionSupportBadge(row){const i=uep08257AdmissionMeta(row);if(i.unavailable)return '<span class="uep-admission-unho-unavailable">운호고 지원대상 아님</span>';if(i.restricted)return '<span class="uep-admission-restricted-badge">지원자격 확인</span>';return '';}\n`;
g=g.replace(metaRe,helpers);
g=g.replace(/sort\(uep08256AdmissionCompare\)/g,'sort(uep08257AdmissionCompare)');
g=g.replace(/uep08256AdmissionCardClass\(r\)/g,'uep08257AdmissionCardClass(r)');
g=g.replace(/uep08256AdmissionSupportBadge\(r\)/g,'uep08257AdmissionSupportBadge(r)');

const rendererRe=/  const ordinaryAdmissions=[\s\S]*?  const restrictedHtml=[^\n]*\n/;
must(rendererRe.test(g),'0.82.56 admission split renderer not found');
const renderer=`  const primaryAdmissions=admissions.filter(r=>uep08257AdmissionMeta(r).primary);\n  const detailAdmissions=admissions.filter(r=>!uep08257AdmissionMeta(r).primary);\n  const admissionHtml=primaryAdmissions.length?primaryAdmissions.map(renderAdmissionCard).join(''):'<p>학생부교과·학생부종합 주요 전형자료를 연결 중입니다.</p>';\n  const restrictedHtml=detailAdmissions.length?'<details class="uep-uni-restricted-disclosure uep-uni-more-admissions"><summary>다른 전형 자세히 보기 <b>'+detailAdmissions.length+'개</b><span>펼쳐보기</span></summary><div class="uep-uni-admission-grid uep-uni-restricted-grid">'+detailAdmissions.map(renderAdmissionCard).join('')+'</div></details>':'';\n`;
g=g.replace(rendererRe,renderer);

const styleAnchor='.uep-admission-unho-unavailable{display:inline-flex;align-items:center;margin:0 0 7px;padding:3px 7px;border:1px solid #d6dde7;border-radius:999px;background:#f8fafc;color:#64748b;font-size:11px;font-weight:700}';
must(g.includes(styleAnchor),'0.82.56 unavailable badge style not found');
const extra='.uep-uni-admission-card.uep-admission-regular{background:#fff8f1!important;border-color:#edc9a9!important}.uep-admission-restricted-badge{display:inline-flex;align-items:center;margin:0 0 7px;padding:3px 7px;border:1px solid #dcc89e;border-radius:999px;background:#fffaf0;color:#8a6426;font-size:11px;font-weight:700}';
g=g.replace(styleAnchor,styleAnchor+extra);

g=g.replace(/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/,"const UEP_08221_RELEASE_NOTES=['0.82.57 · 오늘의 대학 주요전형 화면 간소화','기본 화면에는 학생부교과와 학생부종합 일반전형만 표시','논술·실기·정시·지원자격 제한·운호고 지원불가 전형은 다른 전형 자세히 보기에서 확인','53B UEP전형그룹은 교과·종합·논술·실기·정시·기타를 지원','교과·종합·논술·정시는 서로 다른 카드 색으로 구분','UEP자격제한·UEP운호고지원 운영필드 우선 사용 및 기존 호환분류 유지','상담포인트 자식 팝업 구조 유지'];");
fs.writeFileSync(gp,g);
console.log('patched 0.82.57 primary admission cards');
