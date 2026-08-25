const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const repoRoot=process.argv[3]||process.cwd();
const gFile=path.join(root,'resources','app','gyomuon.js');
const mFile=path.join(root,'resources','app','electron','main.cjs');
const pFile=path.join(root,'resources','app','electron','preload.cjs');
let g=fs.readFileSync(gFile,'utf8'),m=fs.readFileSync(mFile,'utf8'),p=fs.readFileSync(pFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
const once=(text,needle,repl,label)=>{A(text.includes(needle),`anchor missing: ${label}`);return text.replace(needle,repl);};

// version: always build from the known-good 0.81.64 release.
A(/const\s+APP_VERSION\s*=\s*["']0\.81\.64["']\s*;/.test(g),'0.81.64 APP_VERSION missing');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.81\.64["']\s*;/,'const APP_VERSION = "0.81.66";');

// Make the password modal wording match central/shared storage.
g=g.replace('비밀번호 원문은 저장하지 않고 해시값만 이 PC에 보관합니다.','비밀번호 원문은 저장하지 않고 해시값만 기본정보 연결시트의 공용 설정에 보관합니다.');

// Today lunch-duty popup: reuse the already proven NEIS TODAY MEAL renderer.
const mealOld='$("#drawerBody").innerHTML=`<div class="today-duty-list"><time>${escapeHtml(key)}</time>${body}</div><div class="drawer-actions"><button class="btn primary" data-reference="lunch-supervisor">빠른열기 · 급식지도 전체 보기</button></div>`;';
const mealNew='$("#drawerBody").innerHTML=`<div class="today-duty-list"><time>${escapeHtml(key)}</time>${body}</div>${monthlyMealSummaryMarkup()}<div class="drawer-actions"><button class="btn primary" data-reference="lunch-supervisor">빠른열기 · 급식지도 전체 보기</button></div>`;/* __UEP_08166_TODAY_MEAL_IN_DUTY_POPUP__ */';
g=once(g,mealOld,mealNew,'today lunch popup');

// Electron: central 00_UEP설정 upsert + Windows login auto-start.
const mainAnchor='ipcMain.handle("notice:save", async (_event, payload = {}) => {';
const mainInsert=`// __UEP_08166_SHARED_SECURITY_AND_AUTOSTART__\nipcMain.handle("securityConfig:save", async (_event, payload={}) => {\n  try {\n    const key=String(payload.key||'').trim(), value=String(payload.value||'').trim();\n    if(!key||!value) throw new Error('설정키와 설정값이 필요합니다.');\n    if(!['SENSITIVE_PIN_HASH','SUBJECT_CONFIDENTIAL_PIN_HASH'].includes(key)) throw new Error('허용되지 않은 보안 설정키입니다.');\n    const account=await readEncrypted(credentialPath());\n    if(!validateServiceAccount(account)) throw new Error('관리자 Google 연결이 필요합니다.');\n    const token=await getSheetsToken(account);\n    const matrix=await readNoticeSheetMatrix(token,'00_UEP설정','A1:F500');\n    const header=findHeaderRowByRequired(matrix,['설정키','설정값']);\n    if(!header) throw new Error('00_UEP설정 헤더를 찾지 못했습니다.');\n    const headers=header.headers.slice(), idx=name=>headers.indexOf(name), keyCol=idx('설정키');\n    const now=new Date().toISOString(), editor=String(payload.editor||'관리자').trim();\n    const values={'설정키':key,'설정값':value,'설명':String(payload.description||'UEP 공용 보안설정'),'수정일시':now,'수정자':editor};\n    const rowIndex=matrix.findIndex((r,i)=>i>header.index&&String(r?.[keyCol]||'').trim()===key);\n    if(rowIndex>=0){\n      const row=Array.from({length:headers.length},(_,i)=>matrix[rowIndex]?.[i]??'');\n      for(const [name,v] of Object.entries(values)){const c=idx(name);if(c>=0)row[c]=v;}\n      await updateSheetValues(token,UEP_SPREADSHEET_ID,\`'00_UEP설정'!A\${rowIndex+1}:\${columnLetter(headers.length-1)}\${rowIndex+1}\`,[row]);\n    }else{\n      const row=Array.from({length:headers.length},()=> '');\n      for(const [name,v] of Object.entries(values)){const c=idx(name);if(c>=0)row[c]=v;}\n      await appendSheetValues(token,UEP_SPREADSHEET_ID,\`'00_UEP설정'!A:\${columnLetter(headers.length-1)}\`,[row]);\n    }\n    liveDataCache=null;liveDataFetchedAt=0;\n    return {ok:true,key,value};\n  } catch(error){return {ok:false,reason:error?.message||'공용 보안설정 저장 실패'};}\n});\nipcMain.handle("system:autoStartGet",()=>{\n  try{return {ok:true,enabled:Boolean(app.getLoginItemSettings().openAtLogin)};}catch(error){return {ok:false,reason:error?.message||'자동실행 상태 확인 실패'};}\n});\nipcMain.handle("system:autoStartSet",(_event,enabled)=>{\n  try{app.setLoginItemSettings({openAtLogin:Boolean(enabled),path:process.execPath});return {ok:true,enabled:Boolean(app.getLoginItemSettings().openAtLogin)};}catch(error){return {ok:false,reason:error?.message||'자동실행 설정 실패'};}\n});\n\n${mainAnchor}`;
m=once(m,mainAnchor,mainInsert,'notice save insertion');

// Preload bridges.
const preloadAnchor='saveNoticeReceipt: (payload) => ipcRenderer.invoke("notice:receiptSave", payload),';
const preloadInsert=`${preloadAnchor}\n  saveSharedSecurityConfig: (payload) => ipcRenderer.invoke("securityConfig:save", payload),\n  getAutoStart: () => ipcRenderer.invoke("system:autoStartGet"),\n  setAutoStart: (enabled) => ipcRenderer.invoke("system:autoStartSet", Boolean(enabled)),`;
p=once(p,preloadAnchor,preloadInsert,'preload notice receipt');

// Append runtime add-ons as raw JS files, not nested templates.
const coreAddon=fs.readFileSync(path.join(repoRoot,'scripts','uep-0.81.66-core-addon.js'),'utf8');
const urgentAddon=fs.readFileSync(path.join(repoRoot,'scripts','uep-0.81.66-urgent-addon.js'),'utf8');
A(coreAddon.includes('__UEP_08166_CORE_RUNTIME__'),'core addon marker missing');
A(urgentAddon.includes('__UEP_08166_URGENT_NOTICE_RUNTIME__'),'urgent addon marker missing');
g += `\n\n${coreAddon}\n\n${urgentAddon}\n`;

fs.writeFileSync(gFile,g,'utf8');fs.writeFileSync(mFile,m,'utf8');fs.writeFileSync(pFile,p,'utf8');

// Patch-level validation before the workflow does full node --check and ZIP round-trip.
const go=fs.readFileSync(gFile,'utf8'),mo=fs.readFileSync(mFile,'utf8'),po=fs.readFileSync(pFile,'utf8');
for(const marker of ['__UEP_08166_CORE_RUNTIME__','__UEP_08166_URGENT_NOTICE_RUNTIME__','__UEP_08166_TODAY_MEAL_IN_DUTY_POPUP__'])A(go.includes(marker),`gyomuon marker missing: ${marker}`);
A(mo.includes('__UEP_08166_SHARED_SECURITY_AND_AUTOSTART__'),'main marker missing');
A(po.includes('saveSharedSecurityConfig'),'preload shared security missing');
A(po.includes('setAutoStart'),'preload autostart missing');
console.log('0.81.66 bundled patch applied');
