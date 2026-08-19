const { app, BrowserWindow, dialog, net } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const POLICY_URL = 'https://raw.githubusercontent.com/hkhsm00-k81c/UEP-Updates/main/uep-policy.json';
const ROOT = path.dirname(process.execPath);
const APP_DIR = path.join(ROOT, 'app-current');
const BACKUP_DIR = path.join(ROOT, 'app-previous');
const VERSION_FILE = path.join(ROOT, 'installed-version.json');
const POLICY_CACHE = path.join(ROOT, 'policy-cache.json');
let win = null;

function createWindow() {
  win = new BrowserWindow({ width:620,height:360,resizable:false,maximizable:false,minimizable:false,show:false,autoHideMenuBar:true,backgroundColor:'#f5faf8',webPreferences:{contextIsolation:true,sandbox:true} });
  const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#f5faf8;font-family:"Segoe UI","Malgun Gothic",sans-serif;color:#153449;display:flex;align-items:center;justify-content:center;height:100vh}.card{width:520px;background:#fff;border:1px solid #d8e6e1;border-radius:22px;padding:30px 34px;box-shadow:0 18px 55px rgba(28,74,66,.13)}.head{display:flex;align-items:center;gap:16px}.logo{width:54px;height:54px;border-radius:17px;background:#dff3ee;display:flex;align-items:center;justify-content:center;color:#159981;font-weight:800;font-size:29px}h1{font-size:23px;margin:0 0 5px;font-weight:800}.sub{font-size:12px;color:#7e959e;letter-spacing:.4px}.status{margin-top:28px;font-size:16px;font-weight:700}.detail{margin-top:8px;font-size:13px;color:#718a94;min-height:20px}.bar{margin-top:22px;height:9px;border-radius:999px;background:#e6efec;overflow:hidden}.fill{height:100%;width:8%;background:#62c3b2;border-radius:999px;transition:width .2s ease}.foot{margin-top:18px;display:flex;justify-content:space-between;font-size:12px;color:#8aa0a7}.pct{font-weight:700;color:#4f8178}</style></head><body><div class="card"><div class="head"><div class="logo">U</div><div><h1>UEP 실행 준비</h1><div class="sub">UNHO EDUCATION PLATFORM</div></div></div><div id="status" class="status">업데이트를 확인하고 있습니다.</div><div id="detail" class="detail">잠시만 기다려 주세요.</div><div class="bar"><div id="fill" class="fill"></div></div><div class="foot"><span id="version">현재 버전 확인 중</span><span id="pct" class="pct"></span></div></div><script>window.setUEPStatus=(s,d,p,v)=>{document.getElementById('status').textContent=s||'';document.getElementById('detail').textContent=d||'';if(Number.isFinite(p))document.getElementById('fill').style.width=Math.max(3,Math.min(100,p))+'%';document.getElementById('pct').textContent=Number.isFinite(p)?Math.round(p)+'%':'';if(v)document.getElementById('version').textContent=v;};</script></body></html>`;
  win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));
  win.once('ready-to-show',()=>win.show());
}
function status(s,d,p,v){if(win&&!win.isDestroyed())win.webContents.executeJavaScript(`window.setUEPStatus(${JSON.stringify(s)},${JSON.stringify(d)},${Number.isFinite(p)?p:'undefined'},${JSON.stringify(v||'')})`).catch(()=>{});}

