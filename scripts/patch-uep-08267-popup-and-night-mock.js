const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'gyomuon.js');
const dp=path.join(root,'electron','google-data.cjs');
const pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
let d=fs.readFileSync(dp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.66["'];/.test(g),'0.82.66 renderer base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.66["'];/,'const APP_VERSION = "0.82.67";').replace(/const CURRENT='0\.82\.66';/g,"const CURRENT='0.82.67';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.67';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// 1) 과거 0.82.21 누적 수정사항 팝업이 현재 APP_VERSION 제목으로 재등장하던 문제 수정.
// 정적 배열 UEP_08221_RELEASE_NOTES는 0.82.21에서만 표시되어야 한다.
const oldPopupGuard=`function uep08221ShowReleaseNotes(){\n  const key='uep:release-notes:'+APP_VERSION;`;
const newPopupGuard=`function uep08221ShowReleaseNotes(){\n  if(String(APP_VERSION)!=='0.82.21') return;\n  const key='uep:release-notes:'+APP_VERSION;`;
must(g.includes(oldPopupGuard),'0.82.21 legacy popup function anchor not found');
g=g.replace(oldPopupGuard,newPopupGuard);

// 2) 야간심화모의고사를 방과후/야간심화와 같은 프로그램 계열로 분류.
const oldIsAfter=`const isAfterSchool = (row) => /방과후|야간심화|야간모의|방학/.test(\`${'${'}row.type || ""} ${'${'}row.programTitle || ""} ${'${'}row.affiliation || ""}\`);`;
const newIsAfter=`const isAfterSchool = (row) => /방과후|야간심화(?:모의고사)?|야간모의|방학/.test(\`${'${'}row.type || ""} ${'${'}row.programTitle || ""} ${'${'}row.affiliation || ""}\`);`;
must(d.includes(oldIsAfter),'isAfterSchool classifier anchor not found');
d=d.replace(oldIsAfter,newIsAfter);

// 3) 12_차시일정 실제 차시 판정에도 야간심화모의고사 포함.
const oldSupported=`const supportedAfterSession=programType==="방과후학교"||/야간심화/.test(programType)||/야간심화/.test(parentType);`;
const newSupported=`const supportedAfterSession=programType==="방과후학교"||/야간심화(?:모의고사)?|야간모의/.test(programType)||/야간심화(?:모의고사)?|야간모의/.test(parentType);`;
must(d.includes(oldSupported),'0.82.66 supportedAfterSession anchor not found');
d=d.replace(oldSupported,newSupported);

// 4) 이번 버전은 신규 팝업 하나만 표시.
g += `\n/* UEP_08267_RELEASE_NOTES_ONCE */\n(function(){const VERSION='0.82.67',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08267'))return;const o=document.createElement('div');o.id='uep-release-08267';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.67 수정사항</h2><ul><li>과거 업데이트 이력이 현재 버전 수정사항처럼 다시 표시되던 중복 팝업을 제거했습니다.</li><li>야간심화모의고사를 12_차시일정의 정식 실제 차시로 인식하도록 연결했습니다.</li><li>방과후·야간심화·야간심화모의고사는 실제 차시 우선 원칙을 동일하게 적용합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;

must(g.includes("if(String(APP_VERSION)!=='0.82.21') return;"),'legacy popup version guard missing');
must(d.includes('야간심화(?:모의고사)?'),'night mock classifier missing');
must(g.includes('UEP_08266_HISTORICAL_NIGHT_ADVANCED_SESSIONS'),'0.82.66 historical night fix missing');
fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(dp,d,'utf8');
console.log('UEP 0.82.67 popup and night mock patch applied');
