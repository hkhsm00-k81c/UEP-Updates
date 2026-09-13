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
function injectPanelHtml(text,tool,nextTool,html){
  const start=text.indexOf('data-board-tool="'+tool+'"');must(start>=0,'panel not found: '+tool);
  const next=text.indexOf('data-board-tool="'+nextTool+'"',start+1);must(next>start,'next panel not found: '+nextTool);
  let pos=text.lastIndexOf('</section>',next);
  if(pos<start)pos=text.lastIndexOf('</div>',next);
  must(pos>start,'panel closing tag not found: '+tool);
  return text.slice(0,pos)+html+text.slice(pos);
}
let renderer=read(rendererPath),main=read(mainPath),preload=read(preloadPath),index=read(indexPath);
const pkg=JSON.parse(read(packagePath));must(pkg.version==='0.82.96',`baseline package version mismatch: ${pkg.version}`);pkg.version='0.82.97';
renderer=replaceOnce(renderer,'const APP_VERSION="0.82.96"; /* UEP_08296_BOARD_SCREEN_MIRROR */','const APP_VERSION="0.82.97"; /* UEP_08297_BOARD_LIVE_MANAGE */','runtime version');

const mainHelpers=`
// __UEP_08297_BOARD_LIVE_MANAGE__
function boardCol08297(n){let s='';for(let x=n;x>0;x=Math.floor((x-1)/26))s=String.fromCharCode(65+((x-1)%26))+s;return s;}
async function boardRowsMeta08297(ctx,sheet,endCol='Z',maxRow=3000){
  const values=await boardReadRange08291(ctx.token,"'"+sheet+"'!A3:"+endCol+maxRow);if(!values.length)return [];
  const h=values[0].map(v=>String(v||'').trim());return values.slice(1).map((r,i)=>({sheet,rowNumber:i+4,obj:Object.fromEntries(h.map((k,j)=>[k,r[j]??'']))})).filter(x=>Object.values(x.obj).some(v=>String(v||'').trim()));
}
async function boardPatchRow08297(ctx,sheet,rowNumber,changes){
  const hv=await boardReadRange08291(ctx.token,"'"+sheet+"'!A3:Z3");const h=(hv[0]||[]).map(v=>String(v||'').trim());const data=[];
  for(const [key,value] of Object.entries(changes)){const idx=h.indexOf(key);if(idx<0)continue;data.push({range:"'"+sheet+"'!"+boardCol08297(idx+1)+rowNumber,values:[[value]]});}
  if(!data.length)throw boardWriteError08291('수정 가능한 항목을 찾지 못했습니다.','UEP_BOARD_MANAGE_NO_FIELDS');
  await boardUpdateValues08293(ctx.token,data);return data.length;
}
function boardOwn08297(ctx,o){
  const ids=boardUserIds08293(ctx),authorId=String(o['작성자ID']||'').trim(),author=String(o['작성자']||'').trim();
  return Boolean((authorId&&ids.has(authorId))||(!authorId&&author&&author===boardDisplayAuthor08293(ctx,{})));
}
function boardHomeroomTarget08297(ctx,o,sheet=''){
  const g=String(ctx.user?.grade||'').replace(/\\D/g,''),c=String(ctx.user?.homeroom||'').replace(/\\D/g,'');if(!g||!c)return false;
  const tg=String(o['대상학년']||'').replace(/\\D/g,''),tc=String(o['대상반']||'').replace(/\\D/g,''),target=String(o['표시대상']||'').replace(/\\s+/g,'');
  const sg=sheet==='06_1학년공지'?'1':sheet==='07_2학년공지'?'2':'';
  if(sg&&sg!==g)return false;if(tg&&tg!==g)return false;if(tc&&tc!==c)return false;
  return Boolean((tc===c)||target.includes(g+'학년'+c+'반'));
}
async function boardMineList08297(payload={}){
  const kind=String(payload.kind||'');const ctx=await boardWriteContext08291();ctx.displayAuthor=boardDisplayAuthor08293(ctx,payload);
  const out=[];
  if(kind==='notice'){
    for(const sheet of ['06_1학년공지','07_2학년공지','08_전교공지']){
      for(const x of await boardRowsMeta08297(ctx,sheet,'V',3000)){
        const o=x.obj;if(String(o['사용여부']||'Y').trim().toUpperCase()==='N'||!boardOwn08297(ctx,o))continue;
        out.push({kind,sheet,rowNumber:x.rowNumber,id:String(o['공지ID']||''),target:String(o['표시대상']||''),title:String(o['제목']||''),body:String(o['핵심문구']||''),startDate:boardDate08296(o['게시시작']),endDate:boardDate08296(o['게시종료']),importance:String(o['중요도']||''),durationType:String(o['게시시간유형']||''),startTime:String(o['게시시작시각']||''),endTime:String(o['게시종료시각']||''),author:String(o['작성자']||''),own:true});
      }
    }
  }else if(kind==='schedule'){
    for(const x of await boardRowsMeta08297(ctx,'09_일정','T',3000)){
      const o=x.obj;if(String(o['사용여부']||'Y').trim().toUpperCase()==='N'||!boardOwn08297(ctx,o))continue;
      const target=[String(o['대상학년']||''),String(o['대상반']||'')].filter(Boolean).join('학년 ')||'전체';
      out.push({kind,sheet:'09_일정',rowNumber:x.rowNumber,id:String(o['일정ID']||''),target,title:String(o['제목']||''),body:String(o['핵심문구']||''),date:boardDate08296(o['일자']),endDate:boardDate08296(o['종료일']),category:String(o['구분']||''),importance:String(o['중요도']||''),startPeriod:String(o['시작교시']||''),endPeriod:String(o['종료교시']||''),author:String(o['작성자']||''),own:true});
    }
  }else throw boardWriteError08291('관리 종류를 확인해 주세요.','UEP_BOARD_MANAGE_KIND');
  out.sort((a,b)=>String(b.startDate||b.date||'').localeCompare(String(a.startDate||a.date||''))||String(b.id||'').localeCompare(String(a.id||'')));
  return {ok:true,kind,items:out.slice(0,200),user:ctx.user};
}
async function boardManagedUpdate08297(payload={}){
  const kind=String(payload.kind||''),id=String(payload.id||'').trim(),sheet=String(payload.sheet||'').trim(),d=payload.data&&typeof payload.data==='object'?payload.data:{};
  const ctx=await boardWriteContext08291();ctx.displayAuthor=boardDisplayAuthor08293(ctx,payload);if(!id)throw boardWriteError08291('수정 대상을 확인해 주세요.','UEP_BOARD_MANAGE_ID');
  let item=null;
  if(kind==='notice'){
    if(!['06_1학년공지','07_2학년공지','08_전교공지'].includes(sheet))throw boardWriteError08291('공지 탭을 확인해 주세요.','UEP_BOARD_MANAGE_SHEET');
    item=(await boardRowsMeta08297(ctx,sheet,'V',3000)).find(x=>String(x.obj['공지ID']||'')===id);
    if(!item||(!ctx.isAdmin&&!boardOwn08297(ctx,item.obj)))throw boardWriteError08291('본인이 등록한 공지만 수정할 수 있습니다.','UEP_BOARD_MANAGE_FORBIDDEN');
    await boardPatchRow08297(ctx,sheet,item.rowNumber,{'제목':boardSafeText08291(d.title,100),'핵심문구':boardSafeText08291(d.body,1000),'게시시작':boardSafeText08291(d.startDate,20),'게시종료':boardSafeText08291(d.endDate,20),'중요도':boardSafeText08291(d.importance,20)||'일반','게시시간유형':boardSafeText08291(d.durationType,40),'게시시작시각':boardSafeText08291(d.startTime,20),'게시종료시각':boardSafeText08291(d.endTime,20),'수정일':boardNow08291()});
  }else if(kind==='schedule'){
    item=(await boardRowsMeta08297(ctx,'09_일정','T',3000)).find(x=>String(x.obj['일정ID']||'')===id);
    if(!item||(!ctx.isAdmin&&!boardOwn08297(ctx,item.obj)))throw boardWriteError08291('본인이 등록한 일정만 수정할 수 있습니다.','UEP_BOARD_MANAGE_FORBIDDEN');
    await boardPatchRow08297(ctx,'09_일정',item.rowNumber,{'일자':boardSafeText08291(d.date,20),'종료일':boardSafeText08291(d.endDate||d.date,20),'구분':boardSafeText08291(d.category,50)||'학교일정','제목':boardSafeText08291(d.title,120),'핵심문구':boardSafeText08291(d.body,1000),'중요도':boardSafeText08291(d.importance,20)||'일반','시작교시':boardSafeText08291(d.startPeriod,20),'종료교시':boardSafeText08291(d.endPeriod,20),'수정일':boardNow08291()});
  }else throw boardWriteError08291('관리 종류를 확인해 주세요.','UEP_BOARD_MANAGE_KIND');
  await boardAudit08291(ctx,kind==='notice'?'공지수정':'일정수정','SUCCESS',id,id);return {ok:true,kind,id,verified:true};
}
async function boardManagedDelete08297(payload={}){
  const kind=String(payload.kind||''),id=String(payload.id||'').trim(),sheet=String(payload.sheet||'').trim();const ctx=await boardWriteContext08291();ctx.displayAuthor=boardDisplayAuthor08293(ctx,payload);
  if(kind==='notice'){
    if(!['06_1학년공지','07_2학년공지','08_전교공지'].includes(sheet)||!id)throw boardWriteError08291('공지 삭제 대상을 확인해 주세요.','UEP_BOARD_MANAGE_DELETE_INVALID');
    const item=(await boardRowsMeta08297(ctx,sheet,'V',3000)).find(x=>String(x.obj['공지ID']||'')===id);
    if(!item||(!ctx.isAdmin&&!boardOwn08297(ctx,item.obj)&&!boardHomeroomTarget08297(ctx,item.obj,sheet)))throw boardWriteError08291('이 공지를 내릴 권한이 없습니다.','UEP_BOARD_MANAGE_DELETE_FORBIDDEN');
    await boardPatchRow08297(ctx,sheet,item.rowNumber,{'사용여부':'N','수정일':boardNow08291()});
  }else if(kind==='schedule'){
    const item=(await boardRowsMeta08297(ctx,'09_일정','T',3000)).find(x=>String(x.obj['일정ID']||'')===id);
    if(!item||(!ctx.isAdmin&&!boardOwn08297(ctx,item.obj)&&!boardHomeroomTarget08297(ctx,item.obj,'09_일정')))throw boardWriteError08291('이 일정을 내릴 권한이 없습니다.','UEP_BOARD_MANAGE_DELETE_FORBIDDEN');
    await boardPatchRow08297(ctx,'09_일정',item.rowNumber,{'사용여부':'N','수정일':boardNow08291()});
  }else throw boardWriteError08291('관리 종류를 확인해 주세요.','UEP_BOARD_MANAGE_KIND');
  await boardAudit08291(ctx,kind==='notice'?'공지삭제':'일정삭제','SUCCESS',id,id);return {ok:true,kind,id,verified:true};
}
`;
main=replaceOnce(main,'// __UEP_08296_BOARD_SCREEN_MIRROR__',mainHelpers+'\n// __UEP_08296_BOARD_SCREEN_MIRROR__','main manage helpers');
main=replaceOnce(main,'ipcMain.handle("uep:boardDbDetail", async (_event,payload={}) => {try{return await boardDbDetail08296(payload);}catch(error){return {ok:false,code:error?.code||\'UEP_BOARD_DETAIL_ERROR\',message:error?.message||String(error)};}});',`ipcMain.handle("uep:boardDbDetail", async (_event,payload={}) => {try{return await boardDbDetail08296(payload);}catch(error){return {ok:false,code:error?.code||'UEP_BOARD_DETAIL_ERROR',message:error?.message||String(error)};}});
ipcMain.handle("uep:boardMineList", async (_event,payload={}) => {try{return await boardMineList08297(payload);}catch(error){return {ok:false,code:error?.code||'UEP_BOARD_MINE_LIST_ERROR',message:error?.message||String(error),items:[]};}});
ipcMain.handle("uep:boardManagedUpdate", async (_event,payload={}) => {try{return await boardManagedUpdate08297(payload);}catch(error){return {ok:false,code:error?.code||'UEP_BOARD_MANAGED_UPDATE_ERROR',message:error?.message||String(error)};}});
ipcMain.handle("uep:boardManagedDelete", async (_event,payload={}) => {try{return await boardManagedDelete08297(payload);}catch(error){return {ok:false,code:error?.code||'UEP_BOARD_MANAGED_DELETE_ERROR',message:error?.message||String(error)};}});`,'manage IPC');
preload=replaceOnce(preload,'boardDbDetail: (payload) => ipcRenderer.invoke("uep:boardDbDetail", payload||{}),',`boardDbDetail: (payload) => ipcRenderer.invoke("uep:boardDbDetail", payload||{}),
  boardMineList: (payload) => ipcRenderer.invoke("uep:boardMineList", payload||{}),
  boardManagedUpdate: (payload) => ipcRenderer.invoke("uep:boardManagedUpdate", payload||{}),
  boardManagedDelete: (payload) => ipcRenderer.invoke("uep:boardManagedDelete", payload||{}),`,'manage preload');

