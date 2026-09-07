const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'gyomuon.js');
const dp=path.join(root,'electron','google-data.cjs');
const pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
const d=fs.readFileSync(dp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.67["'];/.test(g),'0.82.67 renderer base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.67["'];/,'const APP_VERSION = "0.82.68";').replace(/const CURRENT='0\.82\.67';/g,"const CURRENT='0.82.68';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.68';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// 1) 주간 야간시간표에서 실제 차시임을 명확히 표시한다.
// 원본 12_차시일정은 그대로 보존하고, 카드에 sessionNo만 추가한다.
const slotAnchor='function dashboardProgramNightSlot(program){';
must(g.includes(slotAnchor),'dashboardProgramNightSlot anchor missing');
const helper=`function dashboardProgramSessionLabel(program){\n  const raw=String(program?.sessionNo||program?.sourceSessionNo||"").trim();\n  if(!raw) return "";\n  const no=raw.replace(/차시$/,"").trim();\n  return no?\`${'${'}no}차시\`:"";\n}\n`;
g=g.replace(slotAnchor,helper+slotAnchor);

const oldCards='const programCards=programs.map(p=>`<button class="dashboard-night-program-chip" data-dashboard-night-program="${escapeHtml(p.id||p.programId||"")}" data-dashboard-night-program-day="${key}"><b>${/야간심화/.test(`${p.afterType||""} ${p.title||""}`)?"야간심화":"방과후"}</b><span>${escapeHtml(p.actualTitle||p.title||"프로그램")}</span></button>`).join("");';
const newCards='const programCards=programs.map(p=>{const kind=/야간심화/.test(`${p.afterType||""} ${p.title||""}`)?"야간심화":"방과후";const sessionLabel=dashboardProgramSessionLabel(p);return `<button class="dashboard-night-program-chip" data-dashboard-night-program="${escapeHtml(p.id||p.programId||"")}" data-dashboard-night-program-day="${key}"><b>${escapeHtml([kind,sessionLabel].filter(Boolean).join(" "))}</b><span>${escapeHtml(p.actualTitle||p.title||"프로그램")}</span></button>`;}).join("");';
must(g.includes(oldCards),'weekly night program card anchor missing');
g=g.replace(oldCards,newCards);

// 2) 카드 클릭 상세에도 차시를 보여 실제로 서로 다른 수업임을 확인할 수 있게 한다.
const oldDetail='<div class="connection-detail"><div><b>구분</b><span>${isNight?"야간심화":"방과후"}</span></div><div><b>교과</b><span>${escapeHtml(program.subject||"-")}</span></div><div><b>담당교사</b><span>${escapeHtml(program.teacher||"-")}</span></div><div><b>장소</b><span>${escapeHtml(program.place||"-")}</span></div></div>';
const newDetail='<div class="connection-detail"><div><b>구분</b><span>${isNight?"야간심화":"방과후"}</span></div><div><b>차시</b><span>${escapeHtml(dashboardProgramSessionLabel(program)||"-")}</span></div><div><b>교과</b><span>${escapeHtml(program.subject||"-")}</span></div><div><b>담당교사</b><span>${escapeHtml(program.teacher||"-")}</span></div><div><b>장소</b><span>${escapeHtml(program.place||"-")}</span></div></div>';
must(g.includes(oldDetail),'night program drawer detail anchor missing');
g=g.replace(oldDetail,newDetail);

// 3) 0.82.67 릴리즈 노트는 0.82.67에서만 동작하도록 고정한다.
// 신규 설치가 0.82.68로 바로 올라와도 과거 팝업이 연속으로 뜨지 않게 한다.
const old067="(function(){const VERSION='0.82.67',KEY='uep:release-notes:'+VERSION;function show(){";
const new067="(function(){const VERSION='0.82.67',KEY='uep:release-notes:'+VERSION;if(String(APP_VERSION)!==VERSION)return;function show(){";
must(g.includes(old067),'0.82.67 release note anchor missing');
g=g.replace(old067,new067);

// 4) 이번 버전 수정사항은 0.82.68에서만 1회 표시한다.
g += `\n/* UEP_08268_RELEASE_NOTES_ONCE */\n(function(){const VERSION='0.82.68',KEY='uep:release-notes:'+VERSION;if(String(APP_VERSION)!==VERSION)return;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08268'))return;const o=document.createElement('div');o.id='uep-release-08268';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.68 수정사항</h2><ul><li>야간시간표의 방과후·야간심화 실제 수업을 중복으로 제거하지 않고 각 차시로 명확히 표시합니다.</li><li>카드에 15차시·16차시처럼 실제 차시번호를 표시하고, 클릭 상세에도 차시 정보를 추가했습니다.</li><li>12_차시일정 원본과 출결 집계는 변경하지 않습니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;

must(g.includes('function dashboardProgramSessionLabel(program)'),'session label helper missing');
must(g.includes('sessionLabel=dashboardProgramSessionLabel(p)'),'weekly session label render missing');
must(g.includes("if(String(APP_VERSION)!==VERSION)return;function show()"),'release note version gate missing');
must(d.includes('sessionNo:computedSessionNo.get(sessionId)'),'canonical sessionNo source missing');
must(d.includes('야간심화(?:모의고사)?'),'night mock session support missing');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.68 night session label patch applied');
