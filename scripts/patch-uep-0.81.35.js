const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const jsFile=path.join(appRoot,'resources','app','gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');
const versionRx=/const\s+APP_VERSION\s*=\s*['\"][^'\"]+['\"]\s*;/g;
if(!(s.match(versionRx)||[]).length) throw new Error('APP_VERSION declaration missing');
s=s.replace(versionRx,'const APP_VERSION = "0.81.35";');

const start='/* UEP_08135_RUNTIME_REPAIR_START */';
const end='/* UEP_08135_RUNTIME_REPAIR_END */';
const esc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
s=s.replace(new RegExp(esc(start)+'[\\s\\S]*?'+esc(end),'g'),'');

const repair=String.raw`
${start}
(function(){
  if(typeof document==='undefined'||window.__UEP08135RuntimeRepair)return;
  window.__UEP08135RuntimeRepair=true;

  const PIN_KEY='uep_subject_confidential_pin_hash_v2';
  const SESSION_KEY='uep_subject_confidential_unlocked_v2';
  const DEEP_KEY='uep_attendance_public_deeplink_v1';
  const exact=(el,t)=>String(el&&el.textContent||'').trim()===t;
  function privileged(){
    return [...document.querySelectorAll('header *,nav *,button,.badge,.chip,.pill')].some(el=>['관리자','학년부장'].includes(String(el.textContent||'').trim()));
  }
  async function digest(v){
    const b=new TextEncoder().encode(v);
    const h=await crypto.subtle.digest('SHA-256',b);
    return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }

  function ensureSubjectSecuritySetting(){
    if(!/설정/.test(String(document.body.textContent||'')))return;
    if(document.querySelector('[data-uep135-subject-security]'))return;
    const sensitive=[...document.querySelectorAll('h1,h2,h3,h4,b,strong,div,span')].find(el=>exact(el,'민감정보 보안'));
    if(!sensitive)return;
    const host=sensitive.closest('section,.card,[class*="card"],[class*="panel"]')||sensitive.parentElement;
    if(!host||!host.parentElement)return;
    const can=privileged();
    const box=document.createElement('section');
    box.dataset.uep135SubjectSecurity='1';
    box.style.cssText='margin-top:12px;padding:18px;border:1px solid #d8e5e8;border-radius:14px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:18px';
    box.innerHTML='<div><div style="font-size:11px;letter-spacing:.08em;color:#168d7f;font-weight:700">CONFIDENTIAL · CURRICULUM</div><div style="font-size:17px;font-weight:800;margin-top:5px">🔐 선택과목 대외비 보안</div><div style="font-size:12px;color:#6b7c82;margin-top:6px">과목별 신청현황 전용 비밀번호 · 민감정보 비밀번호와 별도 관리</div></div><div style="display:flex;gap:8px;align-items:center"><span data-uep135-pin-state style="font-size:12px;color:#5d747b"></span><button type="button" data-uep135-pin-set '+(can?'':'disabled')+'>비밀번호 설정</button><button type="button" data-uep135-pin-lock '+(can?'':'disabled')+'>즉시 잠금</button></div>';
    host.insertAdjacentElement('afterend',box);
    const state=box.querySelector('[data-uep135-pin-state]');
    const refresh=()=>{state.textContent=localStorage.getItem(PIN_KEY)?'비밀번호 설정됨':'비밀번호 설정 필요';};refresh();
    if(!can){box.style.opacity='.55';box.querySelectorAll('button').forEach(b=>{b.style.cursor='not-allowed';b.title='관리자·학년부장 전용';});return;}
    box.querySelector('[data-uep135-pin-set]').onclick=async()=>{
      const p=prompt('새 선택과목 대외비 비밀번호를 4자리 이상 입력하세요.');
      if(!p||p.length<4)return alert('4자리 이상 입력해 주세요.');
      const p2=prompt('확인을 위해 같은 비밀번호를 다시 입력하세요.');
      if(p!==p2)return alert('비밀번호가 일치하지 않습니다.');
      localStorage.setItem(PIN_KEY,await digest(p));sessionStorage.removeItem(SESSION_KEY);refresh();alert('선택과목 대외비 비밀번호가 저장되었습니다.');
    };
    box.querySelector('[data-uep135-pin-lock]').onclick=()=>{sessionStorage.removeItem(SESSION_KEY);alert('과목별 신청현황을 즉시 잠갔습니다.');};
  }

  function visibleMonth(){
    const txt=String(document.body.textContent||'');
    const m=txt.match(/(20\d{2})년\s*(\d{1,2})월/);
    return m?{y:+m[1],m:+m[2]}:null;
  }
  function dayNumberElement(cell){
    return [...cell.querySelectorAll('span,b,strong,div')].find(el=>/^\d{1,2}$/.test(String(el.textContent||'').trim())&&el.children.length===0)||null;
  }
  function likelyCellFromBadge(badge){
    let n=badge;
    for(let i=0;i<7&&n;i++,n=n.parentElement){
      const d=dayNumberElement(n);
      if(d){const r=n.getBoundingClientRect();if(r.width>90&&r.height>60)return n;}
    }
    return badge.closest('td,[data-date],[data-day],.calendar-day,.day-cell');
  }
  function repairFalseHolidayCalendar(){
    const vm=visibleMonth();if(!vm||vm.y!==2026||vm.m!==8)return;
    const badges=[...document.querySelectorAll('span,b,em,small,div')].filter(el=>exact(el,'공휴일'));
    badges.forEach(b=>{
      const cell=likelyCellFromBadge(b);if(!cell)return;
      const dEl=dayNumberElement(cell);if(!dEl)return;
      const day=+String(dEl.textContent||'').trim();
      const target=(day>=24&&day<=31)||(day>=1&&day<=4);
      if(!target)return;
      let month=day<=4?9:8;
      const dt=new Date(2026,month-1,day);const dow=dt.getDay();
      b.remove();cell.classList.remove('holiday','is-holiday','public-holiday','red-day');
      dEl.style.color=dow===0?'#e65353':dow===6?'#3677d5':'';
      [...cell.querySelectorAll('[class*="holiday"]')].forEach(x=>x.classList.remove('holiday','is-holiday','public-holiday','red-day'));
    });
  }

  function collectMeta(el){
    const nodes=[el,...el.querySelectorAll('*'),el.parentElement,el.parentElement&&el.parentElement.parentElement].filter(Boolean);
    let out='';
    nodes.forEach(n=>{out+=' '+String(n.textContent||'');if(n.attributes)[...n.attributes].forEach(a=>out+=' '+a.name+'='+a.value);});
    return out.replace(/\s+/g,' ').trim();
  }
  function inferAttendanceDetail(chip){
    const meta=collectMeta(chip);
    const type=(meta.match(/공조퇴|공지각|공외출|공결|조퇴|지각|외출/)||[])[0]||'공결';
    const period=(meta.match(/(?:\d{1,2}\s*[~\-]\s*\d{1,2}|\d{1,2})\s*교시/)||[])[0]||'';
    const time=(meta.match(/\d{1,2}:\d{2}\s*[~\-]\s*\d{1,2}:\d{2}/)||[])[0]||'';
    return [type,period||time].filter(Boolean).join(' ');
  }
  function currentStatusDate(){
    const inp=[...document.querySelectorAll('input[type="date"]')].find(x=>x.value);if(inp)return inp.value;
    const m=String(document.body.textContent||'').match(/기준일\s*(20\d{2}-\d{2}-\d{2})/);return m?m[1]:'';
  }
  function wireAttendanceStatusCards(){
    if(!/공결·지각 학생/.test(String(document.body.textContent||'')))return;
    const date=currentStatusDate();
    const chips=[...document.querySelectorAll('button,[role="button"],.chip,.badge,div')].filter(el=>/^\d{4}\s+\S+/.test(String(el.textContent||'').trim())&&/공결|지각|조퇴|외출/.test(String(el.textContent||'')));
    chips.forEach(chip=>{
      if(chip.dataset.uep135Attendance==='1')return;chip.dataset.uep135Attendance='1';
      const raw=String(chip.textContent||'').trim();const who=(raw.match(/^(\d{4})\s+([^\s]+)/)||[]);if(!who[1])return;
      const detail=inferAttendanceDetail(chip);chip.textContent=who[1]+' '+who[2]+' · '+detail;
      chip.style.cursor='pointer';chip.title='출결 메뉴의 해당 날짜로 이동';
      chip.addEventListener('click',()=>{
        sessionStorage.setItem(DEEP_KEY,JSON.stringify({date:date,studentNo:who[1],name:who[2],detail}));
        const menu=[...document.querySelectorAll('button,a,[role="button"],nav *')].find(x=>exact(x,'출결'));
        if(menu)menu.click();
      });
    });
  }
  function applyAttendanceDeepLink(){
    const raw=sessionStorage.getItem(DEEP_KEY);if(!raw)return;
    if(!/출결/.test(String(document.body.textContent||'')))return;
    let q;try{q=JSON.parse(raw);}catch(e){sessionStorage.removeItem(DEEP_KEY);return;}
    const publicBtn=[...document.querySelectorAll('button,[role="button"],a')].find(x=>/공결/.test(String(x.textContent||'').trim()));if(publicBtn&&!publicBtn.dataset.uep135Clicked){publicBtn.dataset.uep135Clicked='1';publicBtn.click();}
    const inp=[...document.querySelectorAll('input[type="date"]')][0];if(inp&&q.date&&inp.value!==q.date){inp.value=q.date;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));}
    const target=[...document.querySelectorAll('tr,button,.card,[class*="row"],[class*="item"]')].find(el=>String(el.textContent||'').includes(q.studentNo)&&String(el.textContent||'').includes(q.name));
    if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.style.outline='3px solid #58b9aa';target.style.outlineOffset='2px';sessionStorage.removeItem(DEEP_KEY);}
  }

  function tick(){
    ensureSubjectSecuritySetting();
    repairFalseHolidayCalendar();
    wireAttendanceStatusCards();
    applyAttendanceDeepLink();
  }
  const obs=new MutationObserver(()=>{clearTimeout(window.__UEP08135Tick);window.__UEP08135Tick=setTimeout(tick,80);});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',tick);window.addEventListener('popstate',tick);setInterval(tick,1200);setTimeout(tick,100);
})();
${end}
`;
s+='\n'+repair+'\n';
fs.writeFileSync(jsFile,s,'utf8');
console.log('UEP 0.81.35 runtime repair applied');
