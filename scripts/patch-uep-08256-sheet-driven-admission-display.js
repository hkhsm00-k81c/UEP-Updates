const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const gp=path.join(root,'gyomuon.js'),pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};

must(/APP_VERSION\s*=\s*["']0\.82\.55["']/.test(g),'0.82.55 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.55["']/,'APP_VERSION = "0.82.56"');
g=g.replace(/const CURRENT='0\.82\.55';/g,"const CURRENT='0.82.56';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.56';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

const detailAnchor='function openDashboardUniversityDetail(university=dashboardAdmissionTodayUniversity()){' ;
must(g.includes(detailAnchor),'university detail anchor not found');
const helpers=`function uep08256AdmissionMeta(row){\n  const legacy=uep08255AdmissionEligibility(row);\n  const explicitGroup=String(row?.['UEP전형그룹']||'').trim();\n  const explicitRestricted=String(row?.['UEP자격제한']||'').trim().toUpperCase();\n  const support=String(row?.['UEP운호고지원']||'').trim();\n  const hasExplicit=!!(explicitGroup||explicitRestricted||support);\n  if(hasExplicit){\n    const group=/^(교과|종합|논술|기타)$/.test(explicitGroup)?explicitGroup:(/교과/.test(legacy.type)?'교과':/종합/.test(legacy.type)?'종합':/논술/.test(legacy.type)?'논술':'기타');\n    const restricted=explicitRestricted==='Y'||support==='불가';\n    return {...legacy,group,restricted,unavailable:support==='불가',support,explicit:true};\n  }\n  const group=/교과/.test(legacy.type)?'교과':/종합/.test(legacy.type)?'종합':/논술/.test(legacy.type)?'논술':'기타';\n  const combined=[legacy.type,legacy.name,legacy.eligibility].join(' ');\n  const unavailable=legacy.restricted&&/농어촌|서해\\s*5도|특성화고|마이스터고/.test(combined);\n  return {...legacy,group,unavailable,support:unavailable?'불가':'',explicit:false};\n}\nfunction uep08256AdmissionGroup(row){const info=uep08256AdmissionMeta(row);if(info.restricted)return 90;if(info.group==='교과')return 10;if(info.group==='종합')return 20;if(info.group==='논술')return 30;return 80;}\nfunction uep08256AdmissionCompare(a,b){const ga=uep08256AdmissionGroup(a),gb=uep08256AdmissionGroup(b);if(ga!==gb)return ga-gb;return dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b)||String(a?.['전형명']||'').localeCompare(String(b?.['전형명']||''),'ko');}\nfunction uep08256AdmissionCardClass(row){const info=uep08256AdmissionMeta(row);if(info.restricted)return ' uep-admission-restricted';if(info.group==='교과')return ' uep-admission-subject';if(info.group==='종합')return ' uep-admission-holistic';if(info.group==='논술')return ' uep-admission-essay';return ' uep-admission-other';}\nfunction uep08256AdmissionSupportBadge(row){return uep08256AdmissionMeta(row).unavailable?'<span class="uep-admission-unho-unavailable">운호고 지원대상 아님</span>':'';}\n`;
g=g.replace(detailAnchor,helpers+detailAnchor);

g=g.replace(/sort\(uep08255AdmissionCompare\)/g,'sort(uep08256AdmissionCompare)');
g=g.replace(/uep08255AdmissionCardClass\(r\)/g,'uep08256AdmissionCardClass(r)');
g=g.replace(/!uep08255AdmissionEligibility\(r\)\.restricted/g,'!uep08256AdmissionMeta(r).restricted');
g=g.replace(/uep08255AdmissionEligibility\(r\)\.restricted/g,'uep08256AdmissionMeta(r).restricted');

const badgeNeedle="<div class=\"uep-uni-badges\">'+uep08223UniversityBadges(r)+'</div><h4>";
must(g.includes(badgeNeedle),'admission badge renderer anchor not found');
g=g.replace(badgeNeedle,"<div class=\"uep-uni-badges\">'+uep08223UniversityBadges(r)+'</div>'+uep08256AdmissionSupportBadge(r)+'<h4>");

const styleNeedle='.uep-admission-counsel-editor-layer{position:fixed!important;inset:0!important;z-index:20!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:20px!important;background:rgba(15,23,42,.34)!important}';
must(g.includes(styleNeedle),'0.82.55 style anchor not found');
g=g.replace(styleNeedle,styleNeedle+'.uep-admission-unho-unavailable{display:inline-flex;align-items:center;margin:0 0 7px;padding:3px 7px;border:1px solid #d6dde7;border-radius:999px;background:#f8fafc;color:#64748b;font-size:11px;font-weight:700}');

g=g.replace(/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/,"const UEP_08221_RELEASE_NOTES=['0.82.56 · 53B 시트기반 대학전형 표시 기준 연결','53B의 UEP전형그룹·UEP자격제한·UEP운호고지원 값을 오늘의 대학 전형카드 표시 기준으로 우선 사용','교과→종합→논술 순서와 색상은 시트의 UEP전형그룹을 기준으로 표시','UEP자격제한=Y 전형은 지원자격 제한 접기영역으로 이동','UEP운호고지원=불가는 같은 접기영역 안에서 운호고 지원대상 아님으로만 표시','기존 행의 운영값이 비어있는 동안에는 0.82.55 분류를 임시 호환값으로 사용','0.82.55 상담포인트 자식 팝업 구조 유지'];");
fs.writeFileSync(gp,g);
console.log('patched 0.82.56 sheet-driven admission display');
