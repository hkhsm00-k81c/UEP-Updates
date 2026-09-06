const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const gp=path.join(root,'gyomuon.js'),mp=path.join(root,'electron/main.cjs'),pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8'),m=fs.readFileSync(mp,'utf8');
const must=(v,msg)=>{if(!v)throw new Error(msg)};

must(/APP_VERSION\s*=\s*["']0\.82\.61["']/.test(g),'0.82.61 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.61["']/,'APP_VERSION = "0.82.62"');
g=g.replace(/const CURRENT='0\.82\.61';/g,"const CURRENT='0.82.62';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.62';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

// 53B now has explicit T=모집인원. Read the full standardized range in both the legacy/base read and admissions DB read.
const oldRange="'53B_전형유형별대학DB'!A1:S3000";
const newRange="'53B_전형유형별대학DB'!A1:T3000";
const rangeCount=m.split(oldRange).length-1;
must(rangeCount>=2,'53B A:S loader ranges not found');
m=m.split(oldRange).join(newRange);
must(!m.includes(oldRange),'old 53B A:S range remains');
must((m.split(newRange).length-1)>=2,'53B A:T range not applied to both loaders');
fs.writeFileSync(mp,m);

// Show explicit recruitment count only from the 53B field. Never parse count from note/description text.
const oldCard=`  const renderAdmissionCard=r=>'<article class="uep-uni-admission-card'+uep08261AdmissionCardClass(r)+'"><div class="uep-uni-badges">'+uep08223UniversityBadges(r)+'</div>'+uep08258AdmissionSupportBadge(r)+'<h4>'+escapeHtml(r['전형명']||'전형명 확인')+'</h4><p>'+escapeHtml(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r))+'</p></article>';`;
must(g.includes(oldCard),'0.82.61 admission card renderer not found');
const newCard=`  const renderAdmissionCard=r=>'<article class="uep-uni-admission-card'+uep08261AdmissionCardClass(r)+'"><div class="uep-uni-badges">'+uep08223UniversityBadges(r)+'</div>'+uep08258AdmissionSupportBadge(r)+(String(r['모집인원']??'').trim()&&!uep08258AdmissionMeta(r).unavailable?'<span class="uep-admission-count-badge">모집 '+escapeHtml(String(r['모집인원']).trim())+'명</span>':'')+'<h4>'+escapeHtml(r['전형명']||'전형명 확인')+'</h4><p>'+escapeHtml(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r))+'</p></article>';`;
g=g.replace(oldCard,newCard);

const cssAnchor='.uep-uni-restricted-grid{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))!important}';
must(g.includes(cssAnchor),'0.82.61 compact admission CSS anchor missing');
g=g.replace(cssAnchor,cssAnchor+'.uep-admission-count-badge{display:inline-flex;align-items:center;margin:0 0 7px 6px;padding:3px 7px;border:1px solid #b8a4e8;border-radius:999px;background:#faf7ff;color:#6f4fb5;font-size:11px;font-weight:800}');

g=g.replace(/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/,"const UEP_08221_RELEASE_NOTES=['0.82.62 · 입시 전형 데이터 정합성 및 지역의사 모집인원','53B 구형·중복 활성행을 정리해 한양대·건국대 등 동일 전형 중복카드를 제거','지역의사·지역인재의 운호고 구조적 지원 가능 여부를 53B UEP운호고지원 값으로 정리','53B에 모집인원 필드를 추가하고 공식 확인된 모집인원만 저장','오늘의 대학 전형카드는 53B 모집인원 값을 직접 읽어 모집 N명으로 표시하고 비고 문자열에서 인원을 추출하지 않음','53B 로더 범위를 A:T로 확장해 새 입시DB와 기존 안전폴백 모두 동일 데이터 계약을 사용','0.82.61의 공식 대전형 기반 탭·색상·간소화 카드 및 0.82.60 School Read 안전폴백 유지'];");
fs.writeFileSync(gp,g);
console.log('patched UEP 0.82.62 admission data/counts');