const rendererHelpers=`
// __UEP_08297_BOARD_LIVE_MANAGE_RENDERER__
let UEP_08297_PREVIEW_TIMER=null;
let UEP_08297_PREVIEW_BUSY=false;
async function refreshSelectedBoardPreview08297(){
  const board=UEP_08295_SELECTED_BOARD,active=document.querySelector('.board-action-card.is-active')?.dataset?.boardTool;if(!board||active!=='boards'||UEP_08297_PREVIEW_BUSY)return;
  UEP_08297_PREVIEW_BUSY=true;try{const boardId=String(board['BoardID']||'');const r=await window.schoolBoard?.boardDbDetail?.({boardId,user:boardStatusUser08294()});if(r?.ok){UEP_08295_SELECTED_BOARD=r.board||board;renderBoardOperationDetail08295(r);}}finally{UEP_08297_PREVIEW_BUSY=false;}
}
function startBoardPreviewAutoRefresh08297(){if(UEP_08297_PREVIEW_TIMER)clearInterval(UEP_08297_PREVIEW_TIMER);UEP_08297_PREVIEW_TIMER=setInterval(refreshSelectedBoardPreview08297,10000);}
function boardManagedCard08297(kind,x){
  const id=escapeHtml(x.id||''),sheet=escapeHtml(x.sheet||''),date=kind==='notice'?((x.startDate||'')+' ~ '+(x.endDate||'')):((x.date||'')+' ~ '+(x.endDate||''));
  const fields=kind==='notice'?`<label>제목<input data-f="title" value="${escapeHtml(x.title||'')}"></label><label>핵심문구<textarea data-f="body">${escapeHtml(x.body||'')}</textarea></label><div class="board-manage-grid"><label>게시시작<input data-f="startDate" type="date" value="${escapeHtml(x.startDate||'')}"></label><label>게시종료<input data-f="endDate" type="date" value="${escapeHtml(x.endDate||'')}"></label><label>중요도<select data-f="importance"><option${x.importance==='일반'?' selected':''}>일반</option><option${x.importance==='중요'?' selected':''}>중요</option><option${x.importance==='긴급'?' selected':''}>긴급</option></select></label></div>`:`<label>제목<input data-f="title" value="${escapeHtml(x.title||'')}"></label><label>핵심문구<textarea data-f="body">${escapeHtml(x.body||'')}</textarea></label><div class="board-manage-grid"><label>시작일<input data-f="date" type="date" value="${escapeHtml(x.date||'')}"></label><label>종료일<input data-f="endDate" type="date" value="${escapeHtml(x.endDate||'')}"></label><label>구분<input data-f="category" value="${escapeHtml(x.category||'')}"></label><label>중요도<select data-f="importance"><option${x.importance==='일반'?' selected':''}>일반</option><option${x.importance==='중요'?' selected':''}>중요</option><option${x.importance==='긴급'?' selected':''}>긴급</option></select></label><label>시작교시<input data-f="startPeriod" value="${escapeHtml(x.startPeriod||'')}"></label><label>종료교시<input data-f="endPeriod" value="${escapeHtml(x.endPeriod||'')}"></label></div>`;
  return `<article class="board-my-card" data-kind="${kind}" data-id="${id}" data-sheet="${sheet}"><div class="board-my-card-head"><div><small>${escapeHtml(x.target||'')} · ${escapeHtml(date)}</small><strong>${escapeHtml(x.title||'-')}</strong><p>${escapeHtml(x.body||'')}</p></div><button type="button" class="btn secondary danger" onclick="deleteBoardManaged08297('${kind}',this)">삭제</button></div><details><summary>수정</summary><div class="board-manage-editor">${fields}<button type="button" class="btn primary" onclick="saveBoardManaged08297('${kind}',this)">수정 저장</button></div></details></article>`;
}
async function refreshBoardMine08297(kind){
  const host=document.getElementById(kind==='notice'?'boardMyNotice08297':'boardMySchedule08297');if(!host||!window.schoolBoard?.boardMineList)return;host.innerHTML='<div class="board-empty-state compact">내가 올린 '+(kind==='notice'?'공지':'일정')+'를 불러오는 중입니다.</div>';
  try{const r=await window.schoolBoard.boardMineList({kind,author:boardCurrentAuthor08293()});if(!r?.ok)throw new Error(r?.message||'목록 조회 실패');const rows=r.items||[];host.innerHTML=rows.length?rows.map(x=>boardManagedCard08297(kind,x)).join(''):'<div class="board-empty-state compact">현재 내가 올린 '+(kind==='notice'?'공지':'일정')+'가 없습니다.</div>';}
  catch(e){host.innerHTML='<div class="board-empty-state compact">'+escapeHtml(e?.message||String(e))+'</div>';}
}
async function saveBoardManaged08297(kind,button){
  const card=button.closest('.board-my-card');if(!card)return;const data={};card.querySelectorAll('[data-f]').forEach(el=>data[el.dataset.f]=el.value);button.disabled=true;const old=button.textContent;button.textContent='저장 중…';
  try{const r=await window.schoolBoard?.boardManagedUpdate?.({kind,id:card.dataset.id,sheet:card.dataset.sheet,data,author:boardCurrentAuthor08293()});if(!r?.ok)throw new Error(r?.message||'수정 실패');toast((kind==='notice'?'공지':'일정')+' 수정 완료');await refreshBoardMine08297(kind);await refreshSelectedBoardPreview08297();}
  catch(e){toast('수정 실패 · '+(e?.message||String(e)));}finally{button.disabled=false;button.textContent=old;}
}
async function deleteBoardManaged08297(kind,button){
  const card=button.closest('.board-my-card');if(!card)return;if(!confirm('이 '+(kind==='notice'?'공지':'일정')+'를 전자칠판에서 내릴까요?\\n\\n원본 행은 남기고 사용여부=N으로 변경합니다.'))return;
  const r=await window.schoolBoard?.boardManagedDelete?.({kind,id:card.dataset.id,sheet:card.dataset.sheet,author:boardCurrentAuthor08293()});if(!r?.ok)return toast(r?.message||'삭제 실패');toast((kind==='notice'?'공지':'일정')+'을 내렸습니다.');await refreshBoardMine08297(kind);await refreshSelectedBoardPreview08297();
}
async function deleteBoardPreviewItem08297(kind,id,sheet=''){
  if(!confirm('현재 전자칠판의 이 '+(kind==='notice'?'공지':'일정')+'을 내릴까요?'))return;const r=await window.schoolBoard?.boardManagedDelete?.({kind,id,sheet,author:boardCurrentAuthor08293()});if(!r?.ok)return toast(r?.message||'삭제 실패');toast('전자칠판에서 내렸습니다.');await refreshSelectedBoardPreview08297();if(kind==='notice')await refreshBoardMine08297('notice');if(kind==='schedule')await refreshBoardMine08297('schedule');
}
`;
renderer=replaceOnce(renderer,'// __UEP_08296_BOARD_SCREEN_MIRROR_RENDERER__','// __UEP_08296_BOARD_SCREEN_MIRROR_RENDERER__\n'+rendererHelpers,'renderer live manage helpers');

