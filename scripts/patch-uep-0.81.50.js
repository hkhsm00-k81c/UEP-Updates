const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(rendererFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.50";');

// Electron에서 동작하지 않는 prompt()를 제거하고 설정과 동일한 보안 모달을 사용합니다.
const oldUnlock=`async function unlockSubjectConfidential(){if(!subjectConfidentialAllowed())return false;if(sessionStorage.getItem(UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY)==='1')return true;if(!subjectConfidentialPasswordConfigured()){alert('설정 → 사용자·보안에서 선택과목 대외비 비밀번호를 먼저 설정해 주세요.');return false;}const p=prompt('선택과목 대외비 비밀번호를 입력하세요.');if(!p)return false;if(await subjectConfidentialDigest(p)!==subjectConfidentialPasswordHash()){alert('선택과목 대외비 비밀번호가 일치하지 않습니다.');return false;}sessionStorage.setItem(UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY,'1');return true;}`;
const newUnlock=`async function unlockSubjectConfidential(){
  if(!subjectConfidentialAllowed()){toast('관리자·학년부장만 과목별 신청현황을 열람할 수 있습니다.');return false;}
  if(sessionStorage.getItem(UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY)==='1')return true;
  if(!subjectConfidentialPasswordConfigured()){toast('설정 → 사용자·보안에서 선택과목 대외비 비밀번호를 먼저 설정해 주세요.');return false;}
  const result=await sensitivePasswordModal({mode:'unlock',configured:true});
  if(!result)return false;
  if(await subjectConfidentialDigest(result.first)!==subjectConfidentialPasswordHash()){toast('선택과목 대외비 비밀번호가 일치하지 않습니다.');return false;}
  sessionStorage.setItem(UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY,'1');
  return true;
}`;
assert(g.includes(oldUnlock),'prompt-based subject unlock not found');
g=g.replace(oldUnlock,newUnlock);

// 0.81.34의 화면 보정 IIFE 안에 남아 있던 미사용 구형 prompt 함수도 제거합니다.
const legacyIifeUnlock=` async function unlockSubjectConfidential(){
   if(!privileged())return false;
   if(sessionStorage.getItem(SESSION_KEY)==='1')return true;
   const saved=localStorage.getItem(PIN_KEY)||'';
   if(!saved){alert('설정에서 선택과목 대외비 비밀번호를 먼저 설정해 주세요.');return false;}
   const p=prompt('선택과목 대외비 비밀번호를 입력하세요.');if(!p)return false;
   if(await digest(p)!==saved){alert('선택과목 대외비 비밀번호가 일치하지 않습니다.');return false;}
   sessionStorage.setItem(SESSION_KEY,'1');return true;
 }
`;
assert(g.includes(legacyIifeUnlock),'legacy IIFE subject prompt not found');
g=g.replace(legacyIifeUnlock,'');

const trendStart=g.indexOf('function mockTrendStatisticsMarkup(classNo){');
const trendEnd=g.indexOf('\nfunction internalNineGradeCut(',trendStart);
assert(trendStart>=0&&trendEnd>trendStart,'mock trend function bounds not found');
const groupedBarTrend=`function mockTrendStatisticsMarkup(classNo){
  const rows=scoreStatisticsRows("mock","",classNo);
  const exams=[...new Set(rows.map(row=>row.exam).filter(Boolean))].sort((a,b)=>scoreExamOrder(a)-scoreExamOrder(b)||String(a).localeCompare(String(b),"ko"));
  const preferred=["국어","수학","영어","한국사"];
  const subjects=[...new Set(rows.map(row=>row.subject).filter(Boolean))].sort((a,b)=>{const ai=preferred.indexOf(a),bi=preferred.indexOf(b);return (ai<0?99:ai)-(bi<0?99:bi)||String(a).localeCompare(String(b),"ko");});
  if(!scoreStatisticsTrendSubject||!subjects.includes(scoreStatisticsTrendSubject))scoreStatisticsTrendSubject=subjects[0]||"";
  const subject=scoreStatisticsTrendSubject;
  if(exams.length<2)return '<div class="query-empty"><b>비교할 모의고사가 부족합니다.</b><span>서로 다른 시험 자료가 2회 이상 연결되면 추이를 표시합니다.</span></div>';
  const grades=Array.from({length:9},(_,i)=>i+1),categories=[...grades.map(x=>x+'등급'),'1~2등급','1~4등급'];
  const counts=exams.map(exam=>{const basic=grades.map(grade=>rows.filter(row=>row.exam===exam&&row.subject===subject&&Number(row.level)===grade).length);return [...basic,basic[0]+basic[1],basic.slice(0,4).reduce((a,b)=>a+b,0)];});
  const colors=['#0b8a78','#2f80ed','#f2994a','#9b51e0','#eb5757','#219653'];
  const max=Math.max(1,...counts.flat()),W=1120,H=380,left=52,right=22,top=38,bottom=72,plotW=W-left-right,plotH=H-top-bottom;
  const groupW=plotW/categories.length,gap=Math.max(2,Math.min(7,groupW*.05)),barW=Math.max(5,Math.min(28,(groupW-gap*(exams.length+1))/exams.length));
  const y=v=>top+plotH-(v/max)*plotH;
  const grid=Array.from({length:5},(_,i)=>{const value=Math.round(max*(4-i)/4),yy=top+plotH*i/4;return '<line x1="'+left+'" y1="'+yy+'" x2="'+(W-right)+'" y2="'+yy+'" stroke="#dfe9ec"/><text x="'+(left-9)+'" y="'+(yy+4)+'" text-anchor="end" font-size="11" fill="#718690">'+value+'</text>';}).join('');
  const bars=categories.map((category,gi)=>{const used=barW*exams.length+gap*(exams.length-1),start=left+gi*groupW+(groupW-used)/2;return exams.map((exam,ei)=>{const v=counts[ei][gi],x=start+ei*(barW+gap),yy=y(v),h=top+plotH-yy,color=colors[ei%colors.length];return '<rect x="'+x+'" y="'+yy+'" width="'+barW+'" height="'+h+'" rx="3" fill="'+color+'"><title>'+escapeHtml(exam)+' · '+category+' '+v+'명</title></rect><text x="'+(x+barW/2)+'" y="'+Math.max(top+10,yy-5)+'" text-anchor="middle" font-size="10" font-weight="700" fill="'+color+'">'+v+'</text>';}).join('')+'<text x="'+(left+gi*groupW+groupW/2)+'" y="'+(H-27)+'" text-anchor="middle" font-size="12" font-weight="800" fill="#315667">'+category+'</text>';}).join('');
  const legend=exams.map((exam,i)=>'<span style="display:inline-flex;align-items:center;gap:6px;font-weight:800"><i style="width:12px;height:12px;border-radius:3px;background:'+colors[i%colors.length]+'"></i>'+escapeHtml(exam)+'</span>').join('');
  const tableHead='<div style="display:grid;grid-template-columns:140px repeat(11,minmax(70px,1fr));background:#28566f;color:white;font-weight:800"><span style="padding:11px">시험</span>'+categories.map(c=>'<span style="padding:11px;text-align:center">'+c+'</span>').join('')+'</div>';
  const tableRows=exams.map((exam,i)=>'<div style="display:grid;grid-template-columns:140px repeat(11,minmax(70px,1fr));border-top:1px solid #e2ebee"><b style="padding:11px;color:'+colors[i%colors.length]+'">'+escapeHtml(exam)+'</b>'+counts[i].map(v=>'<span style="padding:11px;text-align:center">'+v+'명</span>').join('')+'</div>').join('');
  return '<section class="score-stat-section"><div class="score-stat-title"><div><h3>'+escapeHtml(subject)+' 시험별 등급 분포 비교</h3><p>X축은 1~9등급과 누적 1~2·1~4등급, Y축은 인원입니다. 각 항목에서 시험별 막대를 나란히 비교합니다.</p></div><span>'+exams.length+'회</span></div><div style="padding:16px;overflow-x:auto"><div style="display:flex;flex-wrap:wrap;gap:16px;margin:0 0 8px">'+legend+'</div><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;min-width:980px">'+grid+bars+'</svg><div style="min-width:940px">'+tableHead+tableRows+'</div></div></section>';
}`;
g=g.slice(0,trendStart)+groupedBarTrend+g.slice(trendEnd);

for(const marker of [
  'const APP_VERSION = "0.81.50";',
  "const result=await sensitivePasswordModal({mode:'unlock',configured:true});",
  'function mockTrendStatisticsMarkup(classNo)',
  '시험별 등급 분포 비교',
  'data-score-stat-type="mocktrend"',
  "if(next==='subjects'&&!(await unlockSubjectConfidential()))return;"
])assert(g.includes(marker),'0.81.50 marker missing: '+marker);
assert(!g.includes("const p=prompt('선택과목 대외비 비밀번호를 입력하세요.')"),'obsolete subject prompt remains');

fs.writeFileSync(rendererFile,g,'utf8');
console.log('UEP 0.81.50 subject modal unlock and grouped bar trend applied');
