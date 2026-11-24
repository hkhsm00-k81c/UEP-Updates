/*
 * UEP Launcher 2.1.0
 *
 * 2.0.0 에서 고친 것 — 2026-11-24, 선생님 한 분이 **UEP 를 아예 못 여는 일**이 생겨서.
 *
 *  ① 실패하면 UEP 를 안 띄웠다.  마지막 catch 가 오류 상자만 띄우고 `launch()` 도
 *     `app.quit()` 도 부르지 않았다. 팝업을 닫아도 UEP 는 안 열리고 런처 창만 남았다.
 *     → **업데이트가 어떻게 실패하든 깔려 있는 UEP 는 반드시 띄운다.** 업데이트는 다음에 하면 된다.
 *  ② 압축 풀기가 powershell.exe 하나에 매달려 있었다 (게다가 맨 이름이라 PATH 에 기댐).
 *     그 PC 에서 `spawn UNKNOWN` 이 났고, try 밖이라 ①로 직행했다.
 *     → **System32 절대경로 + tar 우선, 파워셸은 예비.** 앱 쪽(0.85.14)과 같은 길이다.
 *        tar 는 `-C` 폴더를 스스로 만들지 않으므로 **먼저 만든다**(앱에서 겪은 그 함정).
 *        어느 쪽으로 됐는지 기록에 남긴다 — 예비가 조용히 성공하면 주 경로의 죽음이 덮인다.
 *  ③ tasklist/taskkill 도 맨 이름이었고, 실패를 catch 로 삼켜 「안 돌고 있다」로 오판했다.
 *     → 절대경로. 못 재면 '모름' 으로 두고, 모름일 때는 **막지 않는다**(죽이기만 해 보고 지나간다).
 *  ④ 내려받기 제한시간이 통째로 180초였다. 155MB 를 3분이면 864KB/s 가 내내 나와야 한다 —
 *     학교 망이 느린 시간대면 멀쩡히 받는 중에 끊겼다.
 *     → **멈춰 있을 때만** 끊는다(90초 무응답). 전체 상한은 넉넉히 30분.
 *  ⑤ 아이콘을 또 누르면 런처가 하나 더 떴다. → 단일 실행 잠금.
 *  ⑥ 로그를 한 줄도 안 남겼다 — 선생님 PC 에서 무엇이 실패했는지 알 길이 없었다.
 *     → 설치 폴더에 `launcher-log.txt`. 한 번 실행에 몇 줄, 256KB 넘으면 앞을 버린다.
 *  ⑦ cmp() 가 '0.85.13-rc1' 같은 꼬리를 숫자로 못 읽어 「같다」로 쳤다. → 숫자만 떼어 본다.
 *  ⑧ 우리가 만든 임시 zip 이 %TEMP% 에 쌓였다. → 시작할 때 지난 것들을 치운다.
 *     (설치 폴더의 app-current.zip 은 **설치본 것이므로 건드리지 않는다.**)
 */
const { app, BrowserWindow, dialog, net } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const LAUNCHER_VERSION='2.1.0';
const POLICY_URL='https://raw.githubusercontent.com/hkhsm00-k81c/UEP-Updates/main/uep-policy.json';
const ROOT=path.dirname(process.execPath);
const APP_DIR=path.join(ROOT,'app-current');
const NEXT_DIR=path.join(ROOT,'app-next');
const BACKUP_DIR=path.join(ROOT,'app-previous');
const VERSION_FILE=path.join(ROOT,'installed-version.json');
const POLICY_CACHE=path.join(ROOT,'policy-cache.json');
const LOG_FILE=path.join(ROOT,'launcher-log.txt');

/* ── 바깥 도구는 반드시 절대경로로 (PATH 가 망가졌거나 막혀 있을 수 있다) ── */
const SYS=path.join(process.env.SystemRoot||process.env.windir||'C:\\Windows','System32');
const TAR_EXE=path.join(SYS,'tar.exe');
const PS_EXE=path.join(SYS,'WindowsPowerShell','v1.0','powershell.exe');
const TASKLIST_EXE=path.join(SYS,'tasklist.exe');
const TASKKILL_EXE=path.join(SYS,'taskkill.exe');
function exists(p){try{fs.accessSync(p);return true}catch{return false}}

let win=null;

