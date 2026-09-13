const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const rendererPath=path.join(root,'gyomuon.js');
const mainPath=path.join(root,'electron','main.cjs');
const preloadPath=path.join(root,'electron','preload.cjs');
const indexPath=path.join(root,'index.html');
const packagePath=path.join(root,'package.json');
function read(p){return fs.readFileSync(p,'utf8');}
function write(p,s){fs.writeFileSync(p,s,'utf8');}
function must(c,m){if(!c)throw new Error(m);}
function replaceOnce(text,from,to,label){const i=text.indexOf(from);must(i>=0,label+' source pattern not found');must(text.indexOf(from,i+from.length)<0,label+' source pattern not unique');return text.slice(0,i)+to+text.slice(i+from.length);}
function replaceFunction(text,name,newSource){
  const rx=new RegExp('(?:async\\s+)?function\\s+'+name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'\\s*\\(');
  const m=rx.exec(text);must(m,name+' not found');const start=m.index;const brace=text.indexOf('{',m.index);must(brace>=0,name+' brace not found');
  let depth=0,end=-1,quote='',esc=false;
  for(let i=brace;i<text.length;i++){
    const ch=text[i];
    if(quote){if(esc){esc=false;continue;}if(ch==='\\'){esc=true;continue;}if(ch===quote)quote='';continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0){end=i+1;break;}}
  }
  must(end>0,name+' end not found');return text.slice(0,start)+newSource+text.slice(end);
}
let renderer=read(rendererPath),main=read(mainPath),preload=read(preloadPath),index=read(indexPath);
const pkg=JSON.parse(read(packagePath));
must(pkg.version==='0.82.94',`baseline package version mismatch: ${pkg.version}`);
pkg.version='0.82.95';
renderer=replaceOnce(renderer,'const APP_VERSION="0.82.94"; /* UEP_08294_BOARD_STATUS_SESSION_RECOVERY */','const APP_VERSION="0.82.95"; /* UEP_08295_BOARD_CARD_OPERATION_CONNECT */','runtime version');

