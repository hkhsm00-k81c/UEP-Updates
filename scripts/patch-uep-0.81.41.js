const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const mainFile=path.resolve(appRoot,'resources','app','electron','main.cjs');
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let m=fs.readFileSync(mainFile,'utf8');
let g=fs.readFileSync(rendererFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.41";');

const oldAccount='    account: account.client_email,';
const newAccount='    account: auth.account || "",';
assert(m.includes(oldAccount),'stale fetchLiveData account reference not found');
m=m.replace(oldAccount,newAccount);

const start=m.indexOf('async function fetchLiveData(');
const end=m.indexOf('\nipcMain.handle(',start);
assert(start>=0&&end>start,'fetchLiveData block bounds not found');
const block=m.slice(start,end);
assert(block.includes('const auth = await getReadonlySheetsAuth(credentials);'),'School Read auth route missing');
assert(block.includes('account: auth.account || "",'),'safe source account assignment missing');
assert(!/\baccount\s*\.\s*client_email\b/.test(block),'undefined account reference remains in fetchLiveData');
assert(g.includes('const APP_VERSION = "0.81.41";'),'renderer version update failed');

fs.writeFileSync(mainFile,m,'utf8');
fs.writeFileSync(rendererFile,g,'utf8');
console.log('UEP 0.81.41 fetchLiveData account reference repair applied');