/* ── 기록 ───────────────────────────────────────────────────────────── */
function log(line){
  try{
    const stamp=new Date().toISOString().replace('T',' ').slice(0,19);
    /* BOM 을 붙여 둔다 — 없으면 메모장·파워셸이 ANSI 로 읽어 한글이 깨진다(선생님이 보실 파일이다) */
    if(!fs.existsSync(LOG_FILE))fs.writeFileSync(LOG_FILE,'﻿','utf8');
    fs.appendFileSync(LOG_FILE,`${stamp}  ${line}${os.EOL}`,'utf8');
    try{ const st=fs.statSync(LOG_FILE);
      if(st.size>262144){ const keep=fs.readFileSync(LOG_FILE,'utf8').replace(/^﻿/,'').slice(-131072); fs.writeFileSync(LOG_FILE,'﻿'+keep,'utf8'); }
    }catch{}
  }catch{}
}

function createWindow(){
  win=new BrowserWindow({width:620,height:360,resizable:false,maximizable:false,minimizable:false,show:false,autoHideMenuBar:true,backgroundColor:'#f5faf8',webPreferences:{contextIsolation:true,sandbox:true}});
  const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#f5faf8;font-family:"Segoe UI","Malgun Gothic",sans-serif;color:#153449;display:flex;align-items:center;justify-content:center;height:100vh}.card{width:520px;background:#fff;border:1px solid #d8e6e1;border-radius:22px;padding:30px 34px;box-shadow:0 18px 55px rgba(28,74,66,.13)}.head{display:flex;align-items:center;gap:16px}.logo{width:54px;height:54px;border-radius:17px;background:#dff3ee;display:flex;align-items:center;justify-content:center;color:#159981;font-weight:800;font-size:29px}h1{font-size:23px;margin:0 0 5px;font-weight:800}.sub{font-size:12px;color:#7e959e}.status{margin-top:28px;font-size:16px;font-weight:700}.detail{margin-top:8px;font-size:13px;color:#718a94;min-height:20px}.bar{margin-top:22px;height:9px;border-radius:999px;background:#e6efec;overflow:hidden}.fill{height:100%;width:8%;background:#62c3b2;border-radius:999px;transition:width .2s}.foot{margin-top:18px;display:flex;justify-content:space-between;font-size:12px;color:#8aa0a7}.pct{font-weight:700;color:#4f8178}</style></head><body><div class="card"><div class="head"><div class="logo">U</div><div><h1>UEP 실행 준비</h1><div class="sub">UNHO EDUCATION PLATFORM · Launcher ${LAUNCHER_VERSION}</div></div></div><div id="status" class="status">업데이트를 확인하고 있습니다.</div><div id="detail" class="detail">잠시만 기다려 주세요.</div><div class="bar"><div id="fill" class="fill"></div></div><div class="foot"><span id="version">현재 버전 확인 중</span><span id="pct" class="pct"></span></div></div><script>window.setUEPStatus=(s,d,p,v)=>{document.getElementById('status').textContent=s||'';document.getElementById('detail').textContent=d||'';if(Number.isFinite(p))document.getElementById('fill').style.width=Math.max(3,Math.min(100,p))+'%';document.getElementById('pct').textContent=Number.isFinite(p)?Math.round(p)+'%':'';if(v)document.getElementById('version').textContent=v;};</script></body></html>`;
  win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));win.once('ready-to-show',()=>win.show());
}
function status(s,d,p,v){if(win&&!win.isDestroyed())win.webContents.executeJavaScript(`window.setUEPStatus(${JSON.stringify(s)},${JSON.stringify(d)},${Number.isFinite(p)?p:'undefined'},${JSON.stringify(v||'')})`).catch(()=>{});}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function readJson(f,x={}){try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return x}}
function writeJson(f,o){fs.writeFileSync(f,JSON.stringify(o,null,2),'utf8')}
function localVersion(){return readJson(VERSION_FILE,{version:'0.0.0'}).version||'0.0.0'}
/* 숫자 아닌 꼬리(0.85.13-rc1)는 떼고 센다 — 2.0.0 은 NaN 이 되어 「같다」로 쳤다 */
function cmp(a,b){const n=s=>String(s||'0').split('.').map(x=>Number(String(x).replace(/[^0-9].*$/,''))||0);const A=n(a),B=n(b);for(let i=0;i<Math.max(A.length,B.length);i++){const d=(A[i]||0)-(B[i]||0);if(d)return d>0?1:-1;}return 0;}
function sha256(f){const h=crypto.createHash('sha256');h.update(fs.readFileSync(f));return h.digest('hex')}
function isBusyError(e){return ['EBUSY','EPERM','EACCES'].includes(String(e?.code||''))||/busy|locked|being used|access is denied/i.test(String(e?.message||''));}
async function retryFs(label,fn,{attempts=20,delay=500}={}){let last;for(let i=1;i<=attempts;i++){try{return fn()}catch(e){last=e;if(!isBusyError(e)||i===attempts)throw e;status('UEP 종료를 기다리고 있습니다.',`${label} · 잠금 해제 ${i}/${attempts}`,91,'안전 업데이트');await sleep(delay+Math.min(1200,(i-1)*100));}}throw last;}

