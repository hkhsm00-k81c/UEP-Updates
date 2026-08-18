const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { execFileSync } = require('child_process');

const POLICY_URL = 'https://raw.githubusercontent.com/hkhsm00-k81c/UEP-Updates/main/uep-policy.json';
const ROOT = path.dirname(process.execPath);
const APP_DIR = path.join(ROOT, 'app-current');
const VERSION_FILE = path.join(ROOT, 'installed-version.json');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'UEP-Launcher/1.0' } }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return resolve(getJson(r.headers.location));
      if (r.statusCode !== 200) return reject(new Error(`HTTP ${r.statusCode}`));
      let s=''; r.on('data', d => s+=d); r.on('end', () => { try { resolve(JSON.parse(s)); } catch(e){ reject(e); } });
    }).on('error', reject);
  });
}
function download(url, dest) {
  return new Promise((resolve,reject)=>{
    const go=u=>https.get(u,{headers:{'User-Agent':'UEP-Launcher/1.0'}},r=>{
      if(r.statusCode>=300&&r.statusCode<400&&r.headers.location) return go(r.headers.location);
      if(r.statusCode!==200) return reject(new Error(`download HTTP ${r.statusCode}`));
      const f=fs.createWriteStream(dest); r.pipe(f); f.on('finish',()=>f.close(resolve));
    }).on('error',reject); go(url);
  });
}
function cmp(a,b){const A=String(a||'0').split('.').map(Number),B=String(b||'0').split('.').map(Number);for(let i=0;i<Math.max(A.length,B.length);i++){const d=(A[i]||0)-(B[i]||0);if(d)return d>0?1:-1;}return 0;}
function localVersion(){try{return JSON.parse(fs.readFileSync(VERSION_FILE,'utf8')).version||'0.0.0'}catch{return '0.0.0'}}
function sha256(file){const h=crypto.createHash('sha256');h.update(fs.readFileSync(file));return h.digest('hex');}
function launch(){const exe=path.join(APP_DIR,'UEP.exe');if(!fs.existsSync(exe))throw new Error('UEP.exe가 없습니다. UEP를 다시 설치해 주세요.');spawn(exe,[],{cwd:APP_DIR,detached:true,stdio:'ignore'}).unref();}

app.whenReady().then(async()=>{
  try {
    const policy=await getJson(POLICY_URL);
    const cur=localVersion();
    if(Array.isArray(policy.blockedVersions)&&policy.blockedVersions.includes(cur) && !policy.updateEnabled) throw new Error(`현재 UEP ${cur} 버전은 사용이 중지되었습니다.`);
    if(cmp(cur,policy.minimumAllowedVersion)<0 && !policy.updateEnabled) throw new Error(`UEP ${cur}은 더 이상 사용할 수 없습니다. 관리자 업데이트가 필요합니다.`);
    if(policy.updateEnabled && policy.latestVersion && cmp(policy.latestVersion,cur)>0){
      if(!policy.downloadUrl) throw new Error('업데이트 주소가 설정되지 않았습니다.');
      const tmp=path.join(app.getPath('temp'),`UEP-update-${Date.now()}.zip`);
      const stage=path.join(app.getPath('temp'),`UEP-stage-${Date.now()}`);
      await download(policy.downloadUrl,tmp);
      if(policy.sha256 && sha256(tmp).toLowerCase()!==String(policy.sha256).toLowerCase()) throw new Error('업데이트 파일 검증에 실패했습니다.');
      fs.mkdirSync(stage,{recursive:true});
      execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',`Expand-Archive -LiteralPath '${tmp.replace(/'/g,"''")}' -DestinationPath '${stage.replace(/'/g,"''")}' -Force`],{windowsHide:true});
      const stagedExe=path.join(stage,'UEP.exe');
      if(!fs.existsSync(stagedExe)) throw new Error('업데이트에 UEP.exe가 없습니다.');
      const backup=path.join(ROOT,'app-previous');
      fs.rmSync(backup,{recursive:true,force:true});
      if(fs.existsSync(APP_DIR)) fs.renameSync(APP_DIR,backup);
      fs.renameSync(stage,APP_DIR);
      fs.writeFileSync(VERSION_FILE,JSON.stringify({version:policy.latestVersion,updatedAt:new Date().toISOString()},null,2));
      fs.rmSync(tmp,{force:true});
    }
    launch(); app.quit();
  } catch(e) {
    try { launch(); } catch(_) {}
    dialog.showErrorBox('UEP 실행/업데이트 오류', String(e&&e.message||e));
    app.quit();
  }
});
