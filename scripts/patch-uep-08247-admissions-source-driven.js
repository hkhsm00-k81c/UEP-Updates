const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};

must(/APP_VERSION\s*=\s*["']0\.82\.46["']/.test(g),'0.82.46 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.46["']/,'APP_VERSION = "0.82.47"').replace(/const CURRENT='0\.82\.46';/g,"const CURRENT='0.82.47';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.47';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

// 53B is the structure source of truth: one visible row = one card. Never infer tracks from punctuation.
const admissionRe=/const admissionHtml=admissions\.length\?[\s\S]*?:'<p>대학별 전형구조 자료를 연결 중입니다\.<\/p>';\s*/;
must(admissionRe.test(g),'admission renderer not found');
const renderer=`const visibleAdmissions=admissions.filter(r=>String(r['UEP노출']||'Y').trim().toUpperCase()!=='N');
  const admissionHtml=visibleAdmissions.length?visibleAdmissions.slice(0,24).map(r=>{const name=String(r['전형명']||r['전형유형']||r['대전형']||'전형명 확인').trim();const major=String(r['대전형']||r['전형유형']||'').trim();const method=String(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r)||'').trim();const minimum=String(r['수능최저']||r['수능최저원문']||'').trim();const badges=[];if(major)badges.push('<span>'+escapeHtml(major)+'</span>');if(/면접/.test(method))badges.push('<span>면접</span>');if(minimum){if(/미적용|없음|해당없음/.test(minimum))badges.push('<span>최저 없음</span>');else if(/학과만|일부|특정|외 미적용|그 외 미적용/.test(minimum))badges.push('<span>최저 일부</span>');else badges.push('<span>최저 O</span>');}return '<article class="uep-uni-admission-card"><div class="uep-uni-badges">'+badges.join('')+'</div><h4>'+escapeHtml(name)+'</h4><p>'+escapeHtml(method)+'</p></article>';}).join(''):'<p>대학별 전형구조 자료를 연결 중입니다.</p>';
  `;
g=g.replace(admissionRe,()=>renderer);

// Restore the shared one-time release-note mechanism instead of adding another per-version popup.
const notesRe=/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/;
must(notesRe.test(g),'shared release notes list not found');
g=g.replace(notesRe,`const UEP_08221_RELEASE_NOTES=[
  '대학 전형카드는 53B의 실제 전형 1행을 그대로 1카드로 표시하며 · / 같은 문장부호로 전형을 추측 분리하지 않습니다.',
  '청주대학교 검증 기준을 전체 대학 DB에 적용하기 시작하고, 중복된 전형공통 요약행은 상세 검증행이 있는 경우 UEP 노출에서 제외했습니다.',
  '수능최저는 대학 전체가 아니라 실제 전형과 모집단위의 적용범위를 기준으로 표시합니다.',
  '내신성적 산출방법과 권장·전공연계과목은 공식 자료의 원문 의미를 보존하고 읽기 좋게 재배치하는 원칙으로 전환했습니다.',
  '새 버전 수정사항 팝업을 공통 1회 표시 로직으로 복구했습니다.'
];`);
const bootOld='function uep08221BootReleaseUx(){uep08221EnsureVersionBadge();}';
must(g.includes(bootOld),'shared release UX boot function not found');
g=g.replace(bootOld,"function uep08221BootReleaseUx(){uep08221EnsureVersionBadge();setTimeout(uep08221ShowReleaseNotes,900);}");

g+='\n/* UEP_08247_SOURCE_DRIVEN_ADMISSIONS: 53B one-row-one-card + UEP노출 gate + shared release notes restored */\n';
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.47 patch PASS');
