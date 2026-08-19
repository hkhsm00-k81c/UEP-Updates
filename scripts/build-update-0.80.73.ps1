$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$m=Get-Content $main -Raw -Encoding UTF8

# 0.80.73 emergency: force homeroom OAuth persistence to the canonical UEP AppData folder.
# This avoids launcher/app-version-dependent userData roots while still reading legacy 0.80.72 locations.
$needle='const googleUserOAuthRecoveryPath = () => path.join(stableUserDataRoot(), "google-user-oauth.recovery.json");'
if($m.Contains($needle) -and $m -notmatch '__UEP_GOOGLE_OAUTH_CANONICAL_08073__'){
$insert=@'
// __UEP_GOOGLE_OAUTH_CANONICAL_08073__
const googleUserOAuthCanonicalRoot = () => path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'UNHO Education Platform');
const googleUserOAuthCanonicalPath = () => path.join(googleUserOAuthCanonicalRoot(), 'google-user-oauth.bin');
const googleUserOAuthCanonicalRecoveryPath = () => path.join(googleUserOAuthCanonicalRoot(), 'google-user-oauth.recovery.json');
'@
  $m=$m.Replace($needle,$needle+"`n"+$insert)
}

# Canonical recovery writer/reader helpers reuse the same machine+Windows-user AES key derivation.
$oldWrite=@'
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
'@
$newWrite=@'
function encodeGoogleUserOAuthRecovery(value){
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),key=googleUserOAuthRecoveryKey(salt);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return {version:1,algorithm:'aes-256-gcm',salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')};
}
function decodeGoogleUserOAuthRecovery(payload){
  if(!payload||payload.version!==1||payload.algorithm!=='aes-256-gcm')throw new Error('invalid OAuth recovery token');
  const salt=Buffer.from(payload.salt,'base64'),iv=Buffer.from(payload.iv,'base64'),tag=Buffer.from(payload.tag,'base64'),data=Buffer.from(payload.data,'base64');
  const decipher=crypto.createDecipheriv('aes-256-gcm',googleUserOAuthRecoveryKey(salt),iv);decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8'));
}
async function writeGoogleUserOAuthRecovery(value){
  const payload=encodeGoogleUserOAuthRecovery(value);
  for(const target of [googleUserOAuthRecoveryPath(),googleUserOAuthCanonicalRecoveryPath()]){
    await fs.mkdir(path.dirname(target),{recursive:true});
    await fs.writeFile(target,JSON.stringify(payload),'utf8');
  }
}
async function readGoogleUserOAuthRecovery(){
  for(const target of [googleUserOAuthCanonicalRecoveryPath(),googleUserOAuthRecoveryPath()]){
    try{return decodeGoogleUserOAuthRecovery(JSON.parse(await fs.readFile(target,'utf8')));}catch{}
  }
  throw new Error('OAuth recovery token not found');
}
'@
if(-not $m.Contains($oldWrite)){throw '0.80.72 OAuth recovery helper block not found'}
$m=$m.Replace($oldWrite,$newWrite)

# Save both safeStorage copies (canonical + legacy) and recovery copies.
$oldSave=@'
async function saveGoogleUserOAuth(value){
  await fs.mkdir(path.dirname(googleUserOAuthPath()),{recursive:true});
  let primarySaved=false;
  if(safeStorage.isEncryptionAvailable()){
    try{await fs.writeFile(googleUserOAuthPath(),safeStorage.encryptString(JSON.stringify(value)));primarySaved=true;}catch{}
  }
  await writeGoogleUserOAuthRecovery(value);
  return {primarySaved,recoverySaved:true};
}
'@
$newSave=@'
async function saveGoogleUserOAuth(value){
  let primarySaved=false;
  if(safeStorage.isEncryptionAvailable()){
    const encrypted=safeStorage.encryptString(JSON.stringify(value));
    for(const target of [googleUserOAuthCanonicalPath(),googleUserOAuthPath()]){
      try{await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,encrypted);primarySaved=true;}catch{}
    }
  }
  await writeGoogleUserOAuthRecovery(value);
  return {primarySaved,recoverySaved:true,canonical:true};
}
'@
if(-not $m.Contains($oldSave)){throw '0.80.72 saveGoogleUserOAuth block not found'}
$m=$m.Replace($oldSave,$newSave)

# Read canonical safeStorage first, then legacy, then AES recovery; migrate anything found back to both paths.
$start=$m.IndexOf('async function readGoogleUserOAuth(){')
$end=$m.IndexOf("async function googleUserInfo",$start)
if($start -lt 0 -or $end -lt 0){throw 'readGoogleUserOAuth function bounds not found'}
$oldRead=$m.Substring($start,$end-$start)
$newRead=@'
async function readGoogleUserOAuth(){
  for(const target of [googleUserOAuthCanonicalPath(),googleUserOAuthPath()]){
    try{
      const encrypted=await fs.readFile(target);
      if(safeStorage.isEncryptionAvailable()){
        try{const value=JSON.parse(safeStorage.decryptString(encrypted));if(value&&typeof value==='object'){await saveGoogleUserOAuth(value);return value;}}catch{}
      }
      try{const legacy=JSON.parse(encrypted.toString('utf8'));if(legacy&&typeof legacy==='object'){await saveGoogleUserOAuth(legacy);return legacy;}}catch{}
    }catch{}
  }
  try{
    const recovered=await readGoogleUserOAuthRecovery();
    if(recovered&&typeof recovered==='object'){await saveGoogleUserOAuth(recovered);return recovered;}
  }catch{}
  return null;
}
'@
$m=$m.Remove($start,$end-$start).Insert($start,$newRead+"`n")

# Disconnect clears every OAuth persistence location.
$m=$m.Replace('for(const file of [googleUserOAuthPath(),googleUserOAuthRecoveryPath()]){','for(const file of [googleUserOAuthCanonicalPath(),googleUserOAuthCanonicalRecoveryPath(),googleUserOAuthPath(),googleUserOAuthRecoveryPath()]){')

Set-Content $main $m -Encoding UTF8 -NoNewline

# Version metadata + visible marker where available.
$g=Get-Content $gyo -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.80.72";','const APP_VERSION = "0.80.73";')
$g=$g.Replace('v0.80.70','v0.80.73')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.73'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8

node --check $main
node --check 'app/resources/app/electron/preload.cjs'
node --check $gyo
Write-Host 'UEP 0.80.73 canonical OAuth persistence emergency patch applied.'
