const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const POLICY_URL = 'https://raw.githubusercontent.com/hkhsm00-k81c/UEP-Updates/main/uep-policy.json';
const ROOT = path.dirname(process.execPath);
const APP_DIR = path.join(ROOT, 'app-current');
const BACKUP_DIR = path.join(ROOT, 'app-previous');
const VERSION_FILE = path.join(ROOT, 'installed-version.json');
const POLICY_CACHE = path.join(ROOT, 'policy-cache.json');

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'UEP-Launcher/1.1' }, timeout: 8000 }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return resolve(requestJson(new URL(r.headers.location, url).toString()));
      if (r.statusCode !== 200) return reject(new Error(`정책 서버 HTTP ${r.statusCode}`));
      let s='';
      r.on('data', d => s += d);
      r.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { reject(e); } });
    });
    req.on('timeout', () => req.destroy(new Error('정책 서버 연결 시간 초과')));
    req.on('error', reject);
  });
}
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const go = u => {
      const req = https.get(u, { headers: { 'User-Agent': 'UEP-Launcher/1.1' }, timeout: 30000 }, r => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return go(new URL(r.headers.location, u).toString());
        if (r.statusCode !== 200) return reject(new Error(`업데이트 다운로드 HTTP ${r.statusCode}`));
        const f = fs.createWriteStream(dest);
        r.pipe(f);
        f.on('finish', () => f.close(resolve));
        f.on('error', reject);
      });
      req.on('timeout', () => req.destroy(new Error('업데이트 다운로드 시간 초과')));
      req.on('error', reject);
    };
    go(url);
  });
}
function cmp(a,b){const A=String(a||'0').split('.').map(Number),B=String(b||'0').split('.').map(Number);for(let i=0;i<Math.max(A.length,B.length);i++){const d=(A[i]||0)-(B[i]||0);if(d)return d>0?1:-1;}return 0;}
function readJson(file, fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}}
function writeJson(file, obj){fs.writeFileSync(file,JSON.stringify(obj,null,2),'utf8')}
function localVersion(){return readJson(VERSION_FILE,{version:'0.0.0'}).version||'0.0.0'}
function sha256(file){const h=crypto.createHash('sha256');h.update(fs.readFileSync(file));return h.digest('hex')}
function launch(){const exe=path.join(APP_DIR,'UEP.exe');if(!fs.existsSync(exe))throw new Error('UEP.exe가 없습니다. UEP를 다시 설치해 주세요.');spawn(exe,[],{cwd:APP_DIR,detached:true,stdio:'ignore'}).unref()}
function isBlocked(policy, cur){return Array.isArray(policy.blockedVersions)&&policy.blockedVersions.includes(cur)}
function assertAllowedWithoutUpdate(policy, cur){
  if(isBlocked(policy,cur)) throw new Error(policy.message || `현재 UEP ${cur} 버전은 사용이 중지되었습니다.`);
  if(policy.minimumAllowedVersion && cmp(cur,policy.minimumAllowedVersion)<0) throw new Error(policy.message || `UEP ${cur}은 더 이상 사용할 수 없습니다.`);
}
function installUpdate(policy){
  return (async()=>{
    const tmp=path.join(app.getPath('temp'),`UEP-update-${Date.now()}.zip`);
    const stage=path.join(app.getPath('temp'),`UEP-stage-${Date.now()}`);
    await download(policy.downloadUrl,tmp);
    if(policy.sha256 && sha256(tmp).toLowerCase()!==String(policy.sha256).toLowerCase()) throw new Error('업데이트 파일 SHA-256 검증에 실패했습니다.');
    fs.mkdirSync(stage,{recursive:true});
    execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',`Expand-Archive -LiteralPath '${tmp.replace(/'/g,"''")}' -DestinationPath '${stage.replace(/'/g,"''")}' -Force`],{windowsHide:true});
    if(!fs.existsSync(path.join(stage,'UEP.exe'))) throw new Error('업데이트 패키지에 UEP.exe가 없습니다.');
    fs.rmSync(BACKUP_DIR,{recursive:true,force:true});
    if(fs.existsSync(APP_DIR)) fs.renameSync(APP_DIR,BACKUP_DIR);
    try {
      fs.renameSync(stage,APP_DIR);
      writeJson(VERSION_FILE,{version:policy.latestVersion,updatedAt:new Date().toISOString()});
      fs.rmSync(tmp,{force:true});
    } catch(e) {
      fs.rmSync(APP_DIR,{recursive:true,force:true});
      if(fs.existsSync(BACKUP_DIR)) fs.renameSync(BACKUP_DIR,APP_DIR);
      throw e;
    }
  })();
}

app.whenReady().then(async()=>{
  const cur=localVersion();
  let policy;
  let online=true;
  try {
    policy=await requestJson(POLICY_URL);
    writeJson(POLICY_CACHE,{fetchedAt:new Date().toISOString(),policy});
  } catch(netErr) {
    online=false;
    const cached=readJson(POLICY_CACHE,null);
    if(cached && cached.policy){
      const ageHours=(Date.now()-new Date(cached.fetchedAt).getTime())/3600000;
      const grace=Number(cached.policy.offlineGraceHours||72);
      if(ageHours<=grace) policy=cached.policy;
    }
    if(!policy){
      try { launch(); } catch(e) { dialog.showErrorBox('UEP 실행 오류',String(e.message||e)); }
      return app.quit();
    }
  }

  try {
    const needsUpdate=!!(policy.updateEnabled && policy.latestVersion && cmp(policy.latestVersion,cur)>0);
    const mustUpdate=!!(policy.forceUpdate && (isBlocked(policy,cur) || (policy.minimumAllowedVersion && cmp(cur,policy.minimumAllowedVersion)<0)));

    if(needsUpdate){
      if(!online && mustUpdate) throw new Error(policy.message || '필수 업데이트가 필요하지만 현재 업데이트 서버에 연결할 수 없습니다.');
      if(!policy.downloadUrl) throw new Error('업데이트 주소가 설정되지 않았습니다.');
      await installUpdate(policy);
    } else {
      assertAllowedWithoutUpdate(policy,cur);
    }

    launch();
  } catch(e) {
    dialog.showErrorBox('UEP 실행/업데이트 차단', String(e&&e.message||e));
  }
  app.quit();
});
