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
    if(ch==='{')depth++; else if(ch==='}'){depth--;if(depth===0){end=i+1;break;}}
  }
  must(end>0,name+' end not found');return text.slice(0,start)+newSource+text.slice(end);
}
let renderer=read(rendererPath), main=read(mainPath), preload=read(preloadPath), index=read(indexPath);
const pkg=JSON.parse(read(packagePath));must(pkg.version==='0.82.92',`baseline package version mismatch: ${pkg.version}`);pkg.version='0.82.93';
renderer=replaceOnce(renderer,'const APP_VERSION="0.82.92"; /* UEP_08292_BOARD_TARGET_ACADEMIC_STAGE */','const APP_VERSION="0.82.93"; /* UEP_08293_BOARD_AUTHOR_NOTICE_MANAGE */','runtime version');

const mainHelpers=`
// __UEP_08293_BOARD_AUTHOR_NOTICE_MANAGE__
function boardDisplayAuthor08293(ctx,data={}){
  const candidates=[data.author,ctx?.displayAuthor,ctx?.user?.name,ctx?.user?.displayName,ctx?.user?.teacherName];
  const name=candidates.map(v=>boardSafeText08291(v,80)).find(v=>v&&v!=='???'&&v!=='-');
  return name||'UEP 교사';
}
function boardUserIds08293(ctx){return new Set([ctx?.user?.userId,ctx?.user?.id,ctx?.user?.email].map(v=>boardSafeText08291(v,120)).filter(Boolean));}
async function boardVerifyAppend08293(token,appendResult,expectedId,author=''){
  const range=String(appendResult?.updates?.updatedRange||'').trim();
  if(!range)return {ok:false,reason:'updatedRange 없음'};
  const rows=await boardReadRange08291(token,range);const row=rows?.[0]||[];
  const id=String(row[0]||'').trim(), savedAuthor=String(row[10]||'').trim();
  if(id!==String(expectedId||''))return {ok:false,reason:'저장 ID 재확인 실패',range};
  if(author&&savedAuthor!==author)return {ok:false,reason:'작성자 재확인 실패',range,savedAuthor};
  return {ok:true,range,savedAuthor};
}
async function boardUpdateValues08293(token,data){
  const url='https://sheets.googleapis.com/v4/spreadsheets/'+UEP_BOARD_DB_ID_08291+'/values:batchUpdate';
  return boardSheetsJson08291(token,url,{method:'POST',body:JSON.stringify({valueInputOption:'USER_ENTERED',data})});
}
async function boardNoticeRows08293(ctx){
  const sheets=['06_1학년공지','07_2학년공지','08_전교공지'];const ids=boardUserIds08293(ctx);const mineGrade=String(ctx.user?.grade||'').replace(/\\D/g,''),mineClass=String(ctx.user?.homeroom||'').replace(/\\D/g,'');const out=[];
  for(const sheet of sheets){
    const values=await boardReadRange08291(ctx.token,"'"+sheet+"'!A3:U3000");if(!values.length)continue;
    const h=values[0].map(v=>String(v||''));
    values.slice(1).forEach((r,i)=>{if(!r.some(v=>String(v||'').trim()))return;const o=Object.fromEntries(h.map((k,j)=>[k,r[j]??'']));if(String(o['사용여부']||'Y').trim().toUpperCase()==='N')return;
      const authorId=String(o['작성자ID']||'').trim(),author=String(o['작성자']||'').trim(),target=String(o['표시대상']||''),classNo=String(o['대상반']||'').replace(/\\D/g,'');
      const sheetGrade=sheet==='06_1학년공지'?'1':sheet==='07_2학년공지'?'2':'';const own=(authorId&&ids.has(authorId))||(!authorId&&author&&author===boardDisplayAuthor08293(ctx,{}));
      const homeroom=Boolean(mineGrade&&mineClass&&sheetGrade===mineGrade&&classNo===mineClass&&/\\d+학년\\s*\\d+반/.test(target));
      if(!ctx.isAdmin&&!own&&!homeroom)return;
      out.push({sheet,rowNumber:i+4,noticeId:String(o['공지ID']||''),target,importance:String(o['중요도']||''),title:String(o['제목']||''),message:String(o['핵심문구']||''),startDate:String(o['게시시작']||''),endDate:String(o['게시종료']||''),author,authorId,own,homeroom,canDelete:Boolean(ctx.isAdmin||own||homeroom)});
    });
  }
  return out.sort((a,b)=>String(b.startDate||'').localeCompare(String(a.startDate||''))||String(b.noticeId||'').localeCompare(String(a.noticeId||''))).slice(0,100);
}
async function boardNoticeList08293(){const ctx=await boardWriteContext08291();ctx.displayAuthor=boardDisplayAuthor08293(ctx,{});return {ok:true,notices:await boardNoticeRows08293(ctx),isAdmin:ctx.isAdmin,user:ctx.user};}
async function boardNoticeDelete08293(payload={}){
  const ctx=await boardWriteContext08291();ctx.displayAuthor=boardDisplayAuthor08293(ctx,payload);const sheet=String(payload.sheet||''),noticeId=String(payload.noticeId||'').trim();
  if(!['06_1학년공지','07_2학년공지','08_전교공지'].includes(sheet)||!noticeId)throw boardWriteError08291('공지 삭제 대상을 확인해 주세요.','UEP_BOARD_NOTICE_DELETE_INVALID');
  const rows=await boardNoticeRows08293(ctx);const item=rows.find(x=>x.sheet===sheet&&x.noticeId===noticeId);if(!item||!item.canDelete)throw boardWriteError08291('이 공지를 삭제할 권한이 없습니다.','UEP_BOARD_NOTICE_DELETE_FORBIDDEN');
  const now=boardNow08291();await boardUpdateValues08293(ctx.token,[{range:"'"+sheet+"'!J"+item.rowNumber,values:[['N']]},{range:"'"+sheet+"'!M"+item.rowNumber,values:[[now]]}]);
  const check=await boardReadRange08291(ctx.token,"'"+sheet+"'!A"+item.rowNumber+":M"+item.rowNumber);if(String(check?.[0]?.[9]||'').trim().toUpperCase()!=='N')throw boardWriteError08291('공지 삭제 상태 재확인에 실패했습니다.','UEP_BOARD_NOTICE_DELETE_VERIFY');
  await boardAudit08291(ctx,'공지삭제','SUCCESS',noticeId+' / '+item.target,noticeId);return {ok:true,noticeId,sheet,verified:true};
}
`;
main=replaceOnce(main,'function createWindow() {',mainHelpers+'\nfunction createWindow() {','main 0.82.93 helpers');

