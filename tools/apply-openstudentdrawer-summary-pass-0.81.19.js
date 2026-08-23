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
const re=/const\s+selectedCount\s*=\s*participationPrograms\.filter\(p\s*=>\s*p\.__isSelected\)\.length\s*;\s*const\s+afterCount\s*=\s*participationPrograms\.filter\(p\s*=>\s*p\.__isAfter\)\.length\s*;\s*const\s+commonCount\s*=\s*participationPrograms\.filter\(p\s*=>\s*p\.__isCommon\)\.length\s*;\s*const\s+submittedReportCount\s*=\s*studentReports\.length\s*;\s*const\s+linkedReportIds\s*=\s*new\s+Set\(participationPrograms\.map\(p\s*=>\s*String\(p\.__studentParticipant\?\.reportId\s*\|\|\s*["']{2}\s*\)\)\.filter\(Boolean\)\)\s*;/;
const m=body.match(re);
if(!m) throw new Error('openStudentDrawer summary pattern not found');
const after='let selectedCount=0,afterCount=0,commonCount=0; const linkedReportIds=new Set(); for(const p of participationPrograms){ if(p.__isSelected)selectedCount++; if(p.__isAfter)afterCount++; if(p.__isCommon)commonCount++; const reportId=String(p.__studentParticipant?.reportId||""); if(reportId)linkedReportIds.add(reportId); } const submittedReportCount=studentReports.length;';
const patchedBody=body.replace(re,after);
if(patchedBody===body) throw new Error('openStudentDrawer summary replacement made no change');
text=text.slice(0,start)+patchedBody+text.slice(end);
fs.writeFileSync(file,text);
console.log('Applied openStudentDrawer single-pass summary optimization');
