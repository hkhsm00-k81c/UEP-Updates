const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const jsFile=path.join(appRoot,'resources','app','gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');
const versionRx=/const\s+APP_VERSION\s*=\s*['\"][^'\"]+['\"]\s*;/g;
if(!(s.match(versionRx)||[]).length) throw new Error('APP_VERSION declaration missing');
s=s.replace(versionRx,'const APP_VERSION = "0.81.34";');
for(const [a,b] of [['/* UEP_08133_CURRICULUM_SECURITY_START */','/* UEP_08133_CURRICULUM_SECURITY_END */'],['/* UEP_08134_CURRICULUM_SECURITY_START */','/* UEP_08134_CURRICULUM_SECURITY_END */']]){
  const esc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  s=s.replace(new RegExp(esc(a)+'[\\s\\S]*?'+esc(b),'g'),'');
}
const start='/* UEP_08134_CURRICULUM_SECURITY_START */';
const end='/* UEP_08134_CURRICULUM_SECURITY_END */';
const repair=String.raw`
${start}
(function(){
 if(typeof document==='undefined'||window.__UEP08134CurriculumSecurity)return;
 window.__UEP08134CurriculumSecurity=true;
 const PIN_KEY='uep_subject_confidential_pin_hash_v2';
 const SESSION_KEY='uep_subject_confidential_unlocked_v2';
 const exact=(el,t)=>String(el&&el.textContent||'').trim()===t;
 function privileged(){
   return [...document.querySelectorAll('header *,nav *,button,.badge,.chip,.pill')].some(el=>['관리자','학년부장'].includes(String(el.textContent||'').trim()));
 }
 async function digest(v){const b=new TextEncoder().encode(v);const h=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 async function unlockSubjectConfidential(){
   if(!privileged())return false;
   if(sessionStorage.getItem(SESSION_KEY)==='1')return true;
   const saved=localStorage.getItem(PIN_KEY)||'';
   if(!saved){alert('설정에서 선택과목 대외비 비밀번호를 먼저 설정해 주세요.');return false;}
   const p=prompt('선택과목 대외비 비밀번호를 입력하세요.');if(!p)return false;
   if(await digest(p)!==saved){alert('선택과목 대외비 비밀번호가 일치하지 않습니다.');return false;}
   sessionStorage.setItem(SESSION_KEY,'1');return true;
 }
 function block(title,pick,items){return '<section class="uep134-block"><div class="uep134-block-head"><b>'+title+'</b>'+(pick?'<span>'+pick+'</span>':'')+'</div><div class="uep134-chips">'+items.map(x=>'<span>'+x+'</span>').join('')+'</div></section>';}
 const plan={
  '1-1':[block('공통·학교지정','', ['공통국어1','공통수학1','공통영어1','한국사1','통합사회1','통합과학1','과학탐구실험1','체육1','음악','정보*'])],
  '1-2':[block('공통·학교지정','', ['공통국어2','공통수학2','공통영어2','한국사2','통합사회2','통합과학2','과학탐구실험2','체육2','미술','한문'])],
  '2-1':[block('공통·학교지정','',['문학','대수*','영어Ⅰ','운동과 건강','음악','정보*']),block('탐구·교과 선택','택3',['독서 토론과 글쓰기','세계 문화와 영어','인공지능 수학*','세계사','현대사회와 윤리','도시의 미래 탐구','경제','물리학*','화학','생명과학','지구과학']),block('제2외국어·정보','택1',['중국어','일본어','인공지능 기초*']),block('예술','택1',['음악 연주와 창작','미술 창작'])],
  '2-2':[block('공통·학교지정','',['화법과 언어','미적분Ⅰ*','영어Ⅱ','스포츠 문화','미술','한문']),block('탐구·교과 선택','택3',['문학과 영상','미디어 영어*','기하*','세계시민과 지리','사회와 문화','동아시아 역사 기행','인문학과 윤리','역학과 에너지','물질과 에너지','세포와 물질대사','지구시스템과학']),block('제2외국어·정보','택1',['중국어 회화','일본어 회화','정보과학*']),block('예술','택1',['음악과 미디어','미술과 매체'])],
  '3-1':[block('공통·학교지정','',['독서와 작문','확률과 통계*','영어 독해와 작문','스포츠 과학']),block('전공심화 선택','택5',['언어생활 탐구','미적분Ⅱ*','영미 문학 읽기','한국지리 탐구','정치','법과 사회','윤리와 사상','역사로 탐구하는 현대세계','역학과 에너지','전자기와 양자','물질과 에너지','화학 반응의 세계','세포와 물질대사','생물의 유전','지구시스템과학','행성우주과학']),block('제2외국어·정보','택1',['데이터 과학*','심화 중국어','심화 일본어','한문 고전 읽기'])],
  '3-2':[block('공통·학교지정','',['스포츠 생활1']),block('전공심화 선택','택7',['주제 탐구 독서','매체 의사소통','전문수학*','수학과 문화','심화영어','심화영어 독해와 작문','여행지리','사회문제탐구','금융과 경제생활','윤리문제탐구','과학의 역사와 문화','기후변화와 환경생태','융합과학 탐구*']),block('제2외국어·정보','택1',['소프트웨어와 생활*','중국 문화','일본 문화','언어생활과 한자'])]
 };
 function planHtml(){return '<div class="uep134-plan"><div class="uep134-title"><b>2026학년도 입학생 3개년 교육과정 편성표</b><span>학교교육과정DB 기준</span></div>'+Object.entries(plan).map(([sem,blocks])=>'<section class="uep134-sem"><h3>'+sem.replace('-','학년 ')+'학기</h3><div class="uep134-blocks">'+blocks.join('')+'</div></section>').join('')+'</div>';}
 function setActive(btns,active){btns.forEach(b=>{b.style.background=b===active?'#0b8a78':'';b.style.color=b===active?'#fff':'';});}
 function ensureTabs(){
   const bs=[...document.querySelectorAll('button,[role="button"]')];
   const student=bs.find(x=>exact(x,'학생신청')); const subject=bs.find(x=>exact(x,'과목별 신청현황')); if(!student||!subject)return;
   const row=student.parentElement;if(!row||row!==subject.parentElement)return;
   row.style.display='grid';row.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';row.style.gap='10px';
   let planBtn=row.querySelector('[data-uep134-plan]');if(!planBtn){planBtn=student.cloneNode(true);planBtn.dataset.uep134Plan='1';planBtn.textContent='교육과정 편성표';row.insertBefore(planBtn,student);}
   [planBtn,student,subject].forEach(b=>{b.style.width='100%';b.style.margin='0';});
   if(!privileged()){subject.disabled=true;subject.setAttribute('aria-disabled','true');subject.title='관리자·학년부장 전용 대외비';subject.style.opacity='.48';subject.style.cursor='not-allowed';subject.textContent='🔒 과목별 신청현황';}
   if(row.dataset.uep134Wired==='1')return;row.dataset.uep134Wired='1';
   let panel=row.parentElement.querySelector('[data-uep134-plan-panel]');if(!panel){panel=document.createElement('div');panel.dataset.uep134PlanPanel='1';panel.innerHTML=planHtml();row.insertAdjacentElement('afterend',panel);panel.style.display='none';}
   function hideContent(showPlan){let n=panel.nextElementSibling;while(n){if(showPlan){if(n.dataset.uep134OldDisplay===undefined)n.dataset.uep134OldDisplay=n.style.display||'';n.style.display='none';}else if(n.dataset.uep134OldDisplay!==undefined){n.style.display=n.dataset.uep134OldDisplay;delete n.dataset.uep134OldDisplay;}n=n.nextElementSibling;}panel.style.display=showPlan?'block':'none';}
   planBtn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();hideContent(true);setActive([planBtn,student,subject],planBtn);},true);
   student.addEventListener('click',()=>{hideContent(false);setActive([planBtn,student,subject],student);},true);
   subject.addEventListener('click',async e=>{if(!privileged()){e.preventDefault();e.stopImmediatePropagation();return;}if(!(await unlockSubjectConfidential())){e.preventDefault();e.stopImmediatePropagation();return;}hideContent(false);setActive([planBtn,student,subject],subject);},true);
 }
 function ensureSettings(){
   const bodyText=String(document.body.textContent||'');if(!/설정/.test(bodyText))return;
   const existing=document.querySelector('[data-uep134-pin-setting]');if(existing)return;
   const labels=[...document.querySelectorAll('div,section,label,h2,h3,h4,p,span')];
   const anchor=labels.find(el=>/민감정보.*비밀번호.*설정/.test(String(el.textContent||'').trim())); if(!anchor)return;
   const host=anchor.closest('section,.card,.setting-row,.settings-section')||anchor.parentElement;if(!host||!host.parentElement)return;
   const box=document.createElement('div');box.dataset.uep134PinSetting='1';box.style.cssText='margin-top:12px;padding:14px 16px;border:1px solid #d7e4e8;border-radius:14px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:16px';
   const can=privileged();box.innerHTML='<div><b>선택과목 대외비 비밀번호 설정</b><div style="font-size:12px;color:#6b7b83;margin-top:4px">과목별 신청현황 전용 · 민감정보 비밀번호와 별도 관리</div></div><button type="button" data-uep134-pin-btn '+(can?'':'disabled')+' style="padding:9px 14px;border-radius:10px;border:1px solid #c9dce1;background:'+(can?'#eefaf7':'#f2f4f5')+';opacity:'+(can?'1':'.5')+'">'+(can?'설정/변경':'권한 없음')+'</button>';
   host.insertAdjacentElement('afterend',box);
   if(can)box.querySelector('[data-uep134-pin-btn]').onclick=async()=>{const p=prompt('새 선택과목 대외비 비밀번호를 4자리 이상 입력하세요.');if(!p||p.length<4)return alert('4자리 이상 입력해 주세요.');localStorage.setItem(PIN_KEY,await digest(p));sessionStorage.removeItem(SESSION_KEY);alert('선택과목 대외비 비밀번호가 저장되었습니다.');};
 }
 function fixFalseHolidayBadges(){
   const falseDates=new Set(['2026-08-24','2026-08-25','2026-08-26','2026-08-27','2026-08-28','2026-08-29','2026-08-30','2026-08-31','2026-09-01','2026-09-02','2026-09-03','2026-09-04']);
   [...document.querySelectorAll('[data-date],[data-day],td,.calendar-day,.day-cell')].forEach(cell=>{
     let d=String(cell.dataset&&cell.dataset.date||cell.getAttribute&&cell.getAttribute('data-date')||'');
     if(!falseDates.has(d))return;
     [...cell.querySelectorAll('*')].forEach(el=>{if(String(el.textContent||'').trim()==='공휴일')el.remove();});
     cell.classList.remove('holiday','is-holiday','public-holiday');cell.style.color='';
   });
   [...document.querySelectorAll('span,b,em,small')].filter(el=>String(el.textContent||'').trim()==='공휴일').forEach(b=>{
     const cell=b.closest('[data-date],[data-day],td,.calendar-day,.day-cell');if(!cell)return;const d=String(cell.dataset&&cell.dataset.date||cell.getAttribute&&cell.getAttribute('data-date')||'');if(falseDates.has(d))b.remove();
   });
 }
 function moveSubjectModalRight(){
   const candidates=[...document.querySelectorAll('[role="dialog"],.modal,.modal-overlay,.popup-overlay')];
   const dlg=candidates.find(el=>/신청|예상등수|학사여부/.test(String(el.textContent||'')));if(!dlg)return;
   const panel=dlg.querySelector('.modal-content,.dialog-content,.popup-content')||dlg;
   if(panel.dataset.uep134Right==='1')return;panel.dataset.uep134Right='1';panel.style.position='fixed';panel.style.top='0';panel.style.right='0';panel.style.left='auto';panel.style.bottom='0';panel.style.width='min(720px,48vw)';panel.style.maxWidth='720px';panel.style.height='100vh';panel.style.maxHeight='100vh';panel.style.borderRadius='18px 0 0 18px';panel.style.overflow='auto';panel.style.zIndex='99999';
 }
 const css=document.createElement('style');css.textContent='.uep134-plan{padding:18px 0}.uep134-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.uep134-title b{font-size:20px}.uep134-title span{font-size:12px;color:#64767d}.uep134-sem{border:1px solid #d7e4e8;border-radius:16px;padding:16px;margin-bottom:14px;background:#fff}.uep134-sem h3{margin:0 0 12px}.uep134-blocks{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}.uep134-block{border:1px solid #d8e6e8;border-radius:14px;padding:12px;background:#fbfdfd}.uep134-block-head{display:flex;justify-content:space-between;gap:8px;margin-bottom:9px}.uep134-block-head span{font-size:12px;font-weight:700;color:#0b8a78;background:#e5f7f2;padding:3px 8px;border-radius:999px}.uep134-chips{display:flex;flex-wrap:wrap;gap:6px}.uep134-chips span{font-size:12px;background:#f1f6f7;border-radius:8px;padding:6px 8px}';document.head.appendChild(css);
 const tick=()=>{try{ensureTabs();ensureSettings();fixFalseHolidayBadges();moveSubjectModalRight();}catch(e){console.warn('UEP08134',e);}};
 new MutationObserver(tick).observe(document.documentElement,{childList:true,subtree:true});setTimeout(tick,200);setTimeout(tick,900);setInterval(tick,2000);
})();
${end}
`;
s+='\n'+repair+'\n';
fs.writeFileSync(jsFile,s,'utf8');
const out=fs.readFileSync(jsFile,'utf8');
for(const m of ['const APP_VERSION = "0.81.34";','UEP_08134_CURRICULUM_SECURITY_START','교육과정 편성표','탐구·교과 선택','택3','전공심화 선택','택7','uep_subject_confidential_pin_hash_v2','선택과목 대외비 비밀번호 설정','fixFalseHolidayBadges()','moveSubjectModalRight()'])if(!out.includes(m))throw new Error('0.81.34 marker missing: '+m);
console.log('UEP 0.81.34 patch applied');
