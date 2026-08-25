const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app',repoRoot=process.argv[3]||process.cwd();
const gFile=path.join(root,'resources','app','gyomuon.js');
const mFile=path.join(root,'resources','app','electron','main.cjs');
const pFile=path.join(root,'resources','app','electron','preload.cjs');
let g=fs.readFileSync(gFile,'utf8'),m=fs.readFileSync(mFile,'utf8'),p=fs.readFileSync(pFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
const once=(text,needle,repl,label)=>{A(text.includes(needle),'anchor missing: '+label);return text.replace(needle,repl)};
A(/const\s+APP_VERSION\s*=\s*["']0\.81\.66["']\s*;/.test(g),'0.81.66 APP_VERSION missing');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.81\.66["']\s*;/,'const APP_VERSION = "0.81.68";');

// Shared security read: homeroom teachers use their existing School Read login; admins may fall back to service account.
const mainAnchor='ipcMain.handle("system:autoStartGet",()=>{';
A(m.includes(mainAnchor),'shared security insertion anchor missing');
const handlers=`// __UEP_08168_SHARED_SECURITY_READ__\nipcMain.handle("securityConfig:readShared", async () => {\n  try{\n    let values=[];\n    const session=await readSchoolReadSession().catch(()=>null);\n    if(session?.token&&session?.deviceId){\n      const ranges=await schoolReadBatchRead(UEP_SPREADSHEET_ID,["'00_UEP설정'!A3:E100"]);\n      values=ranges?.[0]?.values||[];\n    }else{\n      const account=await readEncrypted(credentialPath());\n      if(!validateServiceAccount(account))throw new Error('UEP 로그인이 필요합니다.');\n      const token=await getSheetsToken(account);\n      const matrix=await readNoticeSheetMatrix(token,'00_UEP설정','A3:E100');\n      values=matrix||[];\n    }\n    if(!values.length)return {ok:true,settings:[]};\n    const headers=(values[0]||[]).map(v=>String(v||'').trim());\n    const idx=name=>headers.indexOf(name);\n    const keyCol=idx('설정키'),valueCol=idx('설정값'),descCol=idx('설명');\n    if(keyCol<0||valueCol<0)throw new Error('00_UEP설정 헤더를 찾지 못했습니다.');\n    const allowed=new Set(['SENSITIVE_PIN_HASH','SUBJECT_CONFIDENTIAL_PIN_HASH']);\n    const settings=values.slice(1).map(r=>({key:String(r?.[keyCol]||'').trim(),value:String(r?.[valueCol]||'').trim(),description:descCol>=0?String(r?.[descCol]||''):''})).filter(r=>allowed.has(r.key)&&r.value);\n    return {ok:true,settings};\n  }catch(error){return {ok:false,reason:error?.message||'공용 보안설정 읽기 실패'};}\n});\n\n// __UEP_08168_PASSWORD_RESET__\nipcMain.handle("securityConfig:reset", async (_event,payload={}) => {\n  try{\n    const key=String(payload.key||'').trim();\n    if(!['SENSITIVE_PIN_HASH','SUBJECT_CONFIDENTIAL_PIN_HASH'].includes(key))throw new Error('허용되지 않은 보안 설정키입니다.');\n    const account=await readEncrypted(credentialPath());\n    if(!validateServiceAccount(account))throw new Error('관리자 Google 연결이 필요합니다.');\n    const token=await getSheetsToken(account);\n    const matrix=await readNoticeSheetMatrix(token,'00_UEP설정','A1:F500');\n    const header=findHeaderRowByRequired(matrix,['설정키','설정값']);\n    if(!header)throw new Error('00_UEP설정 헤더를 찾지 못했습니다.');\n    const headers=header.headers.slice(),idx=name=>headers.indexOf(name),keyCol=idx('설정키');\n    const rowIndex=matrix.findIndex((r,i)=>i>header.index&&String(r?.[keyCol]||'').trim()===key);\n    if(rowIndex>=0){\n      const row=Array.from({length:headers.length},(_,i)=>matrix[rowIndex]?.[i]??'');\n      const vals={'설정키':key,'설정값':'','설명':'비밀번호 초기화','수정일시':new Date().toISOString(),'수정자':String(payload.editor||'관리자')};\n      for(const [name,v] of Object.entries(vals)){const c=idx(name);if(c>=0)row[c]=v;}\n      await updateSheetValues(token,UEP_SPREADSHEET_ID,\`'00_UEP설정'!A\${rowIndex+1}:\${columnLetter(headers.length-1)}\${rowIndex+1}\`,[row]);\n    }\n    liveDataCache=null;liveDataFetchedAt=0;return {ok:true,key};\n  }catch(error){return {ok:false,reason:error?.message||'공용 비밀번호 초기화 실패'};}\n});\n\n${mainAnchor}`;
m=m.replace(mainAnchor,handlers);

// Force teacher notice confirmations through School Read session first. No Google approval fallback on a logged-in homeroom PC.
const receiptAnchor='ipcMain.handle("notice:receiptSave", async (_event, payload={}) => {\n  try {';
A(m.includes(receiptAnchor),'notice receipt anchor missing');
const receiptInsert=`ipcMain.handle("notice:receiptSave", async (_event, payload={}) => {\n  try {\n    const schoolSession=await readSchoolReadSession().catch(()=>null);\n    if(schoolSession?.token&&schoolSession?.deviceId){\n      // __UEP_08168_NOTICE_RECEIPT_SCHOOL_READ_FIRST__\n      const result=await schoolReadPost('notice-receipt-save',{token:schoolSession.token,deviceId:schoolSession.deviceId,noticeId:String(payload.noticeId||'').trim(),teacher:String(payload.teacher||'').trim(),userId:String(payload.userId||'').trim(),grade:String(payload.grade||''),classNo:String(payload.classNo||''),confirmed:payload.confirmed!==false,submitted:Boolean(payload.submitted),read:payload.read!==false,dismissed:Boolean(payload.dismissed),detailViewed:Boolean(payload.detailViewed),sourceType:String(payload.sourceType||'직접공지'),note:String(payload.note||'UEP 담임 확인')}).catch(error=>({ok:false,reason:error?.message||'School Read 공지확인 저장 실패'}));\n      if(result?.ok)return result;\n      return {ok:false,reason:result?.reason||result?.message||'학교 공용 확인저장 기능이 아직 배포되지 않았습니다.',requiresSchoolReadWrite:true};\n    }`;
m=m.replace(receiptAnchor,receiptInsert);

// Preload bridges.
const preloadAnchor='saveSharedSecurityConfig: (payload) => ipcRenderer.invoke("securityConfig:save", payload),';
A(p.includes(preloadAnchor),'preload shared security anchor missing');
p=p.replace(preloadAnchor,preloadAnchor+'\n  readSharedSecurityConfig: () => ipcRenderer.invoke("securityConfig:readShared"),\n  resetSharedSecurityConfig: (payload) => ipcRenderer.invoke("securityConfig:reset", payload),');

// Append tested runtime add-ons.
const shared=fs.readFileSync(path.join(repoRoot,'scripts','uep-0.81.68-shared-security-addon.js'),'utf8');
const reset=fs.readFileSync(path.join(repoRoot,'scripts','uep-0.81.67-password-reset-addon.js'),'utf8');
A(shared.includes('__UEP_08168_SHARED_SECURITY_READ_RUNTIME__'),'shared addon marker missing');
A(reset.includes('__UEP_08167_PASSWORD_RESET_RUNTIME__'),'reset addon marker missing');
g+='\n\n'+shared+'\n\n'+reset+'\n';

fs.writeFileSync(gFile,g,'utf8');fs.writeFileSync(mFile,m,'utf8');fs.writeFileSync(pFile,p,'utf8');
const go=fs.readFileSync(gFile,'utf8'),mo=fs.readFileSync(mFile,'utf8'),po=fs.readFileSync(pFile,'utf8');
for(const x of ['__UEP_08168_SHARED_SECURITY_READ_RUNTIME__','__UEP_08167_PASSWORD_RESET_RUNTIME__'])A(go.includes(x),'gyomuon marker missing '+x);
for(const x of ['__UEP_08168_SHARED_SECURITY_READ__','__UEP_08168_PASSWORD_RESET__','__UEP_08168_NOTICE_RECEIPT_SCHOOL_READ_FIRST__'])A(mo.includes(x),'main marker missing '+x);
for(const x of ['readSharedSecurityConfig','resetSharedSecurityConfig'])A(po.includes(x),'preload bridge missing '+x);
console.log('0.81.68 shared security + reset + notice route patch applied');
