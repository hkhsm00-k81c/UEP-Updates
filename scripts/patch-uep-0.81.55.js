const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
const mainFile=path.resolve(appRoot,'resources','app','electron','main.cjs');
let g=fs.readFileSync(rendererFile,'utf8');
let m=fs.readFileSync(mainFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}
function once(s,a,b,label){assert(s.includes(a),label+' anchor not found');return s.replace(a,b);}

g=g.replace(/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/,'const APP_VERSION = "0.81.55";');

// 직접 공지의 단일 진실원천은 40_공지마감입니다. 구형 PC 로컬 공지는 화면에 합치지 않습니다.
const oldDirect=`  const connected=(Array.isArray(readonlyCache?.notices)?readonlyCache.notices:[]).filter(connectedNoticeVisibleToCurrentUser);
  const local=workBoardData("notice").filter(workItemVisibleToCurrentUser).filter(x=>!connected.some(n=>String(n.id)===String(x.id)));
  return [...connected,...local].filter(item=>{`;
const newDirect=`  const connected=(Array.isArray(readonlyCache?.notices)?readonlyCache.notices:[]).filter(connectedNoticeVisibleToCurrentUser);
  return connected.filter(item=>{`;
g=once(g,oldDirect,newDirect,'authoritative notices');

// 저장 성공 직후 동일한 연결 캐시를 업무화면과 대시보드가 공유합니다.
g=once(g,`if(index>=0)readonlyCache.notices[index]={...readonlyCache.notices[index],...normalized};else readonlyCache.notices.unshift(normalized);
  return normalized;`,`if(index>=0)readonlyCache.notices[index]={...readonlyCache.notices[index],...normalized};else readonlyCache.notices.unshift(normalized);
  if(Array.isArray(state.workNotices)&&state.workNotices.length){state.workNotices=[];save().catch(()=>{});}
  return normalized;`,'notice cache purge');

// 삭제 후 전체 시트를 다시 읽지 않고 캐시에서 즉시 제거합니다.
const oldDelete=`$$('[data-notice-delete]').forEach(button=>button.onclick=async(event)=>{event.preventDefault();event.stopPropagation();if(!confirm("이 공지를 삭제할까요?"))return;const result=await window.schoolBoard?.deleteNotice?.(button.dataset.noticeDelete);if(!result?.ok)return toast(result?.reason||"공지 삭제 실패");await refreshReadonlyAfterNotice();render("work");toast("공지를 삭제했습니다.");});`;
const newDelete=`$$('[data-notice-delete]').forEach(button=>button.onclick=async(event)=>{event.preventDefault();event.stopPropagation();if(!confirm("이 공지를 삭제할까요?"))return;const id=button.dataset.noticeDelete;const result=await window.schoolBoard?.deleteNotice?.(id);if(!result?.ok)return toast(result?.reason||"공지 삭제 실패");if(Array.isArray(readonlyCache?.notices))readonlyCache.notices=readonlyCache.notices.filter(item=>String(item.id)!==String(id));render("work");toast("공지를 삭제했습니다.");});`;
g=once(g,oldDelete,newDelete,'notice delete cache');
g=once(g,`const result=await window.schoolBoard?.deleteNotice?.(item.id);if(!result?.ok)return toast(result?.reason||'공지 삭제 실패');await refreshReadonlyAfterNotice();closeDrawer();`,`const result=await window.schoolBoard?.deleteNotice?.(item.id);if(!result?.ok)return toast(result?.reason||'공지 삭제 실패');if(Array.isArray(readonlyCache?.notices))readonlyCache.notices=readonlyCache.notices.filter(row=>String(row.id)!==String(item.id));closeDrawer();`,'drawer delete cache');

// 보안 모달 입력은 전역 단축키·행 선택 핸들러보다 우선합니다.
const modalFocus=`    const passwordInputs=[...layer.querySelectorAll('input[type="password"]')];
    passwordInputs.forEach(input=>{
      input.readOnly=false;input.disabled=false;input.inputMode='numeric';input.autocomplete='off';
      ['keydown','keypress','keyup','beforeinput','input','paste'].forEach(type=>input.addEventListener(type,event=>event.stopImmediatePropagation()));
    });
    setTimeout(()=>layer.querySelector('[data-sensitive-current],[data-sensitive-first]')?.focus(),0);`;
g=once(g,`    setTimeout(()=>layer.querySelector('[data-sensitive-current],[data-sensitive-first]')?.focus(),0);`,modalFocus,'password input isolation');

// 30_공결기록의 고정 원본 행도 직접 정규화하여 파서 결과와 ID 기준으로 합칩니다.
const mergeBlock=`
  {
    const matrix=matrices["30_공식출결기록"]||[];
    const hi=matrix.findIndex(row=>row.some(v=>String(v||'').trim()==='출결ID')&&row.some(v=>String(v||'').trim()==='일자'));
    if(hi>=0){
      const headers=matrix[hi].map(v=>String(v||'').trim()),idx=name=>headers.indexOf(name);
      const iso=value=>{const t=String(value??'').trim();if(/^\\d{5}(?:\\.\\d+)?$/.test(t)){const d=new Date(Math.round((Number(t)-25569)*86400000));return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);}const n=t.replace(/\\D/g,'');if(/^20\\d{6}$/.test(n))return n.slice(0,4)+'-'+n.slice(4,6)+'-'+n.slice(6,8);const x=t.match(/(20\\d{2})\\D+(\\d{1,2})\\D+(\\d{1,2})/);return x?x[1]+'-'+x[2].padStart(2,'0')+'-'+x[3].padStart(2,'0'):t;};
      const raw=matrix.slice(hi+1).filter(r=>String(r[idx('출결ID')]||'').trim()).map((r,i)=>({id:String(r[idx('출결ID')]||'official-raw-'+i).trim(),studentId:String(r[idx('학생ID')]||'').trim(),studentNo:String(r[idx('학번')]||'').replace(/\\.0$/,''),name:String(r[idx('성명')]||'').trim(),className:String(r[idx('반')]||'').replace(/\\.0$/,''),date:iso(r[idx('일자')]),attendanceType:String(r[idx('출결구분')]||'출석인정'),detailType:String(r[idx('세부구분')]||'결석'),type:[r[idx('출결구분')],r[idx('세부구분')]].filter(Boolean).join(' · ')||'공결',period:[r[idx('시작교시')],r[idx('종료교시')]].filter(Boolean).join('~')||String(r[idx('인정범위')]||'하루 전체'),reason:[r[idx('사유')],r[idx('장소')]].filter(Boolean).join(' · '),evidence:String(r[idx('증빙상태')]||''),sourceTab:String(r[idx('원본탭')]||'30_공결기록')})).filter(r=>r.date);
      const byId=new Map((data.officialAttendance||[]).map(r=>[String(r.id),r]));raw.forEach(r=>byId.set(String(r.id),{...(byId.get(String(r.id))||{}),...r}));data.officialAttendance=[...byId.values()];
    }
  }
`;
m=once(m,'  const data = parseGoogleSheetData(matrices);','  const data = parseGoogleSheetData(matrices);'+mergeBlock,'official raw merge');

for(const x of ['const APP_VERSION = "0.81.55";','return connected.filter(item=>{','passwordInputs.forEach','readonlyCache.notices=readonlyCache.notices.filter'])assert(g.includes(x),'renderer marker '+x);
assert(m.includes('official-raw-'),'main attendance marker');
fs.writeFileSync(rendererFile,g,'utf8');fs.writeFileSync(mainFile,m,'utf8');
console.log('UEP 0.81.55 notice, attendance and password input repair applied');
