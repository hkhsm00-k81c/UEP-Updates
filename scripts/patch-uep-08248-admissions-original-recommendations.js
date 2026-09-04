const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const mp=path.join(root,'resources','app','electron','main.cjs');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
let m=fs.readFileSync(mp,'utf8');
const must=(v,msg)=>{if(!v)throw new Error(msg)};

must(/APP_VERSION\s*=\s*["']0\.82\.47["']/.test(g),'0.82.47 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.47["']/,'APP_VERSION = "0.82.48"').replace(/const CURRENT='0\.82\.47';/g,"const CURRENT='0.82.48';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.48';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

// 58_권장과목DB: official-source-only recommendation rows.
const rangeNeedle='["57_내신산정DB", "\'57_내신산정DB\'!A1:Y1200"],';
must(m.includes(rangeNeedle),'57 range anchor not found');
m=m.replace(rangeNeedle,rangeNeedle+'\n    ["58_권장과목DB", "\'58_권장과목DB\'!A1:P2000"],');

const gradeAssign="  data.admissionGradeCalcs=uep08210MatrixObjects(matrices['57_내신산정DB']);";
must(m.includes(gradeAssign),'admissionGradeCalcs assignment anchor not found');
m=m.replace(gradeAssign,gradeAssign+"\n  data.admissionRecommendations=uep08210MatrixObjects(matrices['58_권장과목DB']);");
const gradeAlias="  data['57_내신산정DB']=data.admissionGradeCalcs;";
must(m.includes(gradeAlias),'57 alias anchor not found');
m=m.replace(gradeAlias,gradeAlias+"\n  data['58_권장과목DB']=data.admissionRecommendations;");

// One 53B row remains one card; expose official support/eligibility underneath the selection method.
const admissionRe=/const admissionHtml=visibleAdmissions\.length\?visibleAdmissions\.slice\(0,24\)\.map\(r=>\{[\s\S]*?\}\)\.join\(''\):'<p>대학별 전형구조 자료를 연결 중입니다\.<\/p>';\s*/;
must(admissionRe.test(g),'0.82.47 admission renderer not found');
const renderer=`const admissionHtml=visibleAdmissions.length?visibleAdmissions.slice(0,24).map(r=>{const name=String(r['전형명']||r['전형유형']||r['대전형']||'전형명 확인').trim();const major=String(r['대전형']||r['전형유형']||'').trim();const method=String(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r)||'').trim();const eligibility=String(r['추천/지원조건']||'').trim();const minimum=String(r['수능최저']||r['수능최저원문']||'').trim();const badges=[];if(major)badges.push('<span>'+escapeHtml(major)+'</span>');if(/면접/.test(method))badges.push('<span>면접</span>');if(minimum){if(/미적용|없음|해당없음/.test(minimum))badges.push('<span>최저 없음</span>');else if(/학과만|일부|특정|외 미적용|그 외 미적용/.test(minimum))badges.push('<span>최저 일부</span>');else badges.push('<span>최저 O</span>');}return '<article class="uep-uni-admission-card"><div class="uep-uni-badges">'+badges.join('')+'</div><h4>'+escapeHtml(name)+'</h4><p>'+escapeHtml(method)+'</p>'+(eligibility?'<small class="uep-uni-admission-eligibility"><b>지원조건</b> · '+escapeHtml(eligibility)+'</small>':'')+'</article>';}).join(''):'<p>대학별 전형구조 자료를 연결 중입니다.</p>';
  `;
g=g.replace(admissionRe,()=>renderer);

// Recommendations come from 58, not from interpreted master-card prose.
const calcAnchor="  const calc=calcs.find(r=>String(r['검증상태']||'').startsWith('A-'))||calcs[0]||null;";
must(g.includes(calcAnchor),'calculation anchor not found');
g=g.replace(calcAnchor,calcAnchor+"\n  const recommendations=dashboardAdmissionRows('admissionRecommendations','58_권장과목DB').filter(r=>dashboardAdmissionNormalizeUniversity(r['대학명'])===norm&&String(r['UEP노출']||'Y').trim().toUpperCase()!=='N');");

const oldCourse=/  const course=String\(university\['과목선택\/교과포인트'\]\|\|''\)\.trim\(\);\s*\n  const courseHtml=course\?'<div class="uep-uni-course-copy">'\+escapeHtml\(course\)\+'<\/div>':'<div class="uep-uni-detail-pending"><b>공식 권장과목 확인중<\/b><span>대학이 공식적으로 제시한 권장·핵심·관련 과목만 표시합니다\.<\/span><\/div>';/;
must(oldCourse.test(g),'old master-based recommendation renderer not found');
const newCourse=`  const courseHtml=recommendations.length?recommendations.slice(0,18).map(r=>{const kind=String(r['구분']||'권장과목').trim()||'권장과목';const subjects=String(r['과목']||'').trim();const original=String(r['원문']||'').trim();const value=original||subjects||'공식 자료에 별도 과목 제시 없음';return '<div class="uep-uni-detail-line uep-uni-recommend-line"><b>'+escapeHtml(kind)+'</b><span>'+escapeHtml(value)+(subjects&&original&&subjects!==original?'<small>'+escapeHtml(subjects)+'</small>':'')+'</span></div>';}).join(''):'<div class="uep-uni-detail-pending"><b>공식 권장과목 자료 미연결</b><span>58_권장과목DB에 공식 원문이 연결된 대학만 표시합니다.</span></div>';`;
g=g.replace(oldCourse,newCourse);

const notesRe=/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/;
must(notesRe.test(g),'shared release notes list not found');
g=g.replace(notesRe,`const UEP_08221_RELEASE_NOTES=[
  '청주대학교 학생부 교과 반영과목을 시행계획 원문대로 공통 6과목 + 선택 9과목, 예체능 공통 4과목 + 선택 11과목으로 표시합니다.',
  '충북대학교 학생부교과전형과 지역인재전형을 별도 카드로 분리하고, 지역인재 지원지역인 충북·세종·대전·충남을 카드에서 바로 확인할 수 있게 했습니다.',
  '한국외국어대학교 학교장추천·학종 면접형·SW인재·서류형·기회균형·논술을 실제 전형별 카드로 분리했습니다.',
  '58_권장과목DB를 신설 연결하여 대학 공식 자료의 권장·핵심·전공연계과목 원문만 표시합니다. 별도 제시가 없으면 미제시 사실을 그대로 보여줍니다.',
  '수능최저 normalized/raw 분리와 53B 실제 전형 1행=1카드 원칙은 그대로 유지합니다.'
];`);

g+='\n/* UEP_08248_ORIGINAL_ADMISSIONS: 58 official recommendations + eligibility on cards + source-original calculation display */\n';
fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(mp,m,'utf8');
console.log('UEP 0.82.48 patch PASS');