function requestJson(url,redirects=0){
  return new Promise((resolve,reject)=>{
    if(redirects>8)return reject(new Error('정책 서버 리디렉션이 너무 많습니다.'));
    const req=net.request({method:'GET',url}); req.setHeader('User-Agent','UEP-Launcher/1.3');
    const timer=setTimeout(()=>{try{req.abort();}catch{} reject(new Error('정책 서버 연결 시간 초과'));},10000);
    req.on('response',res=>{
      const code=res.statusCode;
      if(code>=300&&code<400){clearTimeout(timer);const loc=Array.isArray(res.headers.location)?res.headers.location[0]:res.headers.location;if(!loc)return reject(new Error(`정책 서버 HTTP ${code}`));return resolve(requestJson(new URL(loc,url).toString(),redirects+1));}
      if(code!==200){clearTimeout(timer);return reject(new Error(`정책 서버 HTTP ${code}`));}
      let body='';res.on('data',c=>body+=c.toString('utf8'));res.on('end',()=>{clearTimeout(timer);try{resolve(JSON.parse(body));}catch(e){reject(e);}});res.on('error',e=>{clearTimeout(timer);reject(e);});
    });
    req.on('error',e=>{clearTimeout(timer);reject(e);});req.end();
  });
}
function download(url,dest,onProgress,redirects=0){
  return new Promise((resolve,reject)=>{
    if(redirects>10)return reject(new Error('업데이트 다운로드 리디렉션이 너무 많습니다.'));
    const req=net.request({method:'GET',url});req.setHeader('User-Agent','UEP-Launcher/1.3');
    const timer=setTimeout(()=>{try{req.abort();}catch{} reject(new Error('업데이트 다운로드 시간 초과'));},120000);
    req.on('response',res=>{
      const code=res.statusCode;
      if(code>=300&&code<400){clearTimeout(timer);const loc=Array.isArray(res.headers.location)?res.headers.location[0]:res.headers.location;if(!loc)return reject(new Error(`업데이트 다운로드 HTTP ${code}`));return resolve(download(new URL(loc,url).toString(),dest,onProgress,redirects+1));}
      if(code!==200){clearTimeout(timer);return reject(new Error(`업데이트 다운로드 HTTP ${code}`));}
      const h=res.headers['content-length'];const total=Number(Array.isArray(h)?h[0]:h||0);let got=0;const f=fs.createWriteStream(dest);
      res.on('data',c=>{got+=c.length;if(total>0)onProgress?.(got,total);});res.on('error',e=>{clearTimeout(timer);try{f.destroy();}catch{} reject(e);});f.on('error',e=>{clearTimeout(timer);reject(e);});f.on('finish',()=>{clearTimeout(timer);f.close(resolve);});res.pipe(f);
    });
    req.on('error',e=>{clearTimeout(timer);reject(e);});req.end();
  });
}
function cmp(a,b){const A=String(a||'0').split('.').map(Number),B=String(b||'0').split('.').map(Number);for(let i=0;i<Math.max(A.length,B.length);i++){const d=(A[i]||0)-(B[i]||0);if(d)return d>0?1:-1;}return 0;}
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}}
function writeJson(file,obj){fs.writeFileSync(file,JSON.stringify(obj,null,2),'utf8')}
function localVersion(){return readJson(VERSION_FILE,{version:'0.0.0'}).version||'0.0.0'}
function sha256(file){const h=crypto.createHash('sha256');h.update(fs.readFileSync(file));return h.digest('hex')}
function launch(){const exe=path.join(APP_DIR,'UEP.exe');if(!fs.existsSync(exe))throw new Error('UEP.exe가 없습니다. UEP를 다시 설치해 주세요.');const child=spawn(exe,[],{cwd:APP_DIR,detached:true,stdio:'ignore'});child.unref();return child.pid;}
function isBlocked(policy,cur){return Array.isArray(policy.blockedVersions)&&policy.blockedVersions.includes(cur)}
function assertAllowedWithoutUpdate(policy,cur){if(isBlocked(policy,cur))throw new Error(policy.message||`현재 UEP ${cur} 버전은 사용이 중지되었습니다.`);if(policy.minimumAllowedVersion&&cmp(cur,policy.minimumAllowedVersion)<0)throw new Error(policy.message||`UEP ${cur}은 더 이상 사용할 수 없습니다.`)}
async function installUpdate(policy,cur){
  const tmp=path.join(app.getPath('temp'),`UEP-update-${Date.now()}.zip`),stage=path.join(app.getPath('temp'),`UEP-stage-${Date.now()}`);
  status('새 버전을 다운로드하고 있습니다.',`${cur} → ${policy.latestVersion}`,12,`현재 ${cur} · 최신 ${policy.latestVersion}`);
  await download(policy.downloadUrl,tmp,(got,total)=>status('새 버전을 다운로드하고 있습니다.',`${Math.round(got/1048576)}MB / ${Math.round(total/1048576)}MB`,12+(got/total)*58,`현재 ${cur} · 최신 ${policy.latestVersion}`));
  status('업데이트 파일을 검증하고 있습니다.','SHA-256 무결성을 확인하는 중입니다.',74,`최신 ${policy.latestVersion}`);
  if(policy.sha256&&sha256(tmp).toLowerCase()!==String(policy.sha256).toLowerCase())throw new Error('업데이트 파일 SHA-256 검증에 실패했습니다.');
  status('새 버전을 준비하고 있습니다.','압축을 풀고 있습니다.',82,`최신 ${policy.latestVersion}`);fs.mkdirSync(stage,{recursive:true});
  execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',`Expand-Archive -LiteralPath '${tmp.replace(/'/g,"''")}' -DestinationPath '${stage.replace(/'/g,"''")}' -Force`],{windowsHide:true});
  if(!fs.existsSync(path.join(stage,'UEP.exe')))throw new Error('업데이트 패키지에 UEP.exe가 없습니다.');
  status('UEP를 최신 버전으로 교체하고 있습니다.','기존 버전은 안전하게 백업합니다.',92,`최신 ${policy.latestVersion}`);
  fs.rmSync(BACKUP_DIR,{recursive:true,force:true});if(fs.existsSync(APP_DIR))fs.renameSync(APP_DIR,BACKUP_DIR);
  try{fs.renameSync(stage,APP_DIR);writeJson(VERSION_FILE,{version:policy.latestVersion,updatedAt:new Date().toISOString()});fs.rmSync(tmp,{force:true});}
  catch(e){fs.rmSync(APP_DIR,{recursive:true,force:true});if(fs.existsSync(BACKUP_DIR))fs.renameSync(BACKUP_DIR,APP_DIR);throw e;}
}
app.whenReady().then(async()=>{
  createWindow();const cur=localVersion();status('업데이트를 확인하고 있습니다.','최신 배포 정보를 확인하는 중입니다.',6,`현재 버전 ${cur}`);let policy,online=true;
  try{policy=await requestJson(POLICY_URL);writeJson(POLICY_CACHE,{fetchedAt:new Date().toISOString(),policy});}
  catch(netErr){online=false;const cached=readJson(POLICY_CACHE,null);if(cached&&cached.policy){const ageHours=(Date.now()-new Date(cached.fetchedAt).getTime())/3600000;const grace=Number(cached.policy.offlineGraceHours||72);if(ageHours<=grace)policy=cached.policy;}if(!policy){status('업데이트 서버에 연결하지 못했습니다.','현재 설치된 UEP를 실행합니다.',100,`현재 버전 ${cur}`);setTimeout(()=>{try{launch();}catch(e){dialog.showErrorBox('UEP 실행 오류',String(e.message||e));}app.quit();},900);return;}}
  try{const needsUpdate=!!(policy.updateEnabled&&policy.latestVersion&&cmp(policy.latestVersion,cur)>0),mustUpdate=!!(policy.forceUpdate&&(isBlocked(policy,cur)||(policy.minimumAllowedVersion&&cmp(cur,policy.minimumAllowedVersion)<0)));if(needsUpdate){if(!online&&mustUpdate)throw new Error(policy.message||'필수 업데이트가 필요하지만 업데이트 서버에 연결할 수 없습니다.');if(!policy.downloadUrl)throw new Error('업데이트 주소가 설정되지 않았습니다.');await installUpdate(policy,cur);status('업데이트가 완료되었습니다.','최신 UEP를 실행합니다.',100,`UEP ${policy.latestVersion}`);}else{assertAllowedWithoutUpdate(policy,cur);status('최신 버전입니다.','UEP를 실행합니다.',100,`UEP ${cur}`);}setTimeout(()=>{try{const pid=launch();status('UEP를 실행했습니다.',`프로세스 ${pid} 시작 확인`,100,needsUpdate?`UEP ${policy.latestVersion}`:`UEP ${cur}`);setTimeout(()=>app.quit(),900);}catch(e){status('UEP 실행에 실패했습니다.',String(e.message||e),100,needsUpdate?`UEP ${policy.latestVersion}`:`UEP ${cur}`);dialog.showErrorBox('UEP 실행 오류',String(e.message||e));}},700);}
  catch(e){status('UEP를 실행할 수 없습니다.',String(e&&e.message||e),100,`현재 버전 ${cur}`);dialog.showErrorBox('UEP 실행/업데이트 오류',String(e&&e.message||e));}
});
