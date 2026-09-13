const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const rendererPath=path.join(root,'gyomuon.js');
const mainPath=path.join(root,'electron','main.cjs');
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
let renderer=read(rendererPath),main=read(mainPath),index=read(indexPath);
const pkg=JSON.parse(read(packagePath));
must(pkg.version==='0.82.95',`baseline package version mismatch: ${pkg.version}`);
pkg.version='0.82.96';
renderer=replaceOnce(renderer,'const APP_VERSION="0.82.95"; /* UEP_08295_BOARD_CARD_OPERATION_CONNECT */','const APP_VERSION="0.82.96"; /* UEP_08296_BOARD_SCREEN_MIRROR */','runtime version');

const detailMain=`
// __UEP_08296_BOARD_SCREEN_MIRROR__
function boardSeoulToday08296(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const m=Object.fromEntries(parts.map(x=>[x.type,x.value]));return m.year+'-'+m.month+'-'+m.day;
}
function boardSeoulClock08296(){return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date());}
function boardSeoulWeekday08296(){return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',weekday:'long'}).format(new Date()).slice(0,1);}
function boardDate08296(v){
  const s=String(v??'').trim();if(!s)return '';
  let m=s.match(/^(\\d{4})[-/.]\\s*(\\d{1,2})[-/.]\\s*(\\d{1,2})/);if(!m)return /^\\d{4}-\\d{2}-\\d{2}/.test(s)?s.slice(0,10):s;
  return m[1]+'-'+String(Number(m[2])).padStart(2,'0')+'-'+String(Number(m[3])).padStart(2,'0');
}
function boardClock08296(v){
  const s=String(v??'').trim();if(!s)return '';
  const m=s.match(/(\\d{1,2}):(\\d{2})(?::(\\d{2}))?/);if(!m)return s;
  return String(Number(m[1])).padStart(2,'0')+':'+m[2]+':'+(m[3]||'00');
}
function boardEnabled08296(v){const s=String(v??'').trim().toUpperCase();return !s||s==='Y'||s==='TRUE'||s==='1'||s==='사용';}
function boardClassNorm08296(v){const s=String(v??'').trim();return String(Number(s)||s);}
function boardPriority08296(v){const s=String(v??'').trim();const n=Number(s);if(!Number.isNaN(n)&&s!=='')return n;if(s==='긴급')return 3;if(s==='중요'||s==='높음')return 2;return 1;}
async function boardSheetObjects08296(token,sheet,range='A3:Z1000'){
  const rows=await boardReadRange08291(token,"'"+sheet+"'!"+range);if(!rows.length)return [];
  const h=rows[0].map(v=>String(v??'').trim());return rows.slice(1).filter(r=>r.some(v=>String(v??'').trim())).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??''])));
}
function boardNoticeVisible08296(r,grade,classNo,today,nowClock){
  if(!boardEnabled08296(r['사용여부']))return false;
  const sd=boardDate08296(r['게시시작']),ed=boardDate08296(r['게시종료']),st=boardClock08296(r['게시시작시각']),et=boardClock08296(r['게시종료시각']);
  if(sd&&today<sd)return false;if(ed&&today>ed)return false;if(sd===today&&st&&nowClock<st)return false;if(ed===today&&et&&nowClock>et)return false;
  const tg=String(r['대상학년']||'').trim(),tc=boardClassNorm08296(r['대상반']),target=String(r['표시대상']||'').trim();
  if(tg&&tg!=='전체'&&tg!==grade)return false;if(tc&&tc!=='전체'&&tc!==boardClassNorm08296(classNo))return false;
  if(!target||target==='전체'||target==='전교')return true;return target.includes(grade+'학년')||target.includes(boardClassNorm08296(classNo)+'반');
}
async function boardDbDetail08296(payload={}){
  const ui=payload?.user&&typeof payload.user==='object'?payload.user:{};
  const requestedId=boardSafeText08291(payload?.boardId,120);if(!requestedId)throw boardWriteError08291('BoardID를 확인해 주세요.','UEP_BOARD_ID_REQUIRED');
  const ctx=await boardDbReadContext08294(ui);
  const masters=await boardSheetObjects08296(ctx.token,'01_Board마스터','A3:N100');
  if(!masters.length)throw boardWriteError08291('Board 마스터가 비어 있습니다.','UEP_BOARD_MASTER_EMPTY');
  const visible=ctx.isAdmin?masters:masters.filter(b=>String(b['학년']||'')===String(ctx.user.grade||'')&&boardClassNorm08296(b['반'])===boardClassNorm08296(ctx.user.homeroom||''));
  const board=visible.find(b=>String(b['BoardID']||'').trim()===requestedId);if(!board)throw boardWriteError08291('이 Board를 조회할 권한이 없거나 BoardID가 변경되었습니다.','UEP_BOARD_NOT_VISIBLE');
  const boardId=String(board['BoardID']||'').trim(),schoolYear=String(board['학년도']||'').trim(),grade=String(board['학년']||'').trim(),classNo=boardClassNorm08296(board['반']);
  const today=boardSeoulToday08296(),nowClock=boardSeoulClock08296(),weekday=boardSeoulWeekday08296();

  const noticeSheets=grade==='1'?['06_1학년공지','08_전교공지']:grade==='2'?['07_2학년공지','08_전교공지']:['08_전교공지'];
  let notices=[];
  for(const sheet of noticeSheets){
    const rows=await boardSheetObjects08296(ctx.token,sheet,'A3:V500');
    notices=notices.concat(rows.filter(r=>boardNoticeVisible08296(r,grade,classNo,today,nowClock)).map(r=>({
      id:String(r['공지ID']||''),title:String(r['제목']||''),body:String(r['핵심문구']||''),importance:boardPriority08296(r['중요도']),source:sheet,author:String(r['작성자']||''),start:boardDate08296(r['게시시작']),end:boardDate08296(r['게시종료'])
    })));
  }
  notices.sort((a,b)=>b.importance-a.importance);notices=notices.slice(0,12);

  let schedules=(await boardSheetObjects08296(ctx.token,'09_일정','A3:T800')).filter(r=>{
    if(!boardEnabled08296(r['사용여부']))return false;const start=boardDate08296(r['일자']),end=boardDate08296(r['종료일'])||start;if(!start||end<today)return false;
    const tg=String(r['대상학년']||'').trim(),tc=boardClassNorm08296(r['대상반']);return (!tg||tg==='전체'||tg===grade)&&(!tc||tc==='전체'||tc===classNo);
  }).map(r=>({id:String(r['일정ID']||''),date:boardDate08296(r['일자']),endDate:boardDate08296(r['종료일'])||boardDate08296(r['일자']),category:String(r['구분']||''),title:String(r['제목']||''),body:String(r['핵심문구']||''),startPeriod:String(r['시작교시']||''),startTime:boardClock08296(r['시작시각']).slice(0,5),endPeriod:String(r['종료교시']||''),endTime:boardClock08296(r['종료시각']).slice(0,5),author:String(r['작성자']||'')}));
  schedules.sort((a,b)=>a.date.localeCompare(b.date)||(Number(a.startPeriod||999)-Number(b.startPeriod||999))||String(a.startTime||'99:99').localeCompare(String(b.startTime||'99:99')));schedules=schedules.slice(0,12);

  let timetable=(await boardSheetObjects08296(ctx.token,'05_학급시간표','A3:Q800')).filter(r=>boardEnabled08296(r['사용여부'])&&String(r['BoardID']||'').trim()===boardId&&(!schoolYear||String(r['학년도']||'').trim()===schoolYear)&&String(r['학년']||'').trim()===grade&&boardClassNorm08296(r['반'])===classNo&&String(r['요일']||'').trim()===weekday).map(r=>({period:Number(r['교시']||0),subject:String(r['과목']||''),teacher:String(r['교사']||''),room:String(r['교실']||'')})).sort((a,b)=>a.period-b.period);

  const exams=(await boardSheetObjects08296(ctx.token,'22_시험운영','A3:Q300')).filter(r=>{
    if(!boardEnabled08296(r['사용여부']))return false;const tg=String(r['대상학년']||'').trim(),tc=boardClassNorm08296(r['대상반']);if(tg&&tg!=='전체'&&tg!==grade)return false;if(tc&&tc!=='전체'&&tc!==classNo)return false;
    const end=boardDate08296(r['시험종료일']||r['종료일']);return !end||end>=today;
  }).sort((a,b)=>boardDate08296(a['시험시작일']||a['시작일']).localeCompare(boardDate08296(b['시험시작일']||b['시작일'])));
  const examRow=exams[0]||null;let exam={active:false,examId:'',examName:'',startDate:'',endDate:'',timetable:[],cautions:[]};
  if(examRow){
    const examId=String(examRow['시험ID']||''),startDate=boardDate08296(examRow['시험시작일']||examRow['시작일']),endDate=boardDate08296(examRow['시험종료일']||examRow['종료일'])||startDate;
    const examTimetable=(await boardSheetObjects08296(ctx.token,'23_시험시간표','A3:Q600')).filter(r=>boardEnabled08296(r['사용여부'])&&String(r['시험ID']||'')===examId&&boardDate08296(r['시험일자']||r['일자'])===today).filter(r=>{const tg=String(r['대상학년']||'').trim(),tc=boardClassNorm08296(r['대상반']);return (!tg||tg==='전체'||tg===grade)&&(!tc||tc==='전체'||tc===classNo);}).map(r=>({period:String(r['교시']||''),subject:String(r['과목']||''),startTime:boardClock08296(r['시작시각']).slice(0,5),endTime:boardClock08296(r['종료시각']).slice(0,5)})).sort((a,b)=>Number(a.period||999)-Number(b.period||999));
    exam={active:today>=startDate&&today<=endDate&&examTimetable.length>0,examId,examName:String(examRow['시험명']||''),startDate,endDate,timetable:examTimetable,cautions:['유의사항1','유의사항2','유의사항3'].map(k=>String(examRow[k]||'').trim()).filter(Boolean)};
  }
  const hm=nowClock.slice(0,5);const displayMode=exam.active?'EXAM':(hm>='16:30'&&hm<'22:00'?'NIGHT':'GENERAL');
  return {ok:true,board,grade,classNo,displayMode,notices,schedules,timetable,exam,screenScheduleCount:exam.active?exam.timetable.length:schedules.length,sessionVerified:ctx.sessionVerified,fallback:ctx.fallback};
}
`;
main=replaceOnce(main,'// __UEP_08295_BOARD_CARD_OPERATION_CONNECT__',detailMain+'\n// __UEP_08295_BOARD_CARD_OPERATION_CONNECT__','detail mirror insert');
main=replaceOnce(main,'return await boardDbDetail08295(payload);','return await boardDbDetail08296(payload);','detail IPC mirror switch');

