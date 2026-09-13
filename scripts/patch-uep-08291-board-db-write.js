const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const rendererPath=path.join(root,'gyomuon.js');
const mainPath=path.join(root,'electron','main.cjs');
const preloadPath=path.join(root,'electron','preload.cjs');
const packagePath=path.join(root,'package.json');
function read(p){return fs.readFileSync(p,'utf8');}
function write(p,s){fs.writeFileSync(p,s,'utf8');}
function must(c,m){if(!c)throw new Error(m);}
function replaceOnce(text,from,to,label){const i=text.indexOf(from);must(i>=0,label+' source pattern not found');must(text.indexOf(from,i+from.length)<0,label+' source pattern not unique');return text.slice(0,i)+to+text.slice(i+from.length);}

let renderer=read(rendererPath);
let main=read(mainPath);
let preload=read(preloadPath);
const pkg=JSON.parse(read(packagePath));
must(pkg.version==='0.82.90',`baseline package version mismatch: ${pkg.version}`);
pkg.version='0.82.91';
renderer=replaceOnce(renderer,'const APP_VERSION="0.82.90"; /* UEP_08290_BOARD_EXAM_MODE_UI */','const APP_VERSION="0.82.91"; /* UEP_08291_BOARD_DB_WRITE */','runtime version');

