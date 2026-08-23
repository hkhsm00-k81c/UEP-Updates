const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
let text=fs.readFileSync(file,'utf8');
const sig='function openStudentDrawer(';
const start=text.indexOf(sig);
if(start<0) throw new Error('openStudentDrawer not found');
const brace=text.indexOf('{',start);
let i=brace,depth=0,end=-1,inS=false,inD=false,inT=false,esc=false;
for(;i<text.length;i++){
  const ch=text[i];
  if(esc){esc=false;continue;}
  if(ch==='\\'){esc=true;continue;}
  if(!inD&&!inT&&ch==="'"){inS=!inS;continue;}
  if(!inS&&!inT&&ch==='"'){inD=!inD;continue;}
  if(!inS&&!inD&&ch==='`'){inT=!inT;continue;}
  if(inS||inD||inT) continue;
  if(ch==='{') depth++;
  else if(ch==='}'){depth--;if(depth===0){end=i+1;break;}}
}
if(end<0) throw new Error('openStudentDrawer closing brace not found');
const body=text.slice(start,end);
const re=/const\s+attended\s*=\s*statuses\.filter\(x\s*=>\s*\/출석\|지각\|공결\|인정\|정상\|입실\/\.test\(x\)\)\.length\s*;\s*const\s+absent\s*=\s*statuses\.filter\(x\s*=>\s*\/결석\|미입실\|불참\|취소\/\.test\(x\)\)\.length\s*;/;
if(!re.test(body)) throw new Error('openStudentDrawer attendance status pattern not found');
const after='let attended=0,absent=0; for(const status of statuses){ if(/출석|지각|공결|인정|정상|입실/.test(status))attended++; else if(/결석|미입실|불참|취소/.test(status))absent++; }';
const patchedBody=body.replace(re,after);
text=text.slice(0,start)+patchedBody+text.slice(end);
fs.writeFileSync(file,text);
console.log('Applied openStudentDrawer single-pass attendance status optimization');
