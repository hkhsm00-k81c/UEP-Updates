const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const gp=path.join(root,'gyomuon.js'),pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};

must(/APP_VERSION\s*=\s*["']0\.82\.57["']/.test(g),'0.82.57 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.57["']/,'APP_VERSION = "0.82.58"');
g=g.replace(/const CURRENT='0\.82\.57';/g,"const CURRENT='0.82.58';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.58';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

const metaRe=/function uep08257AdmissionMeta\(row\)\{[\s\S]*?function uep08257AdmissionSupportBadge\(row\)\{[\s\S]*?\}\n/;
must(metaRe.test(g),'0.82.57 admission meta block not found');
const helpers=`function uep08258AdmissionActive(row){\n  const raw=row?.['UEP활성']??row?.['UEP노출']??'Y';\n  return String(raw).trim().toUpperCase()!=='N';\n}\nfunction uep08258AdmissionMeta(row){\n  const legacy=uep08255AdmissionEligibility(row);\n  const explicitGroup=String(row?.['UEP전형그룹']||'').trim();\n  const explicitRestricted=String(row?.['UEP자격제한']||'').trim().toUpperCase();\n  const support=String(row?.['UEP운호고지원']||'').trim();\n  const type=String(legacy.type||'');\n  const fallbackGroup=/교과/.test(type)?'교과':/종합/.test(type)?'종합':/논술/.test(type)?'논술':/실기/.test(type)?'실기':/정시|수능/.test(type)?'정시':'기타';\n  const group=/^(교과|종합|논술|실기|정시|기타)$/.test(explicitGroup)?explicitGroup:fallbackGroup;\n  const combined=[legacy.type,legacy.name,legacy.eligibility].join(' ');\n  const legacyUnavailable=legacy.restricted&&/농어촌|서해\\s*5도|특성화고|마이스터고/.test(combined);\n  const unavailable=support==='불가'||(!support&&legacyUnavailable);\n  const restricted=explicitRestricted==='Y'||(!explicitRestricted&&legacy.restricted)||unavailable;\n  const primary=(group==='교과'||group==='종합')&&!restricted&&!unavailable;\n  return {...legacy,group,restricted,unavailable,support,primary,active:uep08258AdmissionActive(row),explicit:!!(explicitGroup||explicitRestricted||support)};\n}\nfunction uep08258AdmissionRank(row){const i=uep08258AdmissionMeta(row);if(i.primary&&i.group==='교과')return 10;if(i.primary&&i.group==='종합')return 20;if(i.group==='논술')return 30;if(i.group==='실기')return 40;if(i.group==='정시')return 50;if(i.restricted&&!i.unavailable)return 80;if(i.unavailable)return 90;return 70;}\nfunction uep08258AdmissionCompare(a,b){const ga=uep08258AdmissionRank(a),gb=uep08258AdmissionRank(b);if(ga!==gb)return ga-gb;return dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b)||String(a?.['전형명']||'').localeCompare(String(b?.['전형명']||''),'ko');}\nfunction uep08258AdmissionCardClass(row){const i=uep08258AdmissionMeta(row);if(i.group==='교과')return ' uep-admission-subject';if(i.group==='종합')return ' uep-admission-holistic';if(i.group==='논술')return ' uep-admission-essay';if(i.group==='정시')return ' uep-admission-regular';return ' uep-admission-other';}\nfunction uep08258AdmissionSupportBadge(row){const i=uep08258AdmissionMeta(row);if(i.unavailable)return '<span class="uep-admission-unho-unavailable">운호고 지원대상 아님</span>';if(i.restricted)return '<span class="uep-admission-restricted-badge">지원자격 확인</span>';return '';}\n`;
g=g.replace(metaRe,helpers);
g=g.replace(/uep08257AdmissionMeta/g,'uep08258AdmissionMeta');
g=g.replace(/uep08257AdmissionCompare/g,'uep08258AdmissionCompare');
g=g.replace(/uep08257AdmissionCardClass/g,'uep08258AdmissionCardClass');
g=g.replace(/uep08257AdmissionSupportBadge/g,'uep08258AdmissionSupportBadge');

const oldTypeGate="String(r['UEP노출']??'Y').toUpperCase()!=='N'";
must(g.includes(oldTypeGate),'legacy 53B UEP노출 gate not found');
g=g.split(oldTypeGate).join('uep08258AdmissionActive(r)');

const structureLine="const structures=dashboardAdmissionStructureRows().filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);";
must(g.includes(structureLine),'university 53B structure loader not found');
g=g.replace(structureLine,"const structures=dashboardAdmissionStructureRows().filter(r=>uep08258AdmissionActive(r)&&dashboardAdmissionNormalizeUniversity(r['대학명'])===norm);");

const primaryLine='  const primaryAdmissions=admissions.filter(r=>uep08258AdmissionMeta(r).primary);\n  const detailAdmissions=admissions.filter(r=>!uep08258AdmissionMeta(r).primary);';
must(g.includes(primaryLine),'0.82.57 admission split renderer not found after helper rename');
g=g.replace(primaryLine,"  const activeAdmissions=admissions.filter(uep08258AdmissionActive);\n  const primaryAdmissions=activeAdmissions.filter(r=>uep08258AdmissionMeta(r).primary);\n  const detailAdmissions=activeAdmissions.filter(r=>!uep08258AdmissionMeta(r).primary);");

must(!g.includes(oldTypeGate),'legacy exact-header active gate remains');
g=g.replace(/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/,"const UEP_08221_RELEASE_NOTES=['0.82.58 · 53B 전형 운영필드 표준화','53B N열은 UEP활성(Y/N) 의미로 통일하고 기존 UEP노출 헤더도 호환','UEP활성=N인 구행·대체행은 전형 이해와 오늘의 대학 모두 제외','UEP운호고지원은 가능/불가 2값으로 단순화','UEP자격제한=Y는 지원자격 확인 배지로 표시','운호고 지원불가 전형도 활성행이면 다른 전형 자세히 보기에서 확인','교과·종합 중심 기본 전형카드 및 상담포인트 구조 유지'];");
fs.writeFileSync(gp,g);
console.log('patched 0.82.58 admission active/support schema');