renderer=replaceFunction(renderer,'selectBoardCard08295',`async function selectBoardCard08295(boardId){
  const card=[...document.querySelectorAll('.board-summary-card-08294[data-board-id]')].find(x=>x.dataset.boardId===boardId);document.querySelectorAll('.board-summary-card-08294').forEach(x=>x.classList.toggle('selected',x===card));
  const host=document.getElementById('boardOperationDetail08295');if(host)host.innerHTML='<div class="board-empty-state">선택한 교실의 현재 전자칠판 화면 내용을 불러오는 중입니다.</div>';const board=window.UEP_08295_BOARD_MAP?.[boardId];if(!board)return;UEP_08295_SELECTED_BOARD=board;
  try{const r=await window.schoolBoard?.boardDbDetail?.({boardId,user:boardStatusUser08294()});if(!r?.ok)throw new Error(r?.message||'Board 화면 조회 실패');UEP_08295_SELECTED_BOARD=r.board||board;renderBoardOperationDetail08295(r);startBoardPreviewAutoRefresh08297();}catch(error){if(host)host.innerHTML='<div class="board-empty-state">'+escapeHtml(String(error?.message||error))+'</div>';}
}`);

renderer=renderer.replace("const row=(kind,title,body)=>'<article class=\"board-op-row\"><span>'+escapeHtml(kind)+'</span><div><strong>'+escapeHtml(title||'-')+'</strong><small>'+escapeHtml(body||'')+'</small></div></article>';","const row=(kind,title,body,action='')=>'<article class=\"board-op-row\"><span>'+escapeHtml(kind)+'</span><div><strong>'+escapeHtml(title||'-')+'</strong><small>'+escapeHtml(body||'')+'</small></div>'+action+'</article>';" );
renderer=renderer.replace("...notices.map(x=>row('공지',x.title,(x.author?x.author+' · ':'')+(x.body||''))),","...notices.map(x=>row('공지',x.title,(x.author?x.author+' · ':'')+(x.body||''),'<button type=\"button\" class=\"btn secondary danger mini\" onclick=\"deleteBoardPreviewItem08297(&quot;notice&quot;,&quot;'+escapeHtml(x.id||'')+'&quot;,&quot;'+escapeHtml(x.source||'')+'&quot;)\">내리기</button>'))," );
renderer=renderer.replace("...schedules.map(x=>row('일정',x.title,[x.date,x.category].filter(Boolean).join(' · '))),","...schedules.map(x=>row('일정',x.title,[x.date,x.category].filter(Boolean).join(' · '),'<button type=\"button\" class=\"btn secondary danger mini\" onclick=\"deleteBoardPreviewItem08297(&quot;schedule&quot;,&quot;'+escapeHtml(x.id||'')+'&quot;)\">내리기</button>'))," );

