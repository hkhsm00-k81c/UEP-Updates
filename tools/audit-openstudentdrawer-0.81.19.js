const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
const sig='function openStudentDrawer(';
const start=text.indexOf(sig);
if(start<0) throw new Error('openStudentDrawer not found');
const brace=text.indexOf('{',start);
let i=brace,depth=0,end=-1,inS=false,inD=false,inT=false,esc=false;
for(;i<text.length;i++){
  const ch=text[i], prev=text[i-1];
  if(esc){esc=false;continue;}
  if(ch==='\\'){esc=true;continue;}
  if(!inD&&!inT&&ch==="'"){inS=!inS;continue;}
  if(!inS&&!inT&&ch==='"'){inD=!inD;continue;}
  if(!inS&&!inD&&ch==='`'){inT=!inT;continue;}
  if(inS||inD||inT) continue;
  if(ch==='{') depth++;
  else if(ch==='}'){depth--; if(depth===0){end=i+1;break;}}
}
if(end<0) throw new Error('openStudentDrawer closing brace not found');
const body=text.slice(start,end);
const opRe=/(querySelectorAll|refreshReadonlyCacheSilently|\brender|\.filter|\.map|\.sort|\.findIndex|\.find)\s*\(/g;
const ops=[]; let m;
while((m=opRe.exec(body))){
  const a=Math.max(0,m.index-180), b=Math.min(body.length,m.index+320);
  ops.push({op:m[1],offset:m.index,context:body.slice(a,b).replace(/\s+/g,' ').trim()});
}
const receiverRe=/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])*)\.(filter|map|sort|find|findIndex)\s*\(/g;
const receivers={};
while((m=receiverRe.exec(body))){const k=m[1]+'.'+m[2];receivers[k]=(receivers[k]||0)+1;}
const repeatedReceivers=Object.entries(receivers).filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]).map(([expr,count])=>({expr,count}));
const renders=ops.filter(x=>x.op==='render').length;
const queryAll=ops.filter(x=>x.op==='querySelectorAll').length;
const arrayOps=ops.filter(x=>['.filter','.map','.sort','.find','.findIndex'].includes(x.op)).length;
const out={function:'openStudentDrawer',chars:body.length,renders,queryAll,arrayOps,repeatedReceivers:repeatedReceivers.slice(0,30),operationContexts:ops.slice(0,120),decision:'REVIEW_OPENSTUDENTDRAWER_CONTEXT'};
fs.mkdirSync('performance-phase19-output',{recursive:true});
fs.writeFileSync('performance-phase19-output/openstudentdrawer-audit.json',JSON.stringify(out,null,2));
fs.writeFileSync('performance-phase19-output/OPENSTUDENTDRAWER-AUDIT.md','# UEP 0.81.19 openStudentDrawer Detailed Audit\n\n```json\n'+JSON.stringify(out,null,2)+'\n```\n');
console.log(JSON.stringify({chars:out.chars,renders,queryAll,arrayOps,repeatedReceivers:out.repeatedReceivers.slice(0,10)},null,2));
