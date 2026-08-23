const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const appDir=path.join(appRoot,'resources','app');
const jsFile=path.join(appDir,'gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');

const versionRx=/const\s+APP_VERSION\s*=\s*['\"][^'\"]+['\"]\s*;/g;
if(!(s.match(versionRx)||[]).length) throw new Error('APP_VERSION declaration missing');
s=s.replace(versionRx,'const APP_VERSION = "0.81.33";');

const start='/* UEP_08133_CURRICULUM_SECURITY_START */';
const end='/* UEP_08133_CURRICULUM_SECURITY_END */';
const blockRx=new RegExp(start.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[\\s\\S]*?'+end.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g');
s=s.replace(blockRx,'');

const repair=String.raw`
${start}
(function(){
  if(typeof document==='undefined'||window.__UEP08133CurriculumSecurity) return;
  window.__UEP08133CurriculumSecurity=true;

  const curriculumData={
    '1-1':[
      ['국어','공통국어1','공통',4],['수학','공통수학1','공통',4],['영어','공통영어1','공통',4],['사회','한국사1','공통',3],['사회','통합사회1','공통',4],['과학','통합과학1','공통',4],['과학','과학탐구실험1','공통',1],['체육','체육1','일반(지정)',2],['예술','음악','일반(지정)',2],['기술·가정/정보','정보*','일반(지정)',3]
    ],
    '1-2':[
      ['국어','공통국어2','공통',4],['수학','공통수학2','공통',4],['영어','공통영어2','공통',4],['사회','한국사2','공통',3],['사회','통합사회2','공통',4],['과학','통합과학2','공통',4],['과학','과학탐구실험2','공통',1],['체육','체육2','일반(지정)',2],['예술','미술','일반(지정)',2],['제2외국어/한문','한문','일반(지정)',3]
    ],
    '2-1':[
      ['국어','문학','일반(지정)',4],['수학','대수*','일반(지정)',4],['영어','영어Ⅰ','일반(지정)',4],['체육','운동과 건강','진로(지정)',2],['예술','음악','일반(지정)',2],['기술·가정/정보','정보*','일반(지정)',3],
      ['국어','독서 토론과 글쓰기','융합(선택)',3],['영어','세계 문화와 영어','융합(선택)',3],['수학','인공지능 수학*','진로(선택)',3],['사회','세계사','일반(선택)',3],['사회','현대사회와 윤리','일반(선택)',3],['사회','도시의 미래 탐구','진로(선택)',3],['사회','경제','진로(선택)',3],['과학','물리학*','일반(선택)',3],['과학','화학','일반(선택)',3],['과학','생명과학','일반(선택)',3],['과학','지구과학','일반(선택)',3],['기술·가정/정보','인공지능 기초*','진로(선택)',3],['제2외국어/한문','중국어','일반(선택)',3],['제2외국어/한문','일본어','일반(선택)',3],['예술','음악 연주와 창작','진로(선택)',3],['예술','미술 창작','진로(선택)',3]
    ],
    '2-2':[
      ['국어','화법과 언어','일반(지정)',4],['수학','미적분Ⅰ*','일반(지정)',4],['영어','영어Ⅱ','일반(지정)',4],['체육','스포츠 문화','진로(지정)',2],['예술','미술','일반(지정)',2],['제2외국어/한문','한문','일반(지정)',3],
      ['국어','문학과 영상','진로(선택)',3],['영어','미디어 영어*','융합(선택)',3],['수학','기하*','진로(선택)',3],['사회','세계시민과 지리','일반(선택)',3],['사회','사회와 문화','일반(선택)',3],['사회','동아시아 역사 기행','진로(선택)',3],['사회','인문학과 윤리','진로(선택)',3],['과학','역학과 에너지','진로(선택)',3],['과학','물질과 에너지','진로(선택)',3],['과학','세포와 물질대사','진로(선택)',3],['과학','지구시스템과학','진로(선택)',3],['기술·가정/정보','정보과학*','진로(선택)',3],['제2외국어/한문','중국어 회화','진로(선택)',3],['제2외국어/한문','일본어 회화','진로(선택)',3],['예술','음악과 미디어','융합(선택)',3],['예술','미술과 매체','융합(선택)',3]
    ],
    '3-1':[
      ['국어','독서와 작문','일반(지정)',3],['수학','확률과 통계*','일반(지정)',3],['영어','영어 독해와 작문','일반(지정)',3],['체육','스포츠 과학','진로(지정)',1],
      ['국어','언어생활 탐구','융합(선택)',3],['수학','미적분Ⅱ*','진로(선택)',3],['영어','영미 문학 읽기','진로(선택)',3],['사회','한국지리 탐구','진로(선택)',3],['사회','정치','진로(선택)',3],['사회','법과 사회','진로(선택)',3],['사회','윤리와 사상','진로(선택)',3],['사회','역사로 탐구하는 현대세계','융합(선택)',3],['과학','역학과 에너지','진로(선택)',3],['과학','전자기와 양자','진로(선택)',3],['과학','물질과 에너지','진로(선택)',3],['과학','화학 반응의 세계','진로(선택)',3],['과학','세포와 물질대사','진로(선택)',3],['과학','생물의 유전','진로(선택)',3],['과학','지구시스템과학','진로(선택)',3],['과학','행성우주과학','진로(선택)',3],['기술·가정/정보','데이터 과학*','진로(선택)',3],['제2외국어/한문','심화 중국어','진로(선택)',3],['제2외국어/한문','심화 일본어','진로(선택)',3],['제2외국어/한문','한문 고전 읽기','진로(선택)',3]
    ],
    '3-2':[
      ['체육','스포츠 생활1','융합(지정)',2],['국어','주제 탐구 독서','진로(선택)',3],['국어','매체 의사소통','융합(선택)',3],['수학','전문수학*','진로(선택)',3],['수학','수학과 문화','융합(선택)',3],['영어','심화영어','진로(선택)',3],['영어','심화영어 독해와 작문','진로(선택)',3],['사회','여행지리','융합(선택)',3],['사회','사회문제탐구','융합(선택)',3],['사회','금융과 경제생활','융합(선택)',3],['사회','윤리문제탐구','융합(선택)',3],['과학','과학의 역사와 문화','융합(선택)',3],['과학','기후변화와 환경생태','융합(선택)',3],['과학','융합과학 탐구*','융합(선택)',3],['기술·가정/정보','소프트웨어와 생활*','융합(선택)',3],['제2외국어/한문','중국 문화','융합(선택)',3],['제2외국어/한문','일본 문화','융합(선택)',3],['제2외국어/한문','언어생활과 한자','융합(선택)',3]
    ]
  };

  const exactText=(el,t)=>String(el&&el.textContent||'').trim()===t;
  function privileged(){
    return [...document.querySelectorAll('header *,nav *,button,.badge,.chip,.pill')].some(el=>{
      const t=String(el.textContent||'').trim();
      return t==='관리자'||t==='학년부장';
    });
  }

  async function digest(v){
    const b=new TextEncoder().encode(v);
    const h=await crypto.subtle.digest('SHA-256',b);
    return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function secureUnlock(){
    if(!privileged()) return false;
    if(sessionStorage.getItem('uep_subject_security_unlocked')==='1') return true;
    const key='uep_subject_security_pin_hash';
    let saved=localStorage.getItem(key)||'';
    if(!saved){
      const p=prompt('과목별 신청현황은 대외비입니다. 이 기기에서 사용할 보안 PIN을 4자리 이상 설정하세요.');
      if(!p||p.length<4) return false;
      saved=await digest(p); localStorage.setItem(key,saved);
      alert('보안 PIN이 설정되었습니다. 다시 과목별 신청현황을 눌러 PIN을 입력하세요.');
      return false;
    }
    const p=prompt('대외비 과목별 신청현황 보안 PIN을 입력하세요.');
    if(!p) return false;
    if(await digest(p)!==saved){ alert('보안 PIN이 일치하지 않습니다.'); return false; }
    sessionStorage.setItem('uep_subject_security_unlocked','1');
    return true;
  }

  function curriculumHtml(){
    const sems=['1-1','1-2','2-1','2-2','3-1','3-2'];
    const cards=sems.map(sem=>{
      const rows=curriculumData[sem]||[];
      const groups={}; rows.forEach(r=>(groups[r[0]]||(groups[r[0]]=[])).push(r));
      const body=Object.entries(groups).map(([g,rs])=>'<div class="uep-curr-group"><b>'+g+'</b>'+rs.map(r=>'<div class="uep-curr-row"><span>'+r[1]+'</span><em>'+r[2]+' · '+r[3]+'학점</em></div>').join('')+'</div>').join('');
      return '<section class="uep-curr-sem"><h3>'+sem.replace('-','학년 ')+'학기</h3>'+body+'</section>';
    }).join('');
    return '<div class="uep-curr-plan"><div class="uep-curr-plan-head"><div><b>2026학년도 입학생 3개년 교육과정 편성표</b><p>학교교육과정DB 기준 · 학교지정 및 학생선택 과목 포함</p></div><span>2026 입학생</span></div><div class="uep-curr-grid">'+cards+'</div></div>';
  }

  function restoreAfterTabs(row,panel){
    if(!row||!row.parentElement) return;
    let n=row.nextElementSibling;
    while(n){ if(n!==panel && n.dataset.uep08133Hidden==='1'){n.style.display=n.dataset.uep08133Display||'';delete n.dataset.uep08133Hidden;delete n.dataset.uep08133Display;} n=n.nextElementSibling; }
    if(panel) panel.style.display='none';
  }
  function showCurriculum(row,panel){
    if(!row||!row.parentElement) return;
    let n=row.nextElementSibling;
    while(n){ if(n!==panel && n.dataset.uep08133Hidden!=='1'){n.dataset.uep08133Hidden='1';n.dataset.uep08133Display=n.style.display||'';n.style.display='none';} n=n.nextElementSibling; }
    panel.style.display='block';
  }

  function ensureCurriculumTabs(){
    const buttons=[...document.querySelectorAll('button,[role="button"]')];
    const student=buttons.find(el=>exactText(el,'학생신청'));
    const subject=buttons.find(el=>exactText(el,'과목별 신청현황'));
    if(!student||!subject||student.dataset.uep08133Wired==='1') return;
    const row=student.parentElement;
    if(!row||row!==subject.parentElement) return;
    student.dataset.uep08133Wired='1'; subject.dataset.uep08133Wired='1';

    const plan=document.createElement('button');
    plan.type='button'; plan.textContent='교육과정 편성표'; plan.className=student.className; plan.dataset.uep08133Plan='1';
    row.insertBefore(plan,student);
    const panel=document.createElement('div'); panel.dataset.uep08133PlanPanel='1'; panel.innerHTML=curriculumHtml(); panel.style.display='none';
    row.parentElement.insertBefore(panel,row.nextSibling);

    plan.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();showCurriculum(row,panel);},true);
    student.addEventListener('click',()=>restoreAfterTabs(row,panel),true);

    if(!privileged()){
      subject.style.display='none'; subject.setAttribute('aria-hidden','true'); subject.dataset.uepRestricted='1';
    }else{
      subject.title='대외비 · 추가 보안 인증 필요';
      subject.addEventListener('click',async ev=>{
        if(sessionStorage.getItem('uep_subject_security_unlocked')==='1'){restoreAfterTabs(row,panel);return;}
        ev.preventDefault();ev.stopImmediatePropagation();
        if(await secureUnlock()){ restoreAfterTabs(row,panel); setTimeout(()=>subject.click(),0); }
      },true);
    }
  }

  // Convert the subject detail modal into a right-side confidential panel without changing its data/query logic.
  function styleSubjectPanel(){
    const dialogs=[...document.querySelectorAll('[role="dialog"],.modal,.dialog,.popup')].filter(el=>el.offsetParent!==null);
    const d=dialogs.find(el=>/학사여부/.test(el.textContent||'')&&/예상등수/.test(el.textContent||'')&&/예상등급/.test(el.textContent||''));
    if(!d||d.dataset.uep08133Side==='1') return;
    d.dataset.uep08133Side='1'; d.classList.add('uep-subject-side-panel');
    const overlay=d.parentElement;
    if(overlay){overlay.style.alignItems='stretch';overlay.style.justifyContent='flex-end';}
  }

  // Calendar: 2026-08-24~09-04 are ordinary school weekdays. Remove only the false holiday badges in this displayed interval.
  function cleanupFalseHolidayBadges(){
    if(!/2026\s*년\s*8\s*월|2026년 8월|8월 24일/.test(document.body.innerText||'')) return;
    [...document.querySelectorAll('*')].filter(el=>String(el.textContent||'').trim()==='공휴일').forEach(b=>{
      const cell=b.closest('td,[role="gridcell"],.calendar-day,.day-cell,.calendar-cell')||b.parentElement;
      if(!cell) return;
      const nums=[...cell.querySelectorAll('*')].map(x=>String(x.textContent||'').trim()).filter(x=>/^\d{1,2}$/.test(x)).map(Number);
      const d=nums.find(n=>n>=24&&n<=31)||nums.find(n=>n>=1&&n<=4);
      if(d!==undefined) b.style.display='none';
    });
    const now=new Date();
    if(now.getFullYear()===2026&&now.getMonth()===7&&now.getDate()>=24){
      const nodes=[...document.querySelectorAll('button,[role="button"],.chip,.pill,.seg-btn')];
      const regular=nodes.find(el=>/정규\s*시간/.test(String(el.textContent||'').trim()));
      const holiday=nodes.find(el=>/공휴\s*시간/.test(String(el.textContent||'').trim()));
      if(regular&&holiday&&(holiday.classList.contains('active')||holiday.classList.contains('selected')||holiday.getAttribute('aria-pressed')==='true')) regular.click();
    }
  }

  const obs=new MutationObserver(()=>{ensureCurriculumTabs();styleSubjectPanel();cleanupFalseHolidayBadges();});
  obs.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('DOMContentLoaded',()=>{ensureCurriculumTabs();styleSubjectPanel();cleanupFalseHolidayBadges();});
  setTimeout(()=>{ensureCurriculumTabs();styleSubjectPanel();cleanupFalseHolidayBadges();},300);
  setTimeout(()=>{ensureCurriculumTabs();styleSubjectPanel();cleanupFalseHolidayBadges();},1200);
})();
${end}
`;

s+='\n'+repair+'\n';
fs.writeFileSync(jsFile,s,'utf8');

const cssFile=fs.existsSync(path.join(appDir,'gyomuon.css'))?path.join(appDir,'gyomuon.css'):path.join(appDir,'style.css');
let c=fs.readFileSync(cssFile,'utf8');
c+='\n/* UEP 0.81.33 curriculum/security */\n.uep-curr-plan{margin-top:16px}.uep-curr-plan-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border:1px solid #d8e6e6;border-radius:16px;background:#fff}.uep-curr-plan-head b{font-size:18px}.uep-curr-plan-head p{margin:5px 0 0;color:#71848a}.uep-curr-plan-head span{padding:7px 11px;border-radius:999px;background:#e8f6f2;color:#147765;font-weight:700}.uep-curr-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:14px}.uep-curr-sem{padding:16px;border:1px solid #d8e6e6;border-radius:15px;background:#fff}.uep-curr-sem h3{margin:0 0 12px}.uep-curr-group{margin-top:10px;padding-top:9px;border-top:1px solid #edf2f2}.uep-curr-group>b{display:block;margin-bottom:5px;color:#2f6570}.uep-curr-row{display:flex;justify-content:space-between;gap:10px;padding:4px 0}.uep-curr-row em{font-style:normal;color:#859398;font-size:12px;white-space:nowrap}.uep-subject-side-panel{position:fixed!important;right:0!important;top:0!important;bottom:0!important;left:auto!important;width:min(760px,48vw)!important;max-width:92vw!important;height:100vh!important;max-height:none!important;margin:0!important;border-radius:18px 0 0 18px!important;overflow:auto!important;z-index:10002!important;box-shadow:-18px 0 48px rgba(20,45,50,.18)!important}@media(max-width:1100px){.uep-curr-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.uep-subject-side-panel{width:min(720px,72vw)!important}}\n';
fs.writeFileSync(cssFile,c,'utf8');

const written=fs.readFileSync(jsFile,'utf8');
for(const marker of ['const APP_VERSION = "0.81.33";','UEP_08133_CURRICULUM_SECURITY_START','교육과정 편성표','uep_subject_security_pin_hash','uep-subject-side-panel','cleanupFalseHolidayBadges()']) if(!written.includes(marker)) throw new Error('0.81.33 marker missing: '+marker);
console.log('UEP 0.81.33 curriculum/security patch applied.');