// 1) Read the currently effective operational records for one authorized Board card.
const detailMain=`
// __UEP_08295_BOARD_CARD_OPERATION_CONNECT__
function boardDate08295(v){return String(v||'').trim().slice(0,10);}
function boardToday08295(){return new Date().toISOString().slice(0,10);}
function boardRowActive08295(v){return String(v||'').trim().toUpperCase()==='Y';}
function boardTargetMatch08295(value,grade,classNo){
  const s=String(value||'').replace(/\\s+/g,'').trim();
  const g=String(grade||''),c=String(Number(classNo||0)||classNo||'');
  return !s||s==='전체'||s==='전교'||s===g+'학년전체'||s===c||s===g+'학년'+c+'반';
}
async function boardDbDetail08295(payload={}){
  const ui=payload?.user&&typeof payload.user==='object'?payload.user:{};
  const requestedId=boardSafeText08291(payload?.boardId,120);
  if(!requestedId)throw boardWriteError08291('BoardID를 확인해 주세요.','UEP_BOARD_ID_REQUIRED');
  const ctx=await boardDbReadContext08294(ui);
  const masterRows=await boardReadRange08291(ctx.token,"'01_Board마스터'!A3:N100");
  if(!masterRows.length)throw boardWriteError08291('Board 마스터가 비어 있습니다.','UEP_BOARD_MASTER_EMPTY');
  const h=masterRows[0].map(v=>String(v||''));
  const all=masterRows.slice(1).filter(r=>r.some(v=>String(v||'').trim())).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??''])));
  const visible=ctx.isAdmin?all:all.filter(b=>String(b['학년']||'')===String(ctx.user.grade||'')&&String(b['반']||'')===String(ctx.user.homeroom||''));
  const board=visible.find(b=>String(b['BoardID']||'').trim()===requestedId);
  if(!board)throw boardWriteError08291('이 Board를 조회할 권한이 없거나 BoardID가 변경되었습니다.','UEP_BOARD_NOT_VISIBLE');
  const grade=String(board['학년']||'').trim(),classNo=String(board['반']||'').trim(),today=boardToday08295();
  const noticeSheets=grade==='1'?['06_1학년공지','08_전교공지']:grade==='2'?['07_2학년공지','08_전교공지']:['08_전교공지'];
  const notices=[];
  for(const sheet of noticeSheets){
    const rows=await boardReadRange08291(ctx.token,"'"+sheet+"'!A3:V500");
    for(const r of rows){
      if(!r?.length||!boardRowActive08295(r[9]))continue;
      const start=boardDate08295(r[4]),end=boardDate08295(r[5]);
      if(start&&start>today)continue;if(end&&end<today)continue;
      if(sheet!=='08_전교공지'&&!boardTargetMatch08295(r[2],grade,classNo)&&!boardTargetMatch08295(r[3],grade,classNo))continue;
      if(sheet==='08_전교공지'&&r[20]&&String(r[20]).trim()!==grade&&String(r[20]).trim()!=='전체')continue;
      notices.push({id:String(r[0]||''),target:String(r[2]||''),importance:String(r[6]||''),title:String(r[7]||''),body:String(r[8]||''),author:String(r[10]||''),start,end,sheet});
    }
  }
  const schedules=[];
  for(const r of await boardReadRange08291(ctx.token,"'09_일정'!A3:T800")){
    if(!r?.length||!boardRowActive08295(r[9]))continue;
    const start=boardDate08295(r[1]),end=boardDate08295(r[2]||r[1]);if(start&&start>today)continue;if(end&&end<today)continue;
    const rg=String(r[4]||'').trim(),rc=String(r[5]||'').trim();
    if(rg&&rg!=='전체'&&rg!==grade)continue;if(rc&&rc!=='전체'&&String(Number(rc)||rc)!==String(Number(classNo)||classNo))continue;
    schedules.push({id:String(r[0]||''),start,end,category:String(r[3]||''),title:String(r[6]||''),body:String(r[7]||'')});
  }
  const timetable=[];
  for(const r of await boardReadRange08291(ctx.token,"'05A_임시시간표변경'!A3:R800")){
    if(!r?.length||!boardRowActive08295(r[12]))continue;if(boardDate08295(r[2])!==today)continue;
    if(String(r[5]||'').trim()!==grade||String(Number(r[6])||r[6]||'')!==String(Number(classNo)||classNo))continue;
    timetable.push({id:String(r[0]||''),date:boardDate08295(r[2]),period:String(r[7]||''),subject:String(r[8]||''),teacher:String(r[9]||''),place:String(r[10]||''),reason:String(r[11]||'')});
  }
  const exams=[];
  for(const r of await boardReadRange08291(ctx.token,"'22_시험운영'!A3:Q300")){
    if(!r?.length||!boardRowActive08295(r[12]))continue;
    const start=boardDate08295(r[2]),end=boardDate08295(r[3]||r[2]);if(start&&start>today)continue;if(end&&end<today)continue;
    const rg=String(r[4]||'').trim(),rc=String(r[5]||'').trim();if(rg&&rg!=='전체'&&rg!==grade)continue;if(rc&&rc!=='전체'&&String(Number(rc)||rc)!==String(Number(classNo)||classNo))continue;
    exams.push({id:String(r[0]||''),name:String(r[1]||''),start,end,modeStart:String(r[7]||''),modeEnd:String(r[8]||''),urgent:String(r[11]||'')});
  }
  return {ok:true,board,grade,classNo,notices,schedules,timetable,exams,sessionVerified:ctx.sessionVerified,fallback:ctx.fallback};
}
`;
main=replaceOnce(main,'// __UEP_08294_BOARD_STATUS_SESSION_RECOVERY__',detailMain+'\n// __UEP_08294_BOARD_STATUS_SESSION_RECOVERY__','detail main insert');
main=replaceOnce(main,'ipcMain.handle("uep:boardDbStatus", async (_event,payload={}) => {try{return await boardDbStatus08291(payload?.user||{});}catch(error){return {ok:false,code:error?.code||\'UEP_BOARD_STATUS_ERROR\',message:error?.message||String(error),boards:[]};}});','ipcMain.handle("uep:boardDbStatus", async (_event,payload={}) => {try{return await boardDbStatus08291(payload?.user||{});}catch(error){return {ok:false,code:error?.code||\'UEP_BOARD_STATUS_ERROR\',message:error?.message||String(error),boards:[]};}});\nipcMain.handle("uep:boardDbDetail", async (_event,payload={}) => {try{return await boardDbDetail08295(payload);}catch(error){return {ok:false,code:error?.code||\'UEP_BOARD_DETAIL_ERROR\',message:error?.message||String(error)};}});','detail IPC');
preload=replaceOnce(preload,'boardDbStatus: (payload) => ipcRenderer.invoke("uep:boardDbStatus", payload||{}),','boardDbStatus: (payload) => ipcRenderer.invoke("uep:boardDbStatus", payload||{}),\n  boardDbDetail: (payload) => ipcRenderer.invoke("uep:boardDbDetail", payload||{}),','detail preload');

