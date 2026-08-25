const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const gFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}
function replaceOnce(oldText,newText,label){assert(g.includes(oldText),label+' anchor not found');g=g.replace(oldText,newText);}

// Version
g=g.replace(/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/,'const APP_VERSION = "0.81.62";');

// 1) 교육과정 클릭 바인딩: 단일 selector($)에 forEach를 호출하던 0.81.61 실배포 오류 수정.
replaceOnce("$('[data-curriculum-workspace]').forEach(b=>b.onclick=async()=>{", "$$('[data-curriculum-workspace]').forEach(b=>b.onclick=async()=>{/* __UEP_08162_CURRICULUM_BINDINGS__ */", 'curriculum workspace collection');
replaceOnce("$('[data-cross-student]').forEach(b=>b.onclick=()=>openCurriculumStudentSidePanel(b.dataset.crossStudent));", "$$('[data-cross-student]').forEach(b=>b.onclick=()=>openCurriculumStudentSidePanel(b.dataset.crossStudent));", 'cross student collection');
replaceOnce("$('[data-curriculum-subject]').forEach(b=>b.onclick=()=>{", "$$('[data-curriculum-subject]').forEach(b=>b.onclick=()=>{", 'curriculum subject collection');

// 2) 공결: 모든 화면이 하나의 canonical date helper를 사용.
const helperAnchor="function dashboardStudentStatusCompactMarkup(){";
assert(g.includes(helperAnchor),'dashboard status compact anchor missing');
const helper=`function officialAttendanceRowsForDate08162(date){
  // __UEP_08162_OFFICIAL_SINGLE_DATE_SOURCE__
  const key=String(date||'').slice(0,10);
  return (readonlyCache?.officialAttendance||[]).filter(row=>String(row?.date||'').slice(0,10)===key);
}
`;
g=g.replace(helperAnchor,helper+helperAnchor);
replaceOnce("const official=filterRowsForDashboardStatus((readonlyCache?.officialAttendance||[]).filter(row=>uepComparableDate(row.date||row.day)===todayKey));","const official=filterRowsForDashboardStatus(officialAttendanceRowsForDate08162(todayKey));",'dashboard compact official');
replaceOnce("const official=filterRowsForDashboardStatus((readonlyCache?.officialAttendance||[]).filter(row=>uepComparableDate(row.date||row.day)===todayKey));","const official=filterRowsForDashboardStatus(officialAttendanceRowsForDate08162(todayKey));",'dashboard main official');
replaceOnce("const official=(readonlyCache?.officialAttendance||[]).filter(r=>{/* __UEP_08161_DASHBOARD_OFFICIAL_CANONICAL_DATE__ officialAttendance.date is already canonical YYYY-MM-DD from google-data localDate(); do not reparse or offset it */return String(r.date||'').slice(0,10)===basisDate;}).map(r=>({...r,dashboardStatusType:dashboardOfficialAttendanceLabel(r,'공결')}));","const official=officialAttendanceRowsForDate08162(basisDate).map(r=>({...r,dashboardStatusType:dashboardOfficialAttendanceLabel(r,'공결')}));",'dashboard detail official');
replaceOnce("const selectedDay = officialRows.filter(row => uepComparableDate(row.date||row.day||row.rawDate||row['일자']||row['출결일자'],attendanceViewDate) === attendanceViewDate);","const selectedDay = officialAttendanceRowsForDate08162(attendanceViewDate);",'attendance page official');

// 3) 직접 학교업무 공지: 일반공지도 확인 대상.
const noticePayloadOld="confirmRequired:['확인요청','제출요청','종례전달','긴급'].includes(k),submitRequired:k==='제출요청'";
const noticePayloadNew="confirmRequired:true,submitRequired:k==='제출요청'/* __UEP_08162_DIRECT_NOTICE_CONFIRM_REQUIRED__ */";
replaceOnce(noticePayloadOld,noticePayloadNew,'direct notice confirm required');

