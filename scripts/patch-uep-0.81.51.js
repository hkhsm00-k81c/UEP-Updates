const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(rendererFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.51";');

const oldScale=`const max=Math.max(1,...counts.flat()),W=1120,H=380,left=52,right=22,top=38,bottom=72,plotW=W-left-right,plotH=H-top-bottom;
  const groupW=plotW/categories.length,gap=Math.max(2,Math.min(7,groupW*.05)),barW=Math.max(5,Math.min(28,(groupW-gap*(exams.length+1))/exams.length));
  const y=v=>top+plotH-(v/max)*plotH;
  const grid=Array.from({length:5},(_,i)=>{const value=Math.round(max*(4-i)/4),yy=top+plotH*i/4;`;
const newScale=`const rawMax=Math.max(1,...counts.flat()),chartMax=Math.max(rawMax+4,Math.ceil(rawMax*1.12)),W=1120,H=380,left=52,right=22,top=38,bottom=72,plotW=W-left-right,plotH=H-top-bottom;
  const groupW=plotW/categories.length,gap=Math.max(2,Math.min(7,groupW*.05)),barW=Math.max(5,Math.min(28,(groupW-gap*(exams.length+1))/exams.length));
  const y=v=>top+plotH-(v/chartMax)*plotH;
  const grid=Array.from({length:5},(_,i)=>{const value=Math.round(chartMax*(4-i)/4),yy=top+plotH*i/4;`;
assert(g.includes(oldScale),'grouped bar scale anchor not found');
g=g.replace(oldScale,newScale);

// 시험별 추이는 기본적으로 연결된 전체 과목을 한 화면에 연속 표시합니다.
const oldSubjectPick=`if(!scoreStatisticsTrendSubject||!subjects.includes(scoreStatisticsTrendSubject))scoreStatisticsTrendSubject=subjects[0]||"";
  const subject=scoreStatisticsTrendSubject;
  if(exams.length<2)return '<div class="query-empty"><b>비교할 모의고사가 부족합니다.</b><span>서로 다른 시험 자료가 2회 이상 연결되면 추이를 표시합니다.</span></div>';
  const grades=`;
const newSubjectPick=`if(!scoreStatisticsTrendSubject||(scoreStatisticsTrendSubject!=="__all__"&&!subjects.includes(scoreStatisticsTrendSubject)))scoreStatisticsTrendSubject="__all__";
  const subject=scoreStatisticsTrendSubject;
  if(exams.length<2)return '<div class="query-empty"><b>비교할 모의고사가 부족합니다.</b><span>서로 다른 시험 자료가 2회 이상 연결되면 추이를 표시합니다.</span></div>';
  const renderSubject=subject=>{
  const grades=`;
assert(g.includes(oldSubjectPick),'trend subject selection anchor not found');
g=g.replace(oldSubjectPick,newSubjectPick);

const oldTrendReturn=`return '<section class="score-stat-section"><div class="score-stat-title"><div><h3>'+escapeHtml(subject)+' 시험별 등급 분포 비교</h3><p>X축은 1~9등급과 누적 1~2·1~4등급, Y축은 인원입니다. 각 항목에서 시험별 막대를 나란히 비교합니다.</p></div><span>'+exams.length+'회</span></div><div style="padding:16px;overflow-x:auto"><div style="display:flex;flex-wrap:wrap;gap:16px;margin:0 0 8px">'+legend+'</div><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;min-width:980px">'+grid+bars+'</svg><div style="min-width:940px">'+tableHead+tableRows+'</div></div></section>';
}`;
const newTrendReturn=`return '<section class="score-stat-section"><div class="score-stat-title"><div><h3>'+escapeHtml(subject)+' 시험별 등급 분포 비교</h3><p>X축은 1~9등급과 누적 1~2·1~4등급, Y축은 인원입니다. 각 항목에서 시험별 막대를 나란히 비교합니다.</p></div><span>'+exams.length+'회</span></div><div style="padding:16px;overflow-x:auto"><div style="display:flex;flex-wrap:wrap;gap:16px;margin:0 0 8px">'+legend+'</div><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;min-width:980px">'+grid+bars+'</svg><div style="min-width:940px">'+tableHead+tableRows+'</div></div></section>';
  };
  const visibleSubjects=subject==="__all__"?subjects:[subject];
  return visibleSubjects.map(renderSubject).join('')||'<div class="query-empty"><b>표시할 과목 자료가 없습니다.</b></div>';
}`;
assert(g.includes(oldTrendReturn),'trend return anchor not found');
g=g.replace(oldTrendReturn,newTrendReturn);

const oldViewSubjectInit=`if(!scoreStatisticsTrendSubject||!subjects.includes(scoreStatisticsTrendSubject))scoreStatisticsTrendSubject=subjects[0]||"";`;
const newViewSubjectInit=`if(!scoreStatisticsTrendSubject||(scoreStatisticsTrendSubject!=="__all__"&&!subjects.includes(scoreStatisticsTrendSubject)))scoreStatisticsTrendSubject="__all__";`;
assert(g.includes(oldViewSubjectInit),'statistics view subject init not found');
g=g.replace(oldViewSubjectInit,newViewSubjectInit);
const oldSelector=`const selector=isTrend?\`<label>과목<select id="scoreStatisticsTrendSubject">\${subjects.map(subject=>\`<option \${subject===scoreStatisticsTrendSubject?"selected":""}>\${escapeHtml(subject)}</option>\`).join("")}</select></label>\``;
const newSelector=`const selector=isTrend?\`<label>과목<select id="scoreStatisticsTrendSubject"><option value="__all__" \${scoreStatisticsTrendSubject==="__all__"?"selected":""}>전체 과목</option>\${subjects.map(subject=>\`<option \${subject===scoreStatisticsTrendSubject?"selected":""}>\${escapeHtml(subject)}</option>\`).join("")}</select></label>\``;
assert(g.includes(oldSelector),'statistics trend selector not found');
g=g.replace(oldSelector,newSelector);

for(const marker of ['const APP_VERSION = "0.81.51";','chartMax=Math.max(rawMax+4,Math.ceil(rawMax*1.12))','visibleSubjects=subject==="__all__"?subjects:[subject]','>전체 과목</option>','시험별 등급 분포 비교',"const result=await sensitivePasswordModal({mode:'unlock',configured:true});"])assert(g.includes(marker),'0.81.51 marker missing: '+marker);
fs.writeFileSync(rendererFile,g,'utf8');
console.log('UEP 0.81.51 mock bar label headroom applied');
