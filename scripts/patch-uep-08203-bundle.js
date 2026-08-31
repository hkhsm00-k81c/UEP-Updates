const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root) throw new Error('usage: node patch-uep-08203-bundle.js <app-root>');
const gPath=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gPath,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

// 1) Version
must(g.includes('const APP_VERSION = "0.82.02";'),'APP_VERSION 0.82.02 marker missing');
g=g.replace('const APP_VERSION = "0.82.02";','const APP_VERSION = "0.82.03";');

// 2) Transfer-grade source label duplication: dataset.uepGradeSource08186 creates
// data-uep-grade-source08186 (without an extra dash before digits).
must(g.includes("querySelectorAll('[data-uep-grade-source-08186]')"),'grade-source cleanup selector missing');
g=g.replaceAll("querySelectorAll('[data-uep-grade-source-08186]')","querySelectorAll('[data-uep-grade-source08186]')");

// 3) Friday academy outing + dorm return is valid in the base weekly rule.
let lines=g.split(/\r?\n/);
let bi=lines.findIndex(x=>x.includes("{id:'base-weekly-2026'"));
must(bi>=0,'base-weekly-2026 rule missing');
lines[bi]="    {id:'base-weekly-2026',category:'base',name:'기본 주간 입·퇴소 규칙',start:'2026-03-01T00:00',end:'2027-02-28T23:59',days:'금,토,일',effect:'기본 입퇴소',entryTime:'일 19:00',exitTime:'토 08:30',lateEntry:'입소일 22:30',earlyExit:'금 일과후',reason:'학원',priority:20,active:true,note:'평상시에는 금요일에 한해 학원 외출 후 학사 복귀를 허용하며, 기존 금요일 야간 학원 후 바로 귀가도 허용합니다. 모두 개인신청 필요. 토요일 08:30 기본 퇴소. 입소일 19:00 기본 입소, 입소일 학원 사유 학생은 개인신청 시 22:30까지 늦은 입소 허용.',operationState:'운영',priorNightAcademyHome:true,formRequired:true,individualOutingAllowed:true},";

// 4) Professional-supervisor report: group by request type, not weekday.
let mi=lines.findIndex(x=>x.includes('const groups=new Map();reportItems.forEach'));
must(mi>=0,'supervisor report grouping block missing');
must(lines[mi+1]?.includes('const body='),'supervisor report body line missing');
must(lines[mi+2]?.includes('const title='),'supervisor report title line missing');
lines[mi]="    const cat=item=>String(item?.category||item?.type||item?.outingType||'').trim();";
lines[mi+1]="    const fmt=(item,kind)=>{const who=outingStudentNo(item)+' '+item.name,out=String(item.outTime||item.outingTime||'').trim(),ret=String(item.returnTime||item.expectedReturnTime||item.inTime||'').trim();if(kind==='퇴소')return who+(out?' · '+out+' 퇴소':'');if(kind==='늦은입소')return who+(ret?' · '+ret+' 입소 예정':'');return who+(out?' · '+out+' 외출':'')+(ret?' → '+ret+' 복귀 예정':'');};";
lines[mi+2]="    const sections=[['외출 후 학사 복귀',reportItems.filter(x=>['외출','병원외출','학원 외출'].includes(cat(x)))],['조기 퇴소',reportItems.filter(x=>cat(x)==='퇴소'||/학원 후 귀가/.test(cat(x)))],['늦은 입소',reportItems.filter(x=>cat(x)==='늦은입소')]].filter(x=>x[1].length);const body=sections.map(([label,list])=>label+'\\n'+list.sort((a,b)=>String(outingStudentNo(a)).localeCompare(String(outingStudentNo(b)))).map(item=>fmt(item,label==='조기 퇴소'?'퇴소':label==='늦은 입소'?'늦은입소':'외출')).join('\\n')).join('\\n\\n');const kinds=new Set(sections.map(x=>x[0]));const title=kinds.size===1&&kinds.has('늦은 입소')?'[학사 늦은 입소 안내]':kinds.size===1&&kinds.has('조기 퇴소')?'[학사 조기 퇴소 안내]':'[학사 외출 안내]';const empty=sunday?'금일 늦은 입소 학생 없음':friday?'금일 학사 외출·조기 퇴소 학생 없음':'금일 외출 학생 없음';return title+'\\n'+displayDate+'\\n\\n'+(body||empty)+'\\n\\n이상입니다.';";
g=lines.join('\n');

// 5) Current-version release notes: show exactly once after update.
const note=`\n/* UEP_08203_RELEASE_NOTES_ONCE_START */\n(function(){\n  if(typeof window==='undefined'||window.__UEP08203ReleaseNotesInstalled)return;window.__UEP08203ReleaseNotesInstalled=true;\n  const V='0.82.03',KEY='uep.updateNotes.lastShownVersion';\n  function close(){document.getElementById('uepUpdateNotes08203')?.remove();try{localStorage.setItem(KEY,V);localStorage.setItem('uep.releaseNotes.seen',V)}catch{}}\n  function show(){try{if(String(APP_VERSION)!==V||localStorage.getItem(KEY)===V)return}catch{return}document.querySelectorAll('[id^="uepUpdateNotes"]').forEach(x=>x.remove());const l=document.createElement('div');l.id='uepUpdateNotes08203';l.style.cssText='position:fixed;inset:0;z-index:2147483010;background:rgba(20,31,35,.38);display:flex;align-items:center;justify-content:center;padding:24px';l.innerHTML='<div style="width:min(700px,92vw);background:#fff;border-radius:22px;padding:24px;box-shadow:0 26px 70px rgba(0,0,0,.22)"><h2>UEP 0.82.03 업데이트</h2><ul><li>금요일 학원 외출 후 학사 복귀 신청을 기존 조기 퇴소와 구분해 처리합니다.</li><li>전문사감 메일을 외출 후 학사 복귀 · 조기 퇴소 · 늦은 입소로 구분하고 사유·학원명은 제외합니다.</li><li>전입생 성적의 전입교 표기가 학생행에 반복되던 표시 오류를 수정했습니다.</li><li>업데이트 후 수정사항 팝업은 현재 버전에서 최초 1회만 표시됩니다.</li></ul><button type="button" style="float:right;border:0;border-radius:12px;background:#167866;color:#fff;padding:10px 18px;font-weight:900;cursor:pointer">확인</button><div style="clear:both"></div></div>';document.body.appendChild(l);l.querySelector('button').onclick=close;}\n  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900);\n})();\n/* UEP_08203_RELEASE_NOTES_ONCE_END */\n`;
g+=note;

// Optional package version metadata.
for(const p of [path.join(root,'resources','app','package.json'),path.join(root,'package.json')]){if(fs.existsSync(p)){try{const j=JSON.parse(fs.readFileSync(p,'utf8'));if(j.version==='0.82.02'){j.version='0.82.03';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n','utf8')}}catch{}}}

fs.writeFileSync(gPath,g,'utf8');
console.log('UEP 0.82.03 bundled fixes applied');