// 기존 0.81.61 일반공지도 즉시 확인 버튼을 제공한다.
const detailOld="const stateInfo=noticeActionState(item), expected=noticeExpectedCount(item), confirmCount=Number(item.confirmedCount||0), submitCount=Number(item.submittedCount||0);\n  const isHead=currentUserCanManageNotices();";
const detailNew="const directConfirmRequired=item?.type==='공지'?true:Boolean(item?.confirmRequired);/* __UEP_08162_EXISTING_NOTICE_CONFIRM_GATE__ */\n  const stateInfo=noticeActionState({...item,confirmRequired:directConfirmRequired}), expected=noticeExpectedCount(item), confirmCount=Number(item.confirmedCount||0), submitCount=Number(item.submittedCount||0);\n  const isHead=currentUserCanManageNotices();";
replaceOnce(detailOld,detailNew,'notice detail state');
replaceOnce("${!isHead&&item.confirmRequired&&!stateInfo.confirmed?`<button class=\"btn primary\" data-notice-confirm=\"${escapeHtml(item.id||'')}\">확인했습니다</button>`:''}","${!isHead&&directConfirmRequired&&!stateInfo.confirmed?`<button class=\"btn primary\" data-notice-confirm=\"${escapeHtml(item.id||'')}\">확인했습니다</button>`:''}",'notice confirm button');

// 직접공지 확인 저장 후 공용 캐시 강제 갱신.
const receiptOld="const result=await window.schoolBoard?.saveNoticeReceipt?.(payload);if(!result?.ok){toast(result?.reason||'확인 상태를 저장하지 못했습니다.');return false;}item.receipts=Array.isArray(item.receipts)?item.receipts:[];const keyIndex=item.receipts.findIndex(row=>(payload.userId&&String(row.userId)===String(payload.userId))||String(row.teacher)===String(payload.teacher));const nextReceipt={...(keyIndex>=0?item.receipts[keyIndex]:{}),...payload,confirmed:Boolean(change.confirmed),submitted:Boolean(change.submitted),modifiedAt:new Date().toISOString()};if(keyIndex>=0)item.receipts[keyIndex]=nextReceipt;else item.receipts.push(nextReceipt);return true;";
const receiptNew="const result=await window.schoolBoard?.saveNoticeReceipt?.({...payload,read:true,detailViewed:true});if(!result?.ok){toast(result?.reason||'확인 상태를 저장하지 못했습니다.');return false;}item.receipts=Array.isArray(item.receipts)?item.receipts:[];const keyIndex=item.receipts.findIndex(row=>(payload.userId&&String(row.userId)===String(payload.userId))||String(row.teacher)===String(payload.teacher));const nextReceipt={...(keyIndex>=0?item.receipts[keyIndex]:{}),...payload,read:true,detailViewed:true,confirmed:Boolean(change.confirmed),submitted:Boolean(change.submitted),modifiedAt:new Date().toISOString()};if(keyIndex>=0)item.receipts[keyIndex]=nextReceipt;else item.receipts.push(nextReceipt);/* __UEP_08162_NOTICE_RECEIPT_REFRESH__ */try{await refreshReadonlyAfterNotice({force:true});}catch{}return true;";
replaceOnce(receiptOld,receiptNew,'notice receipt refresh');

for(const marker of [
  'const APP_VERSION = "0.81.62";',
  '__UEP_08162_CURRICULUM_BINDINGS__',
  '__UEP_08162_OFFICIAL_SINGLE_DATE_SOURCE__',
  '__UEP_08162_DIRECT_NOTICE_CONFIRM_REQUIRED__',
  '__UEP_08162_EXISTING_NOTICE_CONFIRM_GATE__',
  '__UEP_08162_NOTICE_RECEIPT_REFRESH__'
])assert(g.includes(marker),'missing marker '+marker);

const badSelector=/(^|[^$])\$\('\[data-(?:curriculum-workspace|cross-student|curriculum-subject)\]'\)\.forEach/m;
assert(!badSelector.test(g),'singular collection selector remains');
assert(g.includes("$$('[data-curriculum-workspace]').forEach"),'curriculum collection binding missing');
assert(g.includes("$$('[data-cross-student]').forEach"),'cross student collection binding missing');
assert(g.includes("$$('[data-curriculum-subject]').forEach"),'curriculum subject collection binding missing');

fs.writeFileSync(gFile,g,'utf8');
console.log('UEP 0.81.62 curriculum bindings, unified official attendance date, and direct notice confirmation fixed');
