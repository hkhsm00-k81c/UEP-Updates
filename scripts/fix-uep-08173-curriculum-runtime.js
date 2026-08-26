const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};

A(g.includes('UEP_08173_CURRICULUM_WORKSPACE_START'),'08173 module missing');
A(g.includes('function enhanceCourseCards()'),'enhanceCourseCards missing');
A(g.includes('function enhanceRosterPanel()'),'enhanceRosterPanel missing');

const start=g.indexOf('  function closestCourseCard(el)');
const end=g.indexOf('  function findRosterPanel()',start);
A(start>=0&&end>start,'course enhancement block anchors missing');
const courseBlock=String.raw`  function ownCourseSummary(el){const t=String(el?.textContent||'').trim();return /^신청\s*\d+명\s*[·ㆍ|]\s*예상\s*\d+분반$/.test(t);}
  function summaryCount(el){return (String(el?.innerText||'').match(/신청\s*\d+명\s*[·ㆍ|]\s*예상\s*\d+분반/g)||[]).length;}
  function closestCourseCard(el){
    const direct=el.closest?.('button,[role="button"],article,.subject-card,.course-card');
    if(direct&&summaryCount(direct)===1&&String(direct.innerText||'').length<500)return direct;
    let n=el.parentElement,best=null;
    for(let i=0;i<6&&n;i++,n=n.parentElement){const c=summaryCount(n);if(c===1&&String(n.innerText||'').length<500)best=n;else if(c>1)break;}
    return best;
  }
  function existingStatusBadge(card){return [...card.querySelectorAll('span,small,em,b,strong,div')].find(el=>el.children.length===0&&/^(안정|폐강대상|개설 유지|폐강 확정)$/.test(String(el.textContent||'').trim()))||null;}
  function applyCourseStatus(badge,value,count){const state=value==='closed'?'closed':value==='keep'?'keep':count<=25?'risk':'safe';badge.classList.add('uep-course-auto-08173');badge.classList.remove('risk','safe','keep','closed');badge.classList.add(state);badge.textContent=value==='closed'?'폐강 확정':value==='keep'?'개설 유지':count<=25?'폐강대상':'안정';}
  function enhanceCourseCards(){
    const leaves=[...document.querySelectorAll('body *')].filter(ownCourseSummary),seen=new Set();
    leaves.forEach(el=>{const card=closestCourseCard(el);if(!card||seen.has(card)||card.querySelector('.uep-course-decision-08173'))return;seen.add(card);const text=String(card.innerText||''),m=text.match(/신청\s*(\d+)명/);if(!m||summaryCount(card)!==1)return;const count=Number(m[1]),name=subjectName(card);if(!name)return;const term=currentTerm(),key=term+'::'+name,d=decisions()[key]||'';let badge=existingStatusBadge(card);if(!badge){badge=document.createElement('span');card.appendChild(badge);}applyCourseStatus(badge,d,count);const wrap=document.createElement('div');wrap.className='uep-course-decision-08173';const sel=document.createElement('select');sel.setAttribute('aria-label',name+' 개설 상태');sel.innerHTML='<option value="">자동판정</option><option value="keep">개설 유지</option><option value="closed">폐강 확정</option>';sel.value=d;const stop=e=>e.stopPropagation();wrap.addEventListener('click',stop);sel.addEventListener('click',stop);sel.addEventListener('change',e=>{stop(e);saveDecision(key,sel.value);applyCourseStatus(badge,sel.value,count)});wrap.appendChild(sel);card.appendChild(wrap);});
  }
`;
g=g.slice(0,start)+courseBlock+g.slice(end);

const rosterStart=g.indexOf('  function findRosterPanel()');
const rosterEnd=g.indexOf('  function releaseNotes()',rosterStart);
A(rosterStart>=0&&rosterEnd>rosterStart,'roster block anchors missing');
const oldRoster=g.slice(rosterStart,rosterEnd);
const printStart=oldRoster.indexOf('  function printRoster(panel)');
A(printStart>=0,'printRoster missing');
const printEnd=oldRoster.indexOf('  function enhanceRosterPanel()',printStart);
A(printEnd>printStart,'enhanceRosterPanel anchor missing');
const printRosterCode=oldRoster.slice(printStart,printEnd);
const rosterBlock=String.raw`  function findRosterPanel(){
    const sortButtons=[...document.querySelectorAll('button')].filter(b=>/^(예상성적순|반.?번호순)$/.test(String(b.textContent||'').trim()));
    for(const b of sortButtons){
      let n=b.closest?.('aside');
      if(n&&String(n.innerText||'').includes('학번·성명')&&String(n.innerText||'').includes('예상등급'))return n;
      n=b.parentElement;
      for(let i=0;i<7&&n;i++,n=n.parentElement){const t=String(n.innerText||'');if(t.includes('학번·성명')&&t.includes('예상등급')&&/신청\s*\d+명/.test(t))return n;}
    }
    return null;
  }
  function rosterRows(panel){const map=new Map();[...panel.querySelectorAll('button,tr,[role="row"],div')].forEach(el=>{const t=String(el.innerText||'').replace(/\s+/g,' ').trim();const m=t.match(/\b(\d{4})\s+([^\s]+)\b/);if(!m)return;const no=m[1],name=m[2];if(!map.has(no))map.set(no,{no,name})});return [...map.values()].sort((a,b)=>Number(a.no)-Number(b.no));}
`+printRosterCode+String.raw`  function enhanceRosterPanel(){
    const panel=findRosterPanel();if(!panel||panel.querySelector('.uep-roster-print-08173'))return;ensureStyle();
    const sortButtons=[...panel.querySelectorAll('button')].filter(b=>/^(예상성적순|반.?번호순)$/.test(String(b.textContent||'').trim()));
    const anchor=sortButtons.find(b=>/반.?번호순/.test(String(b.textContent||'')))||sortButtons[0];if(!anchor)return;
    const btn=document.createElement('button');btn.type='button';btn.className='uep-roster-print-08173';btn.textContent='신청명단 출력';btn.title='성적정보 없이 학년·반·번호순으로 출력';btn.addEventListener('click',e=>{e.stopPropagation();printRoster(panel)});
    const host=anchor.parentElement||panel;host.appendChild(btn);
  }
`;
g=g.slice(0,rosterStart)+rosterBlock+g.slice(rosterEnd);

fs.writeFileSync(gFile,g,'utf8');
const out=fs.readFileSync(gFile,'utf8');
for(const marker of ['function ownCourseSummary','summaryCount(card)!==1','function existingStatusBadge','function applyCourseStatus','신청명단 출력','function findRosterPanel'])A(out.includes(marker),'runtime fix marker missing: '+marker);
console.log('UEP 0.81.73 curriculum runtime targeting fix applied');