// Main-process only Board DB bridge. Renderer never receives the Sheets token or service-account secret.
const mainInsert=`
// __UEP_08291_BOARD_DB_WRITE__
const UEP_BOARD_DB_ID_08291='1KStE1tJq6LTA8KR8fe56r7OxO1k9Ae8-lIfWw9d4wng';
const UEP_BOARD_WRITE_SHEETS_08291=new Set(['01_Board마스터','05A_임시시간표변경','06_1학년공지','07_2학년공지','08_전교공지','09_일정','15_운영로그','22_시험운영','23_시험시간표']);
function boardWriteError08291(message,code='UEP_BOARD_WRITE_ERROR'){const e=new Error(message);e.code=code;return e;}
function boardSafeText08291(value,max=500){return String(value??'').trim().slice(0,max);}
function boardNow08291(){return new Date().toISOString();}
function boardId08291(prefix){return prefix+'-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();}
async function boardWriteContext08291({adminOnly=false}={}){
  const status=await schoolReadSessionStatus({verify:true});
  if(!status?.authenticated||!status?.user)throw boardWriteError08291('UEP 로그인 세션을 확인해 주세요.','UEP_BOARD_LOGIN_REQUIRED');
  const user=status.user;
  const isAdmin=Boolean(user.isAdmin)||/관리자/.test(String(user.role||''));
  if(adminOnly&&!isAdmin)throw boardWriteError08291('관리자 전용 기능입니다.','UEP_BOARD_ADMIN_REQUIRED');
  const credentials=await resolveSchoolServiceAccount();
  if(!validateServiceAccount(credentials))throw boardWriteError08291('UEP 학교 서비스 계정 연결을 확인해 주세요.','UEP_BOARD_SERVICE_ACCOUNT_REQUIRED');
  const token=await getSheetsToken(credentials);
  return {token,user,isAdmin};
}
async function boardSheetsJson08291(token,url,options={}){
  const response=await net.fetch(url,{...options,headers:{authorization:'Bearer '+token,'content-type':'application/json;charset=UTF-8',...(options.headers||{})}});
  let data={};try{data=await response.json();}catch{}
  if(!response.ok)throw boardWriteError08291(data?.error?.message||('Board DB HTTP '+response.status),'UEP_BOARD_SHEETS_HTTP');
  return data;
}
async function boardAppend08291(token,sheet,values){
  if(!UEP_BOARD_WRITE_SHEETS_08291.has(sheet))throw boardWriteError08291('허용되지 않은 Board DB 탭입니다.','UEP_BOARD_SHEET_NOT_ALLOWED');
  const range=encodeURIComponent("'"+sheet+"'!A:Z");
  const url='https://sheets.googleapis.com/v4/spreadsheets/'+UEP_BOARD_DB_ID_08291+'/values/'+range+':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS';
  return boardSheetsJson08291(token,url,{method:'POST',body:JSON.stringify({majorDimension:'ROWS',values:[values]})});
}
async function boardReadRange08291(token,a1){
  const url='https://sheets.googleapis.com/v4/spreadsheets/'+UEP_BOARD_DB_ID_08291+'/values/'+encodeURIComponent(a1)+'?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE';
  const data=await boardSheetsJson08291(token,url,{method:'GET'});return data.values||[];
}
function boardTarget08291(raw,user){
  const target=boardSafeText08291(raw,80)||'내 반';
  if(target==='내 반')return {label:(user.grade||'')+'학년 '+(user.homeroom||'')+'반',grade:String(user.grade||''),classNo:String(user.homeroom||''),scope:'class'};
  if(target==='전교')return {label:'전교',grade:'전체',classNo:'전체',scope:'school'};
  const gradeAll=target.match(/^(1|2|3)학년 전체$/);if(gradeAll)return {label:target,grade:gradeAll[1],classNo:'전체',scope:'grade'};
  const cls=target.match(/^(1|2|3)학년\s*(\d{1,2})반$/);if(cls)return {label:target,grade:cls[1],classNo:cls[2],scope:'class'};
  if(target.startsWith('특별실'))return {label:target,grade:'',classNo:'',scope:'special'};
  throw boardWriteError08291('표시 대상을 확인해 주세요.','UEP_BOARD_TARGET_INVALID');
}
function noticeSheet08291(t){return t.grade==='1'?'06_1학년공지':t.grade==='2'?'07_2학년공지':'08_전교공지';}
async function boardAudit08291(ctx,feature,result,detail,boardId='PC'){
  try{await boardAppend08291(ctx.token,'15_운영로그',[boardId,boardId,boardNow08291(),'PC_WRITE',feature,result,boardSafeText08291(detail,1000),'0.82.91',boardSafeText08291((ctx.user?.name||'')+' / '+(ctx.user?.email||''),300)]);}catch(error){console.warn('[UEP Board audit]',error);}
}
async function boardDbWrite08291(payload={}){
  const kind=String(payload.kind||'');
  const adminOnly=['examApply','examDisable'].includes(kind);
  const ctx=await boardWriteContext08291({adminOnly});
  const d=payload.data&&typeof payload.data==='object'?payload.data:{};
  try{
    if(kind==='noticeCreate'){
      const t=boardTarget08291(d.target,ctx.user);if(t.scope==='special')throw boardWriteError08291('특별실 단독 공지는 Board 표시 대상 확장 후 연결됩니다.','UEP_BOARD_SPECIAL_TARGET_PENDING');
      const id=boardId08291('NOTICE-PC');const now=boardNow08291();const type=boardSafeText08291(d.type,40)||'일반';
      const importance=type==='긴급'?'긴급':(['조회(아침)','종례(하교)'].includes(type)?'중요':'일반');
      const row=[id,'UEP PC',t.label,t.classNo,boardSafeText08291(d.startDate,20),boardSafeText08291(d.endDate,20),importance,boardSafeText08291(d.title,100),boardSafeText08291(d.body,1000),'Y',boardSafeText08291(ctx.user.name,80),now,now,'유형:'+type,type,'','',boardSafeText08291(ctx.user.userId||ctx.user.email,120),boardSafeText08291(d.linkUrl,500),''];
      if(noticeSheet08291(t)==='08_전교공지')row.push(t.grade);
      await boardAppend08291(ctx.token,noticeSheet08291(t),row);await boardAudit08291(ctx,'공지','SUCCESS',id+' / '+t.label,id);return {ok:true,id,target:t.label,sheet:noticeSheet08291(t)};
    }
    if(kind==='scheduleCreate'){
      const t=boardTarget08291(d.target,ctx.user);if(t.scope==='special')throw boardWriteError08291('특별실 단독 일정은 Board 표시 대상 확장 후 연결됩니다.','UEP_BOARD_SPECIAL_TARGET_PENDING');
      const id=boardId08291('SCHEDULE-PC');const now=boardNow08291();
      await boardAppend08291(ctx.token,'09_일정',[id,boardSafeText08291(d.date,20),boardSafeText08291(d.endDate||d.date,20),boardSafeText08291(d.category,50)||'학교일정',t.grade,t.classNo,boardSafeText08291(d.title,120),boardSafeText08291(d.body,1000),boardSafeText08291(d.importance,20)||'일반','Y','UEP PC',id,now,'',boardSafeText08291(d.startPeriod,20),'',boardSafeText08291(d.endPeriod,20),'',boardSafeText08291(ctx.user.name,80),boardSafeText08291(ctx.user.userId||ctx.user.email,120)]);
      await boardAudit08291(ctx,'일정','SUCCESS',id+' / '+t.label,id);return {ok:true,id,target:t.label,sheet:'09_일정'};
    }
    if(kind==='timetableChange'){
      const cls=boardTarget08291(d.target,ctx.user);if(cls.scope!=='class')throw boardWriteError08291('시간표 변경은 학급을 선택해 주세요.','UEP_BOARD_CLASS_REQUIRED');
      const id=boardId08291('TT-PC');const now=boardNow08291();const boardId='UH-0'+cls.grade+'-'+String(cls.classNo).padStart(2,'0');
      await boardAppend08291(ctx.token,'05A_임시시간표변경',[id,boardId,boardSafeText08291(d.date,20),new Date().getFullYear(),'2',cls.grade,cls.classNo,boardSafeText08291(d.period,10),boardSafeText08291(d.subject,80),boardSafeText08291(d.teacher,80),boardSafeText08291(d.place,80),boardSafeText08291(d.reason,200),'Y',boardSafeText08291(ctx.user.name,80),boardSafeText08291(ctx.user.userId||ctx.user.email,120),now,now,'UEP PC']);
      await boardAudit08291(ctx,'시간표변경','SUCCESS',id+' / '+cls.label,boardId);return {ok:true,id,target:cls.label,sheet:'05A_임시시간표변경',boardDisplayPending:true};
    }
    if(kind==='examApply'){
      const t=boardTarget08291(d.target,ctx.user);if(t.scope==='special')throw boardWriteError08291('특별실 시험모드는 Board 대상판정 확장 후 연결됩니다.','UEP_BOARD_SPECIAL_TARGET_PENDING');
      const id=boardId08291('EXAM-PC');const now=boardNow08291();const date=boardSafeText08291(d.date,20);
      await boardAppend08291(ctx.token,'22_시험운영',[id,boardSafeText08291(d.name,120)||'시험',date,date,t.grade,t.classNo,'Y',boardSafeText08291(d.modeStart,10),boardSafeText08291(d.modeEnd,10),boardSafeText08291(d.caution1,300),boardSafeText08291(d.caution2,300),boardSafeText08291(d.urgent,500),'Y','UEP PC',id,now,'layout='+boardSafeText08291(d.layout,80)+'; attendance='+boardSafeText08291(d.attendance,80)]);
      const periods=Array.isArray(d.periods)?d.periods:[];for(const p of periods){if(!boardSafeText08291(p.subject,80))continue;await boardAppend08291(ctx.token,'23_시험시간표',[boardId08291('EXAMP'),id,date,t.grade,t.classNo,boardSafeText08291(p.period,10),boardSafeText08291(p.subject,80),boardSafeText08291(p.start,10),boardSafeText08291(p.end,10),'Y','UEP PC',id,now,'']);}
      await boardAudit08291(ctx,'시험모드','SUCCESS',id+' / '+t.label,id);return {ok:true,id,target:t.label,sheet:'22_시험운영'};
    }
    throw boardWriteError08291('지원하지 않는 Board DB 쓰기 요청입니다.','UEP_BOARD_WRITE_UNKNOWN');
  }catch(error){await boardAudit08291(ctx,kind||'unknown','FAIL',error?.message||String(error));throw error;}
}
async function boardDbStatus08291(){
  const ctx=await boardWriteContext08291();
  const rows=await boardReadRange08291(ctx.token,"'01_Board마스터'!A3:N100");if(!rows.length)return {ok:true,boards:[],user:ctx.user};
  const header=rows[0].map(v=>String(v||''));const boards=rows.slice(1).filter(r=>r.some(v=>String(v||'').trim())).map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]??''])));
  const visible=ctx.isAdmin?boards:boards.filter(b=>String(b['학년']||'')===String(ctx.user.grade||'')&&String(b['반']||'')===String(ctx.user.homeroom||''));
  return {ok:true,boards:visible,user:ctx.user,isAdmin:ctx.isAdmin};
}
`;
main=replaceOnce(main,'function createWindow() {',mainInsert+'\nfunction createWindow() {','main board bridge');
main=replaceOnce(main,'ipcMain.handle("uep:schoolReadLogout", async () => { try{return await clearSchoolReadSession();}catch(error){return {ok:false,reason:error?.message||String(error)};} });',`ipcMain.handle("uep:schoolReadLogout", async () => { try{return await clearSchoolReadSession();}catch(error){return {ok:false,reason:error?.message||String(error)};} });
ipcMain.handle("uep:boardDbWrite", async (_event,payload={}) => {try{return await boardDbWrite08291(payload);}catch(error){return {ok:false,code:error?.code||'UEP_BOARD_WRITE_ERROR',message:error?.message||String(error)};}});
ipcMain.handle("uep:boardDbStatus", async () => {try{return await boardDbStatus08291();}catch(error){return {ok:false,code:error?.code||'UEP_BOARD_STATUS_ERROR',message:error?.message||String(error),boards:[]};}});`,'main IPC handlers');