/* ── UEP 가 돌고 있나: 못 재면 null('모름'). 모름을 「안 돌고 있다」로 치지 않는다 ── */
function uepRunning(){
  try{
    if(!exists(TASKLIST_EXE))return null;
    const out=execFileSync(TASKLIST_EXE,['/FI','IMAGENAME eq UEP.exe','/FO','CSV','/NH'],{encoding:'utf8',windowsHide:true});
    return /"UEP\.exe"/i.test(out);
  }catch(e){ log('tasklist 실패: '+(e?.message||e)); return null; }
}
async function stopUEP(){
  const first=uepRunning();
  if(first===false)return;
  status('실행 중인 UEP를 종료하고 있습니다.','업데이트 전 프로그램을 안전하게 종료합니다.',88,'안전 업데이트');
  const kill=(force)=>{ try{ if(exists(TASKKILL_EXE)) execFileSync(TASKKILL_EXE,force?['/IM','UEP.exe','/T','/F']:['/IM','UEP.exe','/T'],{windowsHide:true,stdio:'ignore'}); }catch(e){ log('taskkill'+(force?'(강제)':'')+' 실패: '+(e?.message||e)); } };
  kill(false);
  for(let i=0;i<12&&uepRunning()===true;i++)await sleep(500);
  if(uepRunning()===true){ kill(true); for(let i=0;i<8&&uepRunning()===true;i++)await sleep(500); }
  if(uepRunning()===true)throw new Error('실행 중인 UEP를 종료하지 못했습니다. UEP를 닫은 뒤 다시 실행해 주세요.');
  if(first===null)log('UEP 실행 여부를 재지 못했다 — 죽이기만 해 보고 지나간다 (막지 않는다)');
}
function recoverInterruptedSwap(){try{if(!fs.existsSync(APP_DIR)&&fs.existsSync(BACKUP_DIR))fs.renameSync(BACKUP_DIR,APP_DIR);if(fs.existsSync(NEXT_DIR))fs.rmSync(NEXT_DIR,{recursive:true,force:true});}catch(e){log('중단된 교체 복구 실패: '+(e?.message||e));}}
function launch(){const exe=path.join(APP_DIR,'UEP.exe');if(!fs.existsSync(exe))throw new Error('UEP.exe가 없습니다. 설치 복구가 필요합니다.');const child=spawn(exe,[],{cwd:APP_DIR,detached:true,stdio:'ignore'});child.unref();log('UEP 실행 pid='+child.pid);return child.pid;}

/* ── 업데이트가 어떻게 실패하든 깔려 있는 UEP 는 반드시 띄운다 ── */
function launchAnywayAndQuit(reason){
  log('그래도 실행: '+reason);
  try{ launch(); }
  catch(e){ log('실행도 실패: '+(e?.message||e)); try{ dialog.showErrorBox('UEP 실행 오류',String(e?.message||e)); }catch{} }
  setTimeout(()=>app.quit(),900);
}

function requestJson(url,redirects=0){return new Promise((resolve,reject)=>{if(redirects>8)return reject(new Error('정책 서버 리디렉션이 너무 많습니다.'));const bust=url+(url.includes('?')?'&':'?')+'t='+Date.now();const req=net.request({method:'GET',url:redirects?url:bust});req.setHeader('User-Agent',`UEP-Launcher/${LAUNCHER_VERSION}`);const timer=setTimeout(()=>{try{req.abort()}catch{}reject(new Error('정책 서버 연결 시간 초과'));},12000);req.on('response',res=>{const code=res.statusCode;if(code>=300&&code<400){clearTimeout(timer);const loc=Array.isArray(res.headers.location)?res.headers.location[0]:res.headers.location;if(!loc)return reject(new Error(`정책 서버 HTTP ${code}`));return resolve(requestJson(new URL(loc,url).toString(),redirects+1));}if(code!==200){clearTimeout(timer);return reject(new Error(`정책 서버 HTTP ${code}`));}let body='';res.on('data',c=>body+=c.toString('utf8'));res.on('end',()=>{clearTimeout(timer);try{resolve(JSON.parse(body))}catch(e){reject(e)}});res.on('error',reject);});req.on('error',reject);req.end();});}

