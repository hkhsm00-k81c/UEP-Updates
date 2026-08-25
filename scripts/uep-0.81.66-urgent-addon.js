// __UEP_08166_URGENT_NOTICE_RUNTIME__
const UEP_URGENT_ACK_KEY_08166='uep_urgent_notice_ack_v2';
function uepUrgentAckMap08166(){try{return JSON.parse(localStorage.getItem(UEP_URGENT_ACK_KEY_08166)||'{}')||{};}catch{return {};}}
function uepUrgentAcked08166(id){return Boolean(uepUrgentAckMap08166()[String(id||'')]);}
function uepUrgentSetAck08166(id){const map=uepUrgentAckMap08166();map[String(id||'')]=new Date().toISOString();localStorage.setItem(UEP_URGENT_ACK_KEY_08166,JSON.stringify(map));}
function uepUrgentRows08166(){
  if(typeof directNoticeRows!=='function')return [];
  return directNoticeRows().filter(item=>String(item?.noticeKind||item?.type||'').trim()==='긴급'&&!['종료','삭제'].includes(String(item?.status||'게시')));
}
function uepUrgentPending08166(){
  return uepUrgentRows08166().filter(item=>{
    const central=typeof noticeActionState==='function'?noticeActionState({...item,confirmRequired:true}):{confirmed:false};
    return !central.confirmed&&!uepUrgentAcked08166(item.id||item.noticeId);
  });
}
function uepUrgentStyle08166(){
  if(document.getElementById('uepUrgentStyle08166'))return;
  const style=document.createElement('style');style.id='uepUrgentStyle08166';style.textContent=[
    '.uep-urgent-bell-host{position:relative!important}',
    '#uepUrgentBadge08166{position:absolute;right:-7px;top:-7px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#dc2626;color:#fff;border:2px solid #fff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;z-index:3}',
    '#uepUrgentBadge08166[hidden]{display:none}',
    '#uepUrgentFallbackBell08166{position:fixed;right:22px;top:14px;z-index:6400;width:38px;height:38px;border:0;background:transparent;font-size:18px;cursor:pointer}',
    '#uepUrgentPanel08166{position:fixed;right:20px;top:58px;z-index:8800;width:min(390px,calc(100vw - 40px));max-height:58vh;overflow:auto;background:#fff;border:1px solid #dbe4ea;border-radius:18px;box-shadow:0 24px 60px rgba(15,23,42,.22);padding:14px}',
    '#uepUrgentPanel08166[hidden]{display:none}',
    '.uep-urgent-head08166{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.uep-urgent-head08166 button{border:0;background:transparent;cursor:pointer}',
    '.uep-urgent-row08166{display:block;width:100%;border:0;background:#fff;text-align:left;padding:11px;border-radius:12px;cursor:pointer}.uep-urgent-row08166:hover{background:#f8fafc}.uep-urgent-row08166 b{display:block}.uep-urgent-row08166 small{display:block;color:#64748b;margin-top:4px}',
    '#uepUrgentLayer08166{position:fixed;inset:0;z-index:12000;background:rgba(15,23,42,.58);display:flex;align-items:center;justify-content:center;padding:24px}',
    '.uep-urgent-dialog08166{width:min(640px,95vw);background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 34px 90px rgba(0,0,0,.34)}',
    '.uep-urgent-dialog08166 header{padding:22px 24px;background:#fff1f2;border-bottom:1px solid #fecdd3}.uep-urgent-dialog08166 header small{font-weight:900;color:#be123c;letter-spacing:.08em}.uep-urgent-dialog08166 header h3{margin:6px 0 0;font-size:22px}',
    '.uep-urgent-body08166{padding:24px}.uep-urgent-body08166 p{white-space:pre-wrap;line-height:1.7;margin:0}.uep-urgent-meta08166{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.uep-urgent-meta08166 span{padding:6px 9px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:12px}',
    '.uep-urgent-actions08166{padding:0 24px 24px;display:flex;justify-content:flex-end}.uep-urgent-actions08166 button{min-width:160px}'
  ].join('\n');document.head.appendChild(style);
}
function uepFindTopBell08166(){
  const candidates=[...document.querySelectorAll('button,[role="button"],[title],[aria-label]')];
  let el=candidates.find(x=>/알림|notification/i.test(`${x.getAttribute?.('title')||''} ${x.getAttribute?.('aria-label')||''}`));
  if(!el)el=candidates.find(x=>(x.textContent||'').includes('🔔'));
  if(el&&el.tagName!=='BUTTON')el=el.closest('button')||el;
  return el||null;
}
function uepTogglePanel08166(){
  uepUrgentStyle08166();let panel=document.getElementById('uepUrgentPanel08166');
  if(!panel){panel=document.createElement('section');panel.id='uepUrgentPanel08166';document.body.appendChild(panel);uepRenderPanel08166();return;}
  panel.hidden=!panel.hidden;if(!panel.hidden)uepRenderPanel08166();
}
function uepEnsureBell08166(){
  uepUrgentStyle08166();let host=uepFindTopBell08166();
  if(!host){host=document.getElementById('uepUrgentFallbackBell08166');if(!host){host=document.createElement('button');host.id='uepUrgentFallbackBell08166';host.type='button';host.textContent='🔔';host.title='긴급공지';document.body.appendChild(host);}}
  host.classList.add('uep-urgent-bell-host');
  if(!host.dataset.uepUrgentBound){host.dataset.uepUrgentBound='1';host.addEventListener('click',event=>{event.stopPropagation();uepTogglePanel08166();});}
  let badge=host.querySelector?.('#uepUrgentBadge08166');if(!badge){badge=document.createElement('span');badge.id='uepUrgentBadge08166';host.appendChild(badge);}
  const count=uepUrgentPending08166().length;badge.textContent=String(count);badge.hidden=count===0;
}
function uepRenderPanel08166(){
  const panel=document.getElementById('uepUrgentPanel08166');if(!panel)return;const rows=uepUrgentRows08166(),pendingIds=new Set(uepUrgentPending08166().map(x=>String(x.id||x.noticeId)));
  panel.innerHTML=`<div class="uep-urgent-head08166"><b>🔔 긴급공지</b><button type="button" data-urgent-close08166>닫기</button></div>${rows.length?rows.map(item=>{const id=String(item.id||item.noticeId||'');return `<button type="button" class="uep-urgent-row08166" data-urgent-open08166="${escapeHtml(id)}"><b>${pendingIds.has(id)?'🔴':'✓'} ${escapeHtml(item.title||'긴급공지')}</b><small>${escapeHtml(item.postDate||item.date||'')} · ${pendingIds.has(id)?'미확인':'확인됨'}</small></button>`;}).join(''):'<div class="work-board-empty"><b>긴급공지가 없습니다.</b></div>'}`;
  panel.querySelector('[data-urgent-close08166]')?.addEventListener('click',()=>panel.hidden=true);
  panel.querySelectorAll('[data-urgent-open08166]').forEach(btn=>btn.addEventListener('click',()=>{panel.hidden=true;const item=rows.find(x=>String(x.id||x.noticeId)===String(btn.dataset.urgentOpen08166));if(item)uepOpenUrgent08166(item,true);}));
}
async function uepConfirmUrgent08166(item){
  const id=item?.id||item?.noticeId;if(!id)return;
  let central=false;
  try{if(typeof saveCurrentNoticeReceipt==='function')central=Boolean(await saveCurrentNoticeReceipt(item,{confirmed:true}));}catch{}
  uepUrgentSetAck08166(id);document.getElementById('uepUrgentLayer08166')?.remove();uepEnsureBell08166();uepRenderPanel08166();
  if(typeof toast==='function')toast(central?'긴급공지 확인을 기록했습니다.':'긴급공지를 확인했습니다. 중앙 집계는 연결되는 즉시 반영됩니다.');
  setTimeout(uepUrgentTick08166,200);
}
function uepOpenUrgent08166(item,force=false){
  if(!item||document.getElementById('uepUrgentLayer08166'))return;const id=item.id||item.noticeId;
  const central=typeof noticeActionState==='function'?noticeActionState({...item,confirmRequired:true}):{confirmed:false};if(!force&&(central.confirmed||uepUrgentAcked08166(id)))return;
  const layer=document.createElement('div');layer.id='uepUrgentLayer08166';layer.innerHTML=`<div class="uep-urgent-dialog08166"><header><small>URGENT · SCHOOL NOTICE</small><h3>🚨 ${escapeHtml(item.title||'긴급공지')}</h3></header><div class="uep-urgent-body08166"><p>${escapeHtml(item.content||item.detail||item.memo||item.description||'등록된 상세 내용이 없습니다.')}</p><div class="uep-urgent-meta08166"><span>${escapeHtml(item.department||'1학년부')}</span><span>${escapeHtml(item.author||'')}</span><span>${escapeHtml(item.postDate||item.date||'')}</span></div></div><div class="uep-urgent-actions08166"><button type="button" class="btn primary" data-urgent-confirm08166>확인했습니다</button></div></div>`;
  document.body.appendChild(layer);layer.querySelector('[data-urgent-confirm08166]')?.addEventListener('click',()=>uepConfirmUrgent08166(item));
}
function uepUrgentTick08166(){try{uepEnsureBell08166();if(typeof currentUserCanManageNotices==='function'&&currentUserCanManageNotices())return;const first=uepUrgentPending08166()[0];if(first)uepOpenUrgent08166(first);}catch(error){console.warn('[UEP urgent]',error);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(uepUrgentTick08166,1800));else setTimeout(uepUrgentTick08166,1800);
setInterval(uepUrgentTick08166,12000);
