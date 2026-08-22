const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const targets=[
  ['resources/app/gyomuon.js',['emptyModule','formatTaskCompletedAt','internalNineGradeReferenceMap','sortUniversitiesByPriority','workItemReadByCurrentUser']],
  ['resources/app/electron/main.cjs',['dateFromYmd','getReadonlySheetsAuth','parseSchoolCalendarMatrix','sheetNameFromRange']],
  ['resources/app/electron/google-data.cjs',['calendarTitleFromRow']]
];
function findFunction(text,name){
  const re=new RegExp('\\bfunction\\s+'+name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'\\s*\\(','g');
  const m=re.exec(text); if(!m)return null;
  const open=text.indexOf('{',m.index); if(open<0)return null;
  let d=1,q=null,comment=null;
  for(let i=open+1;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(comment==='line'){if(c==='\n')comment=null;continue;}
    if(comment==='block'){if(c==='*'&&n==='/'){comment=null;i++;}continue;}
    if(q){if(c==='\\'){i++;continue;}if(c===q)q=null;continue;}
    if(c==='/'&&n==='/'){comment='line';i++;continue;}
    if(c==='/'&&n==='*'){comment='block';i++;continue;}
    if(c==='"'||c==="'"||c==='`'){q=c;continue;}
    if(c==='{')d++; else if(c==='}'&&--d===0){let end=i+1;while(end<text.length&&(text[end]==='\r'||text[end]==='\n'))end++;return {start:m.index,end};}
  }
  return null;
}
const report=[];
for(const [rel,names] of targets){
  const file=path.join(root,rel); let text=fs.readFileSync(file,'utf8');
  for(const name of names){
    const idRefs=(text.match(new RegExp('\\b'+name+'\\b','g'))||[]).length;
    if(idRefs!==1)throw new Error(`${name}: expected exactly one identifier occurrence before removal, got ${idRefs}`);
    const span=findFunction(text,name); if(!span)throw new Error(`${name}: declaration not found`);
    const removed=text.slice(span.start,span.end); text=text.slice(0,span.start)+text.slice(span.end);
    if(new RegExp('\\b'+name+'\\b').test(text))throw new Error(`${name}: residual reference remains`);
    report.push({file:rel,name,removedChars:removed.length});
  }
  fs.writeFileSync(file,text,'utf8');
}
fs.mkdirSync('cleanup1-output',{recursive:true});
fs.writeFileSync('cleanup1-output/cleanup1-report.json',JSON.stringify(report,null,2),'utf8');
console.log(JSON.stringify(report,null,2));