// Preload exposes only narrow high-level methods.
preload=replaceOnce(preload,'schoolReadLogout: () => ipcRenderer.invoke("uep:schoolReadLogout"),',`schoolReadLogout: () => ipcRenderer.invoke("uep:schoolReadLogout"),
  boardDbWrite: (payload) => ipcRenderer.invoke("uep:boardDbWrite", payload||{}),
  boardDbStatus: () => ipcRenderer.invoke("uep:boardDbStatus"),`,'preload Board bridge');

// Replace generic target options with actual class/grade targets for notice and schedule.
const targetOptions=['내 반'];for(let g=1;g<=3;g++){for(let c=1;c<=9;c++)targetOptions.push(`${g}학년 ${c}반`);targetOptions.push(`${g}학년 전체`);}targetOptions.push('전교','특별실');
const targetHtml=targetOptions.map(x=>`<option>${x}</option>`).join('');
renderer=renderer.replaceAll('<option>내 반</option><option>특정 반</option><option>특별실</option><option>학년 전체</option><option>전교</option>',targetHtml);

const rendererHelpers=`
// __UEP_08291_BOARD_DB_WRITE_RENDERER__
function boardSection08291(tool){return document.querySelector('.board-tool-panel[data-board-tool="'+tool+'"]');}
function boardLabelValue08291(tool,labelText){const host=boardSection08291(tool);if(!host)return '';const label=[...host.querySelectorAll('label')].find(x=>String(x.textContent||'').trim().startsWith(labelText));return String(label?.querySelector('input,select,textarea')?.value||'').trim();}
async function boardWriteCall08291(kind,data,button){
  if(!window.schoolBoard?.boardDbWrite){toast('Board DB 쓰기 기능을 사용할 수 없습니다.');return null;}
  const old=button?.textContent;if(button){button.disabled=true;button.textContent='저장 중…';}
  try{const result=await window.schoolBoard.boardDbWrite({kind,data});if(!result?.ok)throw new Error(result?.message||'Board DB 저장 실패');toast('Board DB에 저장했습니다.');return result;}catch(error){toast(error?.message||String(error));return null;}finally{if(button){button.disabled=false;button.textContent=old||'저장';}}
}
async function saveBoardNotice08291(button){
  const data={type:boardLabelValue08291('notice','공지 유형'),target:boardLabelValue08291('notice','표시 대상'),title:boardLabelValue08291('notice','큰글씨'),body:boardLabelValue08291('notice','작은글씨'),startDate:boardLabelValue08291('notice','게시 시작'),endDate:boardLabelValue08291('notice','게시 종료')};
  if(!data.title){toast('공지 제목을 입력해 주세요.');return;}await boardWriteCall08291('noticeCreate',data,button);
}
async function saveBoardSchedule08291(button){
  const data={date:boardLabelValue08291('schedule','일자'),category:boardLabelValue08291('schedule','구분'),target:boardLabelValue08291('schedule','표시 대상'),title:boardLabelValue08291('schedule','일정 제목'),body:boardLabelValue08291('schedule','안내 내용')};
  if(!data.date||!data.title){toast('일자와 일정 제목을 입력해 주세요.');return;}await boardWriteCall08291('scheduleCreate',data,button);
}
async function saveBoardTimetable08291(button){
  const data={date:boardLabelValue08291('timetable','날짜'),target:boardLabelValue08291('timetable','학년·반'),period:boardLabelValue08291('timetable','교시').replace('교시',''),subject:boardLabelValue08291('timetable','변경 과목'),teacher:boardLabelValue08291('timetable','교사'),place:boardLabelValue08291('timetable','장소'),reason:boardLabelValue08291('timetable','사유')};
  if(!data.date||!data.target||!data.subject){toast('날짜·학급·변경 과목을 확인해 주세요.');return;}const r=await boardWriteCall08291('timetableChange',data,button);if(r?.boardDisplayPending)toast('05A에 저장했습니다. 교실 Board의 임시시간표 우선적용 연결은 다음 단계에서 완료합니다.');
}
async function applyBoardExam08291(button){
  const host=boardSection08291('exam');if(!host)return;const periods=[...host.querySelectorAll('.exam-period-grid label')].map((label,i)=>{const inputs=label.querySelectorAll('input');return {period:String(i+1),subject:String(inputs[0]?.value||''),start:String(inputs[1]?.value||''),end:String(inputs[2]?.value||'')};});
  const data={type:boardLabelValue08291('exam','시험 유형'),name:boardLabelValue08291('exam','시험명'),date:boardLabelValue08291('exam','시험일'),target:boardLabelValue08291('exam','적용 대상'),layout:boardLabelValue08291('exam','기본 화면'),attendance:boardLabelValue08291('exam','출결현황'),urgent:boardLabelValue08291('exam','시험문제 긴급 공지'),caution1:boardLabelValue08291('exam','시험 유의사항 1'),caution2:boardLabelValue08291('exam','시험 유의사항 2'),periods};
  if(!data.name||!data.date){toast('시험명과 시험일을 입력해 주세요.');return;}await boardWriteCall08291('examApply',data,button);
}
async function refreshBoardCards08291(){
  const host=document.getElementById('boardLiveCards08291');if(!host||!window.schoolBoard?.boardDbStatus)return;
  host.innerHTML='<div class="board-empty-state">Board 목록을 불러오는 중입니다.</div>';
  try{const r=await window.schoolBoard.boardDbStatus();if(!r?.ok)throw new Error(r?.message||'Board 목록 조회 실패');const boards=r.boards||[];if(!boards.length){host.innerHTML='<div class="board-empty-state">조회 가능한 Board가 없습니다.</div>';return;}host.innerHTML=boards.map(b=>`<article class="board-summary-card"><span>${b['BoardID']||''}</span><strong>${b['설치위치']||((b['학년']||'')+'학년 '+(b['반']||'')+'반')}</strong><small>${String(b['사용여부']||'N')==='Y'?'사용중':'미사용'} · 앱 ${b['앱버전']||'-'} · 마지막 ${b['마지막접속']||'-'}</small></article>`).join('');}catch(error){host.innerHTML='<div class="board-empty-state">'+String(error?.message||error)+'</div>';}
}
`;
renderer=replaceOnce(renderer,'function electronicBoardView(){',rendererHelpers+'\nfunction electronicBoardView(){','renderer write helpers');
renderer=replaceOnce(renderer,'Promise.resolve().then(refreshElectronicBoardStatus);','Promise.resolve().then(refreshElectronicBoardStatus); Promise.resolve().then(refreshBoardCards08291);','board card load');