// Capture a trustworthy display author from the authenticated UEP UI while keeping authorId/permissions server-side.
main=replaceOnce(main,"const d=payload.data&&typeof payload.data==='object'?payload.data:{};\n  try{","const d=payload.data&&typeof payload.data==='object'?payload.data:{};\n  ctx.displayAuthor=boardDisplayAuthor08293(ctx,d);\n  try{",'board write display author');
main=main.replaceAll("boardSafeText08291(ctx.user.name,80)","boardSafeText08291(ctx.displayAuthor||ctx.user.name,80)");
main=main.replaceAll("(ctx.user?.name||'')+' / '+(ctx.user?.email||'')","(ctx.displayAuthor||ctx.user?.name||'')+' / '+(ctx.user?.email||'')");

// Verify notice append by reading back the exact appended range.
const oldNoticeAppend="await boardAppend08291(ctx.token,noticeSheet08291(t),row);await boardAudit08291(ctx,'공지','SUCCESS',id+' / '+t.label,id);return {ok:true,id,target:t.label,sheet:noticeSheet08291(t)};";
const newNoticeAppend="const appended=await boardAppend08291(ctx.token,noticeSheet08291(t),row);const verified=await boardVerifyAppend08293(ctx.token,appended,id,ctx.displayAuthor);if(!verified.ok)throw boardWriteError08291('Board DB 저장 후 재확인에 실패했습니다: '+verified.reason,'UEP_BOARD_NOTICE_VERIFY');await boardAudit08291(ctx,'공지','SUCCESS',id+' / '+t.label,id);return {ok:true,id,target:t.label,sheet:noticeSheet08291(t),verified:true,range:verified.range,author:ctx.displayAuthor};";
main=replaceOnce(main,oldNoticeAppend,newNoticeAppend,'notice append verification');