// 2) Card click selects a real Board and binds that classroom into existing notice/schedule/timetable/exam forms.
const rendererHelpers=`
// __UEP_08295_BOARD_CARD_OPERATION_RENDERER__
let UEP_08295_SELECTED_BOARD=null;
function boardClassLabel08295(board){const g=String(board?.['학년']||'').trim(),c=String(board?.['반']||'').trim();return g&&c?g+'학년 '+String(Number(c)||c)+'반':'';}
function boardSetSelect08295(tool,labelText,value){
  const host=boardSection08291(tool);if(!host||!value)return false;
  const label=[...host.querySelectorAll('label')].find(x=>String(x.textContent||'').trim().startsWith(labelText));const sel=label?.querySelector('select');if(!sel)return false;
  let option=[...sel.options].find(o=>String(o.value||o.textContent||'').trim()===value);
  if(!option){option=document.createElement('option');option.textContent=value;option.value=value;sel.appendChild(option);}sel.value=option.value;sel.dispatchEvent(new Event('change',{bubbles:true}));return true;
}
function boardBindSelected08295(tool){
  const board=UEP_08295_SELECTED_BOARD;if(!board)return;
  const label=boardClassLabel08295(board);if(!label)return;
  if(tool==='notice')boardSetSelect08295('notice','표시 대상',label);
  if(tool==='schedule')boardSetSelect08295('schedule','표시 대상',label);
  if(tool==='timetable')boardSetSelect08295('timetable','학년·반',label);
  if(tool==='exam')boardSetSelect08295('exam','적용 대상',label);
}
async function selectBoardCard08295(boardId){
  const card=[...document.querySelectorAll('.board-summary-card-08294[data-board-id]')].find(x=>x.dataset.boardId===boardId);
  document.querySelectorAll('.board-summary-card-08294').forEach(x=>x.classList.toggle('selected',x===card));
  const host=document.getElementById('boardOperationDetail08295');if(host)host.innerHTML='<div class="board-empty-state">선택한 교실의 현재 운영 상태를 불러오는 중입니다.</div>';
  const board=window.UEP_08295_BOARD_MAP?.[boardId];if(!board)return;
  UEP_08295_SELECTED_BOARD=board;
  try{
    const r=await window.schoolBoard?.boardDbDetail?.({boardId,user:boardStatusUser08294()});if(!r?.ok)throw new Error(r?.message||'Board 상세 조회 실패');
    UEP_08295_SELECTED_BOARD=r.board||board;renderBoardOperationDetail08295(r);
  }catch(error){if(host)host.innerHTML='<div class="board-empty-state">'+escapeHtml(String(error?.message||error))+'</div>';}
}
function renderBoardOperationDetail08295(r){
  const host=document.getElementById('boardOperationDetail08295');if(!host)return;const board=r.board||{};const label=boardClassLabel08295(board)||String(board['설치위치']||'Board');
  const notices=r.notices||[],schedules=r.schedules||[],tt=r.timetable||[],exams=r.exams||[];
  const row=(kind,title,body)=>'<article class="board-op-row"><span>'+escapeHtml(kind)+'</span><div><strong>'+escapeHtml(title||'-')+'</strong><small>'+escapeHtml(body||'')+'</small></div></article>';
  const current=[...notices.map(x=>row('공지',x.title,(x.author?x.author+' · ':'')+(x.body||''))),...schedules.map(x=>row('일정',x.title,x.category||'')),...tt.map(x=>row('시간표',x.period+'교시 · '+x.subject,[x.teacher,x.place].filter(Boolean).join(' · '))),...exams.map(x=>row('시험',x.name,x.urgent||''))];
  host.innerHTML='<div class="board-selected-head"><div><small>선택된 교실</small><h4>'+escapeHtml(label)+'</h4><p>'+escapeHtml(String(board['BoardID']||''))+' · 앱 '+escapeHtml(String(board['앱버전']||'-'))+' · 마지막 '+escapeHtml(boardStatusWhen08294(board['마지막접속']))+'</p></div><span>'+(String(board['사용여부']||'').toUpperCase()==='Y'?'사용중':'미사용')+'</span></div><div class="board-operation-actions"><button type="button" class="btn secondary" onclick="selectElectronicBoardTool(\'notice\')">이 반 공지</button><button type="button" class="btn secondary" onclick="selectElectronicBoardTool(\'schedule\')">이 반 일정</button><button type="button" class="btn secondary" onclick="selectElectronicBoardTool(\'timetable\')">이 반 시간표 변경</button>'+(boardAdminUiAllowed()?'<button type="button" class="btn secondary" onclick="selectElectronicBoardTool(\'exam\')">이 반 시험모드</button>':'')+'</div><div class="board-current-state"><div class="board-current-counts"><span>공지 <b>'+notices.length+'</b></span><span>일정 <b>'+schedules.length+'</b></span><span>오늘 변경 <b>'+tt.length+'</b></span><span>시험 <b>'+exams.length+'</b></span></div>'+(current.length?current.join(''):'<div class="board-empty-state compact">현재 이 교실에 적용 중인 별도 운영 항목이 없습니다.</div>')+'</div>';
}
`;
renderer=replaceOnce(renderer,'// __UEP_08294_BOARD_STATUS_RENDERER__','// __UEP_08294_BOARD_STATUS_RENDERER__\n'+rendererHelpers,'renderer operation helpers');