renderer=replaceFunction(renderer,'selectBoardCard08295',`async function selectBoardCard08295(boardId){
  const card=[...document.querySelectorAll('.board-summary-card-08294[data-board-id]')].find(x=>x.dataset.boardId===boardId);
  document.querySelectorAll('.board-summary-card-08294').forEach(x=>x.classList.toggle('selected',x===card));
  const host=document.getElementById('boardOperationDetail08295');if(host)host.innerHTML='<div class="board-empty-state">선택한 교실의 현재 전자칠판 화면 내용을 불러오는 중입니다.</div>';
  const board=window.UEP_08295_BOARD_MAP?.[boardId];if(!board)return;
  UEP_08295_SELECTED_BOARD=board;
  try{
    const r=await window.schoolBoard?.boardDbDetail?.({boardId,user:boardStatusUser08294()});if(!r?.ok)throw new Error(r?.message||'Board 화면 조회 실패');
    UEP_08295_SELECTED_BOARD=r.board||board;renderBoardOperationDetail08295(r);
  }catch(error){if(host)host.innerHTML='<div class="board-empty-state">'+escapeHtml(String(error?.message||error))+'</div>';}
}`);

renderer=replaceFunction(renderer,'renderBoardOperationDetail08295',`function renderBoardOperationDetail08295(r){
  const host=document.getElementById('boardOperationDetail08295');if(!host)return;
  const board=r.board||{},label=boardClassLabel08295(board)||String(board['설치위치']||'Board'),notices=r.notices||[],schedules=r.schedules||[],tt=r.timetable||[],exam=r.exam||{active:false,timetable:[],cautions:[]};
  const mode=r.displayMode==='EXAM'?'시험모드':r.displayMode==='NIGHT'?'야간모드':'일반모드';
  const row=(kind,title,body)=>'<article class="board-op-row"><span>'+escapeHtml(kind)+'</span><div><strong>'+escapeHtml(title||'-')+'</strong><small>'+escapeHtml(body||'')+'</small></div></article>';
  let content='';
  if(r.displayMode==='EXAM'){
    const cautionRows=(exam.cautions||[]).map((x,i)=>row('유의',String(i+1)+'. '+x,''));
    const examRows=(exam.timetable||[]).map(x=>row('시험일정',x.period+'교시 · '+x.subject,[x.startTime,x.endTime].filter(Boolean).join(' ~ ')));
    content='<section class="board-mirror-section"><h5>'+escapeHtml(exam.examName||'시험모드')+'</h5><p class="board-mirror-note">실제 전자칠판 시험모드에 표시되는 오늘의 시험 일정과 유의사항입니다.</p>'+(cautionRows.length?cautionRows.join(''):'')+(examRows.length?examRows.join(''):'<div class="board-empty-state compact">오늘 등록된 시험시간표가 없습니다.</div>')+'</section>';
  }else{
    const rows=[];
    tt.forEach(x=>rows.push(row('시간표',x.period+'교시 · '+x.subject,[x.teacher,x.room].filter(Boolean).join(' · '))));
    notices.forEach(x=>rows.push(row('공지',x.title,(x.author?x.author+' · ':'')+(x.body||''))));
    schedules.forEach(x=>{const when=[x.date,x.startPeriod?x.startPeriod+'교시':x.startTime].filter(Boolean).join(' · ');rows.push(row('일정',x.title,[when,x.category].filter(Boolean).join(' · ')));});
    content=rows.length?rows.join(''):'<div class="board-empty-state compact">현재 표시할 시간표·공지·일정이 없습니다.</div>';
  }
  host.innerHTML='<div class="board-selected-head"><div><small>현재 전자칠판 화면 조회</small><h4>'+escapeHtml(label)+'</h4><p>'+escapeHtml(String(board['BoardID']||''))+' · 앱 '+escapeHtml(String(board['앱버전']||'-'))+' · 마지막 '+escapeHtml(boardStatusWhen08294(board['마지막접속']))+'</p></div><span>'+escapeHtml(mode)+'</span></div><div class="board-current-state"><div class="board-current-counts"><span>공지 <b>'+notices.length+'</b></span><span>화면 일정 <b>'+Number(r.screenScheduleCount||0)+'</b></span><span>오늘 시간표 <b>'+tt.length+'</b></span>'+(exam.active?'<span>시험일정 <b>'+exam.timetable.length+'</b></span>':'')+'</div>'+content+'</div>';
}`);