renderer=replaceFunction(renderer,'boardWriteCall08291',`async function boardWriteCall08291(kind,data,button){
  if(!window.schoolBoard?.boardDbWrite){toast('Board DB 쓰기 기능을 사용할 수 없습니다.');return null;}data={...(data||{}),author:boardCurrentAuthor08293()};const old=button?.textContent;if(button){button.disabled=true;button.textContent='저장 중…';}
  try{const result=await window.schoolBoard.boardDbWrite({kind,data});if(!result?.ok)throw new Error(result?.message||'Board DB 저장 실패');const suffix=[result.sheet,result.author,result.verified?'재확인 완료':''].filter(Boolean).join(' · ');toast('Board DB 저장 완료'+(suffix?' · '+suffix:''));if(kind==='noticeCreate')await refreshBoardMine08297('notice');if(kind==='scheduleCreate')await refreshBoardMine08297('schedule');await refreshSelectedBoardPreview08297();return result;}catch(error){toast('저장 실패 · '+(error?.message||String(error)));return null;}finally{if(button){button.disabled=false;button.textContent=old||'저장';}}
}`);
renderer=renderer.replace("document.querySelectorAll('.board-action-card').forEach(el=>el.classList.toggle('is-active',el.dataset.boardTool===tool));","document.querySelectorAll('.board-action-card').forEach(el=>el.classList.toggle('is-active',el.dataset.boardTool===tool));\n  if(tool==='notice')Promise.resolve().then(()=>refreshBoardMine08297('notice'));\n  if(tool==='schedule')Promise.resolve().then(()=>refreshBoardMine08297('schedule'));" );