// Bind selected Board whenever the user moves from 조회 to an operating tool.
renderer=replaceOnce(renderer,"document.querySelectorAll('.board-action-card').forEach(el=>el.classList.toggle('is-active',el.dataset.boardTool===tool));","document.querySelectorAll('.board-action-card').forEach(el=>el.classList.toggle('is-active',el.dataset.boardTool===tool));\n  boardBindSelected08295(tool);",'bind selected board on tool select');

renderer=replaceFunction(renderer,'refreshBoardCards08291',`async function refreshBoardCards08291(){
  const host=document.getElementById('boardLiveCards08291');if(!host||!window.schoolBoard?.boardDbStatus)return;
  host.innerHTML='<div class="board-empty-state">교실 Board 상태를 불러오는 중입니다.</div>';
  try{
    const r=await window.schoolBoard.boardDbStatus({user:boardStatusUser08294()});if(!r?.ok)throw new Error(r?.message||'Board 목록 조회 실패');
    const boards=r.boards||[];window.UEP_08295_BOARD_MAP=Object.fromEntries(boards.map(b=>[String(b['BoardID']||''),b]));
    if(!boards.length){host.innerHTML='<div class="board-empty-state">조회 가능한 교실 Board가 없습니다.</div>';return;}
    const using=boards.filter(b=>String(b['사용여부']||'').trim().toUpperCase()==='Y').length;const versions=[...new Set(boards.map(b=>String(b['앱버전']||'').trim()).filter(Boolean))];
    const syncNote=r.fallback?'School Read 세션 재확인 중 · 현재 로그인 학급 범위로 안전 조회':'로그인 권한과 Board DB가 동기화됨';
    host.innerHTML='<div class="board-live-summary"><div><strong>'+boards.length+'</strong><span>조회 Board</span></div><div><strong>'+using+'</strong><span>사용중</span></div><div><strong>'+versions.length+'</strong><span>앱 버전</span></div><small>'+escapeHtml(syncNote)+'</small></div>'+boards.map(b=>{
      const id=String(b['BoardID']||'').trim(),active=String(b['사용여부']||'').trim().toUpperCase()==='Y';
      return '<button type="button" class="board-summary-card board-summary-card-08294 board-click-card" data-board-id="'+escapeHtml(id)+'" onclick="selectBoardCard08295(this.dataset.boardId)"><div class="board-card-head"><span class="board-dot '+(active?'on':'off')+'"></span><strong>'+escapeHtml(boardStatusClass08294(b))+'</strong><em>'+(active?'사용중':'미사용')+'</em></div><p>'+escapeHtml(id)+'</p><dl><div><dt>설치위치</dt><dd>'+escapeHtml(String(b['설치위치']||'-'))+'</dd></div><div><dt>앱버전</dt><dd>'+escapeHtml(String(b['앱버전']||'-'))+'</dd></div><div><dt>마지막 접속</dt><dd>'+escapeHtml(boardStatusWhen08294(b['마지막접속']))+'</dd></div></dl><span class="board-card-connect">선택하여 운영 연결 ›</span></button>';
    }).join('');
  }catch(error){host.innerHTML='<div class="board-empty-state">'+escapeHtml(String(error?.message||error))+'</div>';}
}`);