main=replaceOnce(main,'ipcMain.handle("uep:boardDbStatus", async () => {try{return await boardDbStatus08291();}catch(error){return {ok:false,code:error?.code||\'UEP_BOARD_STATUS_ERROR\',message:error?.message||String(error),boards:[]};}});',`ipcMain.handle("uep:boardDbStatus", async () => {try{return await boardDbStatus08291();}catch(error){return {ok:false,code:error?.code||'UEP_BOARD_STATUS_ERROR',message:error?.message||String(error),boards:[]};}});
ipcMain.handle("uep:boardNoticeList", async () => {try{return await boardNoticeList08293();}catch(error){return {ok:false,code:error?.code||'UEP_BOARD_NOTICE_LIST_ERROR',message:error?.message||String(error),notices:[]};}});
ipcMain.handle("uep:boardNoticeDelete", async (_event,payload={}) => {try{return await boardNoticeDelete08293(payload);}catch(error){return {ok:false,code:error?.code||'UEP_BOARD_NOTICE_DELETE_ERROR',message:error?.message||String(error)};}});`,'notice IPC');
preload=replaceOnce(preload,'boardDbStatus: () => ipcRenderer.invoke("uep:boardDbStatus"),',`boardDbStatus: () => ipcRenderer.invoke("uep:boardDbStatus"),
  boardNoticeList: () => ipcRenderer.invoke("uep:boardNoticeList"),
  boardNoticeDelete: (payload) => ipcRenderer.invoke("uep:boardNoticeDelete", payload||{}),`,'preload notice management');

const rendererHelpers=`
// __UEP_08293_BOARD_AUTHOR_NOTICE_MANAGE_RENDERER__
function boardCurrentAuthor08293(){return String(currentLoginTeacherName?.()||currentUserProfile?.()?.name||state?.auth?.user?.name||'').trim();}
async function refreshBoardNoticeManager08293(){
  const host=document.getElementById('boardNoticeManager08293');if(!host||!window.schoolBoard?.boardNoticeList)return;
  host.innerHTML='<div class="board-notice-empty">현재 공지를 불러오는 중입니다.</div>';
  try{const r=await window.schoolBoard.boardNoticeList();if(!r?.ok)throw new Error(r?.message||'공지 목록 조회 실패');const rows=r.notices||[];if(!rows.length){host.innerHTML='<div class="board-notice-empty">관리할 수 있는 현재 공지가 없습니다.</div>';return;}
    host.innerHTML=rows.map(n=>`<article class="board-notice-manage-card"><div><small>${escapeHtml(n.target||'')} · ${escapeHtml(n.importance||'일반')}</small><strong>${escapeHtml(n.title||'')}</strong><p>${escapeHtml(n.message||'')}</p><em>${escapeHtml(n.author||'-')} · ${escapeHtml(n.startDate||'')} ~ ${escapeHtml(n.endDate||'')}</em></div>${n.canDelete?`<button type="button" class="btn secondary danger" onclick="deleteBoardNotice08293('${escapeHtml(n.sheet||'')}','${escapeHtml(n.noticeId||'')}')">삭제</button>`:''}</article>`).join('');
  }catch(error){host.innerHTML='<div class="board-notice-empty">'+escapeHtml(error?.message||String(error))+'</div>';}
}
async function deleteBoardNotice08293(sheet,noticeId){
  if(!confirm('이 공지를 전자칠판에서 내릴까요?\n\n행을 삭제하지 않고 사용여부=N으로 처리하여 이력을 보존합니다.'))return;
  const r=await window.schoolBoard?.boardNoticeDelete?.({sheet,noticeId,author:boardCurrentAuthor08293()});if(!r?.ok)return toast(r?.message||'공지 삭제에 실패했습니다.');toast('공지 사용여부를 N으로 변경했습니다.');await refreshBoardNoticeManager08293();
}
`;
renderer=replaceOnce(renderer,'// __UEP_08291_BOARD_DB_WRITE_RENDERER__','// __UEP_08291_BOARD_DB_WRITE_RENDERER__\n'+rendererHelpers,'renderer 0.82.93 helpers');
renderer=replaceFunction(renderer,'boardWriteCall08291',`async function boardWriteCall08291(kind,data,button){
  if(!window.schoolBoard?.boardDbWrite){toast('Board DB 쓰기 기능을 사용할 수 없습니다.');return null;}
  data={...(data||{}),author:boardCurrentAuthor08293()};
  const old=button?.textContent;if(button){button.disabled=true;button.textContent='저장 중…';}
  try{const result=await window.schoolBoard.boardDbWrite({kind,data});if(!result?.ok)throw new Error(result?.message||'Board DB 저장 실패');const suffix=[result.sheet,result.author,result.verified?'재확인 완료':''].filter(Boolean).join(' · ');toast('Board DB 저장 완료'+(suffix?' · '+suffix:''));if(kind==='noticeCreate')Promise.resolve().then(refreshBoardNoticeManager08293);return result;}catch(error){toast('저장 실패 · '+(error?.message||String(error)));return null;}finally{if(button){button.disabled=false;button.textContent=old||'저장';}}
}`);
renderer=replaceOnce(renderer,"document.querySelectorAll('.board-action-card').forEach(el=>el.classList.toggle('is-active',el.dataset.boardTool===tool));","document.querySelectorAll('.board-action-card').forEach(el=>el.classList.toggle('is-active',el.dataset.boardTool===tool));\n  if(tool==='notice')Promise.resolve().then(refreshBoardNoticeManager08293);",'notice manager on select');