renderer=replaceOnce(renderer,"document.querySelectorAll('.board-action-card').forEach(el=>el.classList.toggle('is-active',el.dataset.boardTool===tool));\n  boardBindSelected08295(tool);","document.querySelectorAll('.board-action-card').forEach(el=>el.classList.toggle('is-active',el.dataset.boardTool===tool));",'remove query-to-edit auto binding');
renderer=renderer.replaceAll('선택하여 운영 연결 ›','선택하여 화면 조회 ›');
renderer=renderer.replaceAll('교실 카드를 선택하면 현재 적용 상태와 이 반 운영 버튼이 표시됩니다.','교실 카드를 선택하면 실제 전자칠판에 표시되는 현재 화면 내용을 조회합니다.');

const css=`<style id="uep08296BoardMirrorStyle">
.board-mirror-section{margin-top:6px}.board-mirror-section h5{margin:10px 0 2px;font-size:17px}.board-mirror-note{margin:0 0 8px;color:#71818a;font-size:11px}.board-selected-head>span{background:#eef5ff;color:#3f6fae}.board-current-state{margin-top:14px}
</style>`;
index=replaceOnce(index,'</head>',css+'\n</head>','mirror CSS');

write(rendererPath,renderer);write(mainPath,main);write(indexPath,index);write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP 0.82.96 Board screen mirror patch applied');
