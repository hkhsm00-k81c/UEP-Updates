const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
const mainFile=path.resolve(appRoot,'resources','app','electron','main.cjs');
let g=fs.readFileSync(rendererFile,'utf8');
let m=fs.readFileSync(mainFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.52";');

// 1) 날짜가 ISO·한국식·Date 문자열이어도 화면 기준 YYYY-MM-DD로 비교합니다.
const attendanceAnchor='function attendanceView() {';
assert(g.includes(attendanceAnchor)&&!g.includes('function uepComparableDate('),'attendance date anchor mismatch');
g=g.replace(attendanceAnchor,`function uepComparableDate(value){
  if(value==null||value==='')return '';
  const text=String(value).trim();
  const match=text.match(/(\\d{4})[.\\-/년]\\s*(\\d{1,2})[.\\-/월]\\s*(\\d{1,2})/);
  if(match)return \`\${match[1]}-\${match[2].padStart(2,'0')}-\${match[3].padStart(2,'0')}\`;
  const parsed=new Date(text);
  if(!Number.isNaN(parsed.getTime()))return \`\${parsed.getFullYear()}-\${String(parsed.getMonth()+1).padStart(2,'0')}-\${String(parsed.getDate()).padStart(2,'0')}\`;
  return text.slice(0,10);
}
${attendanceAnchor}`);
g=g.replaceAll('officialRows.filter(row => row.date === attendanceViewDate)','officialRows.filter(row => uepComparableDate(row.date) === attendanceViewDate)');
g=g.replaceAll("String(row.date||row.day||'').slice(0,10)===todayKey","uepComparableDate(row.date||row.day)===todayKey");
g=g.replaceAll("String(r.date||r.day||'').slice(0,10)===basisDate","uepComparableDate(r.date||r.day)===basisDate");

// 2) 개인별 내신 대표값은 최근 학기의 학기말 평균, 없을 때 최근 시험 평균만 사용합니다.
const averageOld=`const gradeValues=rows.map(x=>Number(x.level)).filter(Number.isFinite);
  const average=gradeValues.length?(gradeValues.reduce((a,b)=>a+b,0)/gradeValues.length).toFixed(2):"-";`;
const averageNew=`let averageRows=rows, averageLabel='5등급제 평균';
  if(scoreMode==='internal'&&scope==='individual'){
    const periods=[...new Set(rows.map(scorePeriodKey).filter(Boolean))].sort();
    const latestPeriod=periods.at(-1)||'';
    const periodRows=latestPeriod?rows.filter(row=>scorePeriodKey(row)===latestPeriod):rows;
    const preferredExam=['학기말고사','2차고사','1차고사'].find(name=>periodRows.some(row=>row.exam===name));
    averageRows=preferredExam?periodRows.filter(row=>row.exam===preferredExam):periodRows;
    averageLabel=preferredExam==='학기말고사'?'최근 학기말 평균':preferredExam?\`최근 \${preferredExam} 임시평균\`:'5등급제 평균';
  }
  const gradeValues=averageRows.map(x=>Number(x.level)).filter(Number.isFinite);
  const average=gradeValues.length?(gradeValues.reduce((a,b)=>a+b,0)/gradeValues.length).toFixed(2):"-";`;
assert(g.includes(averageOld),'internal average anchor not found');
g=g.replace(averageOld,averageNew);
const thirdOld='const third=scoreMode==="mock"?`<span><b>${subjects}</b>과목별 등급</span>`:`<span><b>${average}</b>5등급제 평균</span>`;';
const thirdNew='const third=scoreMode==="mock"?`<span><b>${subjects}</b>과목별 등급</span>`:`<span><b>${average}</b>${escapeHtml(averageLabel)}</span>`;';
assert(g.includes(thirdOld),'internal average label anchor not found');
g=g.replace(thirdOld,thirdNew);

// 3) 선택과목 학생 상세를 목록 아래가 아닌 고정 우측 패널로 엽니다.
const detailFunction=`
function openCurriculumStudentSidePanel(studentId){
  const data=uepSelectionDataset(),all=data.rows.filter(uepSelectionActiveRow08129);
  const scope=String(recordClassNo)==='all'?all:all.filter(row=>recordStudentClass(row.__student)===String(recordClassNo));
  const row=scope.find(item=>String(item.__student.id)===String(studentId));
  if(!row)return toast('학생 신청자료를 찾지 못했습니다.');
  recordStudentId=row.__student.id;
  const errors=data.errors.filter(error=>error.student.id===row.__student.id),index=scope.indexOf(row);
  document.querySelector('[data-curriculum-student-panel]')?.remove();
  const layer=document.createElement('div');layer.dataset.curriculumStudentPanel='1';
  layer.style.cssText='position:fixed;inset:0;z-index:10020;background:rgba(20,39,48,.34);display:flex;justify-content:flex-end';
  layer.innerHTML='<aside style="width:min(980px,78vw);height:100%;background:#fff;box-shadow:-14px 0 40px rgba(24,54,65,.18);overflow:auto;padding:22px"><header style="position:sticky;top:-22px;z-index:2;background:#fff;padding:16px 0 14px;border-bottom:1px solid #dce8eb;display:flex;align-items:center;gap:10px"><button class="btn secondary" data-curriculum-panel-prev>‹ 이전</button><div style="flex:1"><small>'+escapeHtml(recordClassNo==='all'?'전체 학생':recordClassNo+'반')+'</small><h2 style="margin:3px 0">'+escapeHtml(row.__student.studentNo)+' '+escapeHtml(row.__student.name)+'</h2></div><button class="btn secondary" data-curriculum-panel-next>다음 ›</button><button class="btn primary" data-curriculum-panel-close>목록으로</button></header><div style="padding-top:18px">'+uepStudentApplicationDetail(row,errors)+'</div></aside>';
  document.body.appendChild(layer);
  const close=()=>layer.remove();layer.querySelector('[data-curriculum-panel-close]').onclick=close;layer.onclick=e=>{if(e.target===layer)close();};
  layer.querySelector('[data-curriculum-panel-prev]').onclick=()=>{const next=scope[(index-1+scope.length)%scope.length];layer.remove();if(next)openCurriculumStudentSidePanel(next.__student.id);};
  layer.querySelector('[data-curriculum-panel-next]').onclick=()=>{const next=scope[(index+1)%scope.length];layer.remove();if(next)openCurriculumStudentSidePanel(next.__student.id);};
}
`;
const detailAnchor='function uepSubjectGroup08128(subject){';
assert(g.includes(detailAnchor)&&!g.includes('function openCurriculumStudentSidePanel('),'curriculum side panel anchor mismatch');
g=g.replace(detailAnchor,detailFunction+'\n'+detailAnchor);
const studentHandlerA="$$('[data-record-student]').forEach(b=>b.onclick=()=>{recordStudentId=b.dataset.recordStudent;render('records');});";
const studentHandlerB="$$('[data-record-student]').forEach(button=>button.onclick=()=>{recordStudentId=button.dataset.recordStudent;render('records');});";
const studentCount=(g.split(studentHandlerA).length-1)+(g.split(studentHandlerB).length-1);
assert(studentCount>=3,'curriculum student handlers not found');
g=g.split(studentHandlerA).join("$$('[data-record-student]').forEach(b=>b.onclick=()=>openCurriculumStudentSidePanel(b.dataset.recordStudent));");
g=g.split(studentHandlerB).join("$$('[data-record-student]').forEach(button=>button.onclick=()=>openCurriculumStudentSidePanel(button.dataset.recordStudent));");

// 4) 공지는 저장 결과를 즉시 캐시에 반영하고, 전체 재조회 없이 화면을 갱신합니다.
const noticeHelperAnchor='function openNoticeEditor(id=""){' ;
const noticeHelpers=`function upsertNoticeCache(payload,id){
  readonlyCache=readonlyCache||{};readonlyCache.notices=Array.isArray(readonlyCache.notices)?readonlyCache.notices:[];
  const normalized={...payload,id:String(id||payload.id||''),status:payload.status||'게시',detail:payload.content,date:payload.postDate,receipts:readonlyCache.notices.find(x=>String(x.id)===String(id))?.receipts||[]};
  const index=readonlyCache.notices.findIndex(x=>String(x.id)===String(normalized.id));
  if(index>=0)readonlyCache.notices[index]={...readonlyCache.notices[index],...normalized};else readonlyCache.notices.unshift(normalized);
  return normalized;
}
function setNoticeBusy(form,busy,label='저장 중…'){
  const button=form?.querySelector('button[type="submit"]');if(!button)return;
  if(busy){button.dataset.originalText=button.textContent;button.disabled=true;button.textContent=label;form.setAttribute('aria-busy','true');}
  else{button.disabled=false;button.textContent=button.dataset.originalText||'저장';form.removeAttribute('aria-busy');}
}
`;
assert(g.includes(noticeHelperAnchor)&&!g.includes('function upsertNoticeCache('),'notice helper anchor mismatch');
g=g.replace(noticeHelperAnchor,noticeHelpers+noticeHelperAnchor);
const submitStart='$("#noticeEditorForm").onsubmit=async(e)=>{e.preventDefault();const k=$("#noticeKind").value;';
assert(g.includes(submitStart),'notice submit start not found');
g=g.replace(submitStart,'$("#noticeEditorForm").onsubmit=async(e)=>{e.preventDefault();const form=e.currentTarget;if(form.getAttribute(\'aria-busy\')===\'true\')return;const k=$("#noticeKind").value;');
const submitSave=`const result=await window.schoolBoard?.saveNotice?.(payload);if(!result?.ok)return toast(result?.reason||'공지를 저장하지 못했습니다.');await refreshReadonlyAfterNotice();closeDrawer();workBoardMode='notice';render(state.activePage==='work'?'work':'dashboard');toast(isEdit?'공지를 수정했습니다.':'학교업무 공지를 등록했습니다.');};`;
const submitSaveNew=`setNoticeBusy(form,true,isEdit?'수정 저장 중…':'공지 등록 중…');try{const result=await window.schoolBoard?.saveNotice?.(payload);if(!result?.ok){toast(result?.reason||'공지를 저장하지 못했습니다.');return;}upsertNoticeCache(payload,result.id||payload.id);closeDrawer();workBoardMode='notice';render(state.activePage==='work'?'work':'dashboard');toast(result.duplicate?'같은 공지가 이미 등록되어 기존 공지를 표시합니다.':isEdit?'공지를 수정했습니다.':'학교업무 공지를 등록했습니다.');}catch(error){toast(error?.message||'공지를 저장하지 못했습니다.');}finally{setNoticeBusy(form,false);}};`;
assert(g.includes(submitSave),'notice save sequence not found');
g=g.replace(submitSave,submitSaveNew);

const receiptOld=`const result=await window.schoolBoard?.saveNoticeReceipt?.(payload);if(!result?.ok){toast(result?.reason||'확인 상태를 저장하지 못했습니다.');return false;}await refreshReadonlyAfterNotice();return true;`;
const receiptNew=`const result=await window.schoolBoard?.saveNoticeReceipt?.(payload);if(!result?.ok){toast(result?.reason||'확인 상태를 저장하지 못했습니다.');return false;}item.receipts=Array.isArray(item.receipts)?item.receipts:[];const keyIndex=item.receipts.findIndex(row=>(payload.userId&&String(row.userId)===String(payload.userId))||String(row.teacher)===String(payload.teacher));const nextReceipt={...(keyIndex>=0?item.receipts[keyIndex]:{}),...payload,confirmed:Boolean(change.confirmed),submitted:Boolean(change.submitted),modifiedAt:new Date().toISOString()};if(keyIndex>=0)item.receipts[keyIndex]=nextReceipt;else item.receipts.push(nextReceipt);return true;`;
assert(g.includes(receiptOld),'notice receipt refresh sequence not found');
g=g.replace(receiptOld,receiptNew);

// 5) 다른 교사의 변경을 받기 위한 10분 동기화는 유지하되, 공지 단건 작업에서는 전체 재조회를 제거했습니다.

// 같은 공지를 느린 저장 중 반복 클릭해도 중복 행을 만들지 않습니다.
const backendAnchor=`const headers=header.headers.slice(), idCol=headers.indexOf("공지ID");`;
const backendNew=`const headers=header.headers.slice(), idCol=headers.indexOf("공지ID");
    if(!payload.id){
      const idx=name=>headers.indexOf(name), same=matrix.find((r,i)=>i>header.index&&String(r?.[idx("제목")]||"").trim()===String(payload.title||"").trim()&&String(r?.[idx("내용")]||"").trim()===String(payload.content||"").trim()&&String(r?.[idx("대상반")]||"전체").trim()===String(payload.targetClass||"전체").trim()&&String(r?.[idx("게시일")]||"").slice(0,10)===String(payload.postDate||"").slice(0,10)&&!["삭제","종료"].includes(String(r?.[idx("상태")]||"게시")));
      if(same)return {ok:true,id:String(same[idCol]||id),duplicate:true};
    }`;
assert(m.includes(backendAnchor),'notice backend header anchor not found');
m=m.replace(backendAnchor,backendNew);

for(const marker of ['const APP_VERSION = "0.81.52";','function uepComparableDate(','최근 학기말 평균','function openCurriculumStudentSidePanel(','function upsertNoticeCache(','const READONLY_AUTO_REFRESH_MS = 10 * 60 * 1000;'])assert(g.includes(marker),'renderer marker missing: '+marker);
for(const marker of ['if(!payload.id){','duplicate:true'])assert(m.includes(marker),'main marker missing: '+marker);
fs.writeFileSync(rendererFile,g,'utf8');
fs.writeFileSync(mainFile,m,'utf8');
console.log('UEP 0.81.52 accumulated operations and performance fixes applied');
