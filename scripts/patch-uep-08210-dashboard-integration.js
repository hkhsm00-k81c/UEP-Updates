const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root) throw new Error('usage: node patch-uep-08210-dashboard-integration.js <app-root>');
const gPath=path.join(root,'resources','app','gyomuon.js');
const cssPath=path.join(root,'resources','app','gyomuon.css');
const mainPath=path.join(root,'resources','app','electron','main.cjs');
let g=fs.readFileSync(gPath,'utf8');
let css=fs.readFileSync(cssPath,'utf8');
let main=fs.readFileSync(mainPath,'utf8');
const must=(v,msg)=>{if(!v)throw new Error(msg)};
must(g.includes('const APP_VERSION = "0.82.09";'),'APP_VERSION 0.82.09 marker missing');

// Remove the stacked dashboard overlays from 0.82.06/08/09 and replace them with one consolidated implementation.
for(const name of ['UEP_08206_ADMISSION_DASHBOARD','UEP_08208_DASHBOARD_SCOPE_FIX','UEP_08209_DASHBOARD_DATA_FIX']){
  const re=new RegExp('\\n?\\/\\* '+name+'_START \\*\\/[\\s\\S]*?\\/\\* '+name+'_END \\*\\/\\n?','g');
  g=g.replace(re,'\n');
}
for(const name of ['UEP_08206_ADMISSION_DASHBOARD_CSS','UEP_08208_DASHBOARD_SCOPE_FIX_CSS','UEP_08209_DASHBOARD_DATA_FIX_CSS']){
  const re=new RegExp('\\n?\\/\\* '+name+' \\*\\/[\\s\\S]*?(?=\\n\\/\\*|$)','g');
  css=css.replace(re,'\n');
}
g=g.replace('const APP_VERSION = "0.82.09";','const APP_VERSION = "0.82.10";');

// 52/53/56 are basic-info connector tabs. Add them to the existing full-read range list without mutating the frozen base manifest.
const entriesMarker='  const entries = Object.entries(SHEET_RANGES);';
must(main.includes(entriesMarker),'fetchLiveData entries marker missing');
main=main.replace(entriesMarker,`  const entries = [\n    ...Object.entries(SHEET_RANGES),\n    ["52_대입기초", "'52_대입기초'!A1:N500"],\n    ["53_전형이해", "'53_전형이해'!A1:N500"],\n    ["56_대학입시마스터", "'56_대학입시마스터'!A1:R500"],\n  ];`);

// Convert the three matrices (row 3 header, row 4+ data) into readonlyCache datasets.
const parseMarker='  const data = parseGoogleSheetData(matrices);';
must(main.includes(parseMarker),'parseGoogleSheetData marker missing');
main=main.replace(parseMarker,parseMarker+`\n\n  // 0.82.10 admissions reference datasets from basic-info connector\n  const uep08210MatrixObjects=(matrix)=>{\n    const rows=Array.isArray(matrix)?matrix:[];\n    const headers=(rows[2]||[]).map(v=>String(v??'').replace(/\\r?\\n/g,' ').trim());\n    if(!headers.some(Boolean))return [];\n    return rows.slice(3).filter(row=>Array.isArray(row)&&row.some(v=>String(v??'').trim())).map(row=>{\n      const obj={};headers.forEach((h,i)=>{if(h)obj[h]=row[i]??'';});return obj;\n    });\n  };\n  data.admissionBasics=uep08210MatrixObjects(matrices['52_대입기초']);\n  data.admissionTypes=uep08210MatrixObjects(matrices['53_전형이해']);\n  data.universityAdmissions=uep08210MatrixObjects(matrices['56_대학입시마스터']);\n  data['52_대입기초']=data.admissionBasics;\n  data['53_전형이해']=data.admissionTypes;\n  data['56_대학입시마스터']=data.universityAdmissions;`);

