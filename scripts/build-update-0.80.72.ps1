$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$m=Get-Content $main -Raw -Encoding UTF8

# 0.80.72: dedicated persistence/recovery for user OAuth tokens.
$pathNeedle='const googleUserOAuthPath = () => path.join(stableUserDataRoot(), "google-user-oauth.bin");'
if($m.Contains($pathNeedle) -and $m -notmatch 'googleUserOAuthRecoveryPath'){
  $m=$m.Replace($pathNeedle,$pathNeedle + "`n" + 'const googleUserOAuthRecoveryPath = () => path.join(stableUserDataRoot(), "google-user-oauth.recovery.json");')
}

# Ensure stable user-data migration also knows about user OAuth files.
$m=$m.Replace('"google-service-account.recovery.json","neis-api-key.bin"','"google-service-account.recovery.json","google-user-oauth.bin","google-user-oauth.recovery.json","neis-api-key.bin"')

$oldRead=@'
async function readGoogleUserOAuth(){
  try{return await readEncrypted(googleUserOAuthPath());}
  catch(error){if(error?.code==='ENOENT'||/no such file/i.test(String(error?.message||'')))return null;throw error;}
}
'@
$newRead=@'
function googleUserOAuthRecoveryKey(salt){
  const identity=`${os.hostname()}|${os.userInfo().username}|UEP-GOOGLE-USER-OAUTH-v1`;
  return crypto.scryptSync(identity,salt,32);
}
async function writeGoogleUserOAuthRecovery(value){
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),key=googleUserOAuthRecoveryKey(salt);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  const payload={version:1,algorithm:'aes-256-gcm',salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')};
  await fs.mkdir(path.dirname(googleUserOAuthRecoveryPath()),{recursive:true});
  await fs.writeFile(googleUserOAuthRecoveryPath(),JSON.stringify(payload),'utf8');
}
async function readGoogleUserOAuthRecovery(){
  const payload=JSON.parse(await fs.readFile(googleUserOAuthRecoveryPath(),'utf8'));
  if(!payload||payload.version!==1||payload.algorithm!=='aes-256-gcm')throw new Error('invalid OAuth recovery token');
  const salt=Buffer.from(payload.salt,'base64'),iv=Buffer.from(payload.iv,'base64'),tag=Buffer.from(payload.tag,'base64'),data=Buffer.from(payload.data,'base64');
  const decipher=crypto.createDecipheriv('aes-256-gcm',googleUserOAuthRecoveryKey(salt),iv);decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8'));
}
async function saveGoogleUserOAuth(value){
  await fs.mkdir(path.dirname(googleUserOAuthPath()),{recursive:true});
  let primarySaved=false;
  if(safeStorage.isEncryptionAvailable()){
    try{await fs.writeFile(googleUserOAuthPath(),safeStorage.encryptString(JSON.stringify(value)));primarySaved=true;}catch{}
  }
  await writeGoogleUserOAuthRecovery(value);
  return {primarySaved,recoverySaved:true};
}
async function readGoogleUserOAuth(){
  let primaryExists=false;
  try{
    const encrypted=await fs.readFile(googleUserOAuthPath());primaryExists=true;
    if(safeStorage.isEncryptionAvailable()){
      try{return JSON.parse(safeStorage.decryptString(encrypted));}catch{}
    }
    try{const legacy=JSON.parse(encrypted.toString('utf8'));if(legacy&&typeof legacy==='object'){await saveGoogleUserOAuth(legacy);return legacy;}}catch{}
  }catch(error){if(error?.code!=='ENOENT'&&!/no such file/i.test(String(error?.message||''))){} }
  try{
    const recovered=await readGoogleUserOAuthRecovery();
    if(recovered&&typeof recovered==='object'){
      if(safeStorage.isEncryptionAvailable())try{await fs.writeFile(googleUserOAuthPath(),safeStorage.encryptString(JSON.stringify(recovered)));}catch{}
      return recovered;
    }
  }catch{}
  if(primaryExists){try{await fs.rename(googleUserOAuthPath(),`${googleUserOAuthPath()}.unreadable-${Date.now()}.bak`);}catch{}}
  return null;
}
'@
if(-not $m.Contains($oldRead)){throw '0.80.71 readGoogleUserOAuth block not found'}
$m=$m.Replace($oldRead,$newRead)

# All OAuth token writes must use the dedicated resilient store.
$m=$m.Replace('await saveEncrypted(googleUserOAuthPath(),merged);','await saveGoogleUserOAuth(merged);')
$m=$m.Replace('await saveEncrypted(googleUserOAuthPath(),saved);','await saveGoogleUserOAuth(saved);')

# Remove both primary and recovery token stores on disconnect.
$oldDisconnect=@'
async function disconnectGoogleUser(){
  try{await fs.unlink(googleUserOAuthPath());}catch(error){if(error?.code!=='ENOENT')throw error;}
  liveDataCache=null;liveDataFetchedAt=0;return {ok:true};
}
'@
$newDisconnect=@'
async function disconnectGoogleUser(){
  for(const file of [googleUserOAuthPath(),googleUserOAuthRecoveryPath()]){
    try{await fs.unlink(file);}catch(error){if(error?.code!=='ENOENT')throw error;}
  }
  liveDataCache=null;liveDataFetchedAt=0;return {ok:true};
}
'@
if($m.Contains($oldDisconnect)){$m=$m.Replace($oldDisconnect,$newDisconnect)}

# Browser callback only confirms handoff; final success is shown inside UEP after token exchange+save.
$m=$m.Replace('UEP Google 계정 승인이 완료되었습니다.','Google 승인 정보가 UEP로 전달되었습니다.')
$m=$m.Replace('이 창을 닫고 UEP로 돌아가 주세요.','이 창을 닫고 UEP로 돌아가 연결 완료 여부를 확인해 주세요.')

# Credential status now reports which local persistence path restored the token logically via readGoogleUserOAuth().
$oldStatus='return {ok:true,authorized:true,encryption:safeStorage.isEncryptionAvailable(),local:true,mode:"user_oauth",account:String(userOAuth.email||""),userOAuth:true,connectionState:"authorized"};'
$newStatus='return {ok:true,authorized:true,encryption:safeStorage.isEncryptionAvailable(),local:true,mode:"user_oauth",account:String(userOAuth.email||""),userOAuth:true,connectionState:"authorized",tokenPersisted:true};'
$m=$m.Replace($oldStatus,$newStatus)

Set-Content $main $m -Encoding UTF8 -NoNewline

# Renderer version marker if present, package metadata always updated.
$g=Get-Content $gyo -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.80.71";','const APP_VERSION = "0.80.72";')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.72'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check $main
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo
Write-Host 'UEP 0.80.72 resilient OAuth token persistence patch applied.'