const noticeManager=`<div class="board-notice-manager-shell"><div class="board-section-head compact"><div><small>NOTICE MANAGEMENT</small><h4>현재 공지 관리</h4><p>내가 등록한 공지와 담임반 대상 공지를 확인합니다. 담임은 다른 교사가 자기 반에 등록한 공지도 내릴 수 있고, 관리자는 전체 공지를 관리합니다.</p></div><button class="btn secondary" type="button" onclick="refreshBoardNoticeManager08293()">새로고침</button></div><div id="boardNoticeManager08293" class="board-notice-manager-list"><div class="board-notice-empty">공지를 불러오는 중입니다.</div></div></div>`;
const noticeTransition='</div></div>\n    </section>\n\n    <section class="board-tool-panel" data-board-tool="schedule" hidden>';
must(renderer.includes(noticeTransition),'notice section transition not found');
renderer=renderer.replace(noticeTransition,'</div></div>'+noticeManager+'\n    </section>\n\n    <section class="board-tool-panel" data-board-tool="schedule" hidden>');

const css=`<style id="uep08293BoardNoticeManageStyle">
.board-notice-manager-shell{margin-top:16px;border:1px solid #dfe8ec;border-radius:20px;padding:16px;background:#fff}.board-section-head.compact{margin-bottom:12px}.board-section-head.compact h4{margin:2px 0 4px;font-size:18px}.board-notice-manager-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.board-notice-manage-card{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e2eaee;border-radius:16px;padding:13px 14px;background:#fbfdfd}.board-notice-manage-card>div{min-width:0}.board-notice-manage-card small,.board-notice-manage-card em{display:block;color:#70808b;font-size:11px;font-style:normal}.board-notice-manage-card strong{display:block;margin:3px 0;font-size:15px}.board-notice-manage-card p{margin:0 0 4px;color:#46545e;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.board-notice-empty{grid-column:1/-1;padding:22px;text-align:center;color:#7d8c95;border:1px dashed #cedade;border-radius:14px}.btn.danger{color:#b74752;border-color:#e8c7cb}@media(max-width:1100px){.board-notice-manager-list{grid-template-columns:1fr}}
</style>`;
index=replaceOnce(index,'</head>',css+'\n</head>','notice manager css');
write(rendererPath,renderer);write(mainPath,main);write(preloadPath,preload);write(indexPath,index);write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP 0.82.93 Board author + notice management patch applied');