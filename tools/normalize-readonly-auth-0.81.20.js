const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const mainPath=path.join(root,'resources/app/electron/main.cjs');
let text=fs.readFileSync(mainPath,'utf8');
const signature='async function getReadonlySheetsAuth(';
const start=text.indexOf(signature);
if(start<0)throw new Error('getReadonlySheetsAuth function not found');
const braceStart=text.indexOf('{',start);
if(braceStart<0)throw new Error('getReadonlySheetsAuth opening brace not found');
let depth=0,end=-1,quote='',escape=false,templateDepth=0;
for(let i=braceStart;i<text.length;i++){
  const ch=text[i],next=text[i+1];
  if(quote){
    if(escape){escape=false;continue;}
    if(ch==='\\'){escape=true;continue;}
    if(quote==='`'&&ch==='$'&&next==='{'){templateDepth++;i++;continue;}
    if(quote==='`'&&templateDepth>0){if(ch==='{')templateDepth++;else if(ch==='}')templateDepth--;continue;}
    if(ch===quote)quote='';
    continue;
  }
  if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
  if(ch==='/'&&next==='/'){const nl=text.indexOf('\n',i+2);i=nl<0?text.length:nl;continue;}
  if(ch==='/'&&next==='*'){const close=text.indexOf('*/',i+2);i=close<0?text.length:close+1;continue;}
  if(ch==='{')depth++;
  else if(ch==='}'){depth--;if(depth===0){end=i+1;break;}}
}
if(end<0)throw new Error('getReadonlySheetsAuth closing brace not found');
const normalized=`async function getReadonlySheetsAuth(credentials=null){
  if(credentials){if(!validateServiceAccount(credentials))throw new Error("Google 서비스 계정 인증정보가 올바르지 않습니다.");return {token:await getSheetsToken(credentials),mode:'service_account',account:credentials.client_email||''};}
  try{
    const service=await readEncrypted(credentialPath());
    if(validateServiceAccount(service)) return {token:await getSheetsToken(service),mode:'service_account',account:service.client_email||''};
  }catch(error){
    const fallbackAllowed=error?.code==='UEP_GOOGLE_CREDENTIAL_MISSING'||error?.code==='ENOENT'||error?.code==='UEP_SAFE_STORAGE_DECRYPT_FAILED'||/no such file/i.test(String(error?.message||''));
    if(!fallbackAllowed) throw error;
  }
  const saved=await readGoogleUserOAuth();
  const token=await getGoogleUserSheetsToken();
  return {token,mode:'user_oauth',account:String(saved?.email||'')};
}`;
text=text.slice(0,start)+normalized+text.slice(end);
fs.writeFileSync(mainPath,text,'utf8');
console.log('Normalized getReadonlySheetsAuth for 0.81.20 patch compatibility.');