// Turn placeholder Board card region into a live Board list mount.
renderer=renderer.replace(/<div class="board-empty-state"><span class="board-empty-icon">▣<\/span><div><strong>반별 Board 카드 영역<\/strong>[\s\S]*?<\/div><\/div>/, '<div id="boardLiveCards08291" class="board-summary-grid"><div class="board-empty-state">Board 목록을 불러오는 중입니다.</div></div>');

// Activate write buttons without changing surrounding form structure.
renderer=renderer.replace('<button class="btn primary" type="button" disabled title="0.82.90 쓰기 API 연결 예정">Board DB 저장 준비 중</button>','<button class="btn primary" type="button" onclick="saveBoardNotice08291(this)">Board DB 저장</button>');
renderer=renderer.replace('<button class="btn primary" type="button" disabled>Board DB 저장 준비 중</button>','<button class="btn primary" type="button" onclick="saveBoardSchedule08291(this)">Board DB 저장</button>');
renderer=renderer.replace('<button class="btn primary" type="button" disabled>임시 변경 저장 준비 중</button>','<button class="btn primary" type="button" onclick="saveBoardTimetable08291(this)">05A 임시변경 저장</button>');
renderer=renderer.replace('<button class="btn primary" type="button" disabled>시험모드 적용 준비 중</button>','<button class="btn primary" type="button" onclick="applyBoardExam08291(this)">시험모드 적용</button>');

write(rendererPath,renderer);write(mainPath,main);write(preloadPath,preload);write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP 0.82.91 Board DB write patch applied');
