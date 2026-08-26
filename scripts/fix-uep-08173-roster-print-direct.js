const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(g.includes('UEP_08173_CURRICULUM_WORKSPACE_START'),'08173 module missing');
A(g.includes('function printRoster(panel)'),'printRoster missing');

const s=g.indexOf('  function enhanceRosterPanel(){');
const e=g.indexOf('  function retryRosterPanel(){',s);
A(s>=0&&e>s,'roster enhancement anchors missing');
const direct=String.raw`  function visibleRosterSortButtons(){
    return [...document.querySelectorAll('button')].filter(b=>{
      const txt=String(b.textContent||'').trim();
      if(!/^(예상성적순|반.?번호순)$/.test(txt))return false;
      const r=b.getBoundingClientRect?.();
      return !!r&&r.width>0&&r.height>0;
    });
  }
  function rosterPanelFromAnchor(anchor){
    let n=anchor?.parentElement,best=null;
    while(n&&n!==document.body){
      const t=String(n.innerText||'');
      if(t.includes('학번·성명')&&t.includes('예상등급')){best=n;break;}
      n=n.parentElement;
    }
    return best||findRosterPanel();
  }
  function enhanceRosterPanel(){
    ensureStyle();
    const all=visibleRosterSortButtons();
    const anchor=[...all].reverse().find(b=>/반.?번호순/.test(String(b.textContent||'').trim()))||all[0];
    if(!anchor)return false;
    const host=anchor.parentElement||document.body;
    let btn=host.querySelector('.uep-roster-print-08173');
    if(!btn){
      btn=document.createElement('button');btn.type='button';btn.className='uep-roster-print-08173';btn.textContent='신청명단 출력';btn.title='성적정보 없이 학년·반·번호순으로 출력';
      btn.addEventListener('click',e=>{e.stopPropagation();const panel=rosterPanelFromAnchor(anchor);if(panel)printRoster(panel);else if(typeof toast==='function')toast('신청학생 명단 패널을 찾지 못했습니다.');});
    }
    if(btn!==anchor.nextElementSibling)anchor.insertAdjacentElement('afterend',btn);
    return true;
  }
`;
g=g.slice(0,s)+direct+g.slice(e);

fs.writeFileSync(gFile,g,'utf8');
const out=fs.readFileSync(gFile,'utf8');
for(const m of ['function visibleRosterSortButtons','function rosterPanelFromAnchor','신청명단 출력','anchor.insertAdjacentElement'])A(out.includes(m),'direct roster marker missing: '+m);
console.log('UEP 0.81.73 direct roster print attachment applied');