/* 내려받기: **멈춰 있을 때만** 끊는다(90초 무응답). 전체 상한 30분. */
function download(url,dest,onProgress,redirects=0){return new Promise((resolve,reject)=>{
  if(redirects>10)return reject(new Error('업데이트 다운로드 리디렉션이 너무 많습니다.'));
  const req=net.request({method:'GET',url});req.setHeader('User-Agent',`UEP-Launcher/${LAUNCHER_VERSION}`);
  let stall=null,hard=null;
  const done=(fn,arg)=>{clearTimeout(stall);clearTimeout(hard);fn(arg);};
  const bumpStall=()=>{clearTimeout(stall);stall=setTimeout(()=>{try{req.abort()}catch{}done(reject,new Error('업데이트 다운로드가 90초 동안 멈춰 있어 중단했습니다. 인터넷 상태를 확인해 주세요.'));},90000);};
  hard=setTimeout(()=>{try{req.abort()}catch{}done(reject,new Error('업데이트 다운로드 시간 초과(30분)'));},1800000);
  bumpStall();
  req.on('response',res=>{
    const code=res.statusCode;
    if(code>=300&&code<400){const loc=Array.isArray(res.headers.location)?res.headers.location[0]:res.headers.location;if(!loc)return done(reject,new Error(`업데이트 다운로드 HTTP ${code}`));clearTimeout(stall);clearTimeout(hard);return resolve(download(new URL(loc,url).toString(),dest,onProgress,redirects+1));}
    if(code!==200)return done(reject,new Error(`업데이트 다운로드 HTTP ${code}`));
    const h=res.headers['content-length'];const total=Number(Array.isArray(h)?h[0]:h||0);let got=0;
    const f=fs.createWriteStream(dest);
    res.on('data',c=>{got+=c.length;bumpStall();if(total>0)onProgress?.(got,total)});
    res.on('error',e=>{try{f.destroy()}catch{}done(reject,e)});
    f.on('error',e=>done(reject,e));
    f.on('finish',()=>{clearTimeout(stall);clearTimeout(hard);f.close(()=>resolve())});
    res.pipe(f);
  });
  req.on('error',e=>done(reject,e));req.end();
});}

