const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const jsFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');
function assert(c,m){if(!c)throw new Error(m);}
function extractFunction(src,name){
  const sig=new RegExp('(?:async\\s+)?function\\s+'+name.replace(/[$]/g,'\\$&')+'\\s*\\([^)]*\\)\\s*\\{');
  const m=src.match(sig); if(!m)return null;
  const start=m.index, brace=src.indexOf('{',start); let depth=0,quote='',escaped=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i],n=src[i+1];
    if(quote){if(escaped){escaped=false;continue;}if(c==='\\'){escaped=true;continue;}if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='/'&&n==='*'){const j=src.indexOf('*/',i+2);if(j<0)break;i=j+1;continue;}
    if(c==='/'&&n==='/'){const j=src.indexOf('\n',i+2);if(j<0)break;i=j;continue;}
    if(c==='{')depth++; else if(c==='}'&&--depth===0)return {start,end:i+1,text:src.slice(start,i+1)};
  }
  return null;
}
function replaceFunction(name,text){const f=extractFunction(s,name);assert(f,'missing function '+name);s=s.slice(0,f.start)+text+s.slice(f.end);}
const vr=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((s.match(vr)||[]).length===1,'APP_VERSION declaration mismatch');
s=s.replace(vr,'const APP_VERSION = "0.81.37";');
replaceFunction('unlockSubjectConfidential',[
"async function unlockSubjectConfidential(){",
"  if(!subjectConfidentialAllowed())return false;",
"  if(sessionStorage.getItem(UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY)==='1')return true;",
"  // Privileged users must never be locked out before the first password is configured.",
"  if(!subjectConfidentialPasswordConfigured())return true;",
"  const p=prompt('선택과목 대외비 비밀번호를 입력하세요.');",
"  if(!p)return false;",
"  if(await subjectConfidentialDigest(p)!==subjectConfidentialPasswordHash()){alert('선택과목 대외비 비밀번호가 일치하지 않습니다.');return false;}",
"  sessionStorage.setItem(UEP_SUBJECT_CONFIDENTIAL_SESSION_KEY,'1');",
"  return true;",
"}"
].join('\n'));
assert(s.includes('const APP_VERSION = "0.81.37";'),'version update failed');
assert(s.includes('if(!subjectConfidentialPasswordConfigured())return true;'),'privileged recovery rule missing');
assert(s.includes('선택과목 대외비 보안'),'settings card missing from 0.81.36 base');
fs.writeFileSync(jsFile,s,'utf8');
console.log('UEP 0.81.37 privileged subject-lock recovery applied');
