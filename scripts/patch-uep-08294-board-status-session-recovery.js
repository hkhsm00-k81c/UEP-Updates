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

let renderer=read(rendererPath),main=read(mainPath),preload=read(preloadPath),index=read(indexPath);
const pkg=JSON.parse(read(packagePath));
must(pkg.version==='0.82.93',`baseline package version mismatch: ${pkg.version}`);
pkg.version='0.82.94';
renderer=replaceOnce(renderer,'const APP_VERSION="0.82.93"; /* UEP_08293_BOARD_AUTHOR_NOTICE_MANAGE */','const APP_VERSION="0.82.94"; /* UEP_08294_BOARD_STATUS_SESSION_RECOVERY */','runtime version');

// 1) Keep 0.82.93 author capture/append verification, but remove the unrequested visible notice-manager expansion.
renderer=renderer.replace("\n  if(tool==='notice')Promise.resolve().then(refreshBoardNoticeManager08293);",'');
renderer=renderer.replace(/<div class="board-notice-manager-shell">[\s\S]*?<div id="boardNoticeManager08293" class="board-notice-manager-list"><div class="board-notice-empty">공지를 불러오는 중입니다\.<\/div><\/div><\/div>/,'');
index=index.replace(/<style id="uep08293BoardNoticeManageStyle">[\s\S]*?<\/style>\s*/,'');

// 2) Exam mode visibility must follow the authenticated UEP profile as well as the header chip.
renderer=replaceFunction(renderer,'boardAdminUiAllowed',`function boardAdminUiAllowed(){
  const role=String(document.getElementById('headerRoleChip')?.textContent||'').trim();
  let profile={};try{profile=currentUserProfile?.()||{};}catch{}
  let authUser={};try{authUser=state?.auth?.user||{};}catch{}
  const roles=[role,profile?.role,profile?.roles,profile?.permission,profile?.permissions,authUser?.role,authUser?.roles].flatMap(v=>Array.isArray(v)?v:[v]).map(v=>String(v||''));
  return Boolean(profile?.isAdmin||authUser?.isAdmin||roles.some(v=>/관리자/.test(v)));
}`);

// 3) Board status is read-only. If School Read session verification is temporarily out of sync,
// use the already-authenticated renderer identity only to limit the fallback view to that homeroom.
const readContext=`
// __UEP_08294_BOARD_STATUS_SESSION_RECOVERY__
async function boardDbReadContext08294(ui={}){
  let status=null;try{status=await schoolReadSessionStatus({verify:true});}catch{}
  const verified=Boolean(status?.authenticated&&status?.user);
  const uiUser=ui&&typeof ui==='object'?ui:{};
  const user=verified?status.user:{
    name:boardSafeText08291(uiUser.name,80),
    email:boardSafeText08291(uiUser.email,120),
    grade:boardSafeText08291(uiUser.grade,10),
    homeroom:boardSafeText08291(uiUser.homeroom,10),
    role:boardSafeText08291(uiUser.role,120),
    isAdmin:false
  };
  if(!verified&&!user.name&&!user.email)throw boardWriteError08291('UEP 로그인 정보를 확인해 주세요.','UEP_BOARD_LOGIN_REQUIRED');
  const credentials=await resolveSchoolServiceAccount();
  if(!validateServiceAccount(credentials))throw boardWriteError08291('UEP 학교 서비스 계정 연결을 확인해 주세요.','UEP_BOARD_SERVICE_ACCOUNT_REQUIRED');
  const token=await getSheetsToken(credentials);
  const isAdmin=verified&&(Boolean(user.isAdmin)||/관리자/.test(String(user.role||'')));
  return {token,user,isAdmin,sessionVerified:verified,fallback:!verified};
}
`;
main=replaceOnce(main,'async function boardDbStatus08291(){',readContext+'\nasync function boardDbStatus08291(ui={}){','board read context');
main=replaceOnce(main,'  const ctx=await boardWriteContext08291();\n  const rows=await boardReadRange08291(ctx.token,"\'01_Board마스터\'!A3:N100");','  const ctx=await boardDbReadContext08294(ui);\n  const rows=await boardReadRange08291(ctx.token,"\'01_Board마스터\'!A3:N100");','board status context');
main=replaceOnce(main,'  return {ok:true,boards:visible,user:ctx.user,isAdmin:ctx.isAdmin};','  return {ok:true,boards:visible,user:ctx.user,isAdmin:ctx.isAdmin,sessionVerified:ctx.sessionVerified,fallback:ctx.fallback};','board status result');
main=replaceOnce(main,'ipcMain.handle("uep:boardDbStatus", async () => {try{return await boardDbStatus08291();}catch(error){return {ok:false,code:error?.code||\'UEP_BOARD_STATUS_ERROR\',message:error?.message||String(error),boards:[]};}});','ipcMain.handle("uep:boardDbStatus", async (_event,payload={}) => {try{return await boardDbStatus08291(payload?.user||{});}catch(error){return {ok:false,code:error?.code||\'UEP_BOARD_STATUS_ERROR\',message:error?.message||String(error),boards:[]};}});','board status IPC payload');
preload=replaceOnce(preload,'boardDbStatus: () => ipcRenderer.invoke("uep:boardDbStatus"),','boardDbStatus: (payload) => ipcRenderer.invoke("uep:boardDbStatus", payload||{}),','preload board status payload');