const injected=String.raw`
/* UEP_08210_DASHBOARD_INTEGRATION_START */
(function(){
  if(typeof window==='undefined'||window.__UEP08210DashboardIntegration)return;
  window.__UEP08210DashboardIntegration=true;
  const OFFICIAL_LEDGER_URL='https://docs.google.com/spreadsheets/d/1f6moB3bJJjZcAHv6OPRiLq41InvmzTRuh9ANFZmhNhk/edit';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const arr=(...xs)=>xs.find(Array.isArray)||[];
  const cache=()=>{try{return (typeof readonlyCache!=='undefined'&&readonlyCache)||{};}catch{return {};}};
  const order=x=>Number(x?.['노출순서']??x?.order??9999)||9999;
  const enabled=x=>String(x?.['사용여부']??x?.use??'Y').toUpperCase()!=='N';
  function rows52(){const c=cache();return arr(c.admissionBasics,c['52_대입기초']).filter(enabled);}
  function rows53(){const c=cache();return arr(c.admissionTypes,c['53_전형이해']).filter(enabled);}
  function rows56(){const c=cache();return arr(c.universityAdmissions,c['56_대학입시마스터']).filter(x=>String(x?.['사용여부']??x?.use??'Y').toUpperCase()==='Y');}
  function dayIndex(n){if(!n)return 0;const d=new Date(),start=new Date(d.getFullYear(),0,0);return Math.floor((d-start)/86400000)%n;}
  function modal(title,body){
    document.getElementById('uepAdmissionModal08210')?.remove();
    const m=document.createElement('div');m.id='uepAdmissionModal08210';m.className='uep-admission-modal';
    m.innerHTML='<div class="uep-admission-dialog"><header><div><small>UEP 대입상담 참고</small><h2>'+esc(title)+'</h2></div><button type="button" aria-label="닫기">×</button></header><div class="uep-admission-body">'+body+'</div></div>';
    document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.closest('header button'))m.remove();});
  }
  function basicDetail(){const rows=rows52().slice().sort((a,b)=>order(a)-order(b));if(!rows.length)return modal('대입 기초','<p>52_대입기초 자료를 아직 읽지 못했습니다. 동기화 상태를 확인해 주세요.</p>');modal('대입 기초',rows.map(r=>'<article><h3>'+esc(r['주제']||'')+'</h3><p>'+esc(r['상세설명']||r['카드요약']||'')+'</p><small>'+esc(r['상담포인트']||'')+'</small></article>').join(''));}
  function typeDetail(){const rows=rows53().slice().sort((a,b)=>order(a)-order(b));if(!rows.length)return modal('전형 이해','<p>53_전형이해 자료를 아직 읽지 못했습니다. 동기화 상태를 확인해 주세요.</p>');modal('전형 이해',rows.map(r=>'<article><h3>'+esc(r['전형유형']||'')+'</h3><p>'+esc(r['한줄요약']||'')+'</p><small>'+esc(r['고1준비포인트']||r['상담체크']||'')+'</small></article>').join(''));}
  function uniDetail(){const us=rows56().slice().sort((a,b)=>order(a)-order(b)),u=us[dayIndex(us.length)];if(!u)return modal('오늘의 대학','<p>56_대학입시마스터 자료를 아직 읽지 못했습니다. 동기화 상태를 확인해 주세요.</p>');modal(u['대학명']||'오늘의 대학','<article><h3>'+esc(u['카드한줄']||'')+'</h3><p>'+esc(u['수시핵심']||'')+'</p><p>'+esc(u['정시핵심']||'')+'</p><p>'+esc(u['과목선택/교과포인트']||'')+'</p><small>'+esc(u['자료상태']||'')+(u['수능최저요약']?' · '+esc(u['수능최저요약']):'')+'</small></article>');}
  function admissionDefs(){const b=rows52().slice().sort((a,b)=>order(a)-order(b))[0],t=rows53().slice().sort((a,b)=>order(a)-order(b))[0],us=rows56().slice().sort((a,b)=>order(a)-order(b)),u=us[dayIndex(us.length)];return [['대입 기초',b?.['주제']||'1학년 대입 기본',b?.['카드요약']||'과목선택·내신·모의 흐름을 함께 봅니다.'],['전형 이해',t?.['전형유형']||'교과·종합·정시',t?.['한줄요약']||'전형별 평가방식을 구분해 봅니다.'],['오늘의 대학',u?.['대학명']||'대학 정보',u?.['카드한줄']||'공식 시행계획 기준 상담 참고']];}
  const admissionActions=[basicDetail,typeDetail,uniDetail];
  function stripOldReportCardBehavior(el){
    ['title','aria-label','data-tooltip','data-title'].forEach(a=>el.removeAttribute(a));
    Object.keys(el.dataset||{}).forEach(k=>{if(/report|submit|status|detail/i.test(k)&&k!=='uepAdmissionCard08210')delete el.dataset[k];});
    el.onclick=null;
  }
  function findOriginalReportCards(){const labels=['제출완료','제출중','미제출'],nodes=[...document.querySelectorAll('article,section,div,button')],out=[];for(const label of labels){const c=nodes.filter(el=>{const t=(el.innerText||'').trim();return t.includes(label)&&t.length<150&&!out.includes(el);}).sort((a,b)=>a.children.length-b.children.length);if(c[0])out.push(c[0]);}return out;}
  function ensureAdmissions(){let cards=[...document.querySelectorAll('[data-uep-admission-card-08210]')];if(cards.length!==3){cards=findOriginalReportCards();if(cards.length!==3)return false;cards.forEach((el,i)=>el.setAttribute('data-uep-admission-card-08210',String(i)));}const defs=admissionDefs();cards.forEach((el,i)=>{stripOldReportCardBehavior(el);el.classList.add('uep-admission-kpi');el.innerHTML='<small>'+esc(defs[i][0])+'</small><strong>'+esc(defs[i][1])+'</strong><span>'+esc(defs[i][2])+'</span>';});return true;}
  document.addEventListener('click',e=>{const card=e.target.closest?.('[data-uep-admission-card-08210]');if(!card)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const i=Number(card.getAttribute('data-uep-admission-card-08210'));admissionActions[i]?.();},true);

  function roleId(){try{return typeof currentRoleId==='function'?String(currentRoleId()||''):'';}catch{return '';}}
  function currentClass(){const c=cache();const candidates=[typeof authSessionUser!=='undefined'?authSessionUser:null,typeof currentUser!=='undefined'?currentUser:null,c.currentUser].filter(Boolean);for(const x of candidates){const raw=x.classNo??x.className??x['반']??x.homeroomClass??'';const m=String(raw).match(/([1-9])/);if(m)return Number(m[1]);}return 0;}
  function isHomeroom(){return roleId()==='homeroom'&&currentClass()>0;}
  function classNoOf(r){const raw=r?.classNo??r?.className??r?.class??r?.['반']??r?.studentRef?.className??r?.studentRef?.classNo??'';const m=String(raw).match(/([1-9])/);return m?Number(m[1]):0;}
  function studentNameOf(r){return String(r?.name??r?.studentName??r?.['학생명']??r?.['성명']??r?.studentRef?.name??'').trim();}
  function reportRows(){try{return typeof dashboardReportStatusRows==='function'?(dashboardReportStatusRows()||[]):[];}catch{return [];}}
  function missingRows(){return reportRows().filter(r=>r?.submitted===false||/missing|미제출/i.test(String(r?.state??r?.status??r?.['제출상태']??'')));}
  function missingByClass(){const map=new Map();for(let i=1;i<=9;i++)map.set(i,new Set());for(const r of missingRows()){const cn=classNoOf(r),nm=studentNameOf(r);if(cn>=1&&cn<=9&&nm)map.get(cn).add(nm);}return map;}
  function reviewByClass(){const map=new Map();for(let i=1;i<=9;i++)map.set(i,0);const c=cache(),rows=arr(c.consultationCandidates,c.studentReviewCandidates,c.counselCandidates,c.discoveryStudents);for(const r of rows){const cn=classNoOf(r);if(cn>=1&&cn<=9)map.set(cn,(map.get(cn)||0)+1);}return map;}
  function isApprovedAuto(r){const source=String(r?.['유형']??r?.type??r?.source??r?.kind??'');if(!/자동|마감|deadline/i.test(source))return true;const v=String(r?.['승인여부']??r?.approved??r?.approval??r?.['공지상태']??r?.status??'').trim().toUpperCase();return /^(Y|YES|TRUE|승인|APPROVED|게시|PUBLISHED)$/.test(v);}
  function publishedNotices(){const c=cache();const direct=arr(c.notices,c.workNotices,c.directNotices,c.schoolNotices).filter(r=>isApprovedAuto(r));const deadlines=arr(c.schoolDeadlines,c.deadlines,c.workDeadlines).filter(r=>isApprovedAuto(r)&&/자동|마감|deadline/i.test(String(r?.['유형']??r?.type??r?.source??r?.kind??'')));const seen=new Set(),out=[];for(const r of [...direct,...deadlines]){const key=String(r?.id??r?.noticeId??r?.['공지ID']??r?.['제목']??r?.title??JSON.stringify(r));if(seen.has(key))continue;seen.add(key);out.push(r);}return out;}
  function noticeHtml(){const rows=publishedNotices();if(!rows.length)return '<div class="uep-panel-empty"><strong>학년공지</strong><span>현재 게시 중인 학년공지가 없습니다.</span></div>';return '<div class="uep-notice-list">'+rows.slice(0,8).map(r=>'<button type="button"><b>'+esc(r?.['제목']??r?.title??r?.['내용']??r?.text??'학년공지')+'</b><span>'+esc(r?.['마감일']??r?.deadline??r?.date??'')+'</span></button>').join('')+'</div>';}
  function reviewHtml(){const cn=currentClass(),map=reviewByClass();if(isHomeroom())return '<div class="uep-panel-empty"><strong>'+cn+'반 학생 점검</strong><span>UEP가 참고 후보를 제시하고 상담대상 판단은 담임이 합니다.</span></div>';return '<div class="uep-class-grid">'+[1,2,3,4,5,6,7,8,9].map(i=>'<button type="button"><b>'+i+'반</b><span>점검 참고 '+(map.get(i)||0)+'명</span></button>').join('')+'</div>';}
  function missingHtml(){const cn=currentClass(),map=missingByClass();if(isHomeroom()){const names=[...(map.get(cn)||new Set())];return names.length?'<div class="uep-student-mini-list">'+names.map(n=>'<button type="button">'+esc(n)+'</button>').join('')+'</div>':'<div class="uep-panel-empty">현재 확인된 미제출 학생이 없습니다.</div>';}return '<div class="uep-class-grid">'+[1,2,3,4,5,6,7,8,9].map(i=>'<button type="button"><b>'+i+'반</b><span>미제출 '+((map.get(i)||new Set()).size)+'명</span></button>').join('')+'</div>';}
  function directText(el){return [...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent||'').join(' ').trim();}
  function safeWorkPanel(){const all=[...document.querySelectorAll('section,article,div')];const titleNodes=all.filter(el=>{const own=directText(el),txt=(el.innerText||'').trim();return own==='학교업무공지·마감'||txt==='학교업무공지·마감';});const candidates=[];for(const title of titleNodes){let p=title;for(let i=0;i<5&&p;i++,p=p.parentElement){const t=(p.innerText||'').trim();if(!t.includes('게시 중 직접공지')||!t.includes('자동 마감공지')||!t.includes('상담 필요')||!t.includes('내 체크리스트'))continue;if(/오늘의 프로그램|내 주간시간표|학교 캘린더|링크 메뉴|실행 메뉴/.test(t))continue;if(t.length>5000)continue;candidates.push(p);break;}}return candidates.sort((a,b)=>(a.innerText||'').length-(b.innerText||'').length)[0]||null;}
  function ensurePanels(){let host=document.querySelector('[data-uep-dashboard-panels-08210="1"]');if(!host){host=safeWorkPanel();if(!host)return false;host.dataset.uepDashboardPanels08210='1';}let addBtn=[...host.querySelectorAll('button')].find(b=>/\+\s*공지/.test((b.innerText||'').trim()));if(addBtn)addBtn.remove();host.innerHTML='<div class="uep-dashboard-panels-head"><strong>학년업무 · 학생점검</strong><div class="uep-dashboard-panel-actions"></div></div><div class="uep-dashboard-panels-grid"><section><h3>학년공지</h3>'+noticeHtml()+'</section><section><h3>학생상담/점검</h3>'+reviewHtml()+'</section><section><h3>보고서 미제출 현황</h3>'+missingHtml()+'</section></div>';if(addBtn)host.querySelector('.uep-dashboard-panel-actions')?.appendChild(addBtn);return true;}

  function injectLedgerButton(){if(document.querySelector('[data-uep-official-ledger-button="1"]'))return;const dialogs=[...document.querySelectorAll('[role="dialog"],.modal,.dialog,.overlay,.popup')].filter(el=>{const t=(el.innerText||'').trim();return /공결|지각/.test(t)&&t.length<12000;}).sort((a,b)=>(a.innerText||'').length-(b.innerText||'').length);const dlg=dialogs[0];if(!dlg)return;const btn=document.createElement('button');btn.type='button';btn.dataset.uepOfficialLedgerButton='1';btn.className='uep-official-ledger-btn';btn.textContent='공결대장';btn.title='[운호고]2026학년도 공결대장';btn.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();window.schoolBoard?.openChrome?.(OFFICIAL_LEDGER_URL);});const target=dlg.querySelector('footer,.modal-footer,.dialog-footer')||dlg;target.appendChild(btn);}
  document.addEventListener('click',e=>{const el=e.target.closest?.('button,article,section,div');if(!el)return;const t=(el.innerText||'').trim();if(/공결\s*\/\s*지각/.test(t)&&t.length<180)setTimeout(injectLedgerButton,120);},true);

  let scheduled=false;function sync(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;ensureAdmissions();ensurePanels();},120);}
  new MutationObserver(sync).observe(document.documentElement,{childList:true,subtree:true});
  sync();setInterval(sync,2500);
})();
/* UEP_08210_DASHBOARD_INTEGRATION_END */
`;
g+='\n'+injected+'\n';
css+='\n/* UEP_08210_DASHBOARD_INTEGRATION_CSS */\n.uep-admission-kpi{cursor:pointer!important}.uep-admission-kpi small,.uep-admission-kpi strong,.uep-admission-kpi span{display:block}.uep-admission-kpi strong{font-size:14px;margin:3px 0}.uep-admission-kpi span{font-size:10px;line-height:1.3;opacity:.76}.uep-admission-modal{position:fixed;inset:0;z-index:2147483020;background:rgba(20,31,35,.42);display:flex;align-items:center;justify-content:center;padding:24px}.uep-admission-dialog{width:min(780px,94vw);max-height:84vh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 28px 80px rgba(0,0,0,.24)}.uep-admission-dialog header{position:sticky;top:0;background:#fff;display:flex;justify-content:space-between;align-items:center;padding:20px 22px;border-bottom:1px solid #e5ecea;z-index:1}.uep-admission-dialog header h2{margin:3px 0 0}.uep-admission-dialog header small{color:#71827d}.uep-admission-dialog header button{border:0;background:#eef4f2;border-radius:50%;width:36px;height:36px;font-size:22px;cursor:pointer}.uep-admission-body{padding:18px 22px;display:grid;gap:10px}.uep-admission-body article{border:1px solid #e3ebe8;border-radius:14px;padding:14px 16px}.uep-admission-body h3{margin:0 0 7px}.uep-admission-body p{margin:5px 0;line-height:1.55}.uep-admission-body small{display:block;margin-top:8px;color:#667873;line-height:1.45}[data-uep-dashboard-panels-08210="1"]{height:auto!important;min-height:252px!important;overflow:visible!important}.uep-dashboard-panels-head{display:flex;align-items:center;justify-content:space-between;padding:7px 12px;border-bottom:1px solid #e4ece9}.uep-dashboard-panels-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));min-height:210px}.uep-dashboard-panels-grid>section{padding:9px 10px;border-right:1px solid #e6eeeb;overflow:visible}.uep-dashboard-panels-grid>section:last-child{border-right:0}.uep-dashboard-panels-grid h3{margin:0 0 7px;font-size:12px}.uep-class-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:42px;gap:5px}.uep-class-grid button,.uep-student-mini-list button,.uep-notice-list button{border:1px solid #e1ebe7;background:#fff;border-radius:8px;padding:5px 7px;cursor:pointer;text-align:left;min-width:0}.uep-class-grid button b,.uep-class-grid button span,.uep-notice-list b,.uep-notice-list span{display:block}.uep-class-grid button span,.uep-notice-list span{font-size:9px;margin-top:1px;color:#6c7d78}.uep-student-mini-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.uep-panel-empty{display:grid;gap:4px;padding:10px;border-radius:9px;background:#f7faf9;color:#6b7a76;font-size:10px}.uep-notice-list{display:grid;gap:5px;max-height:178px;overflow:auto}.uep-official-ledger-btn{margin:12px;border:1px solid #b8d8cf;background:#eef8f5;color:#176d5e;border-radius:10px;padding:9px 14px;font-weight:800;cursor:pointer}\n';

for(const p of [path.join(root,'resources','app','package.json'),path.join(root,'package.json')]){if(!fs.existsSync(p))continue;try{const j=JSON.parse(fs.readFileSync(p,'utf8'));if(j.version==='0.82.09'){j.version='0.82.10';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n','utf8');}}catch{}}
fs.writeFileSync(gPath,g,'utf8');
fs.writeFileSync(cssPath,css,'utf8');
fs.writeFileSync(mainPath,main,'utf8');
console.log('UEP 0.82.10 dashboard integration patch applied');