const noticeMount=`<div class="board-my-manage-shell"><div class="board-section-head compact"><div><small>MY NOTICE</small><h4>내가 올린 공지</h4><p>로그인한 내가 등록한 공지를 확인하고 수정하거나 내릴 수 있습니다.</p></div><button class="btn secondary" type="button" onclick="refreshBoardMine08297('notice')">새로고침</button></div><div id="boardMyNotice08297" class="board-my-list"><div class="board-empty-state compact">공지 탭을 열면 내가 올린 공지를 불러옵니다.</div></div></div>`;
const scheduleMount=`<div class="board-my-manage-shell"><div class="board-section-head compact"><div><small>MY SCHEDULE</small><h4>내가 올린 일정</h4><p>로그인한 내가 등록한 일정을 확인하고 수정하거나 내릴 수 있습니다.</p></div><button class="btn secondary" type="button" onclick="refreshBoardMine08297('schedule')">새로고침</button></div><div id="boardMySchedule08297" class="board-my-list"><div class="board-empty-state compact">일정 탭을 열면 내가 올린 일정을 불러옵니다.</div></div></div>`;
renderer=injectPanelHtml(renderer,'notice','schedule',noticeMount);
renderer=injectPanelHtml(renderer,'schedule','timetable',scheduleMount);

