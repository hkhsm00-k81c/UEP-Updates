const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const root=path.resolve(process.argv[2]||'.');
const base=path.join(__dirname,'patch-uep-08297-board-live-manage.js');
let src=fs.readFileSync(base,'utf8');

// The notice/schedule panels are built as renderer strings in gyomuon.js, so do not
// try to locate a literal closing </section> in the patch source. Create the owner
// management mount from the normal Board section renderer when that tool is opened.
src=src.replace("renderer=injectPanelHtml(renderer,'notice','schedule',noticeMount);\nrenderer=injectPanelHtml(renderer,'schedule','timetable',scheduleMount);",'');
const refreshNeedle="async function refreshBoardMine08297(kind){\n  const host=document.getElementById(kind==='notice'?'boardMyNotice08297':'boardMySchedule08297');";
const refreshReplacement="function ensureBoardMineMount08297(kind){\n  const id=kind==='notice'?'boardMyNotice08297':'boardMySchedule08297';\n  if(document.getElementById(id))return;\n  const section=boardSection08291(kind);if(!section)return;\n  const title=kind==='notice'?'내가 올린 공지':'내가 올린 일정';\n  const sub=kind==='notice'?'로그인한 내가 등록한 공지를 확인하고 수정하거나 내릴 수 있습니다.':'로그인한 내가 등록한 일정을 확인하고 수정하거나 내릴 수 있습니다.';\n  const tag=kind==='notice'?'MY NOTICE':'MY SCHEDULE';\n  section.insertAdjacentHTML('beforeend','<div class=\"board-my-manage-shell\"><div class=\"board-section-head compact\"><div><small>'+tag+'</small><h4>'+title+'</h4><p>'+sub+'</p></div><button class=\"btn secondary\" type=\"button\" onclick=\"refreshBoardMine08297(&quot;'+kind+'&quot;)\">새로고침</button></div><div id=\"'+id+'\" class=\"board-my-list\"><div class=\"board-empty-state compact\">목록을 불러오는 중입니다.</div></div></div>');\n}\nasync function refreshBoardMine08297(kind){\n  ensureBoardMineMount08297(kind);\n  const host=document.getElementById(kind==='notice'?'boardMyNotice08297':'boardMySchedule08297');";
if(!src.includes(refreshNeedle))throw new Error('refreshBoardMine08297 source pattern missing');
src=src.replace(refreshNeedle,refreshReplacement);

const marker='const rendererHelpers=`';
const start=src.indexOf(marker);
if(start<0)throw new Error('rendererHelpers marker missing');
const innerStart=start+marker.length;
const after="renderer=replaceOnce(renderer,'// __UEP_08296_BOARD_SCREEN_MIRROR_RENDERER__'";
const afterPos=src.indexOf(after,innerStart);
if(afterPos<0)throw new Error('rendererHelpers following statement missing');
const closePos=src.lastIndexOf('`;',afterPos);
if(closePos<innerStart)throw new Error('rendererHelpers closing delimiter missing');
const fixedInner=src.slice(innerStart,closePos).replace(/`/g,'\\`').replace(/\$\{/g,'\\${');
src=src.slice(0,innerStart)+fixedInner+src.slice(closePos);
src=src.replace("renderer=replaceOnce(renderer,'// __UEP_08296_BOARD_SCREEN_MIRROR_RENDERER__'","renderer=replaceOnce(renderer,'// __UEP_08295_BOARD_CARD_OPERATION_RENDERER__'");
const temp=path.join(__dirname,'.tmp-patch-uep-08297-fixed.js');
fs.writeFileSync(temp,src,'utf8');
try{
  const check=spawnSync(process.execPath,['--check',temp],{stdio:'inherit'});
  if(check.status!==0)process.exit(check.status||1);
  const run=spawnSync(process.execPath,[temp,root],{stdio:'inherit'});
  process.exitCode=run.status||0;
}finally{
  try{fs.unlinkSync(temp);}catch{}
}
