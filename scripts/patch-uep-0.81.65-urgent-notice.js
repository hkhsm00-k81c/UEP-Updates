const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(/const\s+APP_VERSION\s*=\s*["']0\.81\.64["']\s*;/.test(g),'0.81.64 version missing');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.81\.64["']\s*;/,'const APP_VERSION = "0.81.65";');

const addon=`

// __UEP_08165_URGENT_NOTICE_BELL_POPUP__
const UEP_URGENT_LOCAL_ACK_KEY='uep_urgent_notice_ack_v1';
function uepUrgentAckMap(){try{return JSON.parse(localStorage.getItem(UEP_URGENT_LOCAL_ACK_KEY)||'{}')||{};}catch{return {};}}
function uepUrgentAcked(id){return Boolean(uepUrgentAckMap()[String(id||'')]);}
function uepSetUrgentAck(id){const map=uepUrgentAckMap();map[String(id||'')]=new Date().toISOString();localStorage.setItem(UEP_URGENT_LOCAL_ACK_KEY,JSON.stringify(map));}
function uepUrgentNoticeRows(){
  if(typeof directNoticeRows!=='function')return [];
  return directNoticeRows().filter(item=>{
    const kind=String(item?.noticeKind||item?.type||'').trim();
    if(kind!=='긴급')return false;
    if(String(item?.status||'게시')==='종료'||String(item?.status||'')==='삭제')return false;
    return true;
  });
}
function uepUrgentPendingRows(){
  return uepUrgentNoticeRows().filter(item=>{
    const central=typeof noticeActionState==='function'?noticeActionState({...item,confirmRequired:true}):{confirmed:false};
    return !central.confirmed&&!uepUrgentAcked(item.id||item.noticeId);
  });
}
function uepEnsureUrgentBellStyle(){
  if(document.getElementById('uepUrgentBellStyle'))return;
  const s=document.createElement('style');s.id='uepUrgentBellStyle';s.textContent=`
    #uepUrgentBell{position:fixed;top:18px;right:24px;z-index:6500;width:42px;height:42px;border:1px solid rgba(15,23,42,.12);border-radius:14px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.14);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center}
    #uepUrgentBell:hover{transform:translateY(-1px)}
    #uepUrgentBellBadge{position:absolute;right:-5px;top:-5px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:#dc2626;color:white;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid white}
    #uepUrgentBellBadge[hidden]{display:none}
    #uepUrgentBellPanel{position:fixed;top:68px;right:24px;z-index:6501;width:min(380px,calc(100vw - 48px));max-height:55vh;overflow:auto;background:#fff;border:1px solid rgba(15,23,42,.12);border-radius:18px;box-shadow:0 20px 50px rgba(15,23,42,.22);padding:14px}
    #uepUrgentBellPanel[hidden]{display:none}
    .uep-urgent-panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.uep-urgent-panel-head b{font-size:15px}.uep-urgent-panel-row{width:100%;text-align:left;border:0;background:#fff;padding:11px 10px;border-radius:12px;cursor:pointer}.uep-urgent-panel-row:hover{background:#f8fafc}.uep-urgent-panel-row b{display:block;font-size:14px}.uep-urgent-panel-row small{display:block;color:#64748b;margin-top:4px}
    #uepUrgentLayer{position:fixed;inset:0;z-index:9000;background:rgba(15,23,42,.58);display:flex;align-items:center;justify-content:center;padding:24px}.uep-urgent-dialog{width:min(620px,95vw);background:#fff;border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.3);overflow:hidden}.uep-urgent-dialog header{padding:22px 24px;background:#fff1f2;border-bottom:1px solid #fecdd3}.uep-urgent-dialog header small{color:#be123c;font-weight:900;letter-spacing:.08em}.uep-urgent-dialog header h3{margin:6px 0 0;font-size:22px}.uep-urgent-body{padding:24px}.uep-urgent-body p{white-space:pre-wrap;line-height:1.65;margin:0}.uep-urgent-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.uep-urgent-meta span{background:#f1f5f9;border-radius:999px;padding:6px 9px;font-size:12px;color:#475569}.uep-urgent-actions{display:flex;justify-content:flex-end;padding:0 24px 24px}.uep-urgent-actions button{min-width:150px}
  `;document.head.appendChild(s);
}
function uepEnsureUrgentBell(){
  uepEnsureUrgentBellStyle();
  let bell=document.getElementById('uepUrgentBell');
  if(!bell){bell=document.createElement('button');bell.type='button';bell.id='uepUrgentBell';bell.title='긴급공지';bell.innerHTML='🔔<span id="uepUrgentBellBadge" hidden></span>';document.body.appendChild(bell);bell.addEventListener('click',uepToggleUrgentBellPanel);}
  const pending=uepUrgentPendingRows();const badge=document.getElementById('uepUrgentBellBadge');if(badge){badge.textContent=String(pending.length);badge.hidden=!pending.length;}
  return bell;
}
function uepToggleUrgentBellPanel(){
  uepEnsureUrgentBellStyle();let panel=document.getElementById('uepUrgentBellPanel');if(panel){panel.hidden=!panel.hidden;return;}
  panel=document.createElement('section');panel.id='uepUrgentBellPanel';document.body.appendChild(panel);uepRenderUrgentBellPanel();
}
function uepRenderUrgentBellPanel(){
  const panel=document.getElementById('uepUrgentBellPanel');if(!panel)return;const rows=uepUrgentNoticeRows();
  panel.innerHTML=`<div class="uep-urgent-panel-head"><b>🔔 긴급공지</b><button type="button" data-urgent-panel-close>닫기</button></div>${rows.length?rows.map(item=>{const pending=uepUrgentPendingRows().some(x=>String(x.id)===String(item.id));return `<button type="button" class="uep-urgent-panel-row" data-urgent-open="${escapeHtml(item.id||'')}"><b>${pending?'🔴 ':'✓ '}${escapeHtml(item.title||'긴급공지')}</b><small>${escapeHtml(item.postDate||item.date||'')} · ${pending?'미확인':'확인됨'}</small></button>`;}).join(''):'<div class="work-board-empty"><b>긴급공지가 없습니다.</b></div>'}`;
  panel.querySelector('[data-urgent-panel-close]')?.addEventListener('click',()=>panel.hidden=true);
  panel.querySelectorAll('[data-urgent-open]').forEach(b=>b.addEventListener('click',()=>{panel.hidden=true;const item=uepUrgentNoticeRows().find(x=>String(x.id)===String(b.dataset.urgentOpen));if(item)uepOpenUrgentPopup(item,true);}));
}
async function uepConfirmUrgentNotice(item){
  const id=item?.id||item?.noticeId;if(!id)return false;
  let central=false;
  try{if(typeof saveCurrentNoticeReceipt==='function')central=Boolean(await saveCurrentNoticeReceipt(item,{confirmed:true}));}catch{}
  uepSetUrgentAck(id);
  document.getElementById('uepUrgentLayer')?.remove();
  uepEnsureUrgentBell();uepRenderUrgentBellPanel();
  if(typeof toast==='function')toast(central?'긴급공지 확인을 기록했습니다.':'이 PC에서 확인했습니다. 중앙 집계는 연결 후 반영됩니다.');
  setTimeout(uepMaybeShowUrgentPopup,250);
  return true;
}
function uepOpenUrgentPopup(item,forceOpen=false){
  if(!item||document.getElementById('uepUrgentLayer'))return;
  const id=item.id||item.noticeId;if(!forceOpen&&uepUrgentAcked(id))return;
  const central=typeof noticeActionState==='function'?noticeActionState({...item,confirmRequired:true}):{confirmed:false};if(!forceOpen&&central.confirmed)return;
  const layer=document.createElement('div');layer.id='uepUrgentLayer';layer.innerHTML=`<div class="uep-urgent-dialog"><header><small>URGENT · SCHOOL NOTICE</small><h3>🚨 ${escapeHtml(item.title||'긴급공지')}</h3></header><div class="uep-urgent-body"><p>${escapeHtml(item.content||item.detail||item.memo||item.description||'등록된 상세 내용이 없습니다.')}</p><div class="uep-urgent-meta"><span>${escapeHtml(item.department||'1학년부')}</span><span>${escapeHtml(item.author||'')}</span><span>${escapeHtml(item.postDate||item.date||'')}</span></div></div><div class="uep-urgent-actions"><button type="button" class="btn primary" data-urgent-confirm>확인했습니다</button></div></div>`;
  document.body.appendChild(layer);layer.querySelector('[data-urgent-confirm]')?.addEventListener('click',()=>uepConfirmUrgentNotice(item));
}
function uepMaybeShowUrgentPopup(){
  uepEnsureUrgentBell();
  if(typeof currentUserCanManageNotices==='function'&&currentUserCanManageNotices())return;
  const first=uepUrgentPendingRows()[0];if(first)uepOpenUrgentPopup(first);
}
function uepUrgentNoticeTick(){try{uepEnsureUrgentBell();uepMaybeShowUrgentPopup();}catch{}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(uepUrgentNoticeTick,1800));else setTimeout(uepUrgentNoticeTick,1800);
setInterval(uepUrgentNoticeTick,12000);
`;

g += addon;
fs.writeFileSync(gFile,g,'utf8');
const out=fs.readFileSync(gFile,'utf8');
A(out.includes('__UEP_08165_URGENT_NOTICE_BELL_POPUP__'),'urgent addon missing');
A(out.includes('id=\'uepUrgentBell\'')||out.includes('id="uepUrgentBell"')||out.includes("bell.id='uepUrgentBell'"),'bell missing');
A(out.includes('data-urgent-confirm'),'urgent confirm missing');
console.log('0.81.65 urgent notice patch applied');