const css=`<style id="uep08297BoardLiveManageStyle">
.board-my-manage-shell{margin-top:18px;padding-top:16px;border-top:1px solid #e7eeee}.board-my-list{display:grid;gap:10px;margin-top:10px}.board-my-card{border:1px solid #dfe8e8;border-radius:14px;background:#fff;padding:12px}.board-my-card-head{display:flex;gap:12px;align-items:flex-start}.board-my-card-head>div{flex:1}.board-my-card small,.board-my-card strong,.board-my-card p{display:block}.board-my-card strong{margin:3px 0}.board-my-card p{margin:0;color:#68777f}.board-my-card details{margin-top:9px;border-top:1px solid #edf1f1;padding-top:8px}.board-my-card summary{cursor:pointer;font-weight:700;color:#4b766e}.board-manage-editor{display:grid;gap:8px;margin-top:10px}.board-manage-editor label{display:grid;gap:4px;font-size:11px;color:#67777f}.board-manage-editor input,.board-manage-editor textarea,.board-manage-editor select{width:100%;box-sizing:border-box;border:1px solid #dbe5e4;border-radius:9px;padding:8px;background:#fff}.board-manage-editor textarea{min-height:64px;resize:vertical}.board-manage-grid{display:grid;grid-template-columns:repeat(3,minmax(110px,1fr));gap:8px}.btn.mini{padding:5px 8px;font-size:10px;margin-left:auto}.board-op-row>button{align-self:center}@media(max-width:900px){.board-manage-grid{grid-template-columns:1fr 1fr}}
</style>`;
index=replaceOnce(index,'</head>',css+'\n</head>','manage CSS');
write(rendererPath,renderer);write(mainPath,main);write(preloadPath,preload);write(indexPath,index);write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP 0.82.97 Board live refresh and owner management patch applied');
