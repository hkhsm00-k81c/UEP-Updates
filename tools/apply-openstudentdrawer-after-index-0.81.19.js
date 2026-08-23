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
let body=text.slice(start,end);
const re=/const\s+afterForStudent\s*=\s*groupedAfterSchoolCourses\(rawParticipationPrograms\.filter\(p\s*=>\s*p\.__isAfter\)\)\.map\(group\s*=>\s*\{\s*const\s+courseKey\s*=\s*String\(group\.programId\|\|group\.courseId\|\|group\.id\)\.replace\(\/\^after-course-\/,\s*["']{2}\)\s*;\s*const\s+courseRows\s*=\s*rawParticipationPrograms\.filter\(p\s*=>\s*p\.__isAfter&&\(String\(p\.programId\|\|p\.courseId\|\|p\.id\)\.replace\(\/\^after-\(\?:master\|session\)-\/,\s*["']{2}\)===courseKey\|\|\(p\.actualTitle\|\|p\.title\)===\(group\.actualTitle\|\|group\.title\)\)\)\s*;/;
const m=body.match(re);
if(!m) throw new Error('after-school grouping expected shape not found');
const after='const afterRows=rawParticipationPrograms.filter(p=>p.__isAfter); const afterRowsByCourse=new Map(); for(const row of afterRows){ const key=String(row.programId||row.courseId||row.id).replace(/^after-(?:master|session)-/,""); if(key){ if(!afterRowsByCourse.has(key))afterRowsByCourse.set(key,[]); afterRowsByCourse.get(key).push(row); } const titleKey=`title:${row.actualTitle||row.title||""}`; if(titleKey!=="title:"){ if(!afterRowsByCourse.has(titleKey))afterRowsByCourse.set(titleKey,[]); afterRowsByCourse.get(titleKey).push(row); } } const afterForStudent=groupedAfterSchoolCourses(afterRows).map(group=>{ const courseKey=String(group.programId||group.courseId||group.id).replace(/^after-course-/,""); const titleKey=`title:${group.actualTitle||group.title||""}`; const byCourse=afterRowsByCourse.get(courseKey)||[]; const byTitle=afterRowsByCourse.get(titleKey)||[]; const courseRows=byCourse.length?byCourse:byTitle;';
body=body.replace(re,after);
text=text.slice(0,start)+body+text.slice(end);
fs.writeFileSync(file,text);
console.log('Applied openStudentDrawer after-school preindex optimization');