// 4) Advance the Board lookup screen: actual classroom cards + counts, while preserving the original five tools.
const statusHelpers=`
// __UEP_08294_BOARD_STATUS_RENDERER__
function boardStatusUser08294(){
  let p={};try{p=currentUserProfile?.()||{};}catch{}
  let a={};try{a=state?.auth?.user||{};}catch{}
  const pick=(...v)=>v.map(x=>String(x??'').trim()).find(Boolean)||'';
  return {name:pick(currentLoginTeacherName?.(),p.name,a.name),email:pick(p.email,a.email),grade:pick(p.grade,a.grade),homeroom:pick(p.homeroom,p.classNo,a.homeroom,a.classNo),role:pick(p.role,a.role,document.getElementById('headerRoleChip')?.textContent)};
}
function boardStatusClass08294(b){const g=String(b['학년']||'').trim(),c=String(b['반']||'').trim();return g&&c?g+'학년 '+c+'반':String(b['설치위치']||'교실');}
function boardStatusWhen08294(v){const s=String(v||'').trim();if(!s)return '-';const d=new Date(s);return Number.isNaN(d.getTime())?s:d.toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}
`;
renderer=replaceOnce(renderer,'// __UEP_08291_BOARD_DB_WRITE_RENDERER__','// __UEP_08291_BOARD_DB_WRITE_RENDERER__\n'+statusHelpers,'board status renderer helpers');
renderer=replaceFunction(renderer,'refreshBoardCards08291',`async function refreshBoardCards08291(){
  const host=document.getElementById('boardLiveCards08291');if(!host||!window.schoolBoard?.boardDbStatus)return;
  host.innerHTML='<div class="board-empty-state">교실 Board 상태를 불러오는 중입니다.</div>';
  try{
    const r=await window.schoolBoard.boardDbStatus({user:boardStatusUser08294()});if(!r?.ok)throw new Error(r?.message||'Board 목록 조회 실패');
    const boards=r.boards||[];
    if(!boards.length){host.innerHTML='<div class="board-empty-state">조회 가능한 교실 Board가 없습니다.</div>';return;}
    const using=boards.filter(b=>String(b['사용여부']||'').trim().toUpperCase()==='Y').length;
    const versions=[...new Set(boards.map(b=>String(b['앱버전']||'').trim()).filter(Boolean))];
    const syncNote=r.fallback?'School Read 세션 재확인 중 · 현재 로그인 학급 범위로 안전 조회':'로그인 권한과 Board DB가 동기화됨';
    host.innerHTML='<div class="board-live-summary"><div><strong>'+boards.length+'</strong><span>조회 Board</span></div><div><strong>'+using+'</strong><span>사용중</span></div><div><strong>'+versions.length+'</strong><span>앱 버전</span></div><small>'+escapeHtml(syncNote)+'</small></div>'+boards.map(b=>{
      const active=String(b['사용여부']||'').trim().toUpperCase()==='Y';
      return '<article class="board-summary-card board-summary-card-08294"><div class="board-card-head"><span class="board-dot '+(active?'on':'off')+'"></span><strong>'+escapeHtml(boardStatusClass08294(b))+'</strong><em>'+(active?'사용중':'미사용')+'</em></div><p>'+escapeHtml(String(b['BoardID']||''))+'</p><dl><div><dt>설치위치</dt><dd>'+escapeHtml(String(b['설치위치']||'-'))+'</dd></div><div><dt>앱버전</dt><dd>'+escapeHtml(String(b['앱버전']||'-'))+'</dd></div><div><dt>마지막 접속</dt><dd>'+escapeHtml(boardStatusWhen08294(b['마지막접속']))+'</dd></div></dl></article>';
    }).join('');
  }catch(error){host.innerHTML='<div class="board-empty-state">'+escapeHtml(String(error?.message||error))+'</div>';}
}`);

const statusCss=`<style id="uep08294BoardStatusStyle">
.board-live-summary{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(110px,1fr)) minmax(220px,2fr);gap:10px;align-items:stretch;margin-bottom:4px}.board-live-summary>div,.board-live-summary>small{border:1px solid #dce8e8;border-radius:14px;background:#f8fbfb;padding:12px 14px}.board-live-summary strong{display:block;font-size:20px}.board-live-summary span,.board-live-summary small{font-size:11px;color:#6b7a82}.board-live-summary>small{display:flex;align-items:center}.board-summary-card-08294{padding:15px}.board-card-head{display:flex;align-items:center;gap:8px}.board-card-head strong{flex:1}.board-card-head em{font-size:11px;font-style:normal;color:#65747d}.board-dot{width:9px;height:9px;border-radius:50%;background:#aab5ba}.board-dot.on{background:#45b99d}.board-summary-card-08294 p{margin:6px 0 10px;color:#71818a;font-size:11px}.board-summary-card-08294 dl{display:grid;gap:6px;margin:0}.board-summary-card-08294 dl>div{display:flex;justify-content:space-between;gap:10px}.board-summary-card-08294 dt,.board-summary-card-08294 dd{margin:0;font-size:11px}.board-summary-card-08294 dt{color:#7b8990}.board-summary-card-08294 dd{font-weight:600;text-align:right}@media(max-width:1050px){.board-live-summary{grid-template-columns:repeat(3,1fr)}.board-live-summary>small{grid-column:1/-1}}
</style>`;
index=replaceOnce(index,'</head>',statusCss+'\n</head>','board status css');

write(rendererPath,renderer);write(mainPath,main);write(preloadPath,preload);write(indexPath,index);write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP 0.82.94 Board status/session recovery patch applied');
