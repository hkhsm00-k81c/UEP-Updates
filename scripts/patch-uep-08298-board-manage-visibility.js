const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const rendererPath=path.join(root,'gyomuon.js'),mainPath=path.join(root,'electron','main.cjs'),packagePath=path.join(root,'package.json');
function read(p){return fs.readFileSync(p,'utf8');} function write(p,s){fs.writeFileSync(p,s,'utf8');} function must(c,m){if(!c)throw new Error(m);}
function replaceOnce(text,from,to,label){const i=text.indexOf(from);must(i>=0,label+' source pattern not found');must(text.indexOf(from,i+from.length)<0,label+' source pattern not unique');return text.slice(0,i)+to+text.slice(i+from.length);}
function replaceFunction(text,name,newSource){const rx=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\('),m=rx.exec(text);must(m,name+' not found');const start=m.index,brace=text.indexOf('{',m.index);let depth=0,end=-1,quote='',esc=false;for(let i=brace;i<text.length;i++){const ch=text[i];if(quote){if(esc){esc=false;continue;}if(ch==='\\'){esc=true;continue;}if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}if(ch==='{')depth++;else if(ch==='}'&&--depth===0){end=i+1;break;}}must(end>0,name+' end not found');return text.slice(0,start)+newSource+text.slice(end);}
let renderer=read(rendererPath),main=read(mainPath);const pkg=JSON.parse(read(packagePath));must(pkg.version==='0.82.97','baseline version mismatch: '+pkg.version);pkg.version='0.82.98';
renderer=replaceOnce(renderer,'const APP_VERSION="0.82.97"; /* UEP_08297_BOARD_LIVE_MANAGE */','const APP_VERSION="0.82.98"; /* UEP_08298_BOARD_MANAGE_VISIBILITY */','runtime version');
const helper=`\n// __UEP_08298_BOARD_MANAGE_VISIBILITY__\nfunction boardCanManageLive08298(item={}){\n  if(boardAdminUiAllowed())return true;\n  const u=boardStatusUser08294?.()||{},selected=window.UEP_08295_SELECTED_BOARD||{};\n  const ug=String(u.grade||'').replace(/\\D/g,''),uc=String(u.homeroom||'').replace(/\\D/g,'');\n  const bg=String(selected['학년']||selected.grade||'').replace(/\\D/g,''),bc=String(selected['반']||selected.classNo||'').replace(/\\D/g,'');\n  if(ug&&uc&&bg===ug&&bc===uc)return true;\n  const me=String(boardCurrentAuthor08293?.()||'').trim(),author=String(item.author||item['작성자']||'').trim();return Boolean(me&&author&&me===author);\n}\n`;
renderer=replaceOnce(renderer,'// __UEP_08297_BOARD_LIVE_MANAGE_RENDERER__','// __UEP_08297_BOARD_LIVE_MANAGE_RENDERER__'+helper,'renderer helper');
renderer=replaceFunction(renderer,'renderBoardOperationDetail08295',`function renderBoardOperationDetail08295(r){
  const host=document.getElementById('boardOperationDetail08295');if(!host)return;
  const board=r.board||{},label=boardClassLabel08295(board)||String(board['설치위치']||'Board'),notices=r.notices||[],schedules=r.schedules||[],tt=r.timetable||[],exam=r.exam||{active:false,timetable:[],cautions:[]};
  const mode=r.displayMode==='EXAM'?'시험모드':r.displayMode==='NIGHT'?'야간모드':'일반모드';
  const row=(kind,title,body,action='')=>'<article class="board-op-row"><span>'+escapeHtml(kind)+'</span><div><strong>'+escapeHtml(title||'-')+'</strong><small>'+escapeHtml(body||'')+'</small></div>'+action+'</article>';
  const down=(kind,x,sheet='')=>boardCanManageLive08298(x)?'<button type="button" class="btn secondary danger mini" onclick="deleteBoardPreviewItem08297(&quot;'+kind+'&quot;,&quot;'+escapeHtml(x.id||'')+'&quot;,&quot;'+escapeHtml(sheet||'')+'&quot;)">내리기</button>':'';
  let content='';
  if(r.displayMode==='EXAM'){
    const cautionRows=(exam.cautions||[]).map((x,i)=>row('유의',String(i+1)+'. '+x,''));const examRows=(exam.timetable||[]).map(x=>row('시험일정',x.period+'교시 · '+x.subject,[x.startTime,x.endTime].filter(Boolean).join(' ~ ')));
    content='<section class="board-mirror-section"><h5>'+escapeHtml(exam.examName||'시험모드')+'</h5><p class="board-mirror-note">실제 전자칠판 시험모드에 표시되는 오늘의 시험 일정과 유의사항입니다.</p>'+(cautionRows.length?cautionRows.join(''):'')+(examRows.length?examRows.join(''):'<div class="board-empty-state compact">오늘 등록된 시험시간표가 없습니다.</div>')+'</section>';
  }else{
    const rows=[];tt.forEach(x=>rows.push(row('시간표',x.period+'교시 · '+x.subject,[x.teacher,x.room].filter(Boolean).join(' · '))));
    notices.forEach(x=>rows.push(row('공지',x.title,(x.author?x.author+' · ':'')+(x.body||''),down('notice',x,x.source||''))));
    schedules.forEach(x=>{const when=[x.date,x.startPeriod?x.startPeriod+'교시':x.startTime].filter(Boolean).join(' · ');rows.push(row('일정',x.title,[when,x.category].filter(Boolean).join(' · '),down('schedule',x,'')));});
    content=rows.length?rows.join(''):'<div class="board-empty-state compact">현재 표시할 시간표·공지·일정이 없습니다.</div>';
  }
  host.innerHTML='<div class="board-selected-head"><div><small>현재 전자칠판 화면 조회</small><h4>'+escapeHtml(label)+'</h4><p>'+escapeHtml(String(board['BoardID']||''))+' · 앱 '+escapeHtml(String(board['앱버전']||'-'))+' · 마지막 '+escapeHtml(boardStatusWhen08294(board['마지막접속']))+'</p></div><span>'+escapeHtml(mode)+'</span></div><div class="board-current-state"><div class="board-current-counts"><span>공지 <b>'+notices.length+'</b></span><span>화면 일정 <b>'+Number(r.screenScheduleCount||0)+'</b></span><span>오늘 시간표 <b>'+tt.length+'</b></span>'+(exam.active?'<span>시험일정 <b>'+exam.timetable.length+'</b></span>':'')+'</div>'+content+'</div>';
}`);
main+='\n// __UEP_08298_BOARD_MANAGE_VISIBILITY__: boardManagedDelete08297 remains authoritative for admin/owner/homeroom.\n';
write(rendererPath,renderer);write(mainPath,main);write(packagePath,JSON.stringify(pkg,null,2)+'\n');console.log('UEP 0.82.98 Board management visibility patch applied');