/* ── 압축 풀기: System32 절대경로 · tar 우선 · 어느 쪽으로 됐는지 기록 ── */
function runTool(exe,args){
  try{ execFileSync(exe,args,{windowsHide:true,stdio:'ignore'}); return {ok:true}; }
  catch(e){ return {ok:false,detail:(e?.code?e.code+' ':'')+String(e?.message||e).split('\n')[0]}; }
}
function extractZip(zipPath,destPath){
  const tried=[];
  /* tar 는 `-C` 로 준 폴더를 스스로 만들지 않는다 — 앱에서 이것 때문에 고침이 한 번도 안 돌았다 */
  try{ fs.mkdirSync(destPath,{recursive:true}); }
  catch(e){ return {ok:false,detail:'풀어 넣을 폴더를 만들지 못했습니다 · '+String(e?.message||e)}; }
  const 뭔가나왔나=()=>{ try{ return fs.readdirSync(destPath).length>0; }catch{ return false; } };
  if(exists(TAR_EXE)){
    const r=runTool(TAR_EXE,['-xf',zipPath,'-C',destPath]);
    if(r.ok&&뭔가나왔나())return {ok:true,via:'tar'};
    tried.push('tar: '+(r.ok?'끝났는데 빈 폴더':r.detail));
  } else tried.push('tar.exe 없음');
  if(exists(PS_EXE)){
    const cmd=`Expand-Archive -LiteralPath '${zipPath.replace(/'/g,"''")}' -DestinationPath '${destPath.replace(/'/g,"''")}' -Force`;
    const r=runTool(PS_EXE,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',cmd]);
    if(r.ok&&뭔가나왔나())return {ok:true,via:'powershell'};
    tried.push('powershell: '+(r.ok?'끝났는데 빈 폴더':r.detail));
  } else tried.push('powershell.exe 없음');
  return {ok:false,detail:tried.join(' / ')};
}

/* 우리가 만든 지난 임시 zip 치우기 (설치 폴더의 app-current.zip 은 설치본 것이라 건드리지 않는다) */
function cleanOldTemp(){
  try{
    const dir=app.getPath('temp');let n=0,mb=0;
    for(const name of fs.readdirSync(dir)){
      if(!/^UEP-update-\d+\.zip$/.test(name))continue;
      const p=path.join(dir,name);
      try{ const st=fs.statSync(p); fs.rmSync(p,{force:true}); n++; mb+=st.size/1048576; }catch{}
    }
    if(n)log(`지난 임시 zip 치움: ${n}개 ${Math.round(mb)}MB`);
  }catch{}
}

function isBlocked(p,v){return Array.isArray(p.blockedVersions)&&p.blockedVersions.includes(v)}
function assertAllowedWithoutUpdate(p,v){if(isBlocked(p,v))throw new Error(p.message||`현재 UEP ${v} 버전은 사용이 중지되었습니다.`);if(p.minimumAllowedVersion&&cmp(v,p.minimumAllowedVersion)<0)throw new Error(p.message||`UEP ${v}은 더 이상 사용할 수 없습니다.`)}

async function installUpdate(policy,cur){
  const tmp=path.join(app.getPath('temp'),`UEP-update-${Date.now()}.zip`);
  status('새 버전을 다운로드하고 있습니다.',`${cur} → ${policy.latestVersion}`,12,`현재 ${cur} · 최신 ${policy.latestVersion}`);
  await download(policy.downloadUrl,tmp,(got,total)=>status('새 버전을 다운로드하고 있습니다.',`${Math.round(got/1048576)}MB / ${Math.round(total/1048576)}MB`,12+(got/total)*55,`현재 ${cur} · 최신 ${policy.latestVersion}`));
  log(`내려받기 끝 ${Math.round(fs.statSync(tmp).size/1048576)}MB`);
  status('업데이트 파일을 검증하고 있습니다.','SHA-256 무결성 검사',72,`최신 ${policy.latestVersion}`);
  if(policy.sha256&&sha256(tmp).toLowerCase()!==String(policy.sha256).toLowerCase())throw new Error('업데이트 파일 SHA-256 검증에 실패했습니다.');
  await stopUEP();recoverInterruptedSwap();
  status('새 버전을 준비하고 있습니다.','현재 설치 폴더와 같은 위치에 새 버전을 준비합니다.',80,`최신 ${policy.latestVersion}`);
  await retryFs('이전 준비폴더 정리',()=>fs.rmSync(NEXT_DIR,{recursive:true,force:true}));
  const ex=extractZip(tmp,NEXT_DIR);
  if(!ex.ok)throw new Error('업데이트 압축을 풀지 못했습니다 · '+ex.detail);
  log('압축 풀기 ok via='+ex.via);
  if(!fs.existsSync(path.join(NEXT_DIR,'UEP.exe')))throw new Error('업데이트 패키지에 UEP.exe가 없습니다.');
  status('UEP를 최신 버전으로 교체하고 있습니다.','이전 버전을 보관한 뒤 새 버전을 적용합니다.',91,`최신 ${policy.latestVersion}`);
  await retryFs('이전 백업 정리',()=>fs.rmSync(BACKUP_DIR,{recursive:true,force:true}));
  if(fs.existsSync(APP_DIR))await retryFs('현재 버전 백업',()=>fs.renameSync(APP_DIR,BACKUP_DIR));
  try{
    await retryFs('새 버전 적용',()=>fs.renameSync(NEXT_DIR,APP_DIR));
    if(!fs.existsSync(path.join(APP_DIR,'UEP.exe')))throw new Error('새 버전 적용 검증에 실패했습니다.');
    writeJson(VERSION_FILE,{version:policy.latestVersion,updatedAt:new Date().toISOString(),launcherVersion:LAUNCHER_VERSION});
    try{fs.rmSync(tmp,{force:true})}catch{}
    log('업데이트 완료 '+cur+' → '+policy.latestVersion);
  }
  catch(e){
    log('교체 실패, 이전 버전으로 되돌린다: '+(e?.message||e));
    try{if(fs.existsSync(APP_DIR))await retryFs('실패 버전 정리',()=>fs.rmSync(APP_DIR,{recursive:true,force:true}),{attempts:8})}catch{}
    try{if(fs.existsSync(BACKUP_DIR))await retryFs('이전 버전 자동복구',()=>fs.renameSync(BACKUP_DIR,APP_DIR),{attempts:12})}catch{}
    throw e;
  }
}

/* ── 단일 실행 잠금: 아이콘을 또 눌러도 런처가 하나 더 뜨지 않는다 ── */
if(!app.requestSingleInstanceLock()){ app.quit(); }
else {
app.on('second-instance',()=>{ if(win&&!win.isDestroyed()){ if(win.isMinimized())win.restore(); win.focus(); } });

app.whenReady().then(async()=>{
  log(`─── 런처 ${LAUNCHER_VERSION} 시작 · 설치본 ${localVersion()}`);
  cleanOldTemp();
  recoverInterruptedSwap();createWindow();
  const cur=localVersion();
  status('업데이트를 확인하고 있습니다.','GitHub 최신 배포 정책을 새로 확인합니다.',6,`현재 버전 ${cur}`);
  let policy,online=true;
  try{ policy=await requestJson(POLICY_URL);writeJson(POLICY_CACHE,{fetchedAt:new Date().toISOString(),policy}); }
  catch(e){
    online=false; log('정책 읽기 실패: '+(e?.message||e));
    const cached=readJson(POLICY_CACHE,null);
    if(cached&&cached.policy){const age=(Date.now()-new Date(cached.fetchedAt).getTime())/3600000;if(age<=Number(cached.policy.offlineGraceHours||72))policy=cached.policy;}
    if(!policy){ status('업데이트 서버에 연결하지 못했습니다.','현재 설치된 UEP를 실행합니다.',100,`현재 ${cur}`); return setTimeout(()=>launchAnywayAndQuit('정책을 못 읽음'),800); }
  }
  try{
    const needs=!!(policy.updateEnabled&&policy.latestVersion&&cmp(policy.latestVersion,cur)>0);
    const must=!!(policy.forceUpdate&&(isBlocked(policy,cur)||(policy.minimumAllowedVersion&&cmp(cur,policy.minimumAllowedVersion)<0)));
    if(needs){
      if(!online&&must)throw new Error('필수 업데이트 서버에 연결할 수 없습니다.');
      if(!policy.downloadUrl)throw new Error('업데이트 주소가 없습니다.');
      await installUpdate(policy,cur);
      status('업데이트가 완료되었습니다.','최신 UEP를 실행합니다.',100,`UEP ${policy.latestVersion}`);
    } else {
      assertAllowedWithoutUpdate(policy,cur);
      status('최신 버전입니다.','UEP를 실행합니다.',100,`UEP ${cur}`);
    }
    setTimeout(()=>{try{launch();setTimeout(()=>app.quit(),900)}catch(e){log('실행 실패: '+(e?.message||e));dialog.showErrorBox('UEP 실행 오류',String(e.message||e));setTimeout(()=>app.quit(),900);}},650);
  }catch(e){
    /* **여기가 2.0.0 의 버그였다.** 오류만 띄우고 끝내 UEP 가 아예 안 열렸다.
       업데이트가 안 되는 것과 앱을 못 쓰는 것은 전혀 다른 일이다 — 반드시 띄운다. */
    const 말=String(e?.message||e);
    log('업데이트 실패: '+말);
    status('업데이트를 하지 못했습니다. 지금 버전으로 실행합니다.',말,100,`현재 ${localVersion()}`);
    const 쓸수있나=fs.existsSync(path.join(APP_DIR,'UEP.exe'));
    if(쓸수있나){
      /* **띄우고 나서 알린다.** 안내 상자를 먼저 띄우면 선생님이 누르기 전까지 UEP 가 안 열린다 —
         2.0.0 과 같은 일이 약한 꼴로 되풀이된다. showMessageBoxSync 는 멈춰 세우므로 순서가 전부다. */
      let 떴나=false;
      try{ launch(); 떴나=true; }catch(e2){ log('실행도 실패: '+(e2?.message||e2)); }
      try{ dialog.showMessageBoxSync({type:'warning',title:'UEP 업데이트 안내',
        message: 떴나 ? '업데이트를 하지 못해 지금 버전으로 UEP를 실행했습니다.'
                      : '업데이트를 하지 못했고 UEP 실행도 실패했습니다.',
        detail:말+'\n\n'+(떴나?'쓰시는 데에는 지장이 없습니다. 다음에 열 때 다시 시도합니다.':'설치 복구가 필요합니다.')
               +'\n같은 안내가 계속 나오면 알려 주세요 (기록: launcher-log.txt).',
        buttons:['확인'],noLink:true}); }catch{}
      setTimeout(()=>app.quit(),600);
    } else {
      try{ dialog.showErrorBox('UEP 업데이트 오류',말+'\n\n설치된 UEP를 찾지 못했습니다. 설치 복구가 필요합니다.'); }catch{}
      setTimeout(()=>app.quit(),900);
    }
  }
});
}
