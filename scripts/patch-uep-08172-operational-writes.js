const fs=require('fs');
const g='app/resources/app/gyomuon.js',m='app/resources/app/electron/main.cjs';
let gy=fs.readFileSync(g,'utf8'),main=fs.readFileSync(m,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const rep=(src,from,to,label)=>{must(src.includes(from),'missing '+label);return src.replace(from,to)};
function functionBlock(src,name){
  let start=src.indexOf(`async function ${name}`);if(start<0)start=src.indexOf(`function ${name}`);must(start>=0,`function not found: ${name}`);
  const candidates=[src.indexOf('\nasync function ',start+10),src.indexOf('async function ',start+20),src.indexOf('\nfunction ',start+10),src.indexOf('\nipcMain.handle',start+10),src.indexOf('\nconst ',start+10)].filter(i=>i>start);
  const end=candidates.length?Math.min(...candidates):src.length;
  return {start,end,block:src.slice(start,end)};
}
function repFn(src,name,from,to,label){const hit=functionBlock(src,name);must(hit.block.includes(from),`missing ${label} in ${name}`);const block=hit.block.replace(from,to);return src.slice(0,hit.start)+block+src.slice(hit.end);}

main=repFn(main,'saveOfficialAttendance',
`  liveDataCache=null; liveDataFetchedAt=0;
  const data=await fetchLiveData({force:true});
  return {ok:true,id,data};`,
`  const operational=await fetchOperationalData();
  return {ok:true,id,patch:operational.patch||{}};`,'full refresh');

main=repFn(main,'deleteOfficialAttendance',
`  liveDataCache=null; liveDataFetchedAt=0;
  const data=await fetchLiveData({force:true});
  return {ok:true,data};`,
`  const operational=await fetchOperationalData();
  return {ok:true,patch:operational.patch||{}};`,'full refresh');

main=repFn(main,'saveLateAttendance',
`  liveDataCache=null;liveDataFetchedAt=0;return {ok:true,id,data:await fetchLiveData({force:true})};`,
`  const operational=await fetchOperationalData();return {ok:true,id,patch:operational.patch||{}};`,'full refresh');

main=repFn(main,'deleteLateAttendance',
"await clearSheetValues(token,UEP_SPREADSHEET_ID,`'31_지각기록'!A${pos+4}:P${pos+4}`);liveDataCache=null;liveDataFetchedAt=0;return {ok:true,data:await fetchLiveData({force:true})};",
"await clearSheetValues(token,UEP_SPREADSHEET_ID,`'31_지각기록'!A${pos+4}:P${pos+4}`);const operational=await fetchOperationalData();return {ok:true,patch:operational.patch||{}};",'full refresh');

for(const name of ['saveNightSupervisor','saveLunchDuty']){
  main=repFn(main,name,
`  liveDataCache=null; liveDataFetchedAt=0;
  const data=await fetchLiveData({force:true});
  return {ok:true,data};`,
`  const operational=await fetchOperationalData();
  return {ok:true,patch:operational.patch||{}};`,'full refresh');
}

main=repFn(main,'saveDormOuting',
`liveDataCache=null;liveDataFetchedAt=0;const data=await fetchLiveData({force:true});return {ok:true,id,data,record:{id,studentId:String(payload.studentId||''),studentNo,name,date,className,number,category,outTime,returnTime,reason:String(payload.reason||''),destination:String(payload.destination||''),note:String(payload.note||''),confirmed:String(payload.writer||''),status:'확인'}};`,
`const record={id,studentId:String(payload.studentId||''),studentNo,name,date,className,number,category,outTime,returnTime,reason:String(payload.reason||''),destination:String(payload.destination||''),note:String(payload.note||''),confirmed:String(payload.writer||''),status:'확인'};if(liveDataCache){liveDataCache={...liveDataCache,dormOutings:[...(liveDataCache.dormOutings||[]).filter(x=>String(x.id||'')!==String(id)),record],syncedAt:new Date().toISOString()};liveDataFetchedAt=Date.now();}return {ok:true,id,record};`,'full refresh');

gy=rep(gy,
`      readonlyCache=result?.data||readonlyCache; attendanceViewDate=payload.date; officialClassFilter="all"; officialStudentFilter="all"; closeDrawer(); render("attendance"); toast(row?"공결 기록을 수정했습니다.":"공결 기록을 등록했습니다.");`,
`      if(result?.patch)readonlyCache={...(readonlyCache||{}),...result.patch}; attendanceViewDate=payload.date; officialClassFilter="all"; officialStudentFilter="all"; closeDrawer(); render("attendance"); toast(row?"공결 기록을 수정했습니다.":"공결 기록을 등록했습니다.");`,'renderer official save');
const officialDelete=/(deleteOfficialAttendance\(row\.id\)[\s\S]{0,260}?)readonlyCache=result\?\.data\|\|readonlyCache;/;
must(officialDelete.test(gy),'renderer official delete assignment missing');
gy=gy.replace(officialDelete,`$1if(result?.patch)readonlyCache={...(readonlyCache||{}),...result.patch};`);

gy=rep(gy,
`    try{const result=await window.schoolBoard.saveLateAttendance(payload);readonlyCache=result?.data||readonlyCache;attendanceViewDate=payload.date;closeDrawer();render("attendance");toast(row?"지각 기록을 수정했습니다.":"지각 기록을 등록했습니다.");}catch(error){toast(error?.message||"지각 저장에 실패했습니다.");}`,
`    try{const result=await window.schoolBoard.saveLateAttendance(payload);if(result?.patch)readonlyCache={...(readonlyCache||{}),...result.patch};attendanceViewDate=payload.date;closeDrawer();render("attendance");toast(row?"지각 기록을 수정했습니다.":"지각 기록을 등록했습니다.");}catch(error){toast(error?.message||"지각 저장에 실패했습니다.");}`,'renderer late save');
gy=rep(gy,
`  try{const result=await window.schoolBoard.deleteLateAttendance(row.id);readonlyCache=result?.data||readonlyCache;render("attendance");toast("지각 기록을 삭제했습니다.");}catch(error){toast(error?.message||"지각 삭제에 실패했습니다.");}`,
`  try{const result=await window.schoolBoard.deleteLateAttendance(row.id);if(result?.patch)readonlyCache={...(readonlyCache||{}),...result.patch};render("attendance");toast("지각 기록을 삭제했습니다.");}catch(error){toast(error?.message||"지각 삭제에 실패했습니다.");}`,'renderer late delete');

gy=rep(gy,"      readonlyCache=result.data||readonlyCache;\n      renderDutyCalendarDrawer('lunch');","      if(result?.patch)readonlyCache={...(readonlyCache||{}),...result.patch};\n      renderDutyCalendarDrawer('lunch');",'renderer lunch patch');
gy=rep(gy,"      readonlyCache=result.data||readonlyCache;\n      renderDutyCalendarDrawer('night');","      if(result?.patch)readonlyCache={...(readonlyCache||{}),...result.patch};\n      renderDutyCalendarDrawer('night');",'renderer night patch');
gy=rep(gy,"if(!result?.ok)throw new Error(result?.reason||'저장 실패');readonlyCache=result.data||readonlyCache;close();openDormOutingDrawer();","if(!result?.ok)throw new Error(result?.reason||'저장 실패');if(result.record){readonlyCache=readonlyCache||{};const rows=(readonlyCache.dormOutings||[]).filter(x=>String(x.id||'')!==String(result.record.id||''));readonlyCache={...readonlyCache,dormOutings:[...rows,result.record]};}close();openDormOutingDrawer();",'renderer dorm record');

fs.writeFileSync(g,gy,'utf8');fs.writeFileSync(m,main,'utf8');
console.log('UEP 0.81.72 function-scoped operational write refactor applied');