// Add one stable detail mount directly below the real Board card mount.
const liveMount='<div id="boardLiveCards08291" class="board-summary-grid"><div class="board-empty-state">Board 목록을 불러오는 중입니다.</div></div>';
must(renderer.includes(liveMount),'live Board mount missing');
renderer=renderer.replace(liveMount,liveMount+'<div id="boardOperationDetail08295" class="board-operation-detail"><div class="board-empty-state compact">교실 카드를 선택하면 현재 적용 상태와 이 반 운영 버튼이 표시됩니다.</div></div>');

const css=`<style id="uep08295BoardOperationStyle">
.board-click-card{appearance:none;width:100%;text-align:left;cursor:pointer;font:inherit;color:inherit}.board-click-card:hover{border-color:#a9c9c3;box-shadow:0 5px 18px rgba(45,90,84,.08)}.board-click-card.selected{border-color:#59af9d;box-shadow:0 0 0 2px rgba(89,175,157,.12)}.board-card-connect{display:block;margin-top:10px;padding-top:9px;border-top:1px solid #e7eeee;font-size:11px;font-weight:700;color:#478f81}.board-operation-detail{margin-top:14px;border:1px solid #dce8e8;border-radius:18px;background:#fff;padding:16px}.board-selected-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.board-selected-head small{color:#71818a}.board-selected-head h4{margin:2px 0 4px;font-size:20px}.board-selected-head p{margin:0;color:#6e7d85;font-size:11px}.board-selected-head>span{border-radius:999px;padding:6px 10px;background:#edf8f5;color:#318c79;font-size:11px;font-weight:700}.board-operation-actions{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.board-current-counts{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:9px}.board-current-counts span{border-radius:999px;background:#f3f7f7;padding:6px 10px;font-size:11px;color:#5d6d75}.board-op-row{display:flex;gap:10px;align-items:flex-start;border-top:1px solid #edf1f1;padding:10px 0}.board-op-row>span{min-width:44px;border-radius:8px;background:#f2f7f6;padding:4px 6px;text-align:center;font-size:10px;color:#4f756d}.board-op-row strong,.board-op-row small{display:block}.board-op-row small{margin-top:2px;color:#71818a;font-size:11px}.board-empty-state.compact{padding:14px}
</style>`;
index=replaceOnce(index,'</head>',css+'\n</head>','operation CSS');

write(rendererPath,renderer);write(mainPath,main);write(preloadPath,preload);write(indexPath,index);write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP 0.82.95 Board card operation connection patch applied');
